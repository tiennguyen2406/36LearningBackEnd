import express from "express";
import {
  getInstructorReviews,
  createInstructorReview,
} from "../controllers/instructorReviewsController.js";

const router = express.Router();

router.get("/:instructorId", getInstructorReviews);
router.post("/", createInstructorReview);

export default router;

