import { firestore } from "../firebase.js";

// Tạo user mới
export const createUser = async (req, res) => {
  try {
    const data = req.body;

    // Regex patterns
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;

    // Validate fields
    if (!emailRegex.test(data.email)) {
      return res.status(400).json({ error: "Email không hợp lệ!" });
    }
    if (!usernameRegex.test(data.username)) {
      return res.status(400).json({ error: "Tên đăng nhập không hợp lệ! Chỉ cho phép chữ, số, dấu gạch dưới và từ 3-20 ký tự." });
    }
    if (!passwordRegex.test(data.password)) {
      return res.status(400).json({ error: "Mật khẩu không hợp lệ! Phải tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường và số." });
    }

    const userDocRef = data.uid
      ? firestore.collection("Users").doc(data.uid)
      : firestore.collection("Users").doc();
    await userDocRef.set({
      email: data.email || "",
      username: data.username || "",
      password: data.password || "", // thêm password
      fullName: data.fullName || "",
      profileImage: data.profileImage || "",
      createdAt: new Date(),
      lastLogin: new Date(),
      role: data.role || "student",
      preferences: data.preferences || { language: "vi", darkMode: false, notifications: true },
    });
    res.status(201).json({ message: "User created", uid: userDocRef.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

export const getUsers = async (req, res) => {
  try {
    const snapshot = await firestore.collection("Users").get();
    const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};
