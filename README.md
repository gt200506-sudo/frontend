# 🛡️ EduGuard
### AI + Web3 Powered Piracy Detection for Educational Content

> Protect. Detect. Prove Ownership.

---

## 🚀 Problem

The rise of Telegram channels, piracy websites, and unauthorized reselling has made it **extremely easy to leak and distribute paid educational content**.

Educators and ed-tech companies:
- ❌ Lose revenue
- ❌ Lose control over their content
- ❌ Have no reliable way to prove ownership or track misuse

---

## 💡 Solution

**EduGuard** is a full-stack AI-powered platform that:

1. 📤 Lets creators upload their original content  
2. 🧠 Generates intelligent fingerprints (images + text)  
3. 🌐 Scans the internet & Telegram for piracy  
4. 🔍 Detects similarity using AI models  
5. ⚖️ Provides **blockchain-backed proof of ownership**  

---

## 🔥 Key Features

### 🧠 AI Detection Engine
- Image similarity using perceptual hashing (pHash)
- OCR-based text extraction (Tesseract)
- Semantic similarity (embeddings + cosine similarity)

---

### 🌐 Piracy Tracking
- Web scraping + Telegram channel monitoring
- Detects unauthorized content distribution
- Assigns similarity score (% match)

---

### 🔔 Smart Alerts
- Instant detection notifications
- Source links + timestamps
- Risk scoring system

---

### ⚖️ Evidence Viewer
- Side-by-side comparison:
  - Original vs Pirated content
- Highlight matching regions

---

### ⛓️ Web3 Ownership Proof
- Immutable content registration on blockchain
- Timestamped ownership record
- IPFS-backed metadata storage

---

### 📄 Legal-Ready Reports
- Downloadable PDF reports
- Includes:
  - Source URL
  - Screenshots
  - Similarity score
  - Blockchain transaction proof

---

## 🧱 Tech Stack

### 🎨 Frontend
- Next.js (React)
- Tailwind CSS
- Framer Motion

### ⚙️ Backend
- Node.js (Express) / Serverless APIs

### ☁️ Backend-as-a-Service
- Supabase (Auth + PostgreSQL + Storage)

### 🧠 AI/ML
- OpenCV (Image similarity)
- Tesseract OCR
- Sentence Transformers / OpenAI embeddings

### ⛓️ Web3
- Polygon Blockchain
- Solidity Smart Contracts
- IPFS (decentralized storage)
- Ethers.js / Viem

### 🚀 Deployment
- Vercel

---

## 🧩 Architecture Overview
User Upload → Fingerprinting → Supabase Storage
→ IPFS Metadata → Blockchain Registration
→ Scraping Engine → AI Comparison
→ Detection → Alerts + Dashboard


---

## 📸 Demo Preview

> Add screenshots / demo GIFs here

- Dashboard  
- Upload Page  
- Detection Results  
- Evidence Viewer  

---

## ⚙️ Getting Started

### 1. Clone Repository

git clone https://github.com/gt200506-sudo/frontend.git

cd frontend


### 2. Install Dependencies

npm install


### 3. Setup Environment Variables
Create `.env.local`:


NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

NEXT_PUBLIC_RPC_URL=your_rpc
NEXT_PUBLIC_CONTRACT_ADDRESS=your_contract


### 4. Run Locally

npm run dev


---

## ⛓️ Smart Contract

- Deploy on Polygon (Mumbai for testing)
- Register content hashes
- Verify ownership via contract

---

## 🌟 What Makes EduGuard Unique?

✅ Combines **AI + Web scraping + Web3**  
✅ Detects piracy across **Web**  
✅ Provides **tamper-proof ownership proof**  
✅ Generates **legal-ready evidence reports**  
✅ Built as a **scalable SaaS product**

---

## 🚧 Challenges We Solved

- Handling noisy OCR data from images
- Designing scalable similarity matching
- Integrating Web2 + Web3 seamlessly
- Avoiding scraping bans and rate limits

---

## 🔮 Future Scope

- 🔌 Chrome Extension for live detection
- 🤖 Automated daily scanning bots
- 🧬 AI watermarking for invisible protection
- ⚡ Real-time monitoring pipeline
- 🌍 Multi-platform piracy tracking
