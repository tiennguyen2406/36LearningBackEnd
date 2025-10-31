import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import usersRoutes from "./routes/users.js";
import coursesRoutes from "./routes/courses.js";
import categoriesRoutes from "./routes/categories.js";
import lessonsRoutes from "./routes/lessons.js";

dotenv.config();
const app = express();
app.use(express.json());

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      const defaultOrigins = [
        "http://localhost:8081",
        "http://localhost:19006",
      ];
      const envOrigins = (process.env.ALLOWED_ORIGINS || "")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
      const allowlist = new Set([...defaultOrigins, ...envOrigins]);
      const localNetworkRegex = /http:\/\/192\.168\.[0-9\.]+/;
      if (!origin) return callback(null, true);
      if (allowlist.has(origin) || localNetworkRegex.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);

// Preflight: cors middleware already handles OPTIONS automatically in Express 5

// routes
app.use("/users", usersRoutes);
app.use("/courses", coursesRoutes);
app.use("/categories", categoriesRoutes);
app.use("/lessons", lessonsRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
