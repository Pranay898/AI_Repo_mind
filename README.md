# RepoMind AI — Visual Repository Understanding & Onboarding Platform

> **Understand any unfamiliar GitHub repository visually. Onboard faster with automated architecture topologies, AST symbol extraction, and contextual AI codebase chat.**

---

## 📌 Overview

**RepoMind AI** is an open-source visual codebase intelligence platform built to help software engineers and new joiners understand complex, unfamiliar codebases without needing to schedule hours of senior developer walkthroughs.

By simply providing a public GitHub repository URL, RepoMind clones the tree, performs static AST and manifest code analysis across multiple programming languages, synthesizes interactive **GitDiagram-style visual system topologies**, maps data models, and provides a contextual **ChatGPT-style codebase assistant** backed by Google Gemini.

---

## ✨ Key Capabilities

1. **GitDiagram-Style Interactive Visual Architecture**:
   - Automatically clusters discovered components into functional tiers: *Entry & Routing*, *Views & UI*, *Core Services & Logic*, and *Data Access & Persistence*.
   - Renders live interactive SVG topologies via Mermaid with zoom, pan, reset, and raw source export.
   - Connects components using real static import relationships (`import`, `from X import Y`).

2. **Deep Polyglot Code Intelligence**:
   - **Java & Spring Boot**: Detects `@RestController`, `@Service`, `@Repository`, `@Entity`, and mapped HTTP routes.
   - **Python**: Detects Streamlit views, FastAPI/Flask route handlers, function definitions (`def ...`), and Firestore/SQL queries.
   - **TypeScript & React / Next.js**: Maps page routes, UI components, custom hooks, and state context providers.
   - **Go, Rust, C#, PHP**: Extracts primary modules and ecosystem packages.

3. **Codebase Q&A Assistant (ChatGPT-Style)**:
   - Ask natural language questions about any file, workflow, authentication mechanism, or database query.
   - Integrates Google Gemini LLMs with automatic multi-model fallback (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash-latest`).
   - Includes a **Local Codebase Reasoning Agent** that operates without an external API key by scoring in-memory source files and citing exact code excerpts.

4. **Interactive File & Module Explorer**:
   - Interactive folder and file tree with automatic role summaries explaining what each file and directory is responsible for.

5. **Execution Workflows & Sequence Traces**:
   - Generates end-to-end sequence diagrams tracing how requests move from entry points into business services and data storage.

6. **5-Day Developer Onboarding Roadmap**:
   - Generates an actionable, day-by-day learning plan customized specifically to the analyzed repository's architecture and entry files.

7. **Zero-Database Lightweight Deployment**:
   - Runs in-memory with zero external database dependencies (PostgreSQL/Redis are not required).

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    Client["Browser / Developer Workbench\n(React 18 + Vite + Tailwind CSS)"]

    subgraph Backend ["RepoMind Backend Core (Spring Boot 3.3.x / Java 17/21)"]
        Controller["RepositoryController\n(/api/v1/repositories)"]
        
        subgraph Engine ["Understanding & Analysis Engine"]
            GitService["GitHubRepositoryService\n(Shallow Git Clone)"]
            Understanding["RepositoryUnderstandingService\n(AST & Manifest Parser)"]
            TopologyBuilder["GitDiagram Topology Generator\n(Mermaid Synthesizer)"]
            RAGEngine["Codebase Reasoning & Context Indexer"]
        end

        subgraph AIService ["AI Integration Layer"]
            GeminiClient["GeminiAIService\n(Google Generative AI Client)"]
        end

        subgraph InMemStore ["In-Memory Store"]
            AnalysisCache["ConcurrentHashMap Analysis Store"]
            FileCache["Source File Memory Cache"]
        end
    end

    Client -->|HTTP / REST| Controller
    Controller --> Understanding
    Understanding --> GitService
    Understanding --> TopologyBuilder
    Understanding --> RAGEngine
    RAGEngine --> GeminiClient
    Understanding --> InMemStore
    GitService -->|Local Clone| TempFS[("Local Temp Directory")]
```

---

## 🚀 Quickstart Guide

### Prerequisites
- **Java 17** or **Java 21**
- **Apache Maven 3.8+**
- **Node.js 18+** and **npm**
- **Git** installed and available in your `PATH`
- *(Optional)* Free Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

---

### Option 1: Run Locally (2 Terminals)

#### 1. Start the Spring Boot Backend
```bash
cd backend

# Optional: Set your Gemini API key (or set it directly in the web UI)
export GEMINI_API_KEY="your_api_key_here"      # Linux / macOS
$env:GEMINI_API_KEY="your_api_key_here"         # Windows PowerShell

mvn spring-boot:run
```
* Backend runs at: `http://localhost:8080`
* Swagger UI Docs: `http://localhost:8080/swagger-ui.html`

#### 2. Start the React Frontend
```bash
cd frontend
npm install
npm run dev
```
* Open `http://localhost:3000` in your browser.

---

### Option 2: Run with Docker Compose

```bash
cd docker
docker compose up --build
```
Both backend (`:8080`) and frontend (`:3000`) will build and run in coordinated containers.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/repositories/health` | Health status and Gemini AI configuration check |
| `POST` | `/api/v1/repositories/config/api-key` | Set/update Gemini API key dynamically at runtime |
| `POST` | `/api/v1/repositories/analyze` | Clone and analyze a GitHub repository |
| `GET` | `/api/v1/repositories` | List all analyzed repositories in session |
| `GET` | `/api/v1/repositories/{id}` | Get full repository analysis payload |
| `GET` | `/api/v1/repositories/{id}/architecture` | Get visual architecture Mermaid diagram & layers |
| `GET` | `/api/v1/repositories/{id}/structure` | Get interactive folder & file tree |
| `GET` | `/api/v1/repositories/{id}/workflows` | Get execution sequence diagrams |
| `GET` | `/api/v1/repositories/{id}/components` | Get discovered classes, hooks, and modules |
| `GET` | `/api/v1/repositories/{id}/apis` | Get discovered HTTP endpoints and route handlers |
| `GET` | `/api/v1/repositories/{id}/database` | Get detected database technologies & models |
| `GET` | `/api/v1/repositories/{id}/onboarding-guide` | Get customized 5-day developer onboarding plan |
| `POST` | `/api/v1/repositories/{id}/chat` | Ask questions about the codebase |

---

## 📁 Repository Structure

```text
codeintel-ai/
├── backend/
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/
│       ├── main/
│       │   ├── java/com/repomind/
│       │   │   ├── RepoMindApplication.java
│       │   │   ├── config/          # CORS & environment configuration
│       │   │   ├── controller/      # REST API endpoints
│       │   │   ├── dto/             # Analysis result & request models
│       │   │   ├── exception/       # Global exception handlers
│       │   │   └── service/         # AST scanner, Git engine, and Gemini AI client
│       │   └── resources/
│       │       └── application.yml
│       └── test/                    # Unit & integration test suites
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── Dockerfile
│   └── src/
│       ├── App.tsx                  # Developer workbench & GitDiagram canvas
│       ├── main.tsx
│       └── index.css                # Clean, anti-slop developer typography
├── docker/
│   └── docker-compose.yml           # Full-stack container orchestration
├── docs/
│   ├── ARCHITECTURE.md              # Deep architectural specification
│   └── SETUP_GUIDE.md               # Step-by-step developer setup
└── LICENSE                          # MIT License
```

---

## 🛡️ License

This project is licensed under the [MIT License](LICENSE).
