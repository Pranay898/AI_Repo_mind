# RepoMind AI — Setup & Run Guide

**RepoMind AI** is a lightweight, multi-language visual repository understanding platform. It requires zero external databases (PostgreSQL, MySQL, or Redis are not required).

---

## ⚡ Option 1: Run Directly on Your Machine

### Step 1: Start the Spring Boot Backend
Open a terminal in the `backend/` directory:

```bash
cd backend

# Optional: Set your Gemini API key (or set it directly in the web UI at any time)
export GEMINI_API_KEY="your_api_key_here"      # Linux / macOS
$env:GEMINI_API_KEY="your_api_key_here"         # Windows PowerShell

# Run with Maven:
mvn spring-boot:run
```
* **Backend Port:** `http://localhost:8080`
* **Swagger UI API Explorer:** `http://localhost:8080/swagger-ui.html`
* **Health Check:** `http://localhost:8080/api/v1/repositories/health`

### Step 2: Start the React Frontend
Open a second terminal in the `frontend/` directory:

```bash
cd frontend

# Install dependencies (first time only):
npm install

# Start Vite development server:
npm run dev
```
* **Frontend Application:** Open **`http://localhost:3000`** in your browser.

---

## 🐳 Option 2: Run with Docker Compose

If you prefer running everything in containers without configuring Java or Node locally:

```bash
cd docker

# Optional: export your Gemini key
export GEMINI_API_KEY="your_api_key_here"

# Build and start services:
docker compose up --build
```
* **Frontend:** `http://localhost:3000`
* **Backend:** `http://localhost:8080`

---

## 🎯 How to Use RepoMind AI

1. Open **`http://localhost:3000`** in your browser.
2. In the top bar, paste **any public GitHub repository URL** (e.g. `https://github.com/pranay898/ai_automated_question_bulider-` or `https://github.com/ayushiee/nextflix`).
3. Click **"Analyze"**.
4. Explore the repository using the top tab bar:
   - **Architecture**: GitDiagram-style interactive visual topology with zoom and reset controls.
   - **Codebase Chat**: Ask natural language questions about files, functions, workflows, or setup.
   - **Overview**: High-level purpose, language distribution, and detected frameworks.
   - **Files**: Clickable directory tree with role explanations.
   - **Workflows**: Step-by-step sequence diagrams and component execution flows.
   - **Components**: Extracted classes, functions, controllers, and services.
   - **APIs & Routes**: Discovered HTTP endpoints and route handlers.
   - **Data Models**: Discovered database technologies (Firestore, JPA, SQL, etc.) and schema models.
   - **Dependencies**: Detected package manifests (Maven, NPM, PyPI).
   - **Onboarding Guide**: 5-day developer onboarding sequence.
