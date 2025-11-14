import express from "express";
import {
  getQuizResultByLesson,
  getQuizResultsByCourse,
  saveQuizResult,
} from "../controllers/quizResultsController.js";

const router = express.Router();

router.post("/:lessonId", saveQuizResult);
router.get("/course/:courseId/user/:userId", getQuizResultsByCourse);
router.get("/lesson/:lessonId/user/:userId", getQuizResultByLesson);

export default router;


