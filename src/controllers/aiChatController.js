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

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

async function buildSelectedCourseContext(selectedCourseId, currentUserId) {
  if (!selectedCourseId) return null;

  const course = await Course.findById(selectedCourseId).lean();
  if (!course) {
    throw new Error("Khóa học được chọn không tồn tại");
  }

  if (currentUserId) {
    const user = await User.findById(currentUserId).lean();
    const enrolled = Array.isArray(user?.enrolledCourses)
      ? user.enrolledCourses.map((id) => id.toString())
      : [];
    if (!enrolled.includes(String(selectedCourseId))) {
      throw new Error("Bạn chưa tham gia khóa học này nên không thể lấy nội dung chi tiết");
    }
  }

  const lessons = await Lesson.find({ courseId: selectedCourseId })
    .sort({ order: 1 })
    .limit(30)
    .lean();

  const lessonHighlights = lessons.slice(0, 8).map((lesson, index) => {
    const kindLabel = lesson.kind === "quiz" ? "Quiz" : "Bài học";
    return `${index + 1}. ${lesson.title} (${kindLabel})`;
  });

  return {
    id: course._id.toString(),
    title: course.title,
    description: course.description,
    instructor: course.instructor,
    students: course.students,
    price: course.price,
    totalLessons: course.totalLessons,
    lessons: lessonHighlights,
  };
}

// Chat với AI
export const chatWithAI = async (req, res) => {
  // Khai báo các biến ở đầu function để có thể dùng trong catch block
  // Model names hợp lệ cho API v1beta (gemini-pro đã không còn được hỗ trợ):
  // - gemini-2.5-flash (ưu tiên nếu sẵn sàng)
  // - gemini-1.5-flash-latest
  // - gemini-1.5-pro
  // - gemini-1.5-pro-latest
  let modelName = "gemini-2.5-flash";
  const modelNames = [
    "gemini-2.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-1.5-pro-latest",
  ];
  
  try {
    // Kiểm tra API key
    if (!genAI || !GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY chưa được cấu hình",
        details: "Vui lòng thêm GEMINI_API_KEY vào file .env",
      });
    }
    
    // Log để debug
    console.log(`🔑 GEMINI_API_KEY: ${GEMINI_API_KEY.substring(0, 10)}... (${GEMINI_API_KEY.length} ký tự)`);

    const {
      message,
      conversationHistory = [],
      selectedCourseId,
      currentUserId,
    } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }

    const allowedKeywords = [
      "khoa",
      "hoc",
      "course",
      "bai",
      "lesson",
      "mentor",
      "giang",
      "gia",
      "price",
      "danh muc",
      "chu de",
      "quiz",
      "thi",
      "dang ky",
      "enroll",
      "hoc phi",
      "thanh toan",
      "video",
      "giang vien",
      "tai lieu",
      "cap nhat",
      "module",
      "lien he",
    ];

    const normalizedMessage = normalizeText(message);
    const isRelevantQuestion = allowedKeywords.some((keyword) =>
      normalizedMessage.includes(keyword)
    );

    if (!isRelevantQuestion && !selectedCourseId) {
      return res.status(200).json({
        response:
          "Xin lỗi, trợ lý AI 36Learning chỉ hỗ trợ các câu hỏi liên quan đến khóa học, bài học, danh mục và hoạt động trên nền tảng. Bạn vui lòng đặt câu hỏi phù hợp hơn nhé!",
        timestamp: new Date().toISOString(),
      });
    }

    // Lấy context từ database
    const dbContext = await getDatabaseContext();
    const contextText = dbContext
      ? JSON.stringify(dbContext, null, 2)
      : "Không thể tải dữ liệu từ database. Chỉ trả lời dựa trên kiến thức chung và thông tin người dùng cung cấp.";

    let selectedCourseContext = "";
    if (selectedCourseId) {
      try {
        const courseContext = await buildSelectedCourseContext(
          selectedCourseId,
          currentUserId
        );
        selectedCourseContext = courseContext
          ? `
Khóa học đang tập trung:
- Tên: ${courseContext.title}
- Giảng viên: ${courseContext.instructor || "Chưa cập nhật"}
- Số học viên: ${courseContext.students || 0}
- Giá: ${courseContext.price ? `${courseContext.price} VND` : "Miễn phí"}
- Tổng số bài: ${courseContext.totalLessons || "Chưa rõ"}
- Mô tả: ${courseContext.description || "Chưa có mô tả chi tiết"}
- Bài học tiêu biểu:
${courseContext.lessons.join("\n") || "Chưa có bài học"}
`
          : "";
      } catch (courseError) {
        return res.status(403).json({
          error: courseError.message,
        });
      }
    }

    // Tạo system prompt với thông tin database và hướng dẫn chi tiết
    const systemPrompt = `Bạn là trợ lý AI logic cho nền tảng học trực tuyến 36Learning.

Mục tiêu:
- Giải thích ngắn gọn, đi thẳng trọng tâm câu hỏi.
- Ưu tiên dữ liệu thực tế từ hệ thống 36Learning. Nếu thiếu dữ liệu, hãy nói rõ và đề xuất bước tiếp theo.
- Khi có nhiều câu hỏi cùng lúc, hãy trả lời theo từng ý (dùng danh sách ngắn gọn).
- Giữ văn phong thân thiện, chuyên nghiệp, hoàn toàn bằng tiếng Việt.
- Nếu cần thêm thông tin để trả lời chính xác, hãy đặt câu hỏi rõ ràng cho người dùng.

Phạm vi kiến thức trong database:
- Khóa học: tiêu đề, mô tả, danh mục, giảng viên, số học viên, giá, số bài học, đánh giá.
- Danh mục: tên, mô tả, số lượng khóa học.
- Người dùng: username, fullName, role, email (không tiết lộ dữ liệu nhạy cảm).
- Bài học: tiêu đề, loại bài học, thuộc khóa học nào.
- Nếu câu hỏi không liên quan đến việc học hoặc nền tảng 36Learning, hãy trả lời duy nhất: "Xin lỗi, trợ lý AI 36Learning chỉ hỗ trợ các câu hỏi liên quan đến học tập và hoạt động trên nền tảng."
- Nếu người dùng đã chọn khóa học cụ thể, hãy đào sâu vào nội dung khóa học đó, cung cấp nhận xét chi tiết, đồng thời đề xuất 2-3 câu hỏi tiếp theo mà người dùng có thể quan tâm để nghiên cứu sâu hơn.

Dữ liệu khóa học được chọn (nếu có):
${selectedCourseContext || "Người dùng chưa chọn khóa học cụ thể."}

Dữ liệu hiện tại:
${contextText}

Hãy sử dụng dữ liệu trên để trả lời chính xác, có cấu trúc rõ ràng và tập trung vào yêu cầu của người dùng.`;

    // Thử các model theo thứ tự (gemini-pro đã không còn được hỗ trợ)
    let model = null;
    let lastError = null;
    
    for (const testModelName of modelNames) {
      try {
        console.log(`🔧 Đang thử model: ${testModelName}`);
        model = genAI.getGenerativeModel({ model: testModelName });
        // Model đã được khởi tạo thành công
        modelName = testModelName; // Cập nhật modelName đã dùng thành công
        console.log(`✅ Đã chọn model: ${testModelName}`);
        break;
      } catch (modelError) {
        console.warn(`⚠️ Model ${testModelName} không khả dụng:`, modelError.message);
        console.warn(`   Chi tiết lỗi:`, JSON.stringify(modelError, null, 2));
        lastError = modelError;
        continue;
      }
    }
    
    if (!model) {
      const errorMsg = lastError?.message || "Unknown error";
      const errorStack = lastError?.stack || "";
      console.error(`❌ Không thể khởi tạo model. Đã thử: ${modelNames.join(", ")}`);
      console.error(`   Lỗi cuối: ${errorMsg}`);
      console.error(`   Stack: ${errorStack}`);
      throw new Error(`Không thể khởi tạo model. Đã thử: ${modelNames.join(", ")}. Lỗi: ${errorMsg}`);
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
      console.log(`📤 Đang gửi tin nhắn với model: ${modelName}`);
      result = await chat.sendMessage(message);
      console.log(`✅ Đã nhận phản hồi từ model: ${modelName}`);
    } catch (sendError) {
      // Nếu lỗi khi gửi tin nhắn (có thể do model không khả dụng), thử model khác
      console.error(`❌ Lỗi khi gửi tin nhắn với model ${modelName}:`, sendError.message);
      console.error(`   Chi tiết lỗi:`, sendError);
      
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
          console.warn(`   Chi tiết:`, retryError);
          continue;
        }
      }
      
      if (!retrySuccess) {
        // Log đầy đủ thông tin lỗi
        console.error(`❌ Tất cả các model đều không hoạt động`);
        console.error(`   Lỗi ban đầu:`, sendError);
        throw sendError; // Ném lỗi ban đầu nếu không model nào hoạt động
      }
    }
    
    const response = await result.response;
    let text = response.text();

    // Loại bỏ các dấu ** (markdown bold) ở đầu và cuối
    text = text.replace(/^\*\*+|\*+$/g, '').trim();
    // Loại bỏ các dấu ** ở đầu và cuối của mỗi dòng (nếu có)
    text = text.split('\n').map(line => line.replace(/^\*\*+|\*+$/g, '').trim()).join('\n');

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
      errorDetails = `Đã thử tất cả các model: ${modelNames.join(", ")} nhưng không model nào khả dụng. Có thể API key không có quyền truy cập hoặc cần tạo API key mới trong Google AI Studio (https://aistudio.google.com/).`;
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

