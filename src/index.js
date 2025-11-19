import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import usersRoutes from "./routes/users.js";
import coursesRoutes from "./routes/courses.js";
import categoriesRoutes from "./routes/categories.js";
import lessonsRoutes from "./routes/lessons.js";
import proofsRoutes from "./routes/proofs.js";
import proofCoursesRoutes from "./routes/proofCourses.js";
import quizResultsRoutes from "./routes/quizResults.js";
import paymentsRoutes from "./routes/payments.js";
import aiChatRoutes from "./routes/aiChat.js";
import mongoose from "mongoose";

// Lấy đường dẫn thư mục hiện tại
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env từ thư mục root của project
dotenv.config({ path: join(__dirname, "..", ".env") });

// Debug: Kiểm tra biến môi trường
console.log(
  "🔍 MONGO_URI:",
  process.env.MONGO_URI ? "✅ Đã load" : "❌ Chưa load"
);
console.log(
  "🔍 GEMINI_API_KEY:",
  process.env.GEMINI_API_KEY ? "✅ Đã load" : "❌ Chưa load"
);

const app = express();
app.use(express.json());

// Lấy MONGO_URI từ biến môi trường
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error(
    "❌ MONGO_URI không được cấu hình trong file .env hoặc Environment Variables"
  );
  console.error(
    "💡 Vui lòng tạo file .env và thêm: MONGO_URI=mongodb+srv://..."
  );
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Error:", err);
    process.exit(1);
  });

// CORS - Cho phép webhook từ PayOS (server-to-server không có origin)
app.use(
  cors({
    origin: (origin, callback) => {
      // QUAN TRỌNG: Webhook từ PayOS gửi từ server, không có origin header
      // Phải cho phép requests không có origin
      if (!origin) {
        return callback(null, true);
      }

      // Cho phép tất cả origin khi bật CORS_ALLOW_ALL
      if (String(process.env.CORS_ALLOW_ALL || "").toLowerCase() === "true") {
        return callback(null, true);
      }

      const defaultOrigins = [
        "http://localhost:8081",
        "http://localhost:19006",
        "http://localhost:8083",
        "http://127.0.0.1:8083",
        "http://127.0.0.1:8081",
      ];
      const envOrigins = (process.env.ALLOWED_ORIGINS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const allowlist = new Set([...defaultOrigins, ...envOrigins]);

      // Hỗ trợ mạng nội bộ: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
      const lanRegex =
        /^(http|https):\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)[0-9\.]+/;

      if (allowlist.has(origin) || lanRegex.test(origin)) {
        console.log(`✅ CORS: Cho phép origin: ${origin}`);
        return callback(null, true);
      }

      console.warn(`⚠️ CORS: Từ chối origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Type"],
    credentials: false,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

app.use("/users", usersRoutes);
app.use("/courses", coursesRoutes);
app.use("/categories", categoriesRoutes);
app.use("/lessons", lessonsRoutes);
app.use("/proofs", proofsRoutes);
app.use("/proof-courses", proofCoursesRoutes);
app.use("/quiz-results", quizResultsRoutes);
app.use("/payments", paymentsRoutes);
app.use("/ai-chat", aiChatRoutes);

// Health & root endpoints để kiểm tra nhanh từ thiết bị
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", time: new Date().toISOString() });
});
app.get("/", (req, res) => {
  res.status(200).send("36Learning Backend is running");
});

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "0.0.0.0"; // bind tất cả interfaces để thiết bị cùng mạng truy cập
app.listen(PORT, HOST, () =>
  console.log(`Server running on http://${HOST}:${PORT}`)
);
