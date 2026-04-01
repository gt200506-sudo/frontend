# ContentGuard AI & Web3 Sports Media Platform

A modern, responsive platform for AI-powered sports media monitoring, registration, and ownership verification. This project leverages Web3 technologies and AI analysis to track media propagation, manage assets, and provide detailed analytics for content creators and rightsholders.

## 🚀 Key Features

- **Multi-tenant Dashboard**: Comprehensive overview of media performance, detections, and alerts.
- **AI Media Detections**: Automated monitoring and analysis of media assets across platforms.
- **Web3 Media Registration**: Secure registration of content ownership using blockchain technology.
- **Content Library**: Sophisticated asset explorer for managing registered media.
- **Advanced Analytics**: Detailed data visualization for media propagation and engagement.
- **Automated Alerts**: Custom notification system for unauthorized usage or significant propagation events.
- **Secure Authentication**: Integrated sign-in and user management.

## 🛠️ Tech Stack

### Frontend (@workspace/contentguard)
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
- **State Management**: [TanStack Query v5](https://tanstack.com/query)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Routing**: [Wouter](https://github.com/molecula/wouter)
- **Icons**: [Lucide React](https://lucide.dev/)

### Backend (@workspace/api-server)
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express 5](https://expressjs.com/)
- **Database ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Validation**: [Zod](https://zod.dev/)
- **Logging**: [Pino](https://github.com/pinojs/pino)

## 📂 Project Structure

This project is organized as a monorepo using npm workspaces:

```text
├── frontend-main/
│   ├── artifacts/
│   │   ├── api-server/         # Express backend API
│   │   ├── contentguard/       # Main React frontend application
│   │   └── mockup-sandbox/     # Mockup/Sandbox environment for UI/UX testing
│   ├── lib/
│   │   ├── api-client-react/   # Shared React hooks for API interaction
│   │   ├── api-spec/           # Shared API specifications
│   │   ├── api-zod/            # Shared Zod schemas for validation
│   │   └── db/                 # Database schema and repository layer
│   └── scripts/                # Utility scripts for project maintenance
└── README.md                   # Project documentation
```

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Latest LTS version recommended)
- [npm](https://www.npmjs.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd demo
   ```

2. Install dependencies for all workspaces:
   ```bash
   cd frontend-main
   npm install
   ```

### Development

To start both the API server and the ContentGuard frontend concurrently:

```bash
npm run dev
```

Alternatively, you can run individual workspaces:

```bash
# Start API Server
npm run dev -w @workspace/api-server

# Start ContentGuard Frontend
npm run dev -w @workspace/contentguard

# Start Mockup Sandbox
npm run dev -w @workspace/mockup-sandbox
```

### Building for Production

To build all workspaces:

```bash
npm run build
```
