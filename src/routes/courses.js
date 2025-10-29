import express from "express";
import { createCourse, getCourses } from "../controllers/coursesController.js";

const router = express.Router();

// POST /courses -> tạo course
router.post("/", createCourse);

// GET /courses -> lấy danh sách course
router.get("/", getCourses);

export default router;
