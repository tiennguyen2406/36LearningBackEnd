import Proof from "../models/Proof.js";
import cloudinary from "cloudinary";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

// Cấu hình Cloudinary
try {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.v2.config({ secure: true });
  } else if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    cloudinary.v2.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
} catch (e) {
  console.error("Cloudinary config error:", e);
}

// Tạo bản ghi minh chứng (đã có link Cloudinary từ client)
export const createProof = async (req, res) => {
  try {
    const { userId, url, type, metadata, requestedRole } = req.body || {};
    if (!userId || !url) {
      return res.status(400).json({ error: "Missing userId or url" });
    }

    const proof = await Proof.create({
      userId,
      url,
      type,
      metadata,
      requestedRole: requestedRole || metadata?.requestedRole || "instructor",
      status: "pending",
    });
    return res.status(201).json({
      message: "Proof created",
      id: proof._id.toString(),
      proof: {
        id: proof._id.toString(),
        userId: proof.userId?.toString?.() || String(proof.userId),
        url: proof.url,
        type: proof.type,
        requestedRole: proof.requestedRole,
        status: proof.status,
        createdAt: proof.createdAt,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

export const getAllProofs = async (req, res) => {
  try {
    const proofs = await Proof.find()
      .sort({ createdAt: -1 })
      .populate("userId", "username email fullName role");

    return res.status(200).json(
      proofs.map((p) => ({
        id: p._id.toString(),
        userId: p.userId?._id?.toString?.() || String(p.userId),
        username: p.userId?.username,
        email: p.userId?.email,
        fullName: p.userId?.fullName,
        currentRole: p.userId?.role,
        url: p.url,
        type: p.type,
        requestedRole: p.requestedRole,
        status: p.status,
        adminComment: p.adminComment,
        createdAt: p.createdAt,
        metadata: p.metadata,
      }))
    );
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
        requestedRole: p.requestedRole,
        status: p.status,
        createdAt: p.createdAt,
      }))
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

// Upload file trực tiếp từ client lên backend, rồi backend đẩy lên Cloudinary
export const uploadProof = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing file" });
    }

    if (!process.env.CLOUDINARY_URL && !process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(500).json({ error: "Cloudinary is not configured" });
    }

    // Tải buffer tạm thời lên Cloudinary
    const streamUpload = () =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.v2.uploader.upload_stream(
          { resource_type: "auto" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

    const result = await streamUpload();
    // @ts-ignore
    const secureUrl = result.secure_url;
    return res.status(201).json({ url: secureUrl });
  } catch (error) {
    console.error("Upload failed:", error);
    return res.status(500).json({ error: "Upload failed", message: error?.message || String(error) });
  }
};

export const updateProofStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminComment } = req.body || {};

    if (!id || !status || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status or id" });
    }

    const proof = await Proof.findById(id);
    if (!proof) {
      return res.status(404).json({ error: "Proof not found" });
    }

    proof.status = status;
    proof.adminComment = adminComment || "";
    await proof.save();

    if (status === "approved" && proof.requestedRole) {
      await User.findByIdAndUpdate(
        proof.userId,
        { role: proof.requestedRole },
        { new: true }
      );
    }

    return res.status(200).json({ message: "Updated proof", status: proof.status });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
};


