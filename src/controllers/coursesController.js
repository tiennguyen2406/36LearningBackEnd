import { firestore } from "../firebase.js";

// Tạo course mới
export const createCourse = async (req, res) => {
  try {
    const data = req.body;
    const courseRef = firestore.collection("Courses").doc(); // tự tạo ID
    await courseRef.set({
      ...data,
      id: courseRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      students: 0,
      rating: 0,
      isPublished: false,
    });
    res.status(201).json({ message: "Course created", id: courseRef.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Lấy danh sách tất cả courses
export const getCourses = async (req, res) => {
  try {
    const snapshot = await firestore.collection("Courses").get();
    const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};