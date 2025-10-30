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
