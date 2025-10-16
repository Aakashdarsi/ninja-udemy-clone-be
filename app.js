const express = require("express");
const customerRouter = require("./routes/customer");
const cartRouter = require("./routes/cart");
const productRoutes = require("./routes/products");
const stripeRouter = require("./routes/stripe");
const cors = require("cors");
const app = express();
const tracer = require("dd-trace");
const { rateLimit } = require("express-rate-limit");
const helmet = require("helmet");

const allowedOrigins = [
  "http://localhost:5173",
  "https://ninjaudemy.aakashdarsi.online",
];

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: false,
  legacyHeaders: false,
  ipv6Subnet: 56,
});

tracer.init();
app.use(limiter);
app.disable("x-powered-by");
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

app.use("/customers", customerRouter);
app.use("/cart", cartRouter);
app.use("/products", productRoutes);
app.use("/pay", stripeRouter);

// Disabling for the fingerprinting

app.use("/health", (req, res, next) => {
  res.send("End Point working");
});

app.use((req, res) => {
  res.status(404).send("You have landed on the wrong page");
});

app.listen(3000, () => {});
