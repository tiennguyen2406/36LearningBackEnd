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

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI not configured");
  process.exit(1);
}

async function updateAllCourseRatings() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Get all courses
    const courses = await Course.find().lean();
    console.log(`📚 Found ${courses.length} courses`);

    let updated = 0;

    for (const course of courses) {
      const reviews = await CourseReview.find({ courseId: course._id }).lean();

      if (reviews.length === 0) {
        await Course.findByIdAndUpdate(course._id, {
          rating: 0,
          reviewCount: 0,
        });
        console.log(`📊 ${course.title}: No reviews - Reset to 0`);
      } else {
        const avgRating =
          reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        const roundedRating = Math.round(avgRating * 10) / 10;

        await Course.findByIdAndUpdate(course._id, {
          rating: roundedRating,
          reviewCount: reviews.length,
        });

        console.log(
          `📊 ${course.title}: ${roundedRating} ⭐ (${reviews.length} reviews)`
        );
        updated++;
      }
    }

    console.log(`\n✅ Successfully updated ${updated} courses with reviews!`);
    console.log(`📊 Total courses processed: ${courses.length}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating course ratings:", error);
    process.exit(1);
  }
}

// Run the update function
updateAllCourseRatings();

