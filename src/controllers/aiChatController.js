import { GoogleGenerativeAI } from "@google/generative-ai";
import Course from "../models/Course.js";
import Category from "../models/Category.js";
import User from "../models/User.js";
import Lesson from "../models/Lesson.js";

// Khởi tạo Gemini AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

if (!GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY chưa được cấu hình trong biến môi trường");
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

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
  // Khai báo các biến ở đầu function để có thể dùng trong catch block
  let modelName = "gemini-1.5-flash";
  const modelNames = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
  
  try {
    // Kiểm tra API key
    if (!genAI || !GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY chưa được cấu hình",
        details: "Vui lòng thêm GEMINI_API_KEY vào file .env",
      });
    }

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

    // Thử các model theo thứ tự: gemini-1.5-flash -> gemini-1.5-pro -> gemini-pro
    let model = null;
    let lastError = null;
    
    for (const testModelName of modelNames) {
      try {
        console.log(`🔧 Đang thử model: ${testModelName}`);
        model = genAI.getGenerativeModel({ model: testModelName });
        modelName = testModelName; // Cập nhật modelName đã dùng thành công
        console.log(`✅ Đã chọn model: ${testModelName}`);
        break;
      } catch (modelError) {
        console.warn(`⚠️ Model ${testModelName} không khả dụng:`, modelError.message);
        lastError = modelError;
        continue;
      }
    }
    
    if (!model) {
      throw new Error(`Không thể khởi tạo model. Đã thử: ${modelNames.join(", ")}. Lỗi cuối: ${lastError?.message || "Unknown error"}`);
    }

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
    let result;
    try {
      result = await chat.sendMessage(message);
    } catch (sendError) {
      // Nếu lỗi khi gửi tin nhắn (có thể do model không khả dụng), thử model khác
      console.error(`❌ Lỗi khi gửi tin nhắn với model ${modelName}:`, sendError.message);
      
      // Thử lại với model khác nếu chưa thử hết
      const remainingModels = modelNames.filter(m => m !== modelName);
      let retrySuccess = false;
      
      for (const retryModelName of remainingModels) {
        try {
          console.log(`🔄 Thử lại với model: ${retryModelName}`);
          const retryModel = genAI.getGenerativeModel({ model: retryModelName });
          const retryChat = retryModel.startChat({
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
          
          result = await retryChat.sendMessage(message);
          modelName = retryModelName;
          console.log(`✅ Thành công với model: ${retryModelName}`);
          retrySuccess = true;
          break;
        } catch (retryError) {
          console.warn(`⚠️ Model ${retryModelName} cũng không hoạt động:`, retryError.message);
          continue;
        }
      }
      
      if (!retrySuccess) {
        throw sendError; // Ném lỗi ban đầu nếu không model nào hoạt động
      }
    }
    
    const response = await result.response;
    const text = response.text();

    res.json({
      response: text,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in chatWithAI:", error);
    
    // Xử lý lỗi cụ thể từ Google Generative AI
    let errorMessage = "Lỗi khi xử lý yêu cầu AI";
    let errorDetails = error.message;

    if (error.message && error.message.includes("403")) {
      errorMessage = "API Key không hợp lệ hoặc không có quyền truy cập";
      errorDetails = "Vui lòng kiểm tra GEMINI_API_KEY trong file .env. Đảm bảo API key hợp lệ và đã được kích hoạt trong Google AI Studio.";
    } else if (error.message && error.message.includes("401")) {
      errorMessage = "API Key không hợp lệ";
      errorDetails = "GEMINI_API_KEY không đúng. Vui lòng kiểm tra lại.";
    } else if (error.message && error.message.includes("404")) {
      errorMessage = "Model không tìm thấy";
      errorDetails = `Model "${modelName}" không khả dụng. Đã thử các model: ${modelNames.join(", ")}. Có thể API key không có quyền truy cập các model này hoặc model names đã thay đổi.`;
    } else if (error.message && error.message.includes("429")) {
      errorMessage = "Đã vượt quá giới hạn API";
      errorDetails = "Vui lòng thử lại sau.";
    }

    res.status(500).json({
      error: errorMessage,
      details: errorDetails,
    });
  }
};

