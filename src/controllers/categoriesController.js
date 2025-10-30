import { firestore } from "../firebase.js";

export const createCategory = async (req, res) => {
  try {
    const data = req.body;
    const categoryRef = firestore.collection("Categories").doc();
    await categoryRef.set({
      id: categoryRef.id,
      name: data.name,
      iconUrl: data.iconUrl || "",
      description: data.description || "",
      courseCount: data.courseCount || 0,
      isActive: data.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    res.status(201).json({ message: "Category created", id: categoryRef.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

export const getCategories = async (req, res) => {
  try {
    const snapshot = await firestore.collection("Categories").get();
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Lấy category theo ID
export const getCategoryById = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const doc = await firestore.collection("Categories").doc(categoryId).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: "Category not found" });
    }
    
    const category = { id: doc.id, ...doc.data() };
    res.status(200).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Cập nhật số lượng khóa học cho tất cả danh mục
export const updateAllCategoryCounts = async (req, res) => {
  try {
    // Lấy tất cả categories
    const categoriesSnapshot = await firestore.collection("Categories").get();
    const categories = categoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const results = [];
    
    // Cập nhật courseCount cho từng danh mục
    for (const category of categories) {
      // Đếm số khóa học thuộc danh mục này
      const coursesCount = await firestore
        .collection("Courses")
        .where("category", "==", category.id)
        .where("isPublished", "==", true)
        .get()
        .then(snapshot => snapshot.size);
      
      // Cập nhật courseCount trong database
      await firestore.collection("Categories").doc(category.id).update({
        courseCount: coursesCount,
        updatedAt: new Date()
      });
      
      console.log(`Đã cập nhật danh mục "${category.name}": ${coursesCount} khóa học`);
      results.push({ id: category.id, name: category.name, courseCount: coursesCount });
    }
    
    // Thử lấy lại sau khi cập nhật để xác nhận
    const updatedCategories = await firestore.collection("Categories").get().then(
      snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    );
    
    res.status(200).json({ 
      message: "Cập nhật thành công số lượng khóa học cho tất cả danh mục", 
      results,
      categories: updatedCategories
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};