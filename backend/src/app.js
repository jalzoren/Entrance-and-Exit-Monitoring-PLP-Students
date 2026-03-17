const express = require("express");
const cors = require("cors");
const timeRoute = require("./time");

const app = express();

// Update CORS to allow your frontend origin
app.use(cors({
  origin: 'http://localhost:5173' // Your Vite frontend URL
}));

// Increase request size limit for images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/api/time", timeRoute);

module.exports = app;