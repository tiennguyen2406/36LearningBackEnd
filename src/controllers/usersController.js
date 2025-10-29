import { firestore } from "../firebase.js";

// Tạo user mới
export const createUser = async (req, res) => {
  try {
    const data = req.body;
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
