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

// Lấy thông tin user theo ID
export const getUserById = async (req, res) => {
  try {
    const uid = req.params.id;
    const userDoc = await firestore.collection("Users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }
    const userData = { uid: userDoc.id, ...userDoc.data() };
    res.status(200).json(userData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Cập nhật thông tin user
export const updateUser = async (req, res) => {
  try {
    const uid = req.params.id;
    const data = req.body;

    // Kiểm tra user có tồn tại không
    const userDoc = await firestore.collection("Users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    // Validate email nếu được cung cấp
    if (data.email) {
      const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
      if (!emailRegex.test(data.email)) {
        return res.status(400).json({ error: "Email không hợp lệ!" });
      }
    }

    // Xóa các trường không được phép cập nhật
    delete data.password;
    delete data.createdAt;
    delete data.username;

    // Cập nhật thông tin user
    await firestore.collection("Users").doc(uid).update({
      ...data,
      updatedAt: new Date()
    });
    res.status(200).json({ message: "Đã cập nhật thông tin người dùng" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Lấy danh sách khóa học của một user theo uid
export const getUserCourses = async (req, res) => {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: "Missing uid" });

    const userSnap = await firestore.collection("Users").doc(uid).get();
    if (!userSnap.exists) return res.status(404).json({ error: "User not found" });
    const user = { uid: userSnap.id, ...userSnap.data() };
    const enrolled = Array.isArray(user.enrolledCourses) ? user.enrolledCourses : [];

    if (!enrolled.length) return res.status(200).json([]);

    const coursePromises = enrolled.map((id) => firestore.collection("Courses").doc(id).get());
    const courseDocs = await Promise.all(coursePromises);
    const courses = courseDocs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() }));
    return res.status(200).json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Enroll user vào một course
export const enrollCourse = async (req, res) => {
  try {
    const { uid } = req.params;
    const { courseId } = req.body;
    
    if (!uid || !courseId) {
      return res.status(400).json({ error: "Missing uid or courseId" });
    }

    // Kiểm tra user có tồn tại không
    const userRef = firestore.collection("Users").doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    // Kiểm tra course có tồn tại không
    const courseDoc = await firestore.collection("Courses").doc(courseId).get();
    if (!courseDoc.exists) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Lấy enrolledCourses hiện tại
    const userData = userDoc.data();
    const enrolledCourses = Array.isArray(userData.enrolledCourses) ? userData.enrolledCourses : [];

    // Kiểm tra đã enroll chưa
    if (enrolledCourses.includes(courseId)) {
      return res.status(200).json({ message: "User đã tham gia khóa học này rồi" });
    }

    // Thêm courseId vào enrolledCourses
    await userRef.update({
      enrolledCourses: [...enrolledCourses, courseId],
      updatedAt: new Date()
    });

    res.status(200).json({ message: "Đã tham gia khóa học thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};