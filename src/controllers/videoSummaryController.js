import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Khởi tạo Gemini AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

if (!GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY chưa được cấu hình trong biến môi trường");
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Tóm tắt video sử dụng Gemini 1.5 Flash
export const summarizeVideo = async (req, res) => {
  try {
    // Kiểm tra API key
    if (!genAI || !GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY chưa được cấu hình",
        details: "Vui lòng thêm GEMINI_API_KEY vào file .env",
      });
    }

    // Kiểm tra file video
    if (!req.file) {
      return res.status(400).json({
        error: "Thiếu file video",
        details: "Vui lòng upload file video",
      });
    }

    const videoFile = req.file;
    const allowedMimeTypes = [
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
      "video/x-msvideo",
      "video/webm",
    ];

    if (!allowedMimeTypes.includes(videoFile.mimetype)) {
      return res.status(400).json({
        error: "Định dạng video không được hỗ trợ",
        details: `Định dạng ${videoFile.mimetype} không được hỗ trợ. Vui lòng sử dụng MP4, MOV, AVI, hoặc WebM.`,
      });
    }

    // Kiểm tra kích thước file (tối đa 10MB để đảm bảo upload thành công)
    // Gemini có giới hạn về kích thước file, nên giảm xuống 10MB để an toàn
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (videoFile.size > maxSize) {
      return res.status(400).json({
        error: "File video quá lớn",
        details: `Kích thước file tối đa là 10MB. File của bạn: ${(videoFile.size / 1024 / 1024).toFixed(2)}MB. Vui lòng nén video hoặc chọn video ngắn hơn.`,
      });
    }

    console.log(`📹 Đang xử lý video: ${videoFile.originalname} (${(videoFile.size / 1024 / 1024).toFixed(2)}MB)`);

    // Lưu file tạm thời
    const tempDir = join(__dirname, "..", "..", "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = join(tempDir, `video_${Date.now()}_${videoFile.originalname}`);
    fs.writeFileSync(tempFilePath, videoFile.buffer);

    try {
      // Sử dụng Gemini 2.5 Flash để xử lý video (ưu tiên)
      // Thử các model theo thứ tự ưu tiên
      const modelNames = [
        "gemini-2.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-pro-latest",
        "gemini-1.5-pro",
      ];
      
      let model = null;
      let modelName = null;
      let lastError = null;
      
      // Thử từng model cho đến khi tìm được model hoạt động
      for (const testModelName of modelNames) {
        try {
          console.log(`🔧 Đang thử model: ${testModelName}`);
          model = genAI.getGenerativeModel({ model: testModelName });
          modelName = testModelName;
          console.log(`✅ Đã chọn model: ${testModelName}`);
          break;
        } catch (modelError) {
          console.warn(`⚠️ Model ${testModelName} không khả dụng:`, modelError.message);
          lastError = modelError;
          continue;
        }
      }
      
      if (!model) {
        throw new Error(`Không thể khởi tạo model. Đã thử: ${modelNames.join(", ")}. Lỗi: ${lastError?.message || "Unknown"}`);
      }

      console.log(`🤖 Đang gửi video đến Gemini ${modelName}...`);

      // Đọc file video
      const videoData = fs.readFileSync(tempFilePath);
      
      // Tạo prompt
      const prompt = `Hãy đóng vai trợ lý ảo, xem video này và tóm tắt các ý chính bằng tiếng Việt. Liệt kê dưới dạng gạch đầu dòng.`;

      // Sử dụng inlineData trực tiếp cho video (file < 10MB)
      // Gemini 1.5/2.5 hỗ trợ inlineData cho video nhỏ
      console.log("📤 Đang gửi video trực tiếp đến Gemini...");
      console.log(`   File info: ${videoFile.originalname}, size: ${(videoFile.size / 1024 / 1024).toFixed(2)}MB, type: ${videoFile.mimetype}`);
      
      // Chuyển video sang base64
      const videoBase64 = videoData.toString("base64");
      console.log(`   Base64 size: ${(videoBase64.length / 1024 / 1024).toFixed(2)}MB`);
      
      let result;
      try {
        console.log("🤖 Đang gửi video và prompt đến model...");
        result = await model.generateContent([
          {
            inlineData: {
              data: videoBase64,
              mimeType: videoFile.mimetype,
            },
          },
          { text: prompt },
        ]);
        console.log("✅ Đã nhận phản hồi từ model");
      } catch (generateError) {
        console.error("❌ Lỗi khi generate content:");
        console.error("   Error type:", generateError.constructor.name);
        console.error("   Message:", generateError.message);
        console.error("   Stack:", generateError.stack);
        
        // Xử lý lỗi cụ thể
        let errorMsg = `Không thể xử lý video: ${generateError.message || String(generateError)}`;
        const errorStr = String(generateError.message || generateError).toLowerCase();
        
        if (errorStr.includes("413") || errorStr.includes("too large") || errorStr.includes("payload")) {
          errorMsg = "File video quá lớn. Vui lòng chọn video nhỏ hơn 10MB.";
        } else if (errorStr.includes("403") || errorStr.includes("permission") || errorStr.includes("forbidden")) {
          errorMsg = "API Key không có quyền xử lý video hoặc đã hết quota";
        } else if (errorStr.includes("400") || errorStr.includes("invalid") || errorStr.includes("unsupported")) {
          errorMsg = "Định dạng video không được hỗ trợ. Vui lòng thử với video MP4 hoặc MOV.";
        } else if (errorStr.includes("video") && errorStr.includes("not supported")) {
          errorMsg = "Model này không hỗ trợ xử lý video. Vui lòng thử lại sau.";
        }
        
        throw new Error(errorMsg);
      }

      const response = await result.response;
      let summary = response.text();

      // Loại bỏ các dấu markdown không cần thiết
      summary = summary.replace(/^\*\*+|\*+$/g, "").trim();
      summary = summary
        .split("\n")
        .map((line) => line.replace(/^\*\*+|\*+$/g, "").trim())
        .join("\n");

      console.log(`✅ Đã nhận tóm tắt từ Gemini`);

      // Xóa file tạm
      fs.unlinkSync(tempFilePath);

      return res.json({
        summary,
        timestamp: new Date().toISOString(),
        videoName: videoFile.originalname,
        videoSize: videoFile.size,
      });
    } catch (geminiError) {
      // Xóa file tạm nếu có lỗi
      if (fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (unlinkError) {
          console.warn("⚠️ Không thể xóa file tạm:", unlinkError.message);
        }
      }

      console.error("❌ Lỗi khi gọi Gemini API:");
      console.error("   Message:", geminiError.message);
      console.error("   Stack:", geminiError.stack);
      console.error("   Full error:", JSON.stringify(geminiError, null, 2));

      // Xử lý lỗi cụ thể
      let errorMessage = "Lỗi khi xử lý video với AI";
      let errorDetails = geminiError.message || String(geminiError);

      // Kiểm tra các loại lỗi phổ biến
      const errorStr = String(geminiError.message || geminiError).toLowerCase();
      
      if (errorStr.includes("403") || errorStr.includes("permission") || errorStr.includes("forbidden")) {
        errorMessage = "API Key không hợp lệ hoặc không có quyền truy cập";
        errorDetails =
          "Vui lòng kiểm tra GEMINI_API_KEY trong file .env. Đảm bảo API key hợp lệ và đã được kích hoạt trong Google AI Studio.";
      } else if (errorStr.includes("400") || errorStr.includes("bad request") || errorStr.includes("invalid")) {
        errorMessage = "Video không hợp lệ hoặc không được hỗ trợ";
        errorDetails =
          "Gemini không thể xử lý video này. Vui lòng thử với video khác (MP4, MOV) hoặc giảm kích thước file.";
      } else if (errorStr.includes("429") || errorStr.includes("quota") || errorStr.includes("rate limit")) {
        errorMessage = "Đã vượt quá giới hạn API";
        errorDetails = "Vui lòng thử lại sau.";
      } else if (errorStr.includes("file") && errorStr.includes("upload")) {
        errorMessage = "Không thể upload video lên Gemini";
        errorDetails = "Có thể do kết nối mạng hoặc file quá lớn. Vui lòng thử lại.";
      } else if (errorStr.includes("timeout")) {
        errorMessage = "Quá trình xử lý video quá lâu";
        errorDetails = "Video có thể quá dài hoặc phức tạp. Vui lòng thử với video ngắn hơn.";
      }

      return res.status(500).json({
        error: errorMessage,
        details: errorDetails,
        rawError: process.env.NODE_ENV === "development" ? String(geminiError) : undefined,
      });
    }
  } catch (error) {
    console.error("❌ Lỗi trong summarizeVideo:", error);
    return res.status(500).json({
      error: "Lỗi khi xử lý video",
      details: error.message || "Đã có lỗi xảy ra khi xử lý video",
    });
  }
};

// Tóm tắt video từ URL
export const summarizeVideoFromUrl = async (req, res) => {
  try {
    // Kiểm tra API key
    if (!genAI || !GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY chưa được cấu hình",
        details: "Vui lòng thêm GEMINI_API_KEY vào file .env",
      });
    }

    const { videoUrl } = req.body;

    if (!videoUrl || typeof videoUrl !== "string") {
      return res.status(400).json({
        error: "Thiếu videoUrl",
        details: "Vui lòng cung cấp videoUrl hợp lệ",
      });
    }

    console.log(`📹 Đang tải video từ URL: ${videoUrl}`);

    // Tải video từ URL
    let videoData;
    let videoMimeType = "video/mp4";
    let videoFileName = "video.mp4";

    try {
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Lấy content-type từ header
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("video/")) {
        videoMimeType = contentType;
      }

      // Lấy tên file từ URL
      try {
        const urlObj = new URL(videoUrl);
        const pathname = urlObj.pathname;
        const filename = pathname.split("/").pop() || "video.mp4";
        videoFileName = filename;
      } catch (e) {
        // Ignore URL parsing errors
      }

      videoData = Buffer.from(await response.arrayBuffer());
      console.log(`✅ Đã tải video: ${videoFileName} (${(videoData.length / 1024 / 1024).toFixed(2)}MB)`);
    } catch (fetchError) {
      console.error("❌ Lỗi khi tải video từ URL:", fetchError);
      return res.status(400).json({
        error: "Không thể tải video từ URL",
        details: fetchError.message || "URL không hợp lệ hoặc không thể truy cập",
      });
    }

    // Kiểm tra kích thước
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (videoData.length > maxSize) {
      return res.status(400).json({
        error: "File video quá lớn",
        details: `Kích thước file tối đa là 10MB. File của bạn: ${(videoData.length / 1024 / 1024).toFixed(2)}MB`,
      });
    }

    // Lưu file tạm thời
    const tempDir = join(__dirname, "..", "..", "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = join(tempDir, `video_url_${Date.now()}_${videoFileName}`);
    fs.writeFileSync(tempFilePath, videoData);

    try {
      // Sử dụng Gemini 2.5 Flash để xử lý video (ưu tiên)
      const modelNames = [
        "gemini-2.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-pro-latest",
        "gemini-1.5-pro",
      ];
      
      let model = null;
      let modelName = null;
      let lastError = null;
      
      for (const testModelName of modelNames) {
        try {
          console.log(`🔧 Đang thử model: ${testModelName}`);
          model = genAI.getGenerativeModel({ model: testModelName });
          modelName = testModelName;
          console.log(`✅ Đã chọn model: ${testModelName}`);
          break;
        } catch (modelError) {
          console.warn(`⚠️ Model ${testModelName} không khả dụng:`, modelError.message);
          lastError = modelError;
          continue;
        }
      }
      
      if (!model) {
        throw new Error(`Không thể khởi tạo model. Đã thử: ${modelNames.join(", ")}. Lỗi: ${lastError?.message || "Unknown"}`);
      }

      console.log(`🤖 Đang gửi video đến Gemini ${modelName}...`);

      // Tạo prompt
      const prompt = `Hãy đóng vai trợ lý ảo, xem video này và tóm tắt các ý chính bằng tiếng Việt. Liệt kê dưới dạng gạch đầu dòng.`;

      // Chuyển video sang base64
      const videoBase64 = videoData.toString("base64");
      console.log(`   Base64 size: ${(videoBase64.length / 1024 / 1024).toFixed(2)}MB`);
      
      console.log("🤖 Đang gửi video và prompt đến model...");
      const result = await model.generateContent([
        {
          inlineData: {
            data: videoBase64,
            mimeType: videoMimeType,
          },
        },
        { text: prompt },
      ]);
      console.log("✅ Đã nhận phản hồi từ model");

      const response = await result.response;
      let summary = response.text();

      // Loại bỏ các dấu markdown không cần thiết
      summary = summary.replace(/^\*\*+|\*+$/g, "").trim();
      summary = summary
        .split("\n")
        .map((line) => line.replace(/^\*\*+|\*+$/g, "").trim())
        .join("\n");

      console.log(`✅ Đã nhận tóm tắt từ Gemini`);

      // Xóa file tạm
      fs.unlinkSync(tempFilePath);

      return res.json({
        summary,
        timestamp: new Date().toISOString(),
        videoName: videoFileName,
        videoSize: videoData.length,
      });
    } catch (geminiError) {
      // Xóa file tạm nếu có lỗi
      if (fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (unlinkError) {
          console.warn("⚠️ Không thể xóa file tạm:", unlinkError.message);
        }
      }

      console.error("❌ Lỗi khi gọi Gemini API:", geminiError);
      
      let errorMessage = "Lỗi khi xử lý video với AI";
      let errorDetails = geminiError.message || String(geminiError);
      const errorStr = String(geminiError.message || geminiError).toLowerCase();
      
      if (errorStr.includes("403") || errorStr.includes("permission") || errorStr.includes("forbidden")) {
        errorMessage = "API Key không hợp lệ hoặc không có quyền truy cập";
        errorDetails = "Vui lòng kiểm tra GEMINI_API_KEY trong file .env";
      } else if (errorStr.includes("400") || errorStr.includes("bad request") || errorStr.includes("invalid")) {
        errorMessage = "Video không hợp lệ hoặc không được hỗ trợ";
        errorDetails = "Gemini không thể xử lý video này. Vui lòng thử với video khác.";
      } else if (errorStr.includes("429") || errorStr.includes("quota") || errorStr.includes("rate limit")) {
        errorMessage = "Đã vượt quá giới hạn API";
        errorDetails = "Vui lòng thử lại sau.";
      }

      return res.status(500).json({
        error: errorMessage,
        details: errorDetails,
      });
    }
  } catch (error) {
    console.error("❌ Lỗi trong summarizeVideoFromUrl:", error);
    return res.status(500).json({
      error: "Lỗi khi xử lý video",
      details: error.message || "Đã có lỗi xảy ra khi xử lý video",
    });
  }
};

