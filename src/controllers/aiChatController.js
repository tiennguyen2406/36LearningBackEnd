import { GoogleGenerativeAI } from "@google/generative-ai";
import Course from "../models/Course.js";
import Category from "../models/Category.js";
import User from "../models/User.js";
import Lesson from "../models/Lesson.js";

// Khởi tạo Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Hàm lấy thông tin database để cung cấp context cho AI
async function getDatabaseContext() {
  try {
    const [courses, categories, users, lessons] = await Promise.all([
      Course.find({ isPublished: true }).limit(50).lean(),
      Category.find({ isActive: true }).lean(),
      User.find().limit(100).select("username fullName role email").lean(),
      Lesson.find().limit(100).select("title courseId kind").lean(),
    ]);

    return {
      courses: courses.map((c) => ({
        id: c._id.toString(),
        title: c.title,
        description: c.description,
        category: c.category?.toString(),
        instructor: c.instructor,
        price: c.price,
        students: c.students,
        rating: c.rating,
        totalLessons: c.totalLessons,
      })),
      categories: categories.map((cat) => ({
        id: cat._id.toString(),
        name: cat.name,
        description: cat.description,
        courseCount: cat.courseCount,
      })),
      users: users.map((u) => ({
        id: u._id.toString(),
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        email: u.email,
      })),
      lessons: lessons.map((l) => ({
        id: l._id.toString(),
        title: l.title,
        courseId: l.courseId?.toString(),
        kind: l.kind || "video",
      })),
    };
  } catch (error) {
    console.error("Error fetching database context:", error);
    return null;
  }
}

// Chat với AI
export const chatWithAI = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Lấy context từ database
    const dbContext = await getDatabaseContext();

    // Tạo system prompt với thông tin database
    const systemPrompt = `Bạn là một trợ lý AI thông minh cho nền tảng học tập trực tuyến 36Learning. 
Bạn có quyền truy cập vào cơ sở dữ liệu của nền tảng và có thể trả lời các câu hỏi về:
- Khóa học: thông tin, mô tả, giá cả, đánh giá, số học viên
- Danh mục: các danh mục khóa học có sẵn
- Người dùng: thông tin cơ bản (không tiết lộ thông tin nhạy cảm)
- Bài học: các bài học trong khóa học

Hãy trả lời một cách thân thiện, hữu ích và chính xác. Nếu không có thông tin trong database, hãy nói rõ ràng.
Luôn trả lời bằng tiếng Việt.

Dữ liệu hiện tại trong database:
${JSON.stringify(dbContext, null, 2)}

Hãy sử dụng thông tin này để trả lời câu hỏi của người dùng một cách chính xác.`;

    // Lấy model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Tạo lịch sử hội thoại
    const history = conversationHistory.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    // Thêm system prompt vào đầu
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        {
          role: "model",
          parts: [{ text: "Tôi đã hiểu. Tôi là trợ lý AI của 36Learning và có quyền truy cập vào cơ sở dữ liệu. Tôi sẵn sàng trả lời các câu hỏi của bạn." }],
        },
        ...history,
      ],
    });

    // Gửi tin nhắn
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    res.json({
      response: text,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in chatWithAI:", error);
    res.status(500).json({
      error: "Lỗi khi xử lý yêu cầu AI",
      details: error.message,
    });
  }
};

