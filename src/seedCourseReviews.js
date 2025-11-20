import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "..", ".env") });

// Import models
import Course from "./models/Course.js";
import CourseReview from "./models/CourseReview.js";
import User from "./models/User.js";

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI not configured");
  process.exit(1);
}

// Sample comments for reviews
const sampleComments = [
  "Khóa học rất hay và dễ hiểu. Giảng viên giải thích rất chi tiết!",
  "Nội dung phong phú, cập nhật. Rất đáng để đầu tư thời gian học.",
  "Tôi đã học được rất nhiều điều bổ ích từ khóa học này.",
  "Bài giảng chất lượng, có nhiều ví dụ thực tế.",
  "Khóa học tuyệt vời! Hoàn toàn đáng giá tiền bỏ ra.",
  "Giảng viên nhiệt tình, nội dung dễ tiếp cận với người mới bắt đầu.",
  "Video bài giảng rõ ràng, dễ theo dõi.",
  "Học xong khóa này tôi đã tự tin hơn rất nhiều.",
  "Nội dung hay nhưng cần thêm nhiều bài tập thực hành hơn.",
  "Khóa học được tổ chức khoa học, logic. Rất hài lòng!",
  "Đây là khóa học tốt nhất mà tôi từng tham gia.",
  "Giá cả hợp lý so với chất lượng cung cấp.",
  "Tôi sẽ giới thiệu khóa học này cho bạn bè.",
  "Học xong đã có thể áp dụng vào công việc ngay.",
  "Cảm ơn giảng viên đã chia sẻ kiến thức quý báu!",
  "Khóa học phù hợp cho cả người mới và người đã có kinh nghiệm.",
  "Nội dung cập nhật theo xu hướng mới nhất.",
  "Rất đáng để học, không hối hận khi đăng ký.",
  "Bài giảng sinh động, không nhàm chán.",
  "Học được nhiều kỹ năng thực tế từ khóa này.",
];

// Function to generate random rating (weighted towards higher ratings)
function generateRating() {
  const random = Math.random();
  if (random < 0.5) return 5; // 50% chance
  if (random < 0.75) return 4; // 25% chance
  if (random < 0.9) return 3; // 15% chance
  if (random < 0.97) return 2; // 7% chance
  return 1; // 3% chance
}

// Function to get random comment
function getRandomComment() {
  return sampleComments[Math.floor(Math.random() * sampleComments.length)];
}

// Function to update course rating
async function updateCourseRating(courseId) {
  try {
    const reviews = await CourseReview.find({ courseId }).lean();

    if (reviews.length === 0) {
      await Course.findByIdAndUpdate(courseId, {
        rating: 0,
        reviewCount: 0,
      });
    } else {
      const avgRating =
        reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await Course.findByIdAndUpdate(courseId, {
        rating: Math.round(avgRating * 10) / 10,
        reviewCount: reviews.length,
      });
    }
  } catch (error) {
    console.error(`Error updating rating for course ${courseId}:`, error);
  }
}

async function seedCourseReviews() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Get all courses
    const courses = await Course.find().lean();
    console.log(`📚 Found ${courses.length} courses`);

    // Get all users
    const users = await User.find().lean();
    console.log(`👥 Found ${users.length} users`);

    if (courses.length === 0 || users.length === 0) {
      console.log("❌ No courses or users found. Please seed data first.");
      process.exit(1);
    }

    // Clear existing reviews
    console.log("🗑️  Clearing existing reviews...");
    await CourseReview.deleteMany({});

    let totalReviewsCreated = 0;

    // Create reviews for each course
    for (const course of courses) {
      // Random number of reviews per course (2-8 reviews)
      const numReviews = Math.floor(Math.random() * 7) + 2;

      // Get random users for this course
      const shuffledUsers = [...users].sort(() => Math.random() - 0.5);
      const selectedUsers = shuffledUsers.slice(0, Math.min(numReviews, users.length));

      console.log(`\n📝 Creating ${selectedUsers.length} reviews for: ${course.title}`);

      for (const user of selectedUsers) {
        try {
          const rating = generateRating();
          const comment = getRandomComment();

          const review = new CourseReview({
            courseId: course._id,
            userId: user._id,
            username: user.username || user.email || "User",
            rating,
            comment,
          });

          await review.save();
          totalReviewsCreated++;

          console.log(
            `  ✓ ${user.username || user.email} - ${rating} ⭐ - "${comment.substring(0, 40)}..."`
          );
        } catch (error) {
          // Skip if duplicate (user already reviewed this course)
          if (error.code !== 11000) {
            console.error(`  ✗ Error creating review:`, error.message);
          }
        }
      }

      // Update course rating
      await updateCourseRating(course._id);
      const updatedCourse = await Course.findById(course._id).lean();
      console.log(
        `  📊 Updated rating: ${updatedCourse.rating} ⭐ (${updatedCourse.reviewCount} reviews)`
      );
    }

    console.log(`\n✅ Successfully created ${totalReviewsCreated} reviews!`);
    console.log(`📊 Updated ratings for ${courses.length} courses`);

    // Display summary
    const reviewStats = await CourseReview.aggregate([
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          avgRating: { $avg: "$rating" },
        },
      },
    ]);

    if (reviewStats.length > 0) {
      console.log(`\n📈 Overall Statistics:`);
      console.log(`   Total reviews: ${reviewStats[0].totalReviews}`);
      console.log(`   Average rating: ${reviewStats[0].avgRating.toFixed(2)} ⭐`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding course reviews:", error);
    process.exit(1);
  }
}

// Run the seed function
seedCourseReviews();

