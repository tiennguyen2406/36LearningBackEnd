import express from "express";
import multer from "multer";
import { createProof, getProofsByUser, uploadProof } from "../controllers/proofsController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /proofs -> tạo bản ghi minh chứng (client đã upload lên Cloudinary và gửi url)
router.post("/", createProof);

// GET /proofs/:userId -> danh sách minh chứng theo user
router.get("/:userId", getProofsByUser);

// POST /proofs/upload -> upload file (multipart/form-data) { file }
router.post("/upload", upload.single("file"), uploadProof);

export default router;


