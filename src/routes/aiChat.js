import express from "express";
import { chatWithAI } from "../controllers/aiChatController.js";

const router = express.Router();

// GET /ai-chat - Health check endpoint
router.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "AI Chat endpoint is ready. Use POST method to chat with AI.",
    endpoint: "POST /ai-chat",
  });
});

// POST /ai-chat - Chat với AI
router.post("/", chatWithAI);

export default router;

