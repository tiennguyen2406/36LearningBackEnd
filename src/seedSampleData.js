import { firestore } from "./firebase.js";

async function seed() {
  // ----- Categories -----
  const categories = [
    { name: "Graphic Design", iconUrl: "https://link.com/icon1.png", description: "Khóa học về thiết kế đồ họa.", courseCount: 10, isActive: true },
    { name: "Web Development", iconUrl: "https://link.com/icon2.png", description: "Khóa học lập trình web chuyên sâu.", courseCount: 8, isActive: true },
    { name: "SEO & Marketing", iconUrl: "https://link.com/icon3.png", description: "Tối ưu hóa & tiếp thị số.", courseCount: 6, isActive: true },
    { name: "Finance & Accounting", iconUrl: "https://link.com/icon4.png", description: "Tài chính & kế toán cơ bản đến nâng cao.", courseCount: 4, isActive: true },
    { name: "Personal Development", iconUrl: "https://link.com/icon5.png", description: "Phát triển bản thân và kỹ năng sống.", courseCount: 5, isActive: true },
    { name: "3D Design", iconUrl: "https://link.com/icon6.png", description: "Thiết kế 3D chuyên sâu.", courseCount: 3, isActive: true },
    { name: "Office Productivity", iconUrl: "https://link.com/icon7.png", description: "Tăng hiệu quả làm việc với Office.", courseCount: 6, isActive: true },
    { name: "HR Management", iconUrl: "https://link.com/icon8.png", description: "Nhân sự & quản trị con người.", courseCount: 2, isActive: true }
  ];

  // ----- Create categories -----
  const categoryRefs = [];
  for (let cat of categories) {
    const ref = firestore.collection("Categories").doc();
    await ref.set({ ...cat, id: ref.id, createdAt: new Date(), updatedAt: new Date() });
    categoryRefs.push({ ...cat, id: ref.id });
    console.log(`Created Category: ${cat.name}`);
  }

  // Map: lấy id category thực tế thay vì tên
  const catId = (name) => categoryRefs.find(c => c.name === name)?.id || name;

  // ----- Courses -----
  const courses = [
    { title: "React for Beginners", category: catId("Web Development"), instructor: "teacher01", description: "Học React từ cơ bản tới nâng cao", thumbnailUrl: "https://link.com/thumb1.png", originalPrice: 100, currentPrice: 50, rating: 4.8, students: 100, totalLessons: 10, totalDuration: 360, level: "beginner", tags: ["react","web"], isPublished: true },
    { title: "Photoshop Master", category: catId("Graphic Design"), instructor: "teacher02", description: "Thành thạo photoshop chuyên nghiệp.", thumbnailUrl: "https://link.com/thumb2.png", originalPrice: 120, currentPrice: 90, rating: 4.6, students: 80, totalLessons: 16, totalDuration: 400, level: "intermediate", tags: ["photoshop","design"], isPublished: false },
    { title: "SEO Fundamentals", category: catId("SEO & Marketing"), instructor: "teacher03", description: "Nắm vững SEO từ đầu cho doanh nghiệp nhỏ.", thumbnailUrl: "https://link.com/thumb3.png", originalPrice: 80, currentPrice: 50, rating: 4.3, students: 70, totalLessons: 8, totalDuration: 120, level: "beginner", tags: ["seo"], isPublished: true },
    { title: "Facebook Ads 2024", category: catId("SEO & Marketing"), instructor: "teacher04", description: "Quảng cáo Facebook thực chiến.", thumbnailUrl: "https://link.com/thumb4.png", originalPrice: 110, currentPrice: 60, rating: 4.5, students: 67, totalLessons: 7, totalDuration: 90, level: "intermediate", tags: ["ads","facebook"], isPublished: true },
    { title: "Excel for Office", category: catId("Office Productivity"), instructor: "teacher05", description: "Làm chủ Excel cho dân văn phòng.", thumbnailUrl: "https://link.com/thumb5.png", originalPrice: 60, currentPrice: 35, rating: 4.7, students: 150, totalLessons: 9, totalDuration: 88, level: "beginner", tags: ["excel"], isPublished: true },
    { title: "Finance 101", category: catId("Finance & Accounting"), instructor: "teacher06", description: "Nhập môn tài chính cá nhân.", thumbnailUrl: "https://link.com/thumb6.png", originalPrice: 70, currentPrice: 40, rating: 4.2, students: 55, totalLessons: 11, totalDuration: 70, level: "beginner", tags: ["finance"], isPublished: true },
    { title: "AutoCAD Essential", category: catId("3D Design"), instructor: "teacher07", description: "Vẽ kỹ thuật với AutoCAD.", thumbnailUrl: "https://link.com/thumb7.png", originalPrice: 140, currentPrice: 95, rating: 4.9, students: 40, totalLessons: 14, totalDuration: 260, level: "advanced", tags: ["autocad","3d"], isPublished: true },
    { title: "Thiết kế Logo Pro", category: catId("Graphic Design"), instructor: "teacher08", description: "Tư duy sáng tạo logo và thương hiệu.", thumbnailUrl: "https://link.com/thumb8.png", originalPrice: 100, currentPrice: 88, rating: 4.8, students: 90, totalLessons: 10, totalDuration: 80, level: "intermediate", tags: ["logo"], isPublished: true },
    { title: "C++ Basic", category: catId("Web Development"), instructor: "teacher09", description: "Lập trình C++ cho người mới.", thumbnailUrl: "https://link.com/thumb9.png", originalPrice: 90, currentPrice: 55, rating: 4.1, students: 44, totalLessons: 12, totalDuration: 100, level: "beginner", tags: ["c++","code"], isPublished: false },
    { title: "Phát triển bản thân", category: catId("Personal Development"), instructor: "teacher10", description: "Tìm động lực, lập kế hoạch đời bạn.", thumbnailUrl: "https://link.com/thumb10.png", originalPrice: 70, currentPrice: 30, rating: 4.3, students: 32, totalLessons: 7, totalDuration: 60, level: "beginner", tags: ["self-help"], isPublished: true }
  ];
  // Tạo course và map id
  const courseRefs = [];
  for (let course of courses) {
    const ref = firestore.collection("Courses").doc();
    await ref.set({ ...course, id: ref.id, createdAt: new Date(), updatedAt: new Date() });
    courseRefs.push({ ...course, id: ref.id });
    console.log(`Created Course: ${course.title}`);
  }
  // Helper lấy courseId
  const getCourseId = (title) => courseRefs.find(c => c.title === title)?.id || "";

  // ----- Lessons (chia đều cho các khóa học) -----
  const allLessons = [];
  for (let course of courseRefs) {
    for (let i = 1; i <= Math.floor(Math.random()*3)+3; i++) {
      allLessons.push({
        courseId: course.id,
        title: `${course.title} - Lesson ${i}`,
        description: `Bài ${i} của khóa: ${course.title}`,
        videoUrl: `https://link.com/videos/${course.id}_${i}.mp4`,
        duration: 10 + i * 3,
        order: i,
        attachments: [],
        isPreview: i === 1,
      });
    }
  }
  for (let lesson of allLessons) {
    const ref = firestore.collection("Lessons").doc();
    await ref.set({
      ...lesson,
      id: ref.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`Created Lesson: ${lesson.title}`);
  }
  console.log("Sample data seeding completed!");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
