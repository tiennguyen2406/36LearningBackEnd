import Category from "../models/Category.js";
import Course from "../models/Course.js";

export const createCategory = async (req, res) => {
  try {
    const data = req.body;
    const category = await Category.create({
      name: data.name,
      iconUrl: data.iconUrl || "",
      description: data.description || "",
      courseCount: data.courseCount || 0,
      isActive: data.isActive ?? true,
    });
    res.status(201).json({ message: "Category created", id: category._id.toString() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    const list = categories.map(category => ({
      id: category._id.toString(),
      ...category.toObject(),
      _id: undefined,
    }));
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
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    const categoryData = {
      id: category._id.toString(),
      ...category.toObject(),
      _id: undefined,
    };
    res.status(200).json(categoryData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Cập nhật số lượng khóa học cho tất cả danh mục
export const updateAllCategoryCounts = async (req, res) => {
  try {
    // Lấy tất cả categories
    const categories = await Category.find();

    const results = [];

    // Cập nhật courseCount cho từng danh mục
    for (const category of categories) {
      // Đếm số khóa học thuộc danh mục này
      const coursesCount = await Course.countDocuments({
        category: category._id,
        isPublished: true,
      });

      // Cập nhật courseCount trong database
      category.courseCount = coursesCount;
      await category.save();

      console.log(`Đã cập nhật danh mục "${category.name}": ${coursesCount} khóa học`);
      results.push({
        id: category._id.toString(),
        name: category.name,
        courseCount: coursesCount,
      });
    }

    // Thử lấy lại sau khi cập nhật để xác nhận
    const updatedCategories = await Category.find();

    res.status(200).json({
      message: "Cập nhật thành công số lượng khóa học cho tất cả danh mục",
      results,
      categories: updatedCategories.map(cat => ({
        id: cat._id.toString(),
        ...cat.toObject(),
        _id: undefined,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};
