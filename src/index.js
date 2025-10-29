import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import usersRoutes from "./routes/users.js";
import coursesRoutes from "./routes/courses.js";

dotenv.config();
const app = express();
app.use(express.json());

// CORS
app.use(
  cors({
    origin: ["http://localhost:8081", "http://localhost:19006", /http:\/\/192\.168\.[0-9\.]+/],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);

// Preflight: cors middleware already handles OPTIONS automatically in Express 5

// routes
app.use("/users", usersRoutes);
app.use("/courses", coursesRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
