import Lesson from "../models/Lesson.js";

export const createLesson = async (req, res) => {
  try {
    const data = req.body;
    const lesson = await Lesson.create({
      courseId: data.courseId,
      title: data.title,
      description: data.description || "",
      videoUrl: data.videoUrl || "",
      duration: data.duration || 0,
      order: data.order || 0,
      attachments: data.attachments || [],
      isPreview: data.isPreview ?? false,
    });
    res.status(201).json({ message: "Lesson created", id: lesson._id.toString() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

export const getLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find();
    const list = lessons.map(lesson => ({
      id: lesson._id.toString(),
      ...lesson.toObject(),
      _id: undefined,
    }));
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
    const count = await Lesson.countDocuments({ courseId });
    return res.status(200).json({ courseId, count });
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

    const lessons = await Lesson.find({ courseId })
      .sort({ order: 1 });

    const lessonsList = lessons.map(lesson => ({
      id: lesson._id.toString(),
      ...lesson.toObject(),
      _id: undefined,
    }));

    return res.status(200).json(lessonsList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};
