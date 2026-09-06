require("dotenv").config();
const http = require('http');
const express = require("express");
const mongoose = require("mongoose");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const cookieParser = require('cookie-parser');
const { initSocket } = require('./services/socketService');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const facilityRoutes = require('./routes/facilityRoutes');
const incidentRoutes = require('./routes/incidentRoutes');

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
app.use('/api/users', userRoutes); 
app.use('/api/facilities', facilityRoutes); 
app.use('/api/incidents', incidentRoutes);    

app.use(notFound);
app.use(errorHandler);

const httpServer = http.createServer(app);    
initSocket(httpServer);                 

httpServer.listen(PORT, () => {       
  console.log(`Server running on PORT ${PORT}`);
});
