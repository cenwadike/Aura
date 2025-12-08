# Aura AI

![Avalanche](https://img.shields.io/badge/Avalanche-E84142?style=flat-square&logo=avalanche&logoColor=white)
![Solidity](https://img.shields.io/badge/Solidity-0.8.13-363636?style=flat-square&logo=solidity&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-007ACC?style=flat-square&logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**Monetizable AI Avatars on Avalanche with x402 Micropayments**

Aura is a tool for creating, managing, and monetizing dynamic AI avatars (chatbots, NPCs, game characters) with persistent on-chain state. Built on Avalanche for fast finality and integrated with x402 for seamless micropayment revenue sharing.

---

## 🎯 Core Features

- **🤖 AI-Powered Avatars** - GPT-4 driven personalities with contextual memory
- **⚡ Fast Finality** - Avalanche C-Chain for instant state updates
- **💰 Automated Revenue Splits** - 70% to template creators, paid in USDC
- **🔒 Verifiable State** - Cryptographically secure on-chain avatar management
- **💸 x402 Micropayments** - Pay-per-interaction without wallet friction

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────┐
│             User Workflow                       │
└─────────────────────────────────────────────────┘

Step 1: Create Template (Direct Smart Contract)
┌─────────────────┐
│  User's Wallet  │──→ createTemplate()
│   (MetaMask)    │    ├─ Pays gas (AVAX)
└─────────────────┘    └─ Owns template
         │
         ↓
┌─────────────────┐
│ Smart Contract  │──→ Template created on-chain
│ (Avalanche C)   │    User is the creator
└─────────────────┘

Step 2: Create Avatar & AI Interactions (API + x402)
┌─────────────────┐
│  Game Client    │──→ API call + x402 payment
└─────────────────┘    ($0.01 for avatar)
         │             ($0.001 per interaction)
         ↓
┌─────────────────┐
│   Aura API      │──→ OpenAI GPT-4
│  (Express/TS)   │    (AI-powered responses)
└────────┬────────┘
         │ Revenue Split:
         ├─ 70% → Template Creator (USDC)
         └─ 30% → Platform (USDC)
         │
         ↓ Update state
┌─────────────────┐
│ Smart Contract  │──→ Store dialogue, behavior
│ (Avalanche C)   │    Persistent memory
└─────────────────┘    Verifiable storage
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Avalanche wallet with AVAX and USDC(testnet or mainnet)
- OpenAI API key

### Installation

```bash
# Clone repository
git clone https://github.com/cenwadike/Aura
cd Aura

# Install api dependencies
cd api
npm install

cd ui
npm install

# Configure environment
cp .env.example .env
# Edit .env with your keys
```

### Environment Variables

`api` **.env**
```bash
AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc
CONTRACT_ADDRESS=0xBFB3A037b8109fbC07e950dA44F1E51b5d0Fa424
SERVER_PRIVATE_KEY=
OPENAI_API_KEY=
X402_FACILITATOR_URL=https://facilitator.x402.rs
PLATFORM_TREASURY=
PORT=8000
THIRDWEB_SECRET_KEY=
PUBLIC_API_URL=http://localhost:8000
```

`contract` **.env**
```bash
AVALANCHE_RPC_URL=https://avalanche-fuji-c-chain-rpc.publicnode.com
PRIVATE_KEY=
PLATFORM_TREASURY=
```

`ui` **.env**
```bash
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=
SECRET_KEY=
NEXT_PUBLIC_API_BASE_URL=
```

### Start Server

```bash
# Start API server
npm run start
```

### Start UI

```bash
# Start frontend
pnpm start
```
---

## 💻 API Endpoints

### Create Template

Create a reusable AI avatar template.

```bash
  createTemplate(string name, string baseBehavior) external returns (uint256)
```

### Create Avatar

Initialize an avatar from a template (auto-creates session).

```bash
POST /create-avatar
```

**Request:**
```json
{
  "templateId": 1
}
```

**Response:**
```json
{
  "success": true,
  "avatarId": 1,
  "sessionId": 1,
  "transaction": "0xdef456...",
  "blockNumber": 12346
}
```

**Cost:** $0.01

---

### Update Avatar (Interact)

Send player action and receive AI response.

```bash
POST /update-avatar
```

**Request:**
```json
{
  "avatarId": 1,
  "action": "Player asks about the ancient castle"
}
```

**Response:**
```json
{
  "dialogue": "The castle was built centuries ago by King Aldric...",
  "behavior": "informative",
  "transaction": "0x789abc...",
  "blockNumber": 12347
}
```

**Cost:** $0.001

---

### Get Avatar State

```bash
GET /avatar-state?avatarId=1&userAddress=0x...
```

**Response:**
```json
{
  "avatarId": 1,
  "sessionId": 1,
  "templateId": 1,
  "dialogue": "The castle was built...",
  "behavior": "informative",
  "lastInteraction": 1701234567,
  "memory": "Player_asks_about_castle@1701234567",
  "creator": "0xServerAddress..."
}
```

**Cost:** Free

---

### Get Template

```bash
GET /template?templateId=1
```

**Response:**
```json
{
  "templateId": 1,
  "name": "Battle Warrior",
  "baseBehavior": "aggressive, honorable...",
  "creator": "0xCreatorAddress...",
  "createdAt": 1701234000
}
```

**Cost:** Free

---

### Get User's Avatars

```bash
GET /user-avatars?userAddress=0x...
```

**Response:**
```json
{
  "userAddress": "0x...",
  "avatars": [1, 2, 3],
  "sessions": [1, 2, 3],
  "count": 3
}
```

**Cost:** Free

---

### Get Creator Balance

```bash
GET /creator-balance?creator=0x...
```

**Response:**
```json
{
  "address": "0x...",
  "pendingUSDC": "0.075",
  "totalEarnedUSDC": "0.45",
  "thresholdUSDC": "0.1",
  "thresholdReached": false,
  "progressPercent": "75.00%",
  "lastPayout": "2024-12-01T10:30:00Z"
}
```

**Cost:** Free

---

## 📝 Smart Contract

### Key Functions

```solidity
// Create template (returns templateId)
function createTemplate(string name, string baseBehavior) 
    external returns (uint256)

// Initialize avatar (returns avatarId, sessionId)
function initializeAvatar(uint256 templateId) 
    external returns (uint256, uint256)

// Update avatar state
function updateAvatar(uint256 avatarId, string action, 
    string dialogue, string behavior) 
    external returns (uint256)

// View functions
function getState(address user, uint256 avatarId) 
    external view returns (State memory)

function getMemory(address user, uint256 avatarId) 
    external view returns (Memory memory)

function getUserAvatars(address user) 
    external view returns (uint256[] memory)
```

### Data Structures

```solidity
struct Template {
    address creator;
    uint256 templateId;
    string name;
    string baseBehavior;
    uint256 createdAt;
    bool exists;
}

struct State {
    address creator;
    uint256 avatarId;        // User-scoped (1, 2, 3...)
    uint256 sessionId;       // User-scoped (1, 2, 3...)
    uint256 templateId;      // Global
    string dialogue;
    string behavior;
    uint256 lastInteraction;
    bool exists;
}

struct Memory {
    string data;             // CSV: "action@timestamp,action@timestamp"
    uint256 lastUpdated;
}
```

---

## 💰 Economics

### Pricing

| Action | Cost | Revenue Split |
|--------|------|---------------|
| Create Template | $0.005 | 100% Platform |
| Create Avatar | $0.01 | 70% Creator / 30% Platform |
| Update Avatar | $0.001 | 70% Creator / 30% Platform |

### Payout System

- **Threshold:** 0.1 USDC
- **Frequency:** Every 5 minutes (automated)
- **Currency:** USDC
- **Gas:** Paid by platform

---

## 🧪 Testing

```bash
# Run contract tests
forge test
```

### Test Coverage

- ✅ Template creation and validation
- ✅ Avatar initialization with user-scoped IDs
- ✅ Avatar updates with memory accumulation
- ✅ Multi-user isolation (same local IDs, different data)
- ✅ Access control (only creator can update)
- ✅ View function accuracy
- ✅ Revenue tracking and payouts

---

## 🚢 Deployment

```bash
$ forge script script/Aura.s.sol:AuraScript --rpc-url RPC_URL --private-key PRIVATE_KEY
```

**Deployed Contracts:**
- Fuji: `0x...` (testnet)

---

## 🎮 Integration Example

```typescript
import axios from 'axios';

const API_URL = 'https://api.aura-ai.io';

// Create avatar
const response = await fetchWithPay(
  `${url}`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      templateId,
      userAddress: address,
    }),
  },
);

// Interact
const response = await fetchWithPay(
  `${url}`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      avatarId,
      action,
      userAddress: address,
    }),
  },
);

console.log(response.dialogue);
// "True courage is not the absence of fear..."
```

---

## 🔧 Development

### Project Structure

```
aura/
├── contracts/
│   ├──  Aura.sol              # Main smart contract
│   ├── test/
│   │   └── Aura.test.ts       # Comprehensive tests
│   └── scripts/
│       └── deploy.ts          # Deployment script
├── api/
│     ├── server.ts               
│     └── package.json
└── ui/
    ├── ...                   
    └── package.json
```

### Tech Stack

- **Blockchain:** Solidity 0.8.13, Foundry, ethers.js
- **Backend:** Node.js, Express, TypeScript, ThirdWeb
- **AI:** OpenAI GPT-4
- **Payments:** x402 protocol
- **Network:** Avalanche C-Chain Fuji

---

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🏆 Acknowledgments

Built for **Avalanche Hackathon 2024**

**Stack:**
- [Avalanche](https://avax.network) - Ultra-fast blockchain
- [x402](https://x402.io) - Micropayment infrastructure
- [OpenAI](https://openai.com) - AI language models
- [Foundry](https://Foundry.org) - Smart contract development

---

## 🔗 Links

- **Website:** [aura-ai.io](https://github.com/cenwadike/Aura)
- **Docs:** [readme.aura-ai.io](https://github.com/cenwadike/Aura/blob/main/README.md)

---

## 📞 Support

- **Email:** cenwadike@gmail.com
- **GitHub Issues:** [Report bugs](https://github.com/cenwadike/aura/issues)

---

*Empowering the next generation of AI-driven Web3 experiences* 🚀
