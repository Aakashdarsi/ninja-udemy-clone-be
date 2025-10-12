const express = require("express");
const customerRouter = require("./routes/customer");
const cartRouter = require("./routes/cart");
const productRoutes = require("./routes/products");
const stripeRouter = require("./routes/stripe");
const cors = require("cors");
const app = express();
const tracer = require("dd-trace");

const allowedOrigins = [
  "http://localhost:5173",
  "https://your-frontend-app.com",
  "https://ninjaudemy.aakashdarsi.online",
];

tracer.init();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/customers", customerRouter);
app.use("/cart", cartRouter);
app.use("/products", productRoutes);
app.use("/pay", stripeRouter);

app.use("/health", (req, res, next) => {
  res.send("End Point working");
  next();
});

app.use((req, res) => {
  res.status(404).send("You have landed on the wrong page");
});

app.listen(3000, () => {});
