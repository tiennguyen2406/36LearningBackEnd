import express from "express";
import multer from "multer";
import {
  createProof,
  getProofsByUser,
  uploadProof,
  getAllProofs,
  updateProofStatus,
} from "../controllers/proofsController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /proofs/upload -> upload file (multipart/form-data) { file }
router.post("/upload", upload.single("file"), uploadProof);

// GET /proofs -> danh sách tất cả minh chứng (admin)
router.get("/", getAllProofs);

// POST /proofs -> tạo bản ghi minh chứng (client đã upload lên Cloudinary và gửi url)
router.post("/", createProof);

// PATCH /proofs/:id -> cập nhật trạng thái duyệt
router.patch("/:id", updateProofStatus);

// GET /proofs/user/:userId -> danh sách minh chứng theo user
router.get("/user/:userId", getProofsByUser);

export default router;


