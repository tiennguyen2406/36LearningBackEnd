import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import User from "./src/models/User.js";

// Lấy đường dẫn thư mục hiện tại
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env từ thư mục root của project
dotenv.config({ path: join(__dirname, ".env") });

async function createTestUser() {
  // Kiểm tra MONGO_URI
  if (!process.env.MONGO_URI) {
    console.error("❌ Lỗi: MONGO_URI không được tìm thấy trong file .env");
    process.exit(1);
  }

  // Kết nối MongoDB
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ Lỗi kết nối MongoDB:", error.message);
    process.exit(1);
  }

  // Tạo user test
  const testUsers = [
    {
      email: "admin@test.com",
      username: "admin",
      password: "Admin123",
      fullName: "Admin User",
      role: "admin",
    },
    {
      email: "test@test.com",
      username: "test",
      password: "Test1234",
      fullName: "Test User",
      role: "student",
    },
    {
      email: "congy@example.com",
      username: "congy",
      password: "Passw0rd!",
      fullName: "Congy",
      role: "student",
    },
  ];

  console.log("\n📝 Đang tạo user test...");

  for (const userData of testUsers) {
    try {
      const user = await User.findOneAndUpdate(
        { username: userData.username },
        {
          ...userData,
          preferences: { language: "vi", darkMode: false, notifications: true },
          enrolledCourses: [],
        },
        { upsert: true, new: true }
      );
      console.log(`✅ User "${userData.username}" đã được tạo/cập nhật`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   Password: ${userData.password}`);
      console.log(`   Role: ${userData.role}`);
    } catch (error) {
      console.error(`❌ Lỗi khi tạo user ${userData.username}:`, error.message);
    }
  }

  console.log("\n✅ Hoàn thành! Bạn có thể đăng nhập với:");
  console.log("   - Username: admin, Password: Admin123 (admin)");
  console.log("   - Username: test, Password: Test1234 (student)");
  console.log("   - Username: congy, Password: Passw0rd! (student)");

  await mongoose.disconnect();
  process.exit(0);
}

createTestUser().catch((err) => {
  console.error(err);
  process.exit(1);
});

