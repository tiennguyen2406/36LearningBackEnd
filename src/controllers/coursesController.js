import Course from "../models/Course.js";
import Category from "../models/Category.js";
import Lesson from "../models/Lesson.js";

// Function helper để cập nhật courseCount
async function updateCategoryCount(categoryId) {
  if (!categoryId) return;

  try {
    const courseCount = await Course.countDocuments({
      category: categoryId,
      isPublished: true,
    });

    await Category.findByIdAndUpdate(categoryId, {
      courseCount,
      updatedAt: new Date(),
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
    const course = await Course.create({
      ...data,
      students: 0,
      rating: 0,
      isPublished: false,
    });

    // Nếu gửi kèm danh sách lessons, tạo hàng loạt
    if (Array.isArray(data.lessons) && data.lessons.length) {
      const lessonsPayload = data.lessons
        .filter(Boolean)
        .map((l) => ({
          courseId: course._id,
          title: l.title,
          description: l.description || "",
          videoUrl: l.videoUrl || "",
          duration: l.duration || 0,
          order: l.order || 0,
          attachments: l.attachments || [],
          isPreview: l.isPreview ?? false,
          kind: l.kind || (Array.isArray(l.questions) ? "quiz" : "video"),
          questions: Array.isArray(l.questions) ? l.questions : undefined,
        }));
      if (lessonsPayload.length) {
        await Lesson.insertMany(lessonsPayload);
      }
    }

    // Cập nhật số lượng khóa học trong danh mục
    if (data.category) {
      await updateCategoryCount(data.category);
    }

    res.status(201).json({ message: "Course created", id: course._id.toString() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Lấy danh sách tất cả courses
export const getCourses = async (req, res) => {
  try {
    const courses = await Course.find().populate("category", "name");

    // Lấy số lượng lessons thực tế cho mỗi course
    const coursesWithCategory = await Promise.all(
      courses.map(async (course) => {
        const lessonCount = await Lesson.countDocuments({ courseId: course._id });
        const courseObj = course.toObject();
        return {
          id: courseObj._id.toString(),
          ...courseObj,
          _id: undefined,
          categoryName: course.category?.name || undefined,
          category: course.category?._id.toString(),
          totalLessons: lessonCount,
        };
      })
    );

    res.status(200).json(coursesWithCategory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Lấy chi tiết course theo ID
export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id).populate("category", "name");
    if (!course) return res.status(404).send("Course not found");

    const courseObj = course.toObject();
    return res.status(200).json({
      id: courseObj._id.toString(),
      ...courseObj,
      _id: undefined,
      categoryName: course.category?.name || undefined,
      category: course.category?._id.toString(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Lấy danh sách courses theo category ID
export const getCoursesByCategory = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    console.log(`[getCoursesByCategory] Fetching courses for categoryId: ${categoryId}`);

    // Xây dựng query
    const query = { category: categoryId };

    // Kiểm tra nếu có yêu cầu lọc theo isPublished
    const { published } = req.query;
    if (published !== undefined) {
      query.isPublished = published === "true";
    }

    // Lấy thông tin chi tiết về danh mục
    const category = await Category.findById(categoryId);
    const categoryName = category ? category.name : "Unknown";
    console.log(`[getCoursesByCategory] Category name: ${categoryName}`);

    const courses = await Course.find(query).populate("category", "name");
    console.log(`[getCoursesByCategory] Found ${courses.length} courses for category ${categoryName}`);

    // Lấy số lượng lessons thực tế cho mỗi course
    const coursesWithLessons = await Promise.all(
      courses.map(async (course) => {
        const lessonCount = await Lesson.countDocuments({ courseId: course._id });
        const courseObj = course.toObject();
        return {
          id: courseObj._id.toString(),
          ...courseObj,
          _id: undefined,
          categoryName: categoryName,
          categoryId: course.category?._id.toString(),
          totalLessons: lessonCount,
        };
      })
    );

    res.status(200).json(coursesWithLessons);
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
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const oldCategoryId = course.category?.toString();
    const oldPublished = course.isPublished;

    // Cập nhật khóa học
    Object.assign(course, data);
    await course.save();

    // Cập nhật số lượng khóa học cho các danh mục nếu cần
    const newCategoryId = data.category?.toString();
    const newPublished = data.isPublished;

    // Cập nhật nếu thay đổi danh mục hoặc thay đổi trạng thái xuất bản
    if (newCategoryId !== undefined && newCategoryId !== oldCategoryId) {
      // Nếu thay đổi danh mục, cập nhật cả danh mục cũ và mới
      if (oldCategoryId) await updateCategoryCount(oldCategoryId);
      await updateCategoryCount(newCategoryId);
    } else if (newPublished !== undefined && newPublished !== oldPublished) {
      // Nếu chỉ thay đổi trạng thái xuất bản, cập nhật danh mục hiện tại
      await updateCategoryCount(oldCategoryId || newCategoryId);
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
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const categoryId = course.category?.toString();

    // Xóa khóa học
    await Course.findByIdAndDelete(courseId);

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
