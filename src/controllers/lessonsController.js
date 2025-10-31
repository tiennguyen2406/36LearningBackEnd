import { firestore } from "../firebase.js";

export const createLesson = async (req, res) => {
  try {
    const data = req.body;
    const lessonRef = firestore.collection("Lessons").doc();
    await lessonRef.set({
      id: lessonRef.id,
      courseId: data.courseId,
      title: data.title,
      description: data.description || "",
      videoUrl: data.videoUrl || "",
      duration: data.duration || 0,
      order: data.order || 0,
      attachments: data.attachments || [],
      isPreview: data.isPreview ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    res.status(201).json({ message: "Lesson created", id: lessonRef.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

export const getLessons = async (req, res) => {
  try {
    const snapshot = await firestore.collection("Lessons").get();
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

export const getLessonCountByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!courseId) return res.status(400).json({ error: "Missing courseId" });
    const snapshot = await firestore.collection("Lessons").where("courseId", "==", courseId).get();
    return res.status(200).json({ courseId, count: snapshot.size });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Lấy danh sách bài học theo courseId (sắp xếp theo order)
export const getLessonsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!courseId) return res.status(400).json({ error: "Missing courseId" });
    
    // Fetch lessons không dùng orderBy để tránh lỗi index
    const snapshot = await firestore
      .collection("Lessons")
      .where("courseId", "==", courseId)
      .get();
    
    // Map và sort ở backend
    const lessons = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const orderA = a.order || 0;
        const orderB = b.order || 0;
        return orderA - orderB;
      });
    
    return res.status(200).json(lessons);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};