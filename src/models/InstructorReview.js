import mongoose from "mongoose";

const instructorReviewSchema = new mongoose.Schema(
  {
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    instructorUsername: {
      type: String,
      trim: true,
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

instructorReviewSchema.index({ instructorId: 1, userId: 1 }, { unique: true });

const InstructorReview =
  mongoose.models.InstructorReview ||
  mongoose.model("InstructorReview", instructorReviewSchema);

export default InstructorReview;

