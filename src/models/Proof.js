import mongoose from "mongoose";

const ProofSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    url: { type: String, required: true },
    type: { type: String, default: "unknown" },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model("Proof", ProofSchema);


