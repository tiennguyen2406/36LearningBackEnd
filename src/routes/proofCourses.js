import express from "express";
import { createProofCourse, getProofCourses, updateProofCourseStatus } from "../controllers/proofCoursesController.js";

const router = express.Router();

router.post("/", createProofCourse);
router.get("/", getProofCourses);
router.patch("/:id", updateProofCourseStatus);

export default router;


