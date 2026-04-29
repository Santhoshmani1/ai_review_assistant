# AI Study Assistant

A minimalistic, full-stack application that automatically transforms PDF documents into structured educational materials using parallel AI agents.

##  Features

- **PDF Processing**: Upload educational PDF documents for automated analysis.
- **Flashcards Generator**: Extracts atomic facts and creates punchy flashcards to aid recall.
- **Quiz Generation**: Creates multiple-choice quizzes (difficulty 1-5) based on Bloom's Taxonomy, complete with distractors and pedagogical explanations.
- **Revision Strategy**: Designs a structured, phase-based study plan prioritizing concepts based on Cognitive Load Theory.

##  Project Structure

- `/frontend`: React application (built with Vite) that provides the user interface for uploading files and displaying the generated materials.
- `/backend`: Contains the n8n automated workflow (`workflow.json`) and AI prompts powering the LangChain agents.

##  Getting Started

### Prerequisites
- Node.js
- n8n (for orchestrating the backend workflow)

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Backend Setup

1. Open your n8n instance.
2. Import the `backend/src/workflow.json` file.
3. Add your OpenAI API credentials in the n8n UI.
4. Activate the workflow so it can listen to `POST /react-app` webhook requests from the frontend.

## ⚙️ How It Works

1. The user uploads a PDF via the **React Frontend**.
2. The file is securely sent to the **n8n Webhook**.
3. The workflow extracts the text and processes it concurrently using three specialized LangChain agents (Quiz, Flashcards, Revision Plan).
4. The combined, strictly formatted JSON response is returned directly to the frontend for display.