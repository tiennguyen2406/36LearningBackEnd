import express from "express";
import { chatWithAI } from "../controllers/aiChatController.js";

const router = express.Router();

// POST /ai-chat - Chat với AI
router.post("/", chatWithAI);

export default router;

