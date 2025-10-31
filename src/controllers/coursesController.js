import { firestore } from "../firebase.js";

// Function helper để cập nhật courseCount
async function updateCategoryCount(categoryId) {
  if (!categoryId) return;
  
  try {
    const courseCount = await firestore
      .collection("Courses")
      .where("category", "==", categoryId)
      .where("isPublished", "==", true)
      .get()
      .then(snapshot => snapshot.size);
      
    await firestore.collection("Categories").doc(categoryId).update({
      courseCount,
      updatedAt: new Date()
    });
    
    console.log(`Đã cập nhật courseCount cho danh mục ${categoryId}: ${courseCount}`);
  } catch (error) {
    console.error(`Lỗi khi cập nhật courseCount cho ${categoryId}:`, error);
  }
}

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
    
    // Cập nhật số lượng khóa học trong danh mục
    if (data.category) {
      await updateCategoryCount(data.category);
    }
    
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

// Lấy chi tiết course theo ID
export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const docSnap = await firestore.collection("Courses").doc(id).get();
    if (!docSnap.exists) return res.status(404).send("Course not found");

    const data = docSnap.data() || {};
    let categoryName = undefined;
    if (data.category) {
      const categorySnap = await firestore.collection("Categories").doc(data.category).get();
      if (categorySnap.exists) categoryName = categorySnap.data().name;
    }
    return res.status(200).json({ id: docSnap.id, ...data, categoryName });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Lấy danh sách courses theo category ID
export const getCoursesByCategory = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    
    // Lấy courses với điều kiện category = categoryId và isPublished = true (nếu specified)
    let query = firestore.collection("Courses").where("category", "==", categoryId);
    
    // Kiểm tra nếu có yêu cầu lọc theo isPublished
    const { published } = req.query;
    if (published !== undefined) {
      const isPublished = published === 'true';
      query = query.where("isPublished", "==", isPublished);
    }
    
    // Lấy thông tin chi tiết về danh mục
    const categoryDoc = await firestore.collection("Categories").doc(categoryId).get();
    const categoryName = categoryDoc.exists ? categoryDoc.data().name : "Unknown";
    
    const snapshot = await query.get();
    const courses = snapshot.docs.map(doc => {
      const data = doc.data();
      // Thay thế ID của danh mục bằng tên danh mục để dễ hiển thị
      return {
        id: doc.id,
        ...data,
        categoryName: categoryName, // Thêm tên danh mục
        categoryId: data.category // Giữ lại ID danh mục với tên khác
      };
    });
    
    res.status(200).json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Cập nhật course
export const updateCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const data = req.body;
    
    // Lấy thông tin khóa học cũ để biết category cũ
    const courseRef = firestore.collection("Courses").doc(courseId);
    const courseDoc = await courseRef.get();
    
    if (!courseDoc.exists) {
      return res.status(404).json({ error: "Course not found" });
    }
    
    const oldCategoryId = courseDoc.data().category;
    const oldPublished = courseDoc.data().isPublished;
    
    // Cập nhật khóa học
    await courseRef.update({
      ...data,
      updatedAt: new Date()
    });
    
    // Cập nhật số lượng khóa học cho các danh mục nếu cần
    const newCategoryId = data.category;
    const newPublished = data.isPublished;
    
    // Cập nhật nếu thay đổi danh mục hoặc thay đổi trạng thái xuất bản
    if (newCategoryId !== undefined && newCategoryId !== oldCategoryId) {
      // Nếu thay đổi danh mục, cập nhật cả danh mục cũ và mới
      await updateCategoryCount(oldCategoryId);
      await updateCategoryCount(newCategoryId);
    } else if (newPublished !== undefined && newPublished !== oldPublished) {
      // Nếu chỉ thay đổi trạng thái xuất bản, cập nhật danh mục hiện tại
      await updateCategoryCount(oldCategoryId || data.category);
    }
    
    res.status(200).json({ message: "Course updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Xóa course
export const deleteCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    
    // Lấy thông tin khóa học để biết danh mục
    const courseRef = firestore.collection("Courses").doc(courseId);
    const courseDoc = await courseRef.get();
    
    if (!courseDoc.exists) {
      return res.status(404).json({ error: "Course not found" });
    }
    
    const categoryId = courseDoc.data().category;
    
    // Xóa khóa học
    await courseRef.delete();
    
    // Cập nhật số lượng khóa học trong danh mục
    if (categoryId) {
      await updateCategoryCount(categoryId);
    }
    
    res.status(200).json({ message: "Course deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};