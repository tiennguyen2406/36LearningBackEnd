// Test MongoDB Connection
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://khaitien600_db_user:123@kt.3je3tjx.mongodb.net/app36learning?retryWrites=true&w=majority";

async function testConnection() {
  try {
    console.log("🔄 Đang kết nối MongoDB...");
    console.log("URI:", MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")); // Ẩn password

    await mongoose.connect(MONGODB_URI);

    console.log("✅ Kết nối MongoDB thành công!");
    console.log("📊 Database:", mongoose.connection.name);
    console.log("🌐 Host:", mongoose.connection.host);

    await mongoose.disconnect();
    console.log("👋 Đã ngắt kết nối");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi kết nối MongoDB:", error.message);
    process.exit(1);
  }
}

testConnection();
