require("dotenv").config();
const app = require("./src/app");
const loginRouter = require("./routes/login"); // Add this line

const PORT = process.env.PORT || 5000;

// Add this before app.listen
app.use('/api', loginRouter); // This makes the endpoint available at /api/login

app.listen(PORT, () => {
  console.log(`Backend running on port http://localhost:${PORT}`);
  console.log(`Login endpoint: http://localhost:${PORT}/api/login`); // Optional: added for clarity
});

