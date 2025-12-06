import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import websiteContactRouter from "./routes/websiteContactRoutes.js";


dotenv.config();

const app = express();

// 1. Middleware
// CORS is critical: It allows websites hosted elsewhere to send data to this server
app.use(cors({
  origin: "*", // Allow all origins (easiest for generated sites)
  methods: ["POST", "GET"],
  credentials: true
}));

app.use(express.json()); // Parse JSON bodies

// 2. Database Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// 3. Routes
// This creates the URL: http://your-domain.com/api/v1/website/contact/submit
app.use("/api/v1/website/contact", websiteContactRouter);

// 4. Base Route for Health Check
app.get("/", (req, res) => {
  res.send("Contact Server is Running 🚀");
});

// 5. Start Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});