import express from "express";
import { createUser, getUsers, getUserCourses } from "../controllers/usersController.js";

const router = express.Router();

// POST /users -> tạo user
router.post("/", createUser);

// GET /users -> lấy danh sách users
router.get("/", getUsers);

// GET /users/:uid/courses -> lấy danh sách khóa học của user
router.get("/:uid/courses", getUserCourses);

export default router;
