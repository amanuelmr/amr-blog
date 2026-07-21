const mongoose = require("mongoose");

// Connect to MongoDB. Throws on failure so the caller can fail fast instead of
// letting the app run against a dead database.
const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    throw new Error("MONGODB_URI is not set");
  }

  await mongoose.connect(mongoURI);
  console.log("MongoDB connected");
};

module.exports = connectDB;
