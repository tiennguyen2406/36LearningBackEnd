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

    // Kiểm tra kích thước file (tối đa 20MB cho Gemini 1.5 Flash)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (videoFile.size > maxSize) {
      return res.status(400).json({
        error: "File video quá lớn",
        details: `Kích thước file tối đa là 20MB. File của bạn: ${(videoFile.size / 1024 / 1024).toFixed(2)}MB`,
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
      // Sử dụng Gemini 1.5 Flash để xử lý video
      const modelName = "gemini-1.5-flash";
      const model = genAI.getGenerativeModel({ model: modelName });

      console.log(`🤖 Đang gửi video đến Gemini ${modelName}...`);

      // Đọc file video
      const videoData = fs.readFileSync(tempFilePath);
      
      // Tạo prompt
      const prompt = `Hãy đóng vai trợ lý ảo, xem video này và tóm tắt các ý chính bằng tiếng Việt. Liệt kê dưới dạng gạch đầu dòng.`;

      let result;
      
      // Với file lớn hơn 2MB, sử dụng File API
      // Với file nhỏ hơn, có thể dùng inlineData
      if (videoFile.size > 2 * 1024 * 1024) {
        // Upload file lên Gemini File API
        console.log("📤 Đang upload video lên Gemini File API...");
        const uploadResult = await genAI.uploadFile({
          fileData: {
            data: videoData,
            mimeType: videoFile.mimetype,
          },
          displayName: videoFile.originalname,
        });
        
        console.log(`✅ Đã upload file: ${uploadResult.file.uri}`);
        
        // Đợi file được xử lý
        let file = await genAI.getFile(uploadResult.file.name);
        let timeout = 0;
        while (file.state === "PROCESSING" && timeout < 60) {
          console.log("⏳ Đang chờ file được xử lý...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
          file = await genAI.getFile(uploadResult.file.name);
          timeout += 2;
        }
        
        if (file.state === "FAILED") {
          throw new Error("File upload failed");
        }
        
        // Sử dụng file đã upload
        result = await model.generateContent([
          {
            fileData: {
              fileUri: uploadResult.file.uri,
              mimeType: videoFile.mimetype,
            },
          },
          { text: prompt },
        ]);
        
        // Xóa file sau khi sử dụng
        try {
          await genAI.deleteFile(uploadResult.file.name);
        } catch (deleteError) {
          console.warn("⚠️ Không thể xóa file từ Gemini:", deleteError.message);
        }
      } else {
        // Sử dụng inlineData cho file nhỏ
        const videoBase64 = videoData.toString("base64");
        result = await model.generateContent([
          {
            inlineData: {
              data: videoBase64,
              mimeType: videoFile.mimetype,
            },
          },
          { text: prompt },
        ]);
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
        fs.unlinkSync(tempFilePath);
      }

      console.error("❌ Lỗi khi gọi Gemini API:", geminiError);

      // Xử lý lỗi cụ thể
      let errorMessage = "Lỗi khi xử lý video với AI";
      let errorDetails = geminiError.message;

      if (geminiError.message && geminiError.message.includes("403")) {
        errorMessage = "API Key không hợp lệ hoặc không có quyền truy cập";
        errorDetails =
          "Vui lòng kiểm tra GEMINI_API_KEY trong file .env. Đảm bảo API key hợp lệ và đã được kích hoạt trong Google AI Studio.";
      } else if (geminiError.message && geminiError.message.includes("400")) {
        errorMessage = "Video không hợp lệ hoặc quá lớn";
        errorDetails =
          "Gemini không thể xử lý video này. Vui lòng thử với video khác hoặc giảm kích thước file.";
      } else if (geminiError.message && geminiError.message.includes("429")) {
        errorMessage = "Đã vượt quá giới hạn API";
        errorDetails = "Vui lòng thử lại sau.";
      }

      return res.status(500).json({
        error: errorMessage,
        details: errorDetails,
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

