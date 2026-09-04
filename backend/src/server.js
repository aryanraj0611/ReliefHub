require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection failed:", err.message));

app.get("/", (req, res) => {
  res.send("Express server is working!");
});

app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});