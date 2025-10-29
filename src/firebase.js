import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccountKey.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://app36learning-default-rtdb.asia-southeast1.firebasedatabase.app", // Realtime Database
});

const firestore = admin.firestore();
const realtimeDB = admin.database();

export { firestore, realtimeDB };
