## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the project root and set:
   - `GEMINI_API_KEY` — a single Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey), or
   - `GEMINI_API_KEYS` — a comma-separated pool of keys to rotate across for higher throughput
   - `GROQ_API_KEY` / `GROQ_API_KEYS` (optional) — used as an automatic fallback provider if every Gemini key/model is exhausted
3. Run the app:
   ```bash
   npm run dev
   ```
   The app will be at `http://localhost:3000`
