"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeBatchPayout = executeBatchPayout;
const express_1 = __importDefault(require("express"));
const ethers_1 = require("ethers");
const openai_1 = require("openai");
const dotenv = __importStar(require("dotenv"));
const winston_1 = __importDefault(require("winston"));
const x402_express_1 = require("x402-express");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const pLimit = require("p-limit").default;
dotenv.config();
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: "1mb" }));
// ==================== Logger Setup ====================
const logger = winston_1.default.createLogger({
    level: "info",
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.File({ filename: "logs/error.log", level: "error" }),
        new winston_1.default.transports.File({ filename: "logs/combined.log" }),
        new winston_1.default.transports.Console({ format: winston_1.default.format.simple() }),
    ],
});
// ==================== Config ====================
const RPC_URL = process.env.AVALANCHE_RPC_URL || "https://api.avax.network/ext/bc/C/rpc";
const provider = new ethers_1.ethers.JsonRpcProvider(RPC_URL);
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY;
const serverWallet = new ethers_1.ethers.Wallet(PRIVATE_KEY, provider);
const openai = new openai_1.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const FACILITATOR_URL = process.env.X402_FACILITATOR_URL;
if (!FACILITATOR_URL || !/^https:\/\//.test(FACILITATOR_URL)) {
    logger.error("X402_FACILITATOR_URL must be a valid https:// URL");
    process.exit(1);
}
const FACILITATOR_URL_HTTPS = FACILITATOR_URL;
const PLATFORM_TREASURY = process.env.PLATFORM_TREASURY.trim();
if (!/^0x[a-fA-F0-9]{40}$/i.test(PLATFORM_TREASURY)) {
    logger.error("PLATFORM_TREASURY must be a valid 0x-prefixed Ethereum address");
    process.exit(1);
}
if (!PLATFORM_TREASURY) {
    logger.error("Missing PLATFORM_TREASURY");
    process.exit(1);
}
// Smart Contract ABI (updated for new contract structure)
const CONTRACT_ABI = [
    "function createTemplate(string name, string baseBehavior) external returns (uint256)",
    "function initializeAvatar(uint256 templateId) external returns (uint256 avatarId, uint256 sessionId)",
    "function updateAvatar(uint256 avatarId, string action, string dialogue, string behavior) external returns (uint256)",
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
const contract = new ethers_1.ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, serverWallet);
// Payout threshold: 0.1 AVAX
const PAYOUT_THRESHOLD_WEI = ethers_1.ethers.parseEther("0.1");
const creatorBalances = new Map();
const addPendingRevenue = (creator, weiAmount) => {
    const existing = creatorBalances.get(creator);
    if (existing) {
        existing.pendingWei += weiAmount;
        existing.totalEarnedWei += weiAmount;
    }
    else {
        creatorBalances.set(creator, {
            address: creator,
            pendingWei: weiAmount,
            totalEarnedWei: weiAmount,
            lastPayout: 0,
        });
    }
    const pendingAVAX = ethers_1.ethers.formatEther(creatorBalances.get(creator).pendingWei);
    logger.info(`Creator ${creator.slice(0, 8)}... +${ethers_1.ethers.formatEther(weiAmount)} AVAX → ${pendingAVAX} AVAX pending`);
};
// Tunables
const BATCH_SIZE = 50; // recipients per chunk
const CHUNK_CONCURRENCY = 3; // how many chunks to process in parallel
const PER_RECIPIENT_CONCURRENCY = 12; // parallel signed txs per chunk
const CHUNK_THROTTLE_MS = 150; // spacing between chunk starts
const RETRY_BASE_MS = 300; // base backoff
const PER_RECIPIENT_RETRIES = 2; // per-recipient retry attempts
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/**
 * Nonce manager factory
 * - Fetches pending nonce once and hands out sequential nonces.
 */
async function createNonceManager(address) {
    let base = await provider.getTransactionCount(address, "pending");
    let counter = 0;
    return {
        getNextNonce() {
            const n = base + counter;
            counter += 1;
            return n;
        },
        async refresh() {
            base = await provider.getTransactionCount(address, "pending");
            counter = 0;
        },
    };
}
/**
 * Sign and send a single native transfer using an explicit nonce.
 * Returns the sent transaction hash on success.
 */
async function sendSignedTransfer(to, value, nonce) {
    const txRequest = {
        to,
        value: ethers_1.ethers.toBigInt(value.toString()),
        nonce,
    };
    // Estimate gas limit; fallback to 21000 if estimate fails
    try {
        const est = await provider.estimateGas({ to, value: ethers_1.ethers.toBigInt(value.toString()) });
        txRequest.gasLimit = est;
    }
    catch {
        txRequest.gasLimit = ethers_1.ethers.toBigInt(21000);
    }
    // Sign raw tx and send via provider to ensure explicit nonce usage
    const signed = await serverWallet.signTransaction(txRequest);
    // provider.sendTransaction may not be typed on the provider interface in some d.ts; cast to any
    const sent = await provider.sendTransaction(signed);
    // wait for confirmation (optional)
    await sent.wait();
    return sent.hash;
}
/**
 * Process a chunk of addresses using explicit nonces from the shared nonce manager.
 * Returns number of successful payouts in this chunk.
 */
async function processChunk(chunk, startIndex, nonceManager) {
    const items = chunk
        .map((addr, idx) => ({ addr, amount: creatorBalances.get(addr).pendingWei, originalIndex: startIndex + idx }))
        .filter(it => it.amount >= PAYOUT_THRESHOLD_WEI);
    if (items.length === 0)
        return 0;
    const limit = pLimit(PER_RECIPIENT_CONCURRENCY);
    const results = await Promise.all(items.map(it => limit(async () => {
        for (let attempt = 0; attempt <= PER_RECIPIENT_RETRIES; attempt++) {
            try {
                const nonce = nonceManager.getNextNonce();
                const txHash = await sendSignedTransfer(it.addr, it.amount, nonce);
                logger.info(`Payout SUCCESS ${it.addr} tx=${txHash} nonce=${nonce}`);
                const bal = creatorBalances.get(it.addr);
                if (bal) {
                    bal.pendingWei = 0n;
                    bal.lastPayout = Date.now();
                }
                return true;
            }
            catch (err) {
                logger.warn(`Attempt ${attempt + 1} failed for ${it.addr}: ${err?.message || err}`);
                await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
            }
        }
        logger.error(`All attempts failed for ${it.addr}`);
        return false;
    })));
    return results.filter(Boolean).length;
}
/**
 * Main executor
 * - Chunks eligible addresses and processes chunks concurrently.
 * - Uses a single nonce manager for the whole run to avoid nonce collisions.
 */
async function executeBatchPayout(eligible) {
    if (!eligible || eligible.length === 0)
        return { total: 0, succeeded: 0 };
    // Prepare nonce manager once
    const walletAddress = await serverWallet.getAddress();
    const nonceManager = await createNonceManager(walletAddress);
    // Chunk eligible into slices
    const chunks = [];
    for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
        chunks.push(eligible.slice(i, i + BATCH_SIZE));
    }
    logger.info(`Prepared ${chunks.length} chunks for ${eligible.length} eligible creators`);
    const limit = pLimit(CHUNK_CONCURRENCY);
    const chunkPromises = chunks.map((chunk, idx) => limit(async () => {
        if (idx > 0)
            await sleep(CHUNK_THROTTLE_MS);
        return processChunk(chunk, idx * BATCH_SIZE, nonceManager);
    }));
    const settled = await Promise.allSettled(chunkPromises);
    const succeeded = settled.reduce((acc, r) => {
        if (r.status === "fulfilled")
            return acc + r.value;
        logger.error("Chunk execution failed:", r.reason);
        return acc;
    }, 0);
    logger.info(`executeBatchPayout finished: ${succeeded}/${eligible.length} succeeded`);
    return { total: eligible.length, succeeded };
}
// ==================== Helper Functions ====================
const getTemplateCreator = async (templateId) => {
    try {
        const creator = await contract.getTemplateCreator(templateId);
        return creator === ethers_1.ethers.ZeroAddress ? PLATFORM_TREASURY : creator;
    }
    catch {
        return PLATFORM_TREASURY;
    }
};
// ==================== Serve Static Files ====================
// Serve landing page
app.get("/", (req, res) => {
    const indexPath = path_1.default.join(__dirname, "../public/index.html");
    if (fs_1.default.existsSync(indexPath)) {
        res.sendFile(indexPath);
    }
    else {
        res.send("<h1>Aura Protocol</h1><p>Landing page not found. Please add public/index.html</p>");
    }
});
// ==================== x402 Middleware ====================
const createDynamicPaymentMiddleware = () => {
    const routesConfig = {
        "POST /create-avatar": "$0.01",
        "POST /update-avatar": "$0.001",
        "GET /health": "$0.00",
        "GET /avatar-state": "$0.00",
        "GET /template": "$0.00",
        "GET /user-templates": "$0.00",
        "GET /user-avatars": "$0.00",
        "GET /creator-balance": "$0.00",
    };
    const facilitatorConfig = { url: FACILITATOR_URL_HTTPS };
    return async (req, res, next) => {
        const routeKey = `${req.method} ${req.path}`;
        const routeConfig = routesConfig[routeKey];
        const getPrice = (cfg) => {
            if (!cfg)
                return null;
            if (typeof cfg === "string")
                return cfg.trim();
            if (cfg && typeof cfg === "object" && "price" in cfg) {
                return typeof cfg.price === "string" ? cfg.price.trim() : null;
            }
            return null;
        };
        const price = getPrice(routeConfig);
        // Free routes
        if (price === "$0.00") {
            return (0, x402_express_1.paymentMiddleware)(PLATFORM_TREASURY, routesConfig, facilitatorConfig)(req, res, next);
        }
        // Detect creator before payment verification (POST routes only)
        if (req.method === "POST" && req.body && req.body.templateId) {
            try {
                const templateId = Number(req.body.templateId);
                if (!isNaN(templateId)) {
                    const creator = await getTemplateCreator(templateId);
                    if (creator.toLowerCase() !== PLATFORM_TREASURY.toLowerCase()) {
                        req.creator = creator;
                    }
                }
            }
            catch (err) {
                logger.warn("Creator detection failed (non-critical)", err);
            }
        }
        return (0, x402_express_1.paymentMiddleware)(PLATFORM_TREASURY, routesConfig, facilitatorConfig)(req, res, next);
    };
};
app.use(createDynamicPaymentMiddleware());
// ==================== Async Handler ====================
const asyncHandler = (fn) => {
    return (req, res, next) => {
        const result = fn(req, res, next);
        if (result && typeof result.catch === "function") {
            result.catch(next);
        }
    };
};
// ==================== Routes ====================
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        time: new Date().toISOString(),
        network: "Avalanche C-Chain",
        contract: CONTRACT_ADDRESS,
        version: "2.0.0"
    });
});
// Create an avatar (returns avatarId and sessionId)
app.post("/create-avatar", asyncHandler(async (req, res) => {
    const { templateId } = req.body;
    if (templateId === undefined) {
        return res.status(400).json({ error: "templateId required" });
    }
    const templateIdNum = Number(templateId);
    if (isNaN(templateIdNum)) {
        return res.status(400).json({ error: "templateId must be a number" });
    }
    const tx = await contract.initializeAvatar(templateIdNum);
    const receipt = await tx.wait();
    // Extract avatarId and sessionId from event
    const event = receipt.logs.find((log) => {
        try {
            return contract.interface.parseLog(log)?.name === "AvatarInitialized";
        }
        catch {
            return false;
        }
    });
    let avatarId = null;
    let sessionId = null;
    if (event) {
        const parsed = contract.interface.parseLog(event);
        avatarId = Number(parsed?.args[0]);
        sessionId = Number(parsed?.args[1]);
    }
    // Revenue split
    const creator = req.creator;
    if (creator) {
        const header = req.headers["x402-payment"];
        let paidWei = 0n;
        if (typeof header === "string") {
            try {
                const data = JSON.parse(header);
                paidWei = BigInt(data.wei || data.amount || 0);
            }
            catch { }
        }
        if (paidWei > 0n) {
            const creatorShare = (paidWei * 70n) / 100n;
            addPendingRevenue(creator, creatorShare);
        }
    }
    res.json({
        success: true,
        transaction: receipt.hash,
        avatarId,
        sessionId,
        templateId: templateIdNum,
        blockNumber: receipt.blockNumber
    });
}));
// Update avatar (AI interaction)
app.post("/update-avatar", asyncHandler(async (req, res) => {
    const { avatarId, action, userAddress } = req.body;
    if (avatarId === undefined || !action) {
        return res.status(400).json({ error: "avatarId and action required" });
    }
    const avatarIdNum = Number(avatarId);
    if (isNaN(avatarIdNum)) {
        return res.status(400).json({ error: "avatarId must be a number" });
    }
    // Determine which user to query (for multi-user support)
    const queryUser = userAddress || serverWallet.address;
    // Fetch avatar state and memory
    let memoryData = "";
    let templateId = 0;
    try {
        const state = await contract.getState(queryUser, avatarIdNum);
        const memory = await contract.getMemory(queryUser, avatarIdNum);
        memoryData = memory.data || "";
        templateId = Number(state.templateId);
    }
    catch (err) {
        return res.status(404).json({ error: "Avatar not found or does not belong to user" });
    }
    // Get template info for context
    let templateBehavior = "neutral";
    try {
        const template = await contract.getTemplate(templateId);
        templateBehavior = template.baseBehavior || "neutral";
    }
    catch { }
    // Generate AI response
    const prompt = `You are an AI avatar with personality: ${templateBehavior}
Memory: ${memoryData || "none"}
Player action: ${action}

Respond with: dialogue|behavior
- dialogue: What the avatar says (1-2 sentences)
- behavior: Current emotional state (one word: happy, sad, angry, neutral, excited, etc.)`;
    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
    });
    const content = completion.choices[0]?.message?.content || "Hello.|neutral";
    const [dialogue = "Hello.", behavior = "neutral"] = content.split("|");
    // Update on-chain
    const tx = await contract.updateAvatar(avatarIdNum, action, dialogue.trim(), behavior.trim());
    const receipt = await tx.wait();
    // Revenue split
    const creator = req.creator;
    if (creator) {
        const header = req.headers["x402-payment"];
        let paidWei = 0n;
        if (typeof header === "string") {
            try {
                const data = JSON.parse(header);
                paidWei = BigInt(data.wei || data.amount || 0);
            }
            catch { }
        }
        if (paidWei > 0n) {
            const creatorShare = (paidWei * 70n) / 100n;
            addPendingRevenue(creator, creatorShare);
        }
    }
    res.json({
        dialogue: dialogue.trim(),
        behavior: behavior.trim(),
        transaction: receipt.hash,
        blockNumber: receipt.blockNumber
    });
}));
// Get avatar state
app.get("/avatar-state", asyncHandler(async (req, res) => {
    const { avatarId, userAddress } = req.query;
    if (!avatarId) {
        return res.status(400).json({ error: "avatarId required" });
    }
    const avatarIdNum = Number(avatarId);
    if (isNaN(avatarIdNum)) {
        return res.status(400).json({ error: "avatarId must be a number" });
    }
    const queryUser = userAddress || serverWallet.address;
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
    }
    catch {
        res.status(404).json({ error: "Avatar not found" });
    }
}));
// Get template info
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
    }
    catch {
        res.status(404).json({ error: "Template not found" });
    }
}));
// Get user's templates
app.get("/user-templates", asyncHandler(async (req, res) => {
    const { userAddress } = req.query;
    if (!userAddress) {
        return res.status(400).json({ error: "userAddress required" });
    }
    const templates = await contract.getUserTemplates(userAddress);
    res.json({
        userAddress,
        templates: templates.map((id) => Number(id)),
        count: templates.length
    });
}));
// Get user's avatars
app.get("/user-avatars", asyncHandler(async (req, res) => {
    const { userAddress } = req.query;
    if (!userAddress) {
        return res.status(400).json({ error: "userAddress required" });
    }
    const avatars = await contract.getUserAvatars(userAddress);
    const sessions = await contract.getUserSessions(userAddress);
    res.json({
        userAddress,
        avatars: avatars.map((id) => Number(id)),
        sessions: sessions.map((id) => Number(id)),
        count: avatars.length
    });
}));
// Get creator balance
app.get("/creator-balance", asyncHandler(async (req, res) => {
    const { creator } = req.query;
    if (!creator) {
        return res.status(400).json({ error: "creator address required" });
    }
    const addr = creator;
    const balance = creatorBalances.get(addr);
    if (!balance) {
        return res.status(404).json({ error: "No earnings yet" });
    }
    res.json({
        address: balance.address,
        pendingAVAX: ethers_1.ethers.formatEther(balance.pendingWei),
        totalEarnedAVAX: ethers_1.ethers.formatEther(balance.totalEarnedWei),
        thresholdAVAX: "0.1",
        thresholdReached: balance.pendingWei >= PAYOUT_THRESHOLD_WEI,
        progressPercent: Number((balance.pendingWei * 100n) / PAYOUT_THRESHOLD_WEI).toFixed(2) + "%",
        lastPayout: balance.lastPayout ? new Date(balance.lastPayout).toISOString() : null,
    });
}));
// Error handler
app.use((err, req, res, next) => {
    logger.error("Unhandled error:", err);
    res.status(500).json({
        error: "Internal server error",
        message: err.message
    });
});
// ==================== Start ====================
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    logger.info(`🚀 Aura Protocol API v2.0 LIVE on port ${PORT}`);
    logger.info(`📡 Network: Avalanche C-Chain`);
    logger.info(`📝 Contract: ${CONTRACT_ADDRESS}`);
    logger.info(`💰 Revenue: 70% creators → paid in AVAX`);
    logger.info(`🎯 Payout threshold: 0.1 AVAX`);
    logger.info(`⏰ Payout batch: every 5 minutes`);
    logger.info(`🔗 x402 Facilitator: ${FACILITATOR_URL}`);
    logger.info(`🌐 Landing page: http://localhost:${PORT}/`);
});
