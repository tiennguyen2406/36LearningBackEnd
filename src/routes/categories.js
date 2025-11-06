import express from "express";
import { 
  createCategory, 
  getCategories, 
  getCategoryById,
  updateCategory,
  deleteCategory,
  updateAllCategoryCounts 
} from "../controllers/categoriesController.js";

const router = express.Router();

router.post("/", createCategory);
router.get("/", getCategories);
router.get("/:id", getCategoryById);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);
router.post("/update-counts", updateAllCategoryCounts);

export default router;
