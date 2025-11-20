import express from "express";
import multer from "multer";
import { summarizeVideo, summarizeVideoFromUrl } from "../controllers/videoSummaryController.js";

const router = express.Router();

// Cấu hình multer để nhận file video
// Giới hạn 10MB để đảm bảo upload thành công
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
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

// POST /video-summary - Tóm tắt video (upload file)
router.post("/", upload.single("video"), summarizeVideo);

// POST /video-summary/url - Tóm tắt video từ URL
router.post("/url", express.json(), summarizeVideoFromUrl);

// GET /video-summary - Health check
router.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Video Summary endpoint is ready. Use POST method to upload video.",
    endpoint: "POST /video-summary",
    maxFileSize: "10MB",
    supportedFormats: ["MP4", "MOV", "AVI", "WebM"],
  });
});

export default router;

