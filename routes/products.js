const express = require("express");
const router = express.Router();
const { db } = require("../firebase");
const {
  collection,
  getDocs,
  setDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} = require("firebase/firestore");
const { v4: uuidv4 } = require("uuid");

const productsCollectionRef = collection(db, "products");
router.use(express.urlencoded({ extended: true }));
router.use(express.json());

// Get All Products
router.get("/products", async (req, res) => {
  try {
    const querySnapshot = await getDocs(productsCollectionRef);

    if (querySnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: "No products found",
        data: [],
      });
    }

    const products = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({
      success: true,
      message: "Products retrieved successfully",
      data: products,
      count: products.length,
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// Get Single Product by ID
router.get("/products/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const productDoc = await getDoc(doc(db, "products", productId));

    if (!productDoc.exists()) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product retrieved successfully",
      data: {
        id: productDoc.id,
        ...productDoc.data(),
      },
    });
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// Get All Product Categories
router.get("/categories", async (req, res) => {
  try {
    const querySnapshot = await getDocs(productsCollectionRef);

    if (querySnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: "No categories found",
        data: [],
      });
    }

    const categories = new Set();
    querySnapshot.docs.forEach((doc) => {
      const productData = doc.data();
      if (productData.category) {
        categories.add(productData.category);
      }
    });

    res.status(200).json({
      success: true,
      message: "Categories retrieved successfully",
      data: Array.from(categories),
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// Get Products by Category
router.get("/products/category/:category", async (req, res) => {
  try {
    const category = req.params.category;
    const q = query(productsCollectionRef, where("category", "==", category));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: `No products found in category: ${category}`,
        data: [],
      });
    }

    const products = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({
      success: true,
      message: `Products in ${category} category retrieved successfully`,
      data: products,
      count: products.length,
    });
  } catch (err) {
    console.error("Error fetching products by category:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// Add Product
router.post("/products", async (req, res) => {
  try {
    const { name, price, quantity, image, category, description } = req.body;

    // Validation
    if (!name || !price || !quantity || !category) {
      return res.status(400).json({
        success: false,
        message: "Name, price, quantity, and category are required fields",
      });
    }

    const productId = uuidv4();
    const productData = {
      productId: productId,
      name: name.trim(),
      price: parseFloat(price),
      quantity: parseInt(quantity),
      image: image || "",
      category: category.trim(),
      description: description || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "products", productId), productData);

    res.status(201).json({
      success: true,
      message: "Product added successfully",
      data: {
        id: productId,
        ...productData,
      },
    });
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// Update Product
router.put("/products/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const { name, price, quantity, image, category, description } = req.body;

    const productRef = doc(db, "products", productId);
    const productDoc = await getDoc(productRef);

    if (!productDoc.exists()) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const updateData = {
      updatedAt: new Date().toISOString(),
    };

    if (name) updateData.name = name.trim();
    if (price) updateData.price = parseFloat(price);
    if (quantity) updateData.quantity = parseInt(quantity);
    if (image) updateData.image = image;
    if (category) updateData.category = category.trim();
    if (description) updateData.description = description;

    await updateDoc(productRef, updateData);

    // Get updated product
    const updatedDoc = await getDoc(productRef);

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      },
    });
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// Delete Product
router.delete("/products/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const productRef = doc(db, "products", productId);
    const productDoc = await getDoc(productRef);

    if (!productDoc.exists()) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await deleteDoc(productRef);

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: {
        deletedId: productId,
      },
    });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

module.exports = router;
