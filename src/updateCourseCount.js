import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import Category from "./models/Category.js";
import Course from "./models/Course.js";

// Lấy đường dẫn thư mục hiện tại
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env từ thư mục root của project
dotenv.config({ path: join(__dirname, "..", ".env") });

async function updateCourseCount() {
  try {
    // Kết nối MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");

    // Lấy tất cả categories
    const categories = await Category.find();

    console.log(`Tìm thấy ${categories.length} danh mục`);

    // Cập nhật courseCount cho từng danh mục
    for (const category of categories) {
      // Đếm số khóa học thuộc danh mục này
      const coursesCount = await Course.countDocuments({
        category: category._id,
        isPublished: true,
      });

      // Cập nhật courseCount trong database
      category.courseCount = coursesCount;
      await category.save();

      console.log(`Đã cập nhật danh mục "${category.name}": ${coursesCount} khóa học`);
    }

    console.log("Hoàn tất cập nhật courseCount cho tất cả danh mục!");
  } catch (error) {
    console.error("Lỗi khi cập nhật courseCount:", error);
  } finally {
    await mongoose.connection.close();
  }
}

updateCourseCount()
  .then(() => {
    console.log("Đã hoàn thành!");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
