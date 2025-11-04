import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import usersRoutes from "./routes/users.js";
import coursesRoutes from "./routes/courses.js";
import categoriesRoutes from "./routes/categories.js";
import lessonsRoutes from "./routes/lessons.js";
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

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép tất cả origin khi bật CORS_ALLOW_ALL để debug trên thiết bị thật
      if (String(process.env.CORS_ALLOW_ALL || "").toLowerCase() === "true") {
        return callback(null, true);
      }

      const defaultOrigins = [
        "http://localhost:8081",
        "http://localhost:19006",
        "http://localhost:8083",
        "http://127.0.0.1:8083",
      ];
      const envOrigins = (process.env.ALLOWED_ORIGINS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const allowlist = new Set([...defaultOrigins, ...envOrigins]);
      // Hỗ trợ mạng nội bộ: 192.168.x.x, 10.x.x.x, 172.16-31.x.x và http/https
      const lanRegex =
        /^(http|https):\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)[0-9\.]+/;
      if (!origin) return callback(null, true);
      if (allowlist.has(origin) || lanRegex.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);

app.use("/users", usersRoutes);
app.use("/courses", coursesRoutes);
app.use("/categories", categoriesRoutes);
app.use("/lessons", lessonsRoutes);

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
