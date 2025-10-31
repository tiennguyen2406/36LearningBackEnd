import express from "express";
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  getUserCourses,
  enrollCourse,
  unenrollCourse,
} from "../controllers/usersController.js";

const router = express.Router();

// POST /users -> tạo user
router.post("/", createUser);

// GET /users -> lấy danh sách users
router.get("/", getUsers);

// GET /users/:uid/courses -> lấy danh sách khóa học của user
router.get("/:uid/courses", getUserCourses);

// POST /users/:uid/enroll -> enroll user vào course
router.post("/:uid/enroll", enrollCourse);

// POST /users/:uid/unenroll -> hủy tham gia khóa học
router.post("/:uid/unenroll", unenrollCourse);

// GET /users/:id -> lấy user theo ID
router.get("/:id", getUserById);

// PUT /users/:id -> cập nhật thông tin user
router.put("/:id", updateUser);

export default router;
