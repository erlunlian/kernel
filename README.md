# Kernel

**Terminal-native personal automation system.**

Kernel is a powerful, agentic platform designed to bring "vibe coding" and autonomous execution to your local environment. It features a sleek, terminal-inspired web interface communicating with a robust Python backend to manage agents, secrets, and artifacts.

![Kernel Terminal UI](https://placehold.co/800x400?text=Kernel+UI+Screenshot)

## Features

- **🤖 Autonomous Agents**: Create and run AI agents that can execute code, interact with the system, and persist across sessions.
- **💻 E2B Integration**: Secure sandboxed execution environments for your agents.
- **🔐 Secrets Management**: Securely store and inject API keys and secrets into your agent environments to keep your credentials safe.
- **📜 Live Log Streaming**: Watch your agents think and act in real-time with continuous log streaming.
- **📦 Artifact Repository**: Browse and manage files created by your agents.
- **⌨️ Terminal-First UX**: A "True Terminal" experience in the browser with command history, keyboard shortcuts, and slash commands.

## Tech Stack

- **Backend**: Python 3.12+, FastAPI, SQLAlchemy (SQLite), OpenAI SDK
- **Frontend**: Next.js 14, React 19, TailwindCSS, TypeScript
- **Infrastructure**: E2B for sandboxed code execution

## Setup

### Prerequisites

- Python 3.12+
- Node.js 18+
- [E2B API Key](https://e2b.dev/)
- [OpenAI API Key](https://platform.openai.com/)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure Environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY and E2B_API_KEY
```

### 2. Frontend Setup

```bash
cd web

# Install dependencies
npm install
```

## Running the Application

1. **Start the Backend Server**:
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn app.main:app --reload --port 8000
   ```

2. **Start the Frontend Development Server**:
   ```bash
   cd web
   npm run dev
   ```

3. **Access the Terminal**:
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

To deploy this project, ensure you set the necessary environment variables in your deployment environment (e.g., Vercel, Railway, Docker).

---

_Built with ❤️ by [Your Name]_
