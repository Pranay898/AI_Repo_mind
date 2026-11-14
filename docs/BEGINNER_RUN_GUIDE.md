# RepoMind AI — Beginner Run Guide

Welcome to **RepoMind AI**! This guide is written for complete beginners who want to run the project locally on their machine.

---

## ⚡ The Quickest Way to Run (No Docker Needed)

You only need **2 terminal windows**: one for the backend and one for the frontend.

### Terminal 1: Backend (Spring Boot)

1. Open a terminal and navigate to the `backend/` folder:
   ```bash
   cd backend
   ```

2. *(Optional)* If you have a free Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/), you can set it:
   ```bash
   # Windows PowerShell:
   $env:GEMINI_API_KEY="your_api_key_here"

   # macOS / Linux:
   export GEMINI_API_KEY="your_api_key_here"
   ```
   *(Note: You can also just paste your key in the web app UI later!)*

3. Start the backend:
   ```bash
   mvn spring-boot:run
   ```
   Wait until you see: `Started RepoMindApplication in ... seconds`.
   - Your backend is now running at `http://localhost:8080`!

---

### Terminal 2: Frontend (React + Vite)

1. Open a second terminal window and navigate to the `frontend/` folder:
   ```bash
   cd frontend
   ```

2. Install dependencies (only required the first time):
   ```bash
   npm install
   ```

3. Start the frontend:
   ```bash
   npm run dev
   ```

4. Open your browser and go to:
   ```
   http://localhost:3000
   ```

---

## 🔍 Testing Your First Repository

1. On the web page, paste a GitHub URL in the search box, for example:
   ```
   https://github.com/pranay898/ai_automated_question_bulider-
   ```
2. Click **Analyze**.
3. Within a few seconds, you'll see:
   - **Architecture**: A live visual system diagram.
   - **Codebase Chat**: An AI chat box ready to explain any part of the project.
   - **Files & Components**: The full structure, functions, and data models.
