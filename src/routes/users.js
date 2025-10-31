import express from "express";
import { createUser, getUsers, getUserById, updateUser } from "../controllers/usersController.js";

const router = express.Router();

// POST /users -> tạo user
router.post("/", createUser);

// GET /users -> lấy danh sách users
router.get("/", getUsers);

// GET /users/:id -> lấy user theo ID
router.get("/:id", getUserById);

// PUT /users/:id -> cập nhật thông tin user
router.put("/:id", updateUser);

export default router;
