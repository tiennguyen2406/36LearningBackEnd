import User from "../models/User.js";
import Course from "../models/Course.js";
import Category from "../models/Category.js";
import Lesson from "../models/Lesson.js";
import Payment from "../models/Payment.js";

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

    const userData = {
      email: data.email || "",
      username: data.username || "",
      password: data.password || "",
      fullName: data.fullName || "",
      profileImage: data.profileImage || "",
      role: data.role || "student",
      preferences: data.preferences || { language: "vi", darkMode: false, notifications: true },
    };

    let user;
    if (data.uid) {
      // Nếu có uid, tìm và cập nhật hoặc tạo mới
      user = await User.findByIdAndUpdate(
        data.uid,
        userData,
        { new: true, upsert: true, runValidators: true }
      );
    } else {
      user = await User.create(userData);
    }

    res.status(201).json({ message: "User created", uid: user._id.toString() });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ error: `${field} đã tồn tại!` });
    }
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    const usersWithId = users.map(user => ({
      uid: user._id.toString(),
      ...user.toObject(),
      _id: undefined,
    }));
    res.status(200).json(usersWithId);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Đăng nhập người dùng (username + password)
export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Missing username or password" });
    }

    const usernameNorm = String(username).trim();
    const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const ciRegex = new RegExp(`^${escapeRegExp(usernameNorm)}$`, "i");
    let user = await User.findOne({ username: ciRegex });
    console.log(`[login] username=", ${usernameNorm}, " found=", ${!!user}`);
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // So sánh mật khẩu đơn giản (hiện đang lưu plaintext). Có thể nâng cấp bcrypt sau.
    if (!user.password || user.password !== password) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const userObj = user.toObject();
    delete userObj.password;
    return res.status(200).json({
      message: "Login success",
      user: { uid: user._id.toString(), ...userObj, _id: undefined },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: error?.message || "Something went wrong" });
  }
};

// Lấy thông tin user theo ID
export const getUserById = async (req, res) => {
  try {
    const uid = req.params.id;
    const user = await User.findById(uid).select("-password");
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }
    const userData = { uid: user._id.toString(), ...user.toObject(), _id: undefined };
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
    const user = await User.findById(uid);
    if (!user) {
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
    await User.findByIdAndUpdate(uid, data, { new: true, runValidators: true });
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

    const user = await User.findById(uid);
    if (!user) return res.status(404).json({ error: "User not found" });

    const enrolled = Array.isArray(user.enrolledCourses) ? user.enrolledCourses : [];
    if (!enrolled.length) return res.status(200).json([]);

    // Lấy courses với populate category
    const courses = await Course.find({ _id: { $in: enrolled } })
      .populate("category", "name");

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

    return res.status(200).json(coursesWithCategory);
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
    const user = await User.findById(uid);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Kiểm tra course có tồn tại không
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Lấy enrolledCourses hiện tại
    const enrolledCourses = Array.isArray(user.enrolledCourses) 
      ? user.enrolledCourses.map(id => id.toString()) 
      : [];

    // Kiểm tra đã enroll chưa
    if (enrolledCourses.includes(courseId)) {
      return res.status(200).json({ message: "User đã tham gia khóa học này rồi" });
    }

    // Kiểm tra xem khóa học có phải trả phí không
    if (course.price && course.price > 0) {
      // Khóa học có phí - Kiểm tra đã thanh toán chưa
      const completedPayment = await Payment.findOne({
        userId: uid,
        courseId: courseId,
        status: "completed",
      });

      if (!completedPayment) {
        return res.status(402).json({ 
          error: "Khóa học này yêu cầu thanh toán",
          requiresPayment: true,
          price: course.price,
        });
      }
    }

    // Khóa học miễn phí hoặc đã thanh toán - Cho phép enroll
    user.enrolledCourses.push(courseId);
    await user.save();

    // Tăng số lượng học viên nếu chưa tăng (từ payment)
    if (!course.price || course.price <= 0) {
      await Course.findByIdAndUpdate(courseId, {
        $inc: { students: 1 },
      });
    }

    res.status(200).json({ message: "Đã tham gia khóa học thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Hủy tham gia khóa học (unenroll)
export const unenrollCourse = async (req, res) => {
  try {
    const { uid } = req.params;
    const { courseId } = req.body;

    if (!uid || !courseId) {
      return res.status(400).json({ error: "Missing uid or courseId" });
    }

    // Kiểm tra user có tồn tại không
    const user = await User.findById(uid);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Lấy enrolledCourses hiện tại
    const enrolledCourses = Array.isArray(user.enrolledCourses) 
      ? user.enrolledCourses.map(id => id.toString()) 
      : [];

    // Kiểm tra user có enroll course này chưa
    if (!enrolledCourses.includes(courseId)) {
      return res.status(200).json({ message: "User chưa tham gia khóa học này" });
    }

    // Xóa courseId khỏi enrolledCourses
    user.enrolledCourses = user.enrolledCourses.filter(
      id => id.toString() !== courseId
    );
    await user.save();

    res.status(200).json({ message: "Đã hủy tham gia khóa học thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Xóa user
export const deleteUser = async (req, res) => {
  try {
    const uid = req.params.id;
    
    // Kiểm tra user có tồn tại không
    const user = await User.findById(uid);
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    // Xóa user
    await User.findByIdAndDelete(uid);
    res.status(200).json({ message: "Đã xóa người dùng thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Follow/Unfollow instructor
export const followInstructor = async (req, res) => {
  try {
    const { userId, instructorId } = req.body;

    if (!userId || !instructorId) {
      return res.status(400).json({
        error: "Thiếu userId hoặc instructorId",
      });
    }

    if (userId === instructorId) {
      return res.status(400).json({
        error: "Bạn không thể follow chính mình",
      });
    }

    const user = await User.findById(userId);
    const instructor = await User.findById(instructorId);

    if (!user) {
      return res.status(404).json({ error: "User không tồn tại" });
    }

    if (!instructor) {
      return res.status(404).json({ error: "Instructor không tồn tại" });
    }

    // Kiểm tra đã follow chưa
    const isFollowing = user.following.some(
      (id) => id.toString() === instructorId
    );

    if (isFollowing) {
      return res.status(400).json({
        error: "Bạn đã follow instructor này rồi",
      });
    }

    // Thêm instructorId vào following của user
    user.following.push(instructorId);
    await user.save();

    // Thêm userId vào followers của instructor
    instructor.followers.push(userId);
    await instructor.save();

    return res.json({
      message: "Đã follow instructor thành công",
      followingCount: user.following.length,
      followerCount: instructor.followers.length,
    });
  } catch (error) {
    console.error("Error following instructor:", error);
    return res.status(500).json({
      error: "Lỗi khi follow instructor",
      details: error.message,
    });
  }
};

export const unfollowInstructor = async (req, res) => {
  try {
    const { userId, instructorId } = req.body;

    if (!userId || !instructorId) {
      return res.status(400).json({
        error: "Thiếu userId hoặc instructorId",
      });
    }

    const user = await User.findById(userId);
    const instructor = await User.findById(instructorId);

    if (!user) {
      return res.status(404).json({ error: "User không tồn tại" });
    }

    if (!instructor) {
      return res.status(404).json({ error: "Instructor không tồn tại" });
    }

    // Kiểm tra đã follow chưa
    const isFollowing = user.following.some(
      (id) => id.toString() === instructorId
    );

    if (!isFollowing) {
      return res.status(400).json({
        error: "Bạn chưa follow instructor này",
      });
    }

    // Xóa instructorId khỏi following của user
    user.following = user.following.filter(
      (id) => id.toString() !== instructorId
    );
    await user.save();

    // Xóa userId khỏi followers của instructor
    instructor.followers = instructor.followers.filter(
      (id) => id.toString() !== userId
    );
    await instructor.save();

    return res.json({
      message: "Đã unfollow instructor thành công",
      followingCount: user.following.length,
      followerCount: instructor.followers.length,
    });
  } catch (error) {
    console.error("Error unfollowing instructor:", error);
    return res.status(500).json({
      error: "Lỗi khi unfollow instructor",
      details: error.message,
    });
  }
};

export const checkFollowStatus = async (req, res) => {
  try {
    const { userId, instructorId } = req.query;

    if (!userId || !instructorId) {
      return res.status(400).json({
        error: "Thiếu userId hoặc instructorId",
      });
    }

    const user = await User.findById(userId).select("following");
    if (!user) {
      return res.status(404).json({ error: "User không tồn tại" });
    }

    const isFollowing = user.following.some(
      (id) => id.toString() === instructorId
    );

    return res.json({
      isFollowing,
    });
  } catch (error) {
    console.error("Error checking follow status:", error);
    return res.status(500).json({
      error: "Lỗi khi kiểm tra follow status",
      details: error.message,
    });
  }
};