const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verificationOTP: {
      type: String,
    },
    verificationOTPExpiry: {
      type: Date,
    },
    passwordResetOTP: {
      type: String,
    },
    passwordResetOTPExpiry: {
      type: Date,
    },
    refreshToken: {
      type: String,
    },

    readBlogs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Blog" }],
    likedBlogs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Blog" }],
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  // Only hash when the password field actually changed. Without the early
  // return, every save (login/refresh, logout, verify, like, read-tracking)
  // would re-hash the already-hashed value and lock the user out.
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

UserSchema.methods.generateAccessToken = function () {
  return jwt.sign({ _id: this._id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
    algorithm: "HS256",
  });
};

UserSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ _id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
    algorithm: "HS256",
  });
};

module.exports = mongoose.model("User", UserSchema);
