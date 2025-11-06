import express from "express";
import { 
  createLesson, 
  getLessons, 
  getLessonCountByCourse, 
  getLessonsByCourse,
  updateLesson,
  deleteLesson
} from "../controllers/lessonsController.js";

const router = express.Router();

router.post("/", createLesson);
router.get("/", getLessons);
router.get("/count/:courseId", getLessonCountByCourse);
router.get("/by-course/:courseId", getLessonsByCourse);
router.put("/:id", updateLesson);
router.delete("/:id", deleteLesson);

export default router;
