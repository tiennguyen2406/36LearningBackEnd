import { firestore } from "./firebase.js";

async function updateCourseCount() {
  try {
    const categoriesSnapshot = await firestore.collection("Categories").get();
    const categories = categoriesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`Tìm thấy ${categories.length} danh mục`);

    for (const category of categories) {
      const coursesCount = await firestore
        .collection("Courses")
        .where("category", "==", category.id)
        .where("isPublished", "==", true)
        .get()
        .then((snapshot) => snapshot.size);

      await firestore.collection("Categories").doc(category.id).update({
        courseCount: coursesCount,
        updatedAt: new Date(),
      });

      console.log(
        `Đã cập nhật danh mục "${category.name}": ${coursesCount} khóa học`
      );
    }

    console.log("Hoàn tất cập nhật courseCount cho tất cả danh mục!");
  } catch (error) {
    console.error("Lỗi khi cập nhật courseCount:", error);
  }
}

updateCourseCount()
  .then(() => {
    console.log("Đã hoàn thành!");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
