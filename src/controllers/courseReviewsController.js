import CourseReview from "../models/CourseReview.js";
import Course from "../models/Course.js";
import User from "../models/User.js";

// Lấy tất cả reviews của một khóa học
export const getCourseReviews = async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!courseId) {
      return res.status(400).json({ error: "courseId is required" });
    }

    const reviews = await CourseReview.find({ courseId })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const normalizedReviews = (reviews || []).map((review) => ({
      ...review,
      id: review._id?.toString(),
      courseId: review.courseId?.toString(),
      userId: review.userId?.toString(),
    }));

    res.json(normalizedReviews);
  } catch (error) {
    console.error("Error fetching course reviews:", error);
    res.status(500).json({ error: "Failed to load reviews" });
  }
};

// Tạo hoặc cập nhật review của user cho một khóa học
export const createCourseReview = async (req, res) => {
  try {
    const { courseId, rating, comment, userId, username } = req.body;

    if (!courseId || !userId || !username) {
      return res
        .status(400)
        .json({ error: "courseId, userId and username are required" });
    }

    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res
        .status(400)
        .json({ error: "rating must be between 1 and 5" });
    }

    // Kiểm tra course có tồn tại không
    const course = await Course.findById(courseId).lean();
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Kiểm tra user đã enroll khóa học chưa
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const enrolledCourses = user.enrolledCourses || [];
    const isEnrolled = enrolledCourses.some(
      (c) => c.toString() === courseId.toString()
    );

    if (!isEnrolled) {
      return res.status(403).json({
        error: "Bạn phải tham gia khóa học mới được đánh giá",
      });
    }

    const payload = {
      courseId,
      userId,
      username,
      rating: numericRating,
      comment: comment?.toString().slice(0, 2000) || "",
    };

    // Upsert: tạo mới nếu chưa có, update nếu đã có
    const review = await CourseReview.findOneAndUpdate(
      { courseId, userId },
      payload,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Cập nhật rating trung bình của course
    await updateCourseRating(courseId);

    res.status(201).json(review);
  } catch (error) {
    console.error("Error creating course review:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Bạn đã đánh giá khóa học này rồi",
      });
    }
    res.status(500).json({ error: "Failed to submit review" });
  }
};

// Cập nhật review
export const updateCourseReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment, userId } = req.body;

    if (!reviewId || !userId) {
      return res.status(400).json({ error: "reviewId and userId are required" });
    }

    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res
        .status(400)
        .json({ error: "rating must be between 1 and 5" });
    }

    const review = await CourseReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: "Không tìm thấy đánh giá" });
    }

    const reviewOwnerId =
      typeof review.userId?.toString === "function"
        ? review.userId.toString()
        : String(review.userId);

    if (reviewOwnerId !== String(userId)) {
      return res
        .status(403)
        .json({ error: "Bạn không có quyền sửa đánh giá này" });
    }

    review.rating = numericRating;
    review.comment = comment?.toString().slice(0, 2000) || "";
    await review.save();

    // Cập nhật rating trung bình của course
    await updateCourseRating(review.courseId);

    res.json(review);
  } catch (error) {
    console.error("Error updating course review:", error);
    res.status(500).json({ error: "Failed to update review" });
  }
};

// Xóa review
export const deleteCourseReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userIdFromBody = req.body?.userId;
    const userIdFromQuery = req.query?.userId;
    const userIdFromHeader = req.headers["x-user-id"];
    const userId = userIdFromBody || userIdFromQuery || userIdFromHeader;

    if (!reviewId || !userId) {
      return res
        .status(400)
        .json({ error: "reviewId và userId là bắt buộc để xoá" });
    }

    const review = await CourseReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: "Không tìm thấy đánh giá" });
    }

    const reviewOwnerId =
      typeof review.userId?.toString === "function"
        ? review.userId.toString()
        : String(review.userId);

    if (reviewOwnerId !== String(userId)) {
      return res
        .status(403)
        .json({ error: "Bạn không có quyền xoá đánh giá này" });
    }

    const courseId = review.courseId;
    await review.deleteOne();

    // Cập nhật rating trung bình của course
    await updateCourseRating(courseId);

    res.json({ success: true, message: "Đã xóa đánh giá" });
  } catch (error) {
    console.error("Error deleting course review:", error);
    res.status(500).json({ error: "Failed to delete review" });
  }
};

// Helper function: Cập nhật rating trung bình và số lượng reviews của course
async function updateCourseRating(courseId) {
  try {
    const reviews = await CourseReview.find({ courseId }).lean();

    if (reviews.length === 0) {
      await Course.findByIdAndUpdate(courseId, {
        rating: 0,
        reviewCount: 0,
      });
    } else {
      const avgRating =
        reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await Course.findByIdAndUpdate(courseId, {
        rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
        reviewCount: reviews.length,
      });
    }
  } catch (error) {
    console.error("Error updating course rating:", error);
  }
}

