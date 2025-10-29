import express from "express";
import { createUser, getUsers } from "../controllers/usersController.js";

const router = express.Router();

// POST /users -> tạo user
router.post("/", createUser);

// GET /users -> lấy danh sách users
router.get("/", getUsers);

export default router;
