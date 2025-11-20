import express from "express";
import multer from "multer";
import { summarizeVideo } from "../controllers/videoSummaryController.js";

const router = express.Router();

// Cấu hình multer để nhận file video
// Tăng giới hạn kích thước lên 20MB (Gemini 1.5 Flash hỗ trợ tối đa 20MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
  fileFilter: (req, file, cb) => {
    // Chỉ chấp nhận file video
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file video"), false);
    }
  },
});

// POST /video-summary - Tóm tắt video
router.post("/", upload.single("video"), summarizeVideo);

// GET /video-summary - Health check
router.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Video Summary endpoint is ready. Use POST method to upload video.",
    endpoint: "POST /video-summary",
    maxFileSize: "20MB",
    supportedFormats: ["MP4", "MOV", "AVI", "WebM"],
  });
});

export default router;

