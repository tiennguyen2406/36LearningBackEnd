import express from "express";
import { createProof, getProofsByUser } from "../controllers/proofsController.js";

const router = express.Router();

// POST /proofs -> tạo bản ghi minh chứng (client đã upload lên Cloudinary và gửi url)
router.post("/", createProof);

// GET /proofs/:userId -> danh sách minh chứng theo user
router.get("/:userId", getProofsByUser);

export default router;


