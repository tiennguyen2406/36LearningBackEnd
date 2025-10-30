import express from "express";
import { createCategory, getCategories, updateAllCategoryCounts, getCategoryById } from "../controllers/categoriesController.js";

const router = express.Router();

router.post("/", createCategory);
router.get("/", getCategories);
router.get("/:id", getCategoryById);
router.post("/update-counts", updateAllCategoryCounts);

export default router;
