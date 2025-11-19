import InstructorReview from "../models/InstructorReview.js";
import User from "../models/User.js";

export const getInstructorReviews = async (req, res) => {
  try {
    const { instructorId } = req.params;
    if (!instructorId) {
      return res.status(400).json({ error: "instructorId is required" });
    }

    const reviews = await InstructorReview.find({ instructorId })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const avg =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) /
          reviews.length
        : 0;

    res.json({
      reviews,
      averageRating: Number(avg.toFixed(1)),
      totalReviews: reviews.length,
    });
  } catch (error) {
    console.error("Error fetching instructor reviews:", error);
    res.status(500).json({ error: "Failed to load reviews" });
  }
};

export const createInstructorReview = async (req, res) => {
  try {
    const { instructorId, rating, comment, userId, username } = req.body;

    if (!instructorId || !userId || !username) {
      return res
        .status(400)
        .json({ error: "instructorId, userId and username are required" });
    }

    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res
        .status(400)
        .json({ error: "rating must be between 1 and 5" });
    }

    const instructor = await User.findById(instructorId).lean();
    if (!instructor) {
      return res.status(404).json({ error: "Instructor not found" });
    }

    const payload = {
      instructorId,
      instructorUsername: instructor.username || instructor.email || "",
      userId,
      username,
      rating: numericRating,
      comment: comment?.toString().slice(0, 2000) || "",
    };

    const review = await InstructorReview.findOneAndUpdate(
      { instructorId, userId },
      payload,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const stats = await InstructorReview.aggregate([
      { $match: { instructorId: review.instructorId } },
      {
        $group: {
          _id: "$instructorId",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const summary = stats[0] || { averageRating: review.rating, totalReviews: 1 };

    res.status(201).json({
      review,
      averageRating: Number(summary.averageRating.toFixed(1)),
      totalReviews: summary.totalReviews,
    });
  } catch (error) {
    console.error("Error creating instructor review:", error);
    res.status(500).json({ error: "Failed to submit review" });
  }
};

export const deleteInstructorReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userId } = req.body || {};

    if (!reviewId || !userId) {
      return res
        .status(400)
        .json({ error: "reviewId và userId là bắt buộc để xoá" });
    }

    const review = await InstructorReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: "Không tìm thấy đánh giá" });
    }

    if (String(review.userId) !== String(userId)) {
      return res
        .status(403)
        .json({ error: "Bạn không có quyền xoá đánh giá này" });
    }

    const instructorId = review.instructorId;
    await review.deleteOne();

    const stats = await InstructorReview.aggregate([
      { $match: { instructorId } },
      {
        $group: {
          _id: "$instructorId",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const summary = stats[0];
    const averageRating =
      summary && typeof summary.averageRating === "number"
        ? Number(summary.averageRating.toFixed(1))
        : 0;
    const totalReviews = summary?.totalReviews || 0;

    res.json({ success: true, averageRating, totalReviews });
  } catch (error) {
    console.error("Error deleting instructor review:", error);
    res.status(500).json({ error: "Failed to delete review" });
  }
};

