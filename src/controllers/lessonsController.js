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
