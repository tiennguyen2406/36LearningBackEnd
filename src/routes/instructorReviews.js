import express from "express";
import {
  getInstructorReviews,
  createInstructorReview,
  deleteInstructorReview,
} from "../controllers/instructorReviewsController.js";

const router = express.Router();

router.get("/:instructorId", getInstructorReviews);
router.post("/", createInstructorReview);
router.delete("/:reviewId", deleteInstructorReview);

export default router;

