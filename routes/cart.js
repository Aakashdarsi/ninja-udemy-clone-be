const { urlencoded } = require("body-parser");
const express = require("express");
const { db } = require("../firebase");
const {
  setDoc,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} = require("firebase/firestore");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get("/:userId/cart", async (req, res) => {
  try {
    const { userId } = req.params;
    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = userSnap.data();
    const cartItems = userData.cart || [];

    res.json({
      userId,
      cart: cartItems,
      totalItems: cartItems.length,
    });
  } catch (err) {
    console.error("Error fetching user cart:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/:userId/cart/quantity", async (req, res) => {
  try {
    const userId = req.params["userId"];
    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);
    res.status(200).json({
      length: userSnap.data()?.cart.length,
    });
  } catch (err) {
    res.status(500).json({
      err,
    });
  }
});

router.post("/:userId/cart/add", async (req, res) => {
  try {
    const { userId } = req.params;
    const { productId, name, price, quantity = 1, image } = req.body;

    if (!productId || !name || !price) {
      return res.status(400).json({
        message: "Product ID, name, and price are required",
      });
    }

    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);
    const cartItem = {
      cartItemId: uuidv4(),
      productId,
      name,
      price,
      quantity,
      image: image || "",
      addedAt: new Date().toISOString(),
    };

    if (!userSnap.exists()) {
      await setDoc(userDocRef, {
        cart: cartItem,
      });
      // It's better practice to not implicitly create a user here.
      // Force the client to create the user first.
    } else {
      await updateDoc(userDocRef, {
        cart: arrayUnion(cartItem),
      });
    }

    res.status(201).json({
      message: "Item added to cart successfully",
      item: cartItem,
      userId,
    });
  } catch (err) {
    console.error("Error adding item to cart:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.put("/:userId/cart/update/:cartItemId", async (req, res) => {
  try {
    const { userId, cartItemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        message: "Valid quantity is required",
      });
    }

    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = userSnap.data();
    const cartItems = userData.cart || [];

    const updatedCart = cartItems.map((item) =>
      item.cartItemId === cartItemId
        ? { ...item, quantity, updatedAt: new Date().toISOString() }
        : item,
    );

    await updateDoc(userDocRef, {
      cart: updatedCart,
    });

    res.json({
      message: "Cart item updated successfully",
      cartItemId,
      quantity,
      userId,
    });
  } catch (err) {
    console.error("Error updating cart item:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.delete("/:userId/cart/remove/:cartItemId", async (req, res) => {
  try {
    const { userId, cartItemId } = req.params;

    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = userSnap.data();
    const cartItems = userData.cart || [];

    const itemToRemove = cartItems.find(
      (item) => item.cartItemId === cartItemId,
    );

    if (!itemToRemove) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    await updateDoc(userDocRef, {
      cart: arrayRemove(itemToRemove),
    });

    res.json({
      message: "Item removed from cart successfully",
      cartItemId,
      userId,
    });
  } catch (err) {
    console.error("Error removing item from cart:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.delete("/:userId/cart/empty", async (req, res) => {
  try {
    const { userId } = req.params;

    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      return res.status(404).json({ message: "User not found" });
    }

    await updateDoc(userDocRef, {
      cart: [],
    });

    res.json({
      message: "Cart emptied successfully",
      userId,
    });
  } catch (err) {
    console.error("Error emptying cart:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/:userId/orders/create", async (req, res) => {
  try {
    const { userId } = req.params;
    const { shippingAddress, paymentMethod } = req.body;

    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = userSnap.data();
    const cartItems = userData.cart || [];

    if (cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const totalAmount = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const order = {
      orderId: uuidv4(),
      items: cartItems,
      totalAmount,
      shippingAddress: shippingAddress || {},
      paymentMethod: paymentMethod || "card",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(userDocRef, {
      orders: arrayUnion(order),
      cart: [],
    });

    res.status(201).json({
      message: "Order created successfully",
      order,
      userId,
    });
  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/:userId/orders", async (req, res) => {
  try {
    const { userId } = req.params;

    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = userSnap.data();
    const orders = userData.orders || [];

    res.json({
      userId,
      orders,
      totalOrders: orders.length,
    });
  } catch (err) {
    console.error("Error fetching user orders:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/:userId/orders/:orderId", async (req, res) => {
  try {
    const { userId, orderId } = req.params;

    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = userSnap.data();
    const orders = userData.orders || [];
    const order = orders.find((order) => order.orderId === orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({
      userId,
      order,
    });
  } catch (err) {
    console.error("Error fetching order:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.put("/:userId/orders/:orderId/status", async (req, res) => {
  try {
    const { userId, orderId } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Valid status is required",
        validStatuses,
      });
    }

    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = userSnap.data();
    const orders = userData.orders || [];

    // Update the specific order
    const updatedOrders = orders.map((order) =>
      order.orderId === orderId
        ? {
            ...order,
            status,
            updatedAt: new Date().toISOString(),
          }
        : order,
    );

    await updateDoc(userDocRef, {
      orders: updatedOrders,
    });

    res.json({
      message: "Order status updated successfully",
      orderId,
      status,
      userId,
    });
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = userSnap.data();
    const cartItems = userData.cart || [];
    const orders = userData.orders || [];

    const cartTotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    res.json({
      userId,
      profile: {
        email: userData.email,
        name: userData.name,
      },
      cart: {
        items: cartItems,
        totalItems: cartItems.length,
        totalAmount: cartTotal,
      },
      orders: {
        items: orders,
        totalOrders: orders.length,
      },
    });
  } catch (err) {
    console.error("Error fetching user profile:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
