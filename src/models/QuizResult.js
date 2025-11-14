import mongoose from "mongoose";

const quizResultSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    courseId: {
      type: String,
      required: true,
    },
    lessonId: {
      type: String,
      required: true,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    correctCount: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    answers: [
      {
        questionIndex: { type: Number, default: 0 },
        selectedIndex: { type: Number, default: null },
        correctIndex: { type: Number, default: 0 },
        isCorrect: { type: Boolean, default: false },
      },
    ],
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

quizResultSchema.index({ userId: 1, lessonId: 1 }, { unique: true });

export default mongoose.model("QuizResult", quizResultSchema);


