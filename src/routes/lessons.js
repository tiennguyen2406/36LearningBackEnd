import express from "express";
import { createLesson, getLessons, getLessonCountByCourse, getLessonsByCourse } from "../controllers/lessonsController.js";

const router = express.Router();

router.post("/", createLesson);
router.get("/", getLessons);
router.get("/count/:courseId", getLessonCountByCourse);
router.get("/by-course/:courseId", getLessonsByCourse);

export default router;
