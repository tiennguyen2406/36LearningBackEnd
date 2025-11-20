import mongoose from "mongoose";

const courseReviewSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  }
);

// Index để đảm bảo mỗi user chỉ review 1 lần cho mỗi course
courseReviewSchema.index({ courseId: 1, userId: 1 }, { unique: true });

const CourseReview =
  mongoose.models.CourseReview ||
  mongoose.model("CourseReview", courseReviewSchema);

export default CourseReview;

