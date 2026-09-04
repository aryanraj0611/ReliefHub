const express = require("express");

const app = express();
const PORT = 5000;

app.get("/", (req, res) => {
  res.send("Express server is working!");
});

app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});