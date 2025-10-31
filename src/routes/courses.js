import express from "express";
import { createCourse, getCourses, getCourseById, updateCourse, deleteCourse, getCoursesByCategory } from "../controllers/coursesController.js";

const router = express.Router();

// POST /courses -> tạo course
router.post("/", createCourse);
// GET /courses -> lấy danh sách course
router.get("/", getCourses);
// GET /courses/category/:categoryId -> lấy danh sách course theo category
router.get("/category/:categoryId", getCoursesByCategory);
// GET /courses/:id -> lấy chi tiết course
router.get("/:id", getCourseById);
// PUT /courses/:id -> cập nhật course
router.put("/:id", updateCourse);
// DELETE /courses/:id -> xóa course
router.delete("/:id", deleteCourse);

export default router;
