import { randomBytes } from "crypto";
import { ethers } from "ethers";

const SECP256K1_N = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");

function toHex(buf: Buffer) {
    return buf.toString("hex").padStart(64, "0");
}

function validPrivateKeyCandidate(buf: Buffer): boolean {
    if (buf.length !== 32) return false;
    const n = BigInt("0x" + buf.toString("hex"));
    return n > BigInt(0) && n < SECP256K1_N;
}

function generatePrivateKey(): string {
    while (true) {
        const buf = randomBytes(32);
        if (validPrivateKeyCandidate(buf)) {
            return "0x" + toHex(buf);
        }
    }
}

const privateKey = generatePrivateKey();
const RPC_URL = process.env.AVALANCHE_RPC_URL || "https://api.avax.network/ext/bc/C/rpc";
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(privateKey, provider);
console.log(`PRIVATE_KEY: ${privateKey}, ADDRESS: ${wallet.address}`);
