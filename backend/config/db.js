const mongoose = require("mongoose");

// Cache the connection (and the in-flight promise) so it is established once
// and reused across invocations. This is essential on serverless hosts
// (e.g. Vercel), where the module is imported per cold start and there is no
// long-lived `startServer()` to open the connection.
let connectionPromise = null;

const connectDB = async () => {
  // 1 = connected, 2 = connecting — reuse in both cases.
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectionPromise) return connectionPromise;

  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    throw new Error("MONGODB_URI is not set");
  }

  connectionPromise = mongoose
    .connect(mongoURI)
    .then((m) => {
      console.log("MongoDB connected");
      return m.connection;
    })
    .catch((err) => {
      connectionPromise = null; // allow a retry on the next request
      throw err;
    });

  return connectionPromise;
};

module.exports = connectDB;
