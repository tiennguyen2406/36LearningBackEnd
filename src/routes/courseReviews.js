import express from "express";
import {
  getCourseReviews,
  createCourseReview,
  updateCourseReview,
  deleteCourseReview,
} from "../controllers/courseReviewsController.js";

const router = express.Router();

// GET /course-reviews/:courseId - Lấy tất cả reviews của một khóa học
router.get("/:courseId", getCourseReviews);

// POST /course-reviews - Tạo review mới
router.post("/", createCourseReview);

// PUT /course-reviews/:reviewId - Cập nhật review
router.put("/:reviewId", updateCourseReview);

// DELETE /course-reviews/:reviewId - Xóa review
router.delete("/:reviewId", deleteCourseReview);

export default router;

