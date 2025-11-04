import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Lưu ý: Firebase chỉ được dùng cho Realtime Database
// Tất cả dữ liệu chính (Users, Courses, Categories, Lessons) đã chuyển sang MongoDB

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, "base64").toString("utf8");
    return JSON.parse(decoded);
  }
  if (fs.existsSync("./serviceAccountKey.json")) {
    return JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));
  }
  throw new Error("Missing Firebase service account credentials");
}

const serviceAccount = loadServiceAccount();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://app36learning-default-rtdb.asia-southeast1.firebasedatabase.app",
});

// Realtime Database - dùng cho các chức năng realtime (chat, notifications, etc.)
const realtimeDB = admin.database();

// Export chỉ realtimeDB vì Firestore đã được thay thế bằng MongoDB
export { realtimeDB };
