import Proof from "../models/Proof.js";

// Tạo bản ghi minh chứng (đã có link Cloudinary từ client)
export const createProof = async (req, res) => {
  try {
    const { userId, url, type, metadata } = req.body || {};
    if (!userId || !url) {
      return res.status(400).json({ error: "Missing userId or url" });
    }

    const proof = await Proof.create({ userId, url, type, metadata });
    return res.status(201).json({
      message: "Proof created",
      id: proof._id.toString(),
      proof: {
        id: proof._id.toString(),
        userId: proof.userId?.toString?.() || String(proof.userId),
        url: proof.url,
        type: proof.type,
        createdAt: proof.createdAt,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

// (Tuỳ chọn) Lấy danh sách minh chứng theo user
export const getProofsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    const list = await Proof.find({ userId }).sort({ createdAt: -1 });
    return res.status(200).json(
      list.map((p) => ({
        id: p._id.toString(),
        userId: p.userId?.toString?.() || String(p.userId),
        url: p.url,
        type: p.type,
        createdAt: p.createdAt,
      }))
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
};


