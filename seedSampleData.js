import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import User from "./src/models/User.js";
import Course from "./src/models/Course.js";
import Category from "./src/models/Category.js";
import Lesson from "./src/models/Lesson.js";

// Lấy đường dẫn thư mục hiện tại
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env từ thư mục root của project (file seed đã ở root)
dotenv.config({ path: join(__dirname, ".env") });

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function seed() {
  // Kiểm tra MONGO_URI
  if (!process.env.MONGO_URI) {
    console.error("❌ Lỗi: MONGO_URI không được tìm thấy trong file .env");
    console.error("Vui lòng tạo file .env trong thư mục root và thêm:");
    console.error("MONGO_URI=mongodb://localhost:27017/your-database-name");
    process.exit(1);
  }

  // Lấy tên database từ MONGO_URI
  const uriParts = process.env.MONGO_URI.split('/');
  let dbName = uriParts[uriParts.length - 1]?.split('?')[0] || '';
  
  // Nếu không có tên database trong URI, cảnh báo
  if (!dbName || dbName === '') {
    console.warn("⚠️  Cảnh báo: Connection string không có tên database!");
    console.warn("   MongoDB sẽ tự động tạo database khi có document đầu tiên.");
    console.warn("   Nên thêm tên database vào URI: mongodb+srv://.../database-name?appName=KT");
    dbName = "(sẽ tự động tạo)";
  }
  console.log(`📦 Đang kết nối đến database: ${dbName}`);

  // Kết nối MongoDB
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
  } catch (error) {
    console.error("❌ Lỗi kết nối MongoDB:", error.message);
    process.exit(1);
  }

  // ----- Users (Instructors) -----
  const instructors = Array.from({ length: 10 }).map((_, i) => {
    const idx = (i + 1).toString().padStart(2, "0");
    return {
      email: `instructor${idx}@example.com`,
      username: `instructor${idx}`,
      password: `Passw0rd!${idx}`,
      fullName: `Instructor ${idx}`,
      profileImage: "",
      role: "instructor",
      preferences: { language: "vi", darkMode: false, notifications: true },
    };
  });

  console.log("\n📝 Bắt đầu tạo dữ liệu...");
  
  for (let user of instructors) {
    try {
      await User.findOneAndUpdate(
        { username: user.username },
        { ...user, enrolledCourses: [] },
        { upsert: true, new: true }
      );
      console.log(`✅ Upserted Instructor: ${user.username}`);
    } catch (error) {
      console.error(`❌ Lỗi khi tạo user ${user.username}:`, error.message);
    }
  }
  
  console.log(`\n✅ Đã tạo ${instructors.length} instructors`);

  // Gán ngẫu nhiên 2-4 khóa học cho mỗi instructor nếu dữ liệu khóa học đã có
  try {
    const courses = await Course.find().limit(20);
    const courseIds = courses.map((c) => c._id);
    if (courseIds.length) {
      // Upsert user 'congy' and assign 8 courses
      try {
        const eight = courseIds.slice(0, Math.min(8, courseIds.length));
        await User.findOneAndUpdate(
          { username: "congy" },
          {
            email: "congy@example.com",
            username: "congy",
            password: "Passw0rd!",
            fullName: "Congy",
            role: "student",
            preferences: { language: "vi", darkMode: false, notifications: true },
            enrolledCourses: eight,
          },
          { upsert: true, new: true }
        );
        console.log(`Upserted user 'congy' with ${eight.length} courses`);
      } catch (e) {
        console.error("Error upserting congy:", e);
      }

      for (let user of instructors) {
        const count = Math.max(2, Math.min(4, Math.floor(Math.random() * 5)));
        const shuffled = [...courseIds].sort(() => Math.random() - 0.5);
        const picks = shuffled.slice(0, count);
        await User.findOneAndUpdate(
          { username: user.username },
          { enrolledCourses: picks },
          { upsert: true }
        );
        console.log(`Assigned ${picks.length} courses to ${user.username}`);
      }
    }
  } catch (e) {
    console.error("Error assigning courses:", e);
  }

  // ----- Categories -----
  const categories = [
    { name: "Graphic Design", iconUrl: "", description: "Khóa học về thiết kế đồ họa.", isActive: true },
    { name: "Web Development", iconUrl: "", description: "Khóa học lập trình web chuyên sâu.", isActive: true },
    { name: "SEO & Marketing", iconUrl: "", description: "Tối ưu hóa & tiếp thị số.", isActive: true },
    { name: "Finance & Accounting", iconUrl: "", description: "Tài chính & kế toán cơ bản đến nâng cao.", isActive: true },
    { name: "Personal Development", iconUrl: "", description: "Phát triển bản thân và kỹ năng sống.", isActive: true },
    { name: "3D Design", iconUrl: "", description: "Thiết kế 3D chuyên sâu.", isActive: true },
    { name: "Office Productivity", iconUrl: "", description: "Tăng hiệu quả làm việc với Office.", isActive: true },
    { name: "HR Management", iconUrl: "", description: "Nhân sự & quản trị con người.", isActive: true }
  ];

  const categoryRefs = [];
  for (let cat of categories) {
    const category = await Category.findOneAndUpdate(
      { name: cat.name },
      cat,
      { upsert: true, new: true }
    );
    categoryRefs.push(category);
    console.log(`Upserted Category: ${cat.name}`);
  }

  const catId = (name) => categoryRefs.find(c => c.name === name)?._id || null;

  // ----- Courses -----
  const courses = [
    { title: "React for Beginners", categoryName: "Web Development", instructor: "teacher01", description: "Học React từ cơ bản tới nâng cao", imageUrl: "", price: 50, rating: 4.8, students: 100, isPublished: true, duration: 360 },
    { title: "Photoshop Master", categoryName: "Graphic Design", instructor: "teacher02", description: "Thành thạo photoshop chuyên nghiệp.", imageUrl: "", price: 90, rating: 4.6, students: 80, isPublished: false, duration: 400 },
    { title: "SEO Fundamentals", categoryName: "SEO & Marketing", instructor: "teacher03", description: "Nắm vững SEO từ đầu cho doanh nghiệp nhỏ.", imageUrl: "", price: 50, rating: 4.3, students: 70, isPublished: true, duration: 120 },
    { title: "Excel for Office", categoryName: "Office Productivity", instructor: "teacher05", description: "Làm chủ Excel cho dân văn phòng.", imageUrl: "", price: 35, rating: 4.7, students: 150, isPublished: true, duration: 88 },
    { title: "Finance 101", categoryName: "Finance & Accounting", instructor: "teacher06", description: "Nhập môn tài chính cá nhân.", imageUrl: "", price: 40, rating: 4.2, students: 55, isPublished: true, duration: 70 },
  ];

  const courseRefs = [];
  for (let c of courses) {
    const category = catId(c.categoryName);
    const created = await Course.create({
      title: c.title,
      description: c.description,
      category,
      instructor: c.instructor,
      imageUrl: c.imageUrl,
      price: c.price,
      rating: c.rating,
      students: c.students,
      isPublished: c.isPublished,
      duration: c.duration,
      totalLessons: 0,
    });
    courseRefs.push(created);
    console.log(`Upserted Course: ${created.title}`);
  }

  // ----- Lessons (3-5 bài mỗi khóa) -----
  for (let course of courseRefs) {
    const lessonsCount = Math.floor(Math.random() * 3) + 3; // 3..5
    for (let i = 1; i <= lessonsCount; i++) {
      const lesson = await Lesson.create({
        courseId: course._id,
        title: `${course.title} - Lesson ${i}`,
        description: `Bài ${i} của khóa: ${course.title}`,
        videoUrl: "",
        duration: 10 + i * 3,
        order: i,
        attachments: [],
        isPreview: i === 1,
      });
      if (i === lessonsCount) {
        course.totalLessons = lessonsCount;
        await course.save();
      }
      console.log(`Created Lesson: ${lesson.title}`);
    }
  }
  
  // Đếm số documents đã tạo
  const userCount = await User.countDocuments();
  const courseCount = await Course.countDocuments();
  const categoryCount = await Category.countDocuments();
  const lessonCount = await Lesson.countDocuments();
  
  console.log("\n📊 Tổng kết dữ liệu đã tạo:");
  console.log(`   - Users: ${userCount}`);
  console.log(`   - Courses: ${courseCount}`);
  console.log(`   - Categories: ${categoryCount}`);
  console.log(`   - Lessons: ${lessonCount}`);
  console.log(`\n✅ Seed hoàn tất! Database "${mongoose.connection.db.databaseName}" đã được tạo.`);
  
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
