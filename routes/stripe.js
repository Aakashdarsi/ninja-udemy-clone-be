const dotenv = require("dotenv");
const express = require("express");
dotenv.config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { v4: uuidv4 } = require("uuid");
const router = express.Router();

router.post("/pay", async (req, res) => {
  const { product, token } = req.body;
  console.log(product);
  console.log(product.price, "PROD PRICE");
  const idempotencyKey = uuidv4();
  return stripe.customers
    .create({
      email: token.email,
      source: token.id,
    })
    .then((customer) => {
      stripe.charges.create(
        {
          amount: product.price * 100,
          currency: "usd",
          customer: customer.id,
          receipt_email: token.email,
          description: product.name,
          shipping: {
            name: token.card.name,
            address: {
              country: token.card.address_country,
            },
          },
        },
        { idempotencyKey },
      );
    })
    .then((result) => {
      res.status(200).json(result);
    })
    .catch((err) => {
      console.log(err);
    });
});

router.post("/create-checkout-session", async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart items are required" });
    }

    const line_items = items.map((item) => {
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
            images: item.image ? [item.image] : [],
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      billing_address_collection: "required",
      payment_method_types: ["card"],
      line_items,
      mode: "payment",

      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    });

    res.json({
      id: session,
      url: session,
    });
  } catch (err) {
    console.error("Error creating Stripe checkout session:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/session-status", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(
      req.query.session_id,
      {
        expand: ["payment_intent"],
      },
    );

    res.send({
      status: session.status,
      payment_status: session.payment_status,
      payment_intent_id: session.payment_intent.id,
      payment_intent_status: session.payment_intent.status,
      session,
    });
  } catch (err) {
    res.status(500).json({
      status: err,
    });
  }
});
module.exports = router;
