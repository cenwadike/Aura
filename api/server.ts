import express, { Request, RequestHandler, Response, NextFunction } from "express";
import { ethers } from "ethers";
import { OpenAI } from "openai";
import * as dotenv from "dotenv";
import winston from "winston";
import { createThirdwebClient } from "thirdweb";
import { facilitator, settlePayment } from "thirdweb/x402";
import { avalancheFuji } from "thirdweb/chains";
import pLimit from "p-limit";

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, x-payment, x402-payment, X-PAYMENT-RESPONSE, access-control-expose-headers'
    );
    res.header('Access-Control-Expose-Headers', 'X-PAYMENT-RESPONSE, x-payment, x402-payment');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// ==================== Logger Setup ====================

const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [
        new winston.transports.File({ filename: "logs/error.log", level: "error" }),
        new winston.transports.File({ filename: "logs/combined.log" }),
        new winston.transports.Console({ format: winston.format.simple() }),
    ],
});

// ==================== Config ====================

const RPC_URL = process.env.AVALANCHE_RPC_URL || "https://api.avax.network/ext/bc/C/rpc";
const provider = new ethers.JsonRpcProvider(RPC_URL);
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS!;
const PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY!;
const serverWallet = new ethers.Wallet(PRIVATE_KEY, provider);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const PLATFORM_TREASURY = process.env.PLATFORM_TREASURY!.trim() as `0x${string}`;

if (!/^0x[a-fA-F0-9]{40}$/i.test(PLATFORM_TREASURY)) {
    logger.error("PLATFORM_TREASURY must be a valid 0x-prefixed Ethereum address");
    process.exit(1);
}
if (!PLATFORM_TREASURY) {
    logger.error("Missing PLATFORM_TREASURY");
    process.exit(1);
}

// ==================== Thirdweb X402 Setup (FIXED) ====================

const THIRDWEB_SECRET_KEY = process.env.THIRDWEB_SECRET_KEY!;
if (!THIRDWEB_SECRET_KEY) {
    logger.error("Missing THIRDWEB_SECRET_KEY");
    process.exit(1);
}

const thirdwebClient = createThirdwebClient({
    secretKey: THIRDWEB_SECRET_KEY
});

// FIX #1: Add waitUntil: "simulated" to facilitator
const thirdwebX402Facilitator = facilitator({
    client: thirdwebClient,
    serverWalletAddress: PLATFORM_TREASURY,
    waitUntil: "simulated", // ✅ ADDED
});

const BASE_URL = process.env.PUBLIC_API_URL || "http://localhost:8000";

// Smart Contract ABI
const CONTRACT_ABI = [
    "function createTemplate(string name, string baseBehavior) external returns (uint256)",
    "function initializeAvatar(address forUser, uint256 templateId) external returns (uint256 avatarId, uint256 sessionId)",
    "function updateAvatar(address forUser, uint256 avatarId, string action, string dialogue, string behavior) external returns (uint256)",
    "function getTemplate(uint256 templateId) external view returns (tuple(address creator, uint256 templateId, string name, string baseBehavior, uint256 createdAt, bool exists))",
    "function getState(address user, uint256 avatarId) external view returns (tuple(address creator, uint256 avatarId, uint256 sessionId, uint256 templateId, string dialogue, string behavior, uint256 lastInteraction, bool exists))",
    "function getMemory(address user, uint256 avatarId) external view returns (tuple(string data, uint256 lastUpdated))",
    "function getTemplateCreator(uint256 templateId) external view returns (address)",
    "function getUserTemplates(address user) external view returns (uint256[])",
    "function getUserAvatars(address user) external view returns (uint256[])",
    "function getUserSessions(address user) external view returns (uint256[])",
    "function getUserAvatarCount(address user) external view returns (uint256)",
    "function getUserSessionCount(address user) external view returns (uint256)",
    "function getAvatarBySession(address user, uint256 sessionId) external view returns (uint256)",
    "event TemplateCreated(uint256 indexed templateId, address indexed creator, string name, string baseBehavior)",
    "event AvatarInitialized(uint256 indexed avatarId, uint256 indexed sessionId, address indexed creator, uint256 templateId)",
    "event AvatarUpdated(uint256 indexed avatarId, uint256 indexed sessionId, address indexed creator, string action, string dialogue, string behavior)"
];

const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, serverWallet);

// ==================== USDC Transfer Configuration ====================

const USDC_CONTRACT_ADDRESS = process.env.USDC_CONTRACT_ADDRESS!; // USDC on Avalanche Fuji
if (!USDC_CONTRACT_ADDRESS) {
    logger.error("Missing USDC_CONTRACT_ADDRESS");
    process.exit(1);
}

const USDC_ABI = [
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)"
];

const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, serverWallet);

// ==================== Revenue Tracking/Sharing ====================

interface CreatorBalance {
    address: string;
    pendingWei: bigint; // Note: Actually USDC units (6 decimals)
    totalEarnedWei: bigint; // Note: Actually USDC units (6 decimals)
    lastPayout: number;
}

const PAYOUT_THRESHOLD_WEI = ethers.parseUnits("0.1", 6); // 0.1 USDC (6 decimals)
const creatorBalances = new Map<string, CreatorBalance>();

const addPendingRevenue = (creator: string, weiAmount: bigint) => {
    const existing = creatorBalances.get(creator);
    if (existing) {
        existing.pendingWei += weiAmount;
        existing.totalEarnedWei += weiAmount;
    } else {
        creatorBalances.set(creator, {
            address: creator,
            pendingWei: weiAmount,
            totalEarnedWei: weiAmount,
            lastPayout: 0,
        });
    }
    const pendingUSDC = ethers.formatUnits(creatorBalances.get(creator)!.pendingWei, 6);
    logger.info(`Creator ${creator.slice(0, 8)}... +${ethers.formatUnits(weiAmount, 6)} USDC → ${pendingUSDC} USDC pending`);
};

// Batch payout logic
const BATCH_SIZE = 50;
const CHUNK_CONCURRENCY = 3;
const PER_RECIPIENT_CONCURRENCY = 12;
const CHUNK_THROTTLE_MS = 150;
const RETRY_BASE_MS = 300;
const PER_RECIPIENT_RETRIES = 2;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function createNonceManager(address: string) {
    let base = await provider.getTransactionCount(address);
    let counter = 0;
    return {
        getNextNonce(): number {
            const n = base + counter;
            counter += 1;
            return n;
        },
        async refresh() {
            base = await provider.getTransactionCount(address);
            counter = 0;
        },
    };
}

async function sendUSDCTransfer(to: string, amount: bigint, nonce: number): Promise<string> {
    try {
        const tx = await usdcContract.transfer(to, amount, {
            nonce,
            gasLimit: 100000 // Standard ERC20 transfer gas limit
        });
        const receipt = await tx.wait();
        return receipt.hash;
    } catch (error: any) {
        logger.error(`USDC transfer failed to ${to}:`, error);
        throw error;
    }
}

async function processChunk(
    chunk: string[],
    startIndex: number,
    nonceManager: { getNextNonce(): number; refresh(): Promise<void> }
) {
    const items = chunk
        .map((addr, idx) => ({ addr, amount: creatorBalances.get(addr)!.pendingWei, originalIndex: startIndex + idx }))
        .filter(it => it.amount >= PAYOUT_THRESHOLD_WEI);

    if (items.length === 0) return 0;

    const limit = pLimit(PER_RECIPIENT_CONCURRENCY);

    const results = await Promise.all(
        items.map(it =>
            limit(async () => {
                for (let attempt = 0; attempt <= PER_RECIPIENT_RETRIES; attempt++) {
                    try {
                        const nonce = nonceManager.getNextNonce();
                        const txHash = await sendUSDCTransfer(it.addr, it.amount, nonce);
                        logger.info(`USDC Payout SUCCESS ${it.addr} amount=${ethers.formatUnits(it.amount, 6)} USDC tx=${txHash} nonce=${nonce}`);
                        const bal = creatorBalances.get(it.addr);
                        if (bal) { bal.pendingWei = 0n; bal.lastPayout = Date.now(); }
                        return true;
                    } catch (err: any) {
                        logger.warn(`Attempt ${attempt + 1} failed for ${it.addr}: ${err?.message || err}`);
                        await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
                    }
                }
                logger.error(`All attempts failed for ${it.addr}`);
                return false;
            })
        )
    );

    return results.filter(Boolean).length;
}

export async function executeBatchPayout(eligible: string[]) {
    if (!eligible || eligible.length === 0) return { total: 0, succeeded: 0 };

    const walletAddress = await serverWallet.getAddress();
    const nonceManager = await createNonceManager(walletAddress);

    const chunks: string[][] = [];
    for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
        chunks.push(eligible.slice(i, i + BATCH_SIZE));
    }

    logger.info(`Prepared ${chunks.length} chunks for ${eligible.length} eligible creators`);

    const limit = pLimit(CHUNK_CONCURRENCY);
    const chunkPromises = chunks.map((chunk, idx) =>
        limit(async () => {
            if (idx > 0) await sleep(CHUNK_THROTTLE_MS);
            return processChunk(chunk, idx * BATCH_SIZE, nonceManager);
        })
    );

    const settled = await Promise.allSettled(chunkPromises);
    const succeeded = settled.reduce((acc, r) => {
        if (r.status === "fulfilled") return acc + r.value;
        logger.error("Chunk execution failed:", (r as any).reason);
        return acc;
    }, 0);

    logger.info(`executeBatchPayout finished: ${succeeded}/${eligible.length} succeeded`);
    return { total: eligible.length, succeeded };
}

// ==================== Helper Functions ====================

const getTemplateCreator = async (templateId: number): Promise<string> => {
    try {
        const creator = await contract.getTemplateCreator(templateId);
        return creator === ethers.ZeroAddress ? PLATFORM_TREASURY : creator;
    } catch {
        return PLATFORM_TREASURY;
    }
};

// ==================== Thirdweb X402 Payment Handler (FIXED) ====================

interface RouteConfig {
    price: string;
    resourceUrl: string;
    description: string;
    mimeType?: string;
    maxTimeoutSeconds?: number;
}

const routeConfigs: Record<string, RouteConfig> = {
    "POST /create-avatar": {
        price: "$0.01",
        resourceUrl: `${BASE_URL}/create-avatar`,
        description: "Create a new AI avatar instance",
        mimeType: "application/json",
        maxTimeoutSeconds: 60
    },
    "POST /update-avatar": {
        price: "$0.001",
        resourceUrl: `${BASE_URL}/update-avatar`,
        description: "Update avatar state and get AI response",
        mimeType: "application/json",
        maxTimeoutSeconds: 60
    }
};

const createThirdwebPaymentMiddleware = (): express.RequestHandler => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const routeKey = `${req.method} ${req.path}`;
        const routeConfig = routeConfigs[routeKey];

        logger.info(`[PAYMENT] Route: ${routeKey}`);

        // Free routes - skip payment
        if (!routeConfig) {
            logger.info(`[PAYMENT] Free route, skipping payment`);
            return next();
        }

        // Detect creator for revenue split
        if (req.method === "POST" && req.body?.templateId) {
            try {
                const templateId = Number(req.body.templateId);
                if (!isNaN(templateId)) {
                    const creator = await getTemplateCreator(templateId);
                    (req as any).creator = creator;
                    logger.info(`[PAYMENT] Creator detected: ${creator}`);
                }
            } catch (err) {
                logger.warn("[PAYMENT] Creator detection failed:", err);
            }
        }

        // Process payment with Thirdweb
        try {
            const result = await settlePayment({
                resourceUrl: routeConfig.resourceUrl,
                method: req.method as "GET" | "POST",
                paymentData: req.headers["x-payment"] as string || null,
                network: avalancheFuji,
                price: routeConfig.price,
                facilitator: thirdwebX402Facilitator,
            });

            logger.info(`[PAYMENT] Settlement result: ${result.status}`);

            if (result.status === 200) {
                // ✅ FIX: Extract payment amount from price config
                const priceMatch = routeConfig.price.match(/\$([0-9.]+)/);
                if (priceMatch) {
                    const dollarAmount = parseFloat(priceMatch[1]);
                    // Convert to USDC units (6 decimals)
                    const usdcAmount = BigInt(Math.floor(dollarAmount * 1_000_000));
                    (req as any).paymentAmount = usdcAmount;

                    logger.info(`[PAYMENT] Payment processed: $${dollarAmount} (${ethers.formatUnits(usdcAmount, 6)} USDC)`);
                } else {
                    logger.warn(`[PAYMENT] Could not parse price from: ${routeConfig.price}`);
                    (req as any).paymentAmount = 0n;
                }

                return next();
            } else {
                // Payment failed or required
                logger.warn(`[PAYMENT] Payment settlement failed: ${result.status}`);

                // Set payment response headers
                if (result.responseHeaders) {
                    Object.entries(result.responseHeaders).forEach(([key, value]) => {
                        res.setHeader(key, value);
                    });
                }

                return res.status(result.status).json(result.responseBody || {
                    error: "Payment required",
                    status: result.status
                });
            }
        } catch (err: any) {
            logger.error(`[PAYMENT] Settlement error:`, err);
            return res.status(500).json({
                error: "Payment processing failed",
                message: err.message
            });
        }
    };
};

app.use(createThirdwebPaymentMiddleware() as express.RequestHandler);

// ==================== Async Handler ====================

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => any): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = fn(req, res, next);
        if (result && typeof (result as any).catch === "function") {
            (result as Promise<any>).catch(next);
        }
    };
};

// ==================== Routes ====================

app.get("/health", (req: Request, res: Response) => {
    res.json({
        status: "OK",
        time: new Date().toISOString(),
        network: "Avalanche Fuji",
        contract: CONTRACT_ADDRESS,
        version: "0.1.0"
    });
});

app.post("/create-avatar", asyncHandler(async (req, res) => {
    const { templateId, userAddress } = req.body;
    let creator: string | undefined;

    logger.info(`[CREATE-AVATAR] START - Template: ${templateId}, User: ${userAddress}`);

    if (templateId === undefined) {
        logger.error("[CREATE-AVATAR] Missing templateId");
        return res.status(400).json({ error: "templateId required" });
    }

    if (!userAddress) {
        logger.error("[CREATE-AVATAR] Missing userAddress");
        return res.status(400).json({ error: "userAddress required" });
    }

    const templateIdNum = Number(templateId);
    if (isNaN(templateIdNum)) {
        logger.error("[CREATE-AVATAR] Invalid templateId");
        return res.status(400).json({ error: "templateId must be a number" });
    }

    try {
        const template = await contract.getTemplate(templateIdNum);
        if (!template.exists) {
            logger.error(`[CREATE-AVATAR] Template ${templateIdNum} not found`);
            return res.status(404).json({ error: "Template not found" });
        }
        creator = template.creator;
        logger.info(`[CREATE-AVATAR] Template verified: ${template.name}`);
    } catch (err: any) {
        logger.error(`[CREATE-AVATAR] Template check failed:`, err);
        return res.status(404).json({ error: "Template not found" });
    }

    let tx, receipt;
    try {
        logger.info(`[CREATE-AVATAR] Calling contract.initializeAvatar(${userAddress}, ${templateIdNum})`);
        tx = await contract.initializeAvatar(userAddress, templateIdNum);
        logger.info(`[CREATE-AVATAR] TX sent: ${tx.hash}`);
        receipt = await tx.wait();
        logger.info(`[CREATE-AVATAR] TX confirmed in block ${receipt.blockNumber}`);
    } catch (err: any) {
        logger.error(`[CREATE-AVATAR] Contract error:`, err);
        return res.status(500).json({
            error: `Contract call failed: ${err.message}`,
            details: err.reason || err.code
        });
    }

    let avatarId = null;
    let sessionId = null;

    try {
        const event = receipt.logs.find((log: any) => {
            try {
                const parsed = contract.interface.parseLog(log);
                return parsed?.name === "AvatarInitialized";
            } catch {
                return false;
            }
        });

        if (event) {
            const parsed = contract.interface.parseLog(event);
            avatarId = Number(parsed?.args[0]);
            sessionId = Number(parsed?.args[1]);
            logger.info(`[CREATE-AVATAR] Event parsed - Avatar: ${avatarId}, Session: ${sessionId}`);
        }
    } catch (err) {
        logger.warn(`[CREATE-AVATAR] Event parsing failed:`, err);
    }

    // ✅ ENHANCED: Revenue split with detailed logging
    const paidWei: bigint | undefined = (req as any).paymentAmount;

    logger.info(`[CREATE-AVATAR] Revenue check - Creator: ${creator}, Amount: ${paidWei ? ethers.formatUnits(paidWei, 6) : '0'} USDC`);

    if (!creator) {
        logger.warn(`[CREATE-AVATAR] No creator found for template ${templateIdNum}`);
    }
    if (!paidWei || paidWei === 0n) {
        logger.warn(`[CREATE-AVATAR] No payment amount recorded`);
    }

    if (creator && paidWei && paidWei > 0n) {
        const creatorShare = (paidWei * 70n) / 100n;
        addPendingRevenue(creator, creatorShare);
        logger.info(`[CREATE-AVATAR] ✅ Revenue split: ${ethers.formatUnits(creatorShare, 6)} USDC to creator ${creator.slice(0, 10)}...`);
    } else {
        logger.warn(`[CREATE-AVATAR] ⚠️ Revenue NOT recorded - Creator: ${creator || 'none'}, Amount: ${paidWei ? ethers.formatUnits(paidWei, 6) : '0'} USDC`);
    }

    const response = {
        success: true,
        transaction: receipt.hash,
        avatarId,
        sessionId,
        templateId: templateIdNum,
        blockNumber: receipt.blockNumber
    };

    logger.info(`[CREATE-AVATAR] SUCCESS:`, response);
    res.status(200).json(response);
}));

app.post("/update-avatar", asyncHandler(async (req, res) => {
    const { avatarId, action, userAddress } = req.body;

    let creator: string | undefined;

    if (avatarId === undefined || !action) {
        return res.status(400).json({ error: "avatarId and action required" });
    }

    const avatarIdNum = Number(avatarId);
    if (isNaN(avatarIdNum)) {
        return res.status(400).json({ error: "avatarId must be a number" });
    }

    const queryUser = userAddress || serverWallet.address;

    let memoryData = "";
    let templateId = 0;
    try {
        const state = await contract.getState(queryUser, avatarIdNum);
        const memory = await contract.getMemory(queryUser, avatarIdNum);
        memoryData = memory.data || "";
        templateId = Number(state.templateId);
    } catch (err) {
        return res.status(404).json({ error: "Avatar not found or does not belong to user" });
    }

    let templateBehavior = "neutral";
    try {
        const template = await contract.getTemplate(templateId);
        templateBehavior = template.baseBehavior;
        creator = template.creator;
    } catch { }

    const prompt = `You are an AI avatar with personality: ${templateBehavior}
Memory: ${memoryData || "none"}
Player action: ${action}

Respond ONLY in this exact format (no prefixes, no explanations):
dialogue|behavior

Where:
- dialogue: What the avatar says (1-2 sentences max)
- behavior: ONE word describing emotional state (${templateBehavior}, happy, sad, angry, excited, thoughtful, etc.)

Example response: "The path ahead is shrouded in mystery.|mysterious"`;

    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
        temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content || "Hello.|neutral";

    let dialogue = "Hello.";
    let behavior = templateBehavior || "neutral";

    if (content.includes("|")) {
        const parts = content.split("|");
        dialogue = parts[0].trim();
        behavior = parts[1].trim();
    } else if (content.includes("- dialogue:") && content.includes("- behavior:")) {
        const dialogueMatch = content.match(/- dialogue:\s*(.+?)\s*-\s*behavior:/i);
        const behaviorMatch = content.match(/- behavior:\s*(\w+)/i);
        if (dialogueMatch) dialogue = dialogueMatch[1].trim();
        if (behaviorMatch) behavior = behaviorMatch[1].trim();
    } else if (content.includes("dialogue:") && content.includes("behavior:")) {
        const dialogueMatch = content.match(/dialogue:\s*(.+?)\s*behavior:/i);
        const behaviorMatch = content.match(/behavior:\s*(\w+)/i);
        if (dialogueMatch) dialogue = dialogueMatch[1].trim();
        if (behaviorMatch) behavior = behaviorMatch[1].trim();
    } else {
        dialogue = content.trim();
    }

    dialogue = dialogue.replace(/^["'\-\s]+|["'\-\s]+$/g, '');
    behavior = behavior.replace(/^["'\-\s]+|["'\-\s]+$/g, '').toLowerCase();

    if (behavior.includes(' ')) {
        behavior = behavior.split(' ')[0];
    }

    if (!behavior || behavior === '') {
        behavior = templateBehavior || 'neutral';
    }

    logger.info(`[UPDATE-AVATAR] Parsed - Dialogue: "${dialogue}", Behavior: "${behavior}"`);

    const tx = await contract.updateAvatar(userAddress, avatarIdNum, action, dialogue, behavior);
    const receipt = await tx.wait();

    // ✅ ENHANCED: Revenue split with logging
    const paidUSDC: bigint | undefined = (req as any).paymentAmount;

    logger.info(`[UPDATE-AVATAR] Revenue check - Creator: ${creator}, Amount: ${paidUSDC ? ethers.formatUnits(paidUSDC, 6) : '0'} USDC`);

    if (creator && paidUSDC && paidUSDC > 0n) {
        const creatorShare = (paidUSDC * 70n) / 100n;
        addPendingRevenue(creator, creatorShare);
        logger.info(`[UPDATE-AVATAR] ✅ Revenue split: ${ethers.formatUnits(creatorShare, 6)} USDC to creator`);
    } else {
        logger.warn(`[UPDATE-AVATAR] ⚠️ Revenue NOT recorded - Creator: ${creator || 'none'}, Amount: ${paidUSDC ? ethers.formatUnits(paidUSDC, 6) : '0'} USDC`);
    }

    res.status(200).json({
        dialogue,
        behavior,
        transaction: receipt.hash,
        blockNumber: receipt.blockNumber
    });
}));

app.get("/avatar-state", asyncHandler(async (req, res) => {
    const { avatarId, userAddress } = req.query;

    if (!avatarId) {
        return res.status(400).json({ error: "avatarId required" });
    }

    const avatarIdNum = Number(avatarId);
    if (isNaN(avatarIdNum)) {
        return res.status(400).json({ error: "avatarId must be a number" });
    }

    const queryUser = (userAddress as string) || serverWallet.address;

    try {
        const state = await contract.getState(queryUser, avatarIdNum);
        const memory = await contract.getMemory(queryUser, avatarIdNum);

        res.json({
            avatarId: Number(state.avatarId),
            sessionId: Number(state.sessionId),
            templateId: Number(state.templateId),
            dialogue: state.dialogue,
            behavior: state.behavior,
            lastInteraction: Number(state.lastInteraction),
            memory: memory.data,
            creator: state.creator
        });
    } catch {
        res.status(404).json({ error: "Avatar not found" });
    }
}));

app.get("/template", asyncHandler(async (req, res) => {
    const { templateId } = req.query;

    if (!templateId) {
        return res.status(400).json({ error: "templateId required" });
    }

    const templateIdNum = Number(templateId);
    if (isNaN(templateIdNum)) {
        return res.status(400).json({ error: "templateId must be a number" });
    }

    try {
        const template = await contract.getTemplate(templateIdNum);

        res.json({
            templateId: Number(template.templateId),
            name: template.name,
            baseBehavior: template.baseBehavior,
            creator: template.creator,
            createdAt: Number(template.createdAt)
        });
    } catch {
        res.status(404).json({ error: "Template not found" });
    }
}));

app.get("/user-templates", asyncHandler(async (req, res) => {
    const { userAddress } = req.query;

    if (!userAddress) {
        return res.status(400).json({ error: "userAddress required" });
    }

    const templates = await contract.getUserTemplates(userAddress as string);
    res.json({
        userAddress,
        templates: templates.map((id: bigint) => Number(id)),
        count: templates.length
    });
}));

app.get("/user-avatars", asyncHandler(async (req, res) => {
    const { userAddress } = req.query;

    if (!userAddress) {
        return res.status(400).json({ error: "userAddress required" });
    }

    const avatars = await contract.getUserAvatars(userAddress as string);
    const sessions = await contract.getUserSessions(userAddress as string);

    res.json({
        userAddress,
        avatars: avatars.map((id: bigint) => Number(id)),
        sessions: sessions.map((id: bigint) => Number(id)),
        count: avatars.length
    });
}));

app.get("/creator-balance", asyncHandler(async (req, res) => {
    const { creator } = req.query;

    if (!creator) {
        return res.status(400).json({ error: "creator address required" });
    }

    const addr = creator as string;
    const balance = creatorBalances.get(addr);

    if (!balance) {
        return res.status(404).json({ error: "No earnings yet" });
    }

    res.json({
        address: balance.address,
        pendingUSDC: ethers.formatUnits(balance.pendingWei, 6),
        totalEarnedUSDC: ethers.formatUnits(balance.totalEarnedWei, 6),
        thresholdUSDC: "0.1",
        thresholdReached: balance.pendingWei >= PAYOUT_THRESHOLD_WEI,
        progressPercent: Number((balance.pendingWei * 100n) / PAYOUT_THRESHOLD_WEI).toFixed(2) + "%",
        lastPayout: balance.lastPayout ? new Date(balance.lastPayout).toISOString() : null,
    });
}));

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error("Unhandled error:", err);
    res.status(500).json({
        error: "Internal server error",
        message: err.message
    });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    logger.info(`🚀 Aura AI API v0.1.0 LIVE on port ${PORT}`);
    logger.info(`📡 Network: Avalanche Fuji`);
    logger.info(`📝 Contract: ${CONTRACT_ADDRESS}`);
    logger.info(`💰 Revenue: 70% creators → paid in USDC`);
    logger.info(`🎯 Payout threshold: 0.1 USDC`);
    logger.info(`🔗 X402: Thirdweb facilitator`);
});