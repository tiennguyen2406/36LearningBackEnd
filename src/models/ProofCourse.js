import mongoose from "mongoose";

const ProofCourseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    payload: { type: Object, required: true }, // chứa course + lessons đề nghị
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    adminComment: { type: String, default: "" },
    thumbnailUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("ProofCourse", ProofCourseSchema);


