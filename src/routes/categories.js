import express from "express";
import { createCategory, getCategories } from "../controllers/categoriesController.js";

const router = express.Router();

router.post("/", createCategory);
router.get("/", getCategories);

export default router;
