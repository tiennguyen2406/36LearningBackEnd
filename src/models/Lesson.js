import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    videoUrl: {
      type: String,
      default: "",
    },
    duration: {
      type: Number,
      default: 0,
    },
    order: {
      type: Number,
      default: 0,
    },
    attachments: {
      type: [String],
      default: [],
    },
    isPreview: {
      type: Boolean,
      default: false,
    },
    // Loại bài học: video | quiz (mặc định video để tương thích cũ)
    kind: {
      type: String,
      enum: ["video", "quiz"],
      default: "video",
    },
    // Dành cho bài học dạng quiz
    questions: [
      {
        text: { type: String, required: true },
        options: {
          type: [String],
          default: [],
          validate: {
            validator: function (arr) {
              return Array.isArray(arr) && arr.length >= 2;
            },
            message: "Mỗi câu hỏi cần ít nhất 2 lựa chọn.",
          },
        },
        correctIndex: { type: Number, required: true, min: 0 },
        explanation: { type: String, default: "" },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Lesson", lessonSchema);

