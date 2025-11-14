import QuizResult from "../models/QuizResult.js";

const normalizeDoc = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject();
  if (obj._id) {
    obj.id = obj._id.toString();
    delete obj._id;
  }
  return obj;
};

export const saveQuizResult = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const {
      userId,
      courseId,
      totalQuestions = 0,
      correctCount = 0,
      percentage,
      answers = [],
    } = req.body || {};

    if (!lessonId || !userId || !courseId) {
      return res
        .status(400)
        .json({ error: "Thiếu lessonId, courseId hoặc userId" });
    }

    const computedPercentage =
      typeof percentage === "number"
        ? Math.max(0, Math.min(100, Math.round(percentage)))
        : totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 100)
        : 0;

    const payload = {
      userId: String(userId),
      courseId: String(courseId),
      lessonId: String(lessonId),
      totalQuestions,
      correctCount,
      percentage: computedPercentage,
      answers: Array.isArray(answers) ? answers : [],
      submittedAt: new Date(),
    };

    const doc = await QuizResult.findOneAndUpdate(
      { userId: payload.userId, lessonId: payload.lessonId },
      payload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json(normalizeDoc(doc));
  } catch (error) {
    console.error("saveQuizResult error:", error);
    return res
      .status(500)
      .json({ error: "Không thể lưu kết quả quiz. Vui lòng thử lại sau." });
  }
};

export const getQuizResultsByCourse = async (req, res) => {
  try {
    const { courseId, userId } = req.params;
    if (!courseId || !userId) {
      return res.status(400).json({ error: "Thiếu courseId hoặc userId" });
    }

    const list = await QuizResult.find({
      courseId: String(courseId),
      userId: String(userId),
    }).sort({ updatedAt: -1 });

    return res.status(200).json(list.map(normalizeDoc));
  } catch (error) {
    console.error("getQuizResultsByCourse error:", error);
    return res
      .status(500)
      .json({ error: "Không thể tải kết quả quiz. Vui lòng thử lại sau." });
  }
};

export const getQuizResultByLesson = async (req, res) => {
  try {
    const { lessonId, userId } = req.params;
    if (!lessonId || !userId) {
      return res.status(400).json({ error: "Thiếu lessonId hoặc userId" });
    }
    const doc = await QuizResult.findOne({
      lessonId: String(lessonId),
      userId: String(userId),
    });
    if (!doc) return res.status(404).json({ error: "Chưa có kết quả" });
    return res.status(200).json(normalizeDoc(doc));
  } catch (error) {
    console.error("getQuizResultByLesson error:", error);
    return res
      .status(500)
      .json({ error: "Không thể tải kết quả quiz. Vui lòng thử lại sau." });
  }
};


