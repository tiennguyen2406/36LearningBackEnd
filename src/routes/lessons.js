import express from "express";
import { createLesson, getLessons, getLessonCountByCourse } from "../controllers/lessonsController.js";

const router = express.Router();

router.post("/", createLesson);
router.get("/", getLessons);
router.get("/count/:courseId", getLessonCountByCourse);

export default router;
