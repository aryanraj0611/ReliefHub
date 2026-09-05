require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection failed:", err.message));

app.get("/", (req, res) => {
  res.send("Express server is working!");
});

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});
