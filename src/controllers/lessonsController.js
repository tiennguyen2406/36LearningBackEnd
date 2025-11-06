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

// Cập nhật lesson
export const updateLesson = async (req, res) => {
  try {
    const lessonId = req.params.id;
    const data = req.body;

    // Kiểm tra lesson có tồn tại không
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: "Không tìm thấy bài học" });
    }

    // Cập nhật thông tin lesson
    Object.assign(lesson, data);
    await lesson.save();

    res.status(200).json({ message: "Đã cập nhật bài học thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Xóa lesson
export const deleteLesson = async (req, res) => {
  try {
    const lessonId = req.params.id;

    // Kiểm tra lesson có tồn tại không
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: "Không tìm thấy bài học" });
    }

    // Xóa lesson
    await Lesson.findByIdAndDelete(lessonId);
    res.status(200).json({ message: "Đã xóa bài học thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};