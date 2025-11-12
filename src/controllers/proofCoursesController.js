import ProofCourse from "../models/ProofCourse.js";
import Course from "../models/Course.js";
import Lesson from "../models/Lesson.js";
import Category from "../models/Category.js";

async function updateCategoryCount(categoryId) {
  if (!categoryId) return;
  try {
    const courseCount = await Course.countDocuments({
      category: categoryId,
      isPublished: true,
    });
    await Category.findByIdAndUpdate(categoryId, {
      courseCount,
      updatedAt: new Date(),
    });
  } catch (e) {
    console.error("updateCategoryCount error:", e);
  }
}

export const createProofCourse = async (req, res) => {
  try {
    const { userId, payload } = req.body || {};
    if (!userId || !payload) {
      return res.status(400).json({ error: "Missing userId or payload" });
    }
    const pc = await ProofCourse.create({
      userId,
      payload,
      status: "pending",
      thumbnailUrl: payload?.thumbnailUrl || "",
    });
    return res.status(201).json({ message: "ProofCourse created", id: pc._id.toString() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

export const getProofCourses = async (_req, res) => {
  try {
    const list = await ProofCourse.find().sort({ createdAt: -1 }).populate("userId", "username email fullName");
    return res.status(200).json(
      list.map((p) => ({
        id: p._id.toString(),
        status: p.status,
        adminComment: p.adminComment,
        userId: p.userId?._id?.toString?.() || String(p.userId),
        username: p.userId?.username,
        payload: p.payload,
        createdAt: p.createdAt,
      }))
    );
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

export const updateProofCourseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminComment } = req.body || {};
    if (!id || !status || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid request" });
    }
    const pc = await ProofCourse.findById(id);
    if (!pc) return res.status(404).json({ error: "Not found" });
    pc.status = status;
    pc.adminComment = adminComment || "";
    await pc.save();

    if (status === "approved") {
      const p = pc.payload || {};
      // Tạo course
      const course = await Course.create({
        title: p.title,
        description: p.description || "",
        category: p.category,
        price: p.price || 0,
        isPublished: true,
        instructor: String(pc.userId) || "",
        imageUrl: p.thumbnailUrl || pc.thumbnailUrl || "",
      });
      // Tạo lessons nếu có
      if (Array.isArray(p.lessons) && p.lessons.length) {
        const lessonsPayload = p.lessons.map((l) => ({
          courseId: course._id,
          title: l.title,
          description: l.description || "",
          order: l.order || 0,
          kind: l.kind || (Array.isArray(l.questions) ? "quiz" : "video"),
          videoUrl: l.kind === "video" ? (l.videoUrl || "") : "",
          questions: l.kind === "quiz" ? l.questions : undefined,
        }));
        await Lesson.insertMany(lessonsPayload);
      }
      if (p.category) await updateCategoryCount(p.category);
    }
    return res.status(200).json({ message: "Updated", status: pc.status });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Something went wrong" });
  }
};


