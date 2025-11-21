import express from "express";
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateUserPreferences,
  deleteUser,
  getUserCourses,
  enrollCourse,
  unenrollCourse,
  loginUser,
  followInstructor,
  unfollowInstructor,
  checkFollowStatus,
  saveCourse,
  unsaveCourse,
  getSavedCourses,
} from "../controllers/usersController.js";

const router = express.Router();

// POST /users -> tạo user
router.post("/", createUser);

// POST /users/login -> đăng nhập
router.post("/login", loginUser);

// GET /users -> lấy danh sách users
router.get("/", getUsers);

// POST /users/follow -> follow instructor
router.post("/follow", followInstructor);

// POST /users/unfollow -> unfollow instructor
router.post("/unfollow", unfollowInstructor);

// GET /users/check-follow?userId=...&instructorId=... -> kiểm tra follow status
router.get("/check-follow", checkFollowStatus);

// GET /users/:uid/courses -> lấy danh sách khóa học của user
router.get("/:uid/courses", getUserCourses);

// GET /users/:uid/saved-courses -> lấy danh sách khóa học đã lưu
router.get("/:uid/saved-courses", getSavedCourses);

// POST /users/:uid/enroll -> enroll user vào course
router.post("/:uid/enroll", enrollCourse);

// POST /users/:uid/unenroll -> hủy tham gia khóa học
router.post("/:uid/unenroll", unenrollCourse);

// POST /users/:uid/save-course -> lưu khóa học
router.post("/:uid/save-course", saveCourse);

// POST /users/:uid/unsave-course -> bỏ lưu khóa học
router.post("/:uid/unsave-course", unsaveCourse);

// PATCH /users/:id/preferences -> cập nhật preferences (tối ưu cho theme)
// PHẢI ĐẶT TRƯỚC các route /:id để tránh match sai
// Hỗ trợ cả :id và :uid để tương thích
router.patch("/:id/preferences", (req, res, next) => {
  console.log("🔍 PATCH /users/:id/preferences matched, id:", req.params.id);
  updateUserPreferences(req, res, next);
});
router.patch("/:uid/preferences", (req, res, next) => {
  console.log("🔍 PATCH /users/:uid/preferences matched, uid:", req.params.uid);
  req.params.id = req.params.uid; // Chuyển uid thành id cho controller
  updateUserPreferences(req, res, next);
});

// GET /users/:id -> lấy user theo ID (phải đặt sau các route cụ thể)
router.get("/:id", getUserById);

// PUT /users/:id -> cập nhật thông tin user
router.put("/:id", updateUser);

// DELETE /users/:id -> xóa user
router.delete("/:id", deleteUser);

export default router;
