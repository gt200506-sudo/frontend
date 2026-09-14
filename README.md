# ContentGuard AI & Web3 Platform

ContentGuard is an AI-powered content protection and ownership platform designed to help creators and rights holders register, monitor, and protect their digital content.

The platform combines AI-based content detection with Web3-based ownership verification to help identify unauthorized use and track the propagation of registered content across the web.

---

## 🚀 Key Features

- **Content Registration**
  - Register digital content such as images, documents, PDFs, slides, and text files.
  - Create a verifiable record of content ownership.

- **AI-Powered Content Detection**
  - Analyze content for potential unauthorized usage.
  - Detect matching or similar content across online sources.

- **Web Monitoring**
  - Scan web sources for potential copies or unauthorized distribution.
  - Identify where registered content appears online.

- **Ownership Verification**
  - Use content hashes and Web3 technologies to establish ownership records.
  - Maintain verifiable information associated with registered assets.

- **Content Library**
  - Manage and explore registered content.
  - View content details, registration information, and detection results.

- **Analytics & Monitoring**
  - Track content propagation and detection activity.
  - Visualize relevant content and monitoring information.

- **Alerts**
  - Notify users about potential unauthorized usage and important detection events.

- **Secure Authentication**
  - User authentication and account management.
  - Role-based access to platform functionality.

---

## 🔄 How ContentGuard Works

ContentGuard follows a simple three-step workflow:

### 1. Upload Content

Upload your digital content to ContentGuard.

Supported content can include:

- Images
- PDFs
- Slides
- Documents
- Text files

The uploaded content can then be registered and associated with ownership information.

### 2. AI Scans the Web

ContentGuard analyzes registered content and searches for potential matches or unauthorized usage across online sources.

The detection system can use techniques such as:

- Perceptual hashing
- OCR
- Text similarity
- Content matching
- AI-based analysis

### 3. Detect & Protect

Potential matches are presented to the user with relevant detection information.

Users can review detected content, monitor propagation, and take appropriate action to protect their intellectual property.

---

## 🛠️ Tech Stack

### Frontend

- **React 19**
- **Vite**
- **Tailwind CSS 4**
- **Radix UI**
- **TanStack Query v5**
- **Framer Motion**
- **Wouter**
- **Lucide React**

### Backend

- **Node.js**
- **Express 5**
- **Drizzle ORM**
- **Zod**
- **Pino**

### Web3 / Content Protection

- Content hashing
- Perceptual hashing
- IPFS-based content storage
- Blockchain-based ownership verification

### AI / Detection

- OCR
- Image similarity
- Text similarity
- AI-assisted content analysis
- Web monitoring

---

## 📂 Project Structure

The project is organized as an npm-workspaces monorepo.

```text
frontend/
│
├── frontend-main/
│   │
│   ├── artifacts/
│   │   ├── api-server/
│   │   │   └── Express backend API
│   │   │
│   │   ├── contentguard/
│   │   │   └── Main React frontend application
│   │   │
│   │   └── mockup-sandbox/
│   │       └── UI/UX testing environment
│   │
│   ├── lib/
│   │   ├── api-client-react/
│   │   │   └── Shared React API hooks
│   │   │
│   │   ├── api-spec/
│   │   │   └── Shared API specifications
│   │   │
│   │   ├── api-zod/
│   │   │   └── Shared validation schemas
│   │   │
│   │   └── db/
│   │       └── Database schema and repository layer
│   │
│   └── scripts/
│       └── Utility scripts
│
└── README.md
```

---

## 🏁 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) — Latest LTS version recommended
- npm

You can verify your installations with:

```bash
node --version
npm --version
```

---

## 📥 Installation

Clone the repository:

```bash
git clone https://github.com/gt200506-sudo/frontend.git
```

Navigate into the project:

```bash
cd frontend
```

Then enter the main workspace:

```bash
cd frontend-main
```

Install all dependencies:

```bash
npm install
```

---

## ▶️ Running the Project

To start the API server and ContentGuard frontend together:

```bash
npm run dev
```

### Run the individual workspaces

Start the backend API:

```bash
npm run dev -w @workspace/api-server
```

Start the ContentGuard frontend:

```bash
npm run dev -w @workspace/contentguard
```

Start the mockup sandbox:

```bash
npm run dev -w @workspace/mockup-sandbox
```

---

## 🏗️ Build for Production

To build all workspaces:

```bash
npm run build
```

---

## 🔐 Environment Variables

Create the required environment configuration files according to the services enabled in your local setup.

Typical integrations may require credentials for:

- Database
- Authentication
- AI services
- Web search
- IPFS / Pinata
- Web3 services

> Never commit API keys, private keys, passwords, or other secrets to GitHub.

---

## 🧩 Core Platform Flow

```text
                    ┌──────────────────┐
                    │   Upload Content │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Register Content │
                    │  + Generate Hash │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   AI Scans Web  │
                    │  for Potential  │
                    │     Matches     │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Detect & Analyze │
                    │ Unauthorized Use │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Monitor / Alert │
                    │   / Protect     │
                    └──────────────────┘
```

---

## 🎯 Project Goals

ContentGuard aims to provide creators and rights holders with a unified platform to:

1. Register and establish ownership of digital content.
2. Monitor where their content appears online.
3. Detect potentially unauthorized usage.
4. Analyze detected content using AI-based techniques.
5. Maintain verifiable ownership information.
6. Provide actionable monitoring and alerting.

---

## 🔮 Future Enhancements

Potential future improvements include:

- More advanced image and video similarity detection
- Improved OCR-based matching
- Automated copyright infringement reporting
- Browser and social-media monitoring
- Blockchain-based ownership certificates
- Improved AI-powered detection
- Real-time monitoring
- Advanced analytics dashboards
- Automated takedown workflows
- Creator and rights-holder collaboration tools

---

## 🔗 Repository

GitHub:

https://github.com/gt200506-sudo/frontend
