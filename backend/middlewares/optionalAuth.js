const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Like authMiddleware, but never blocks the request: decodes the access
// token and sets req.user when it's present and valid, otherwise proceeds
// unauthenticated. For routes that are public but behave differently for
// the owner (e.g. viewing your own draft).
module.exports = async (req, res, next) => {
  const token =
    req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
      algorithms: ["HS256"],
    });
    const user = await User.findById(decoded._id).select("-password -refreshToken");
    if (user) req.user = user;
  } catch {
    // Invalid/expired token — proceed unauthenticated rather than blocking.
  }
  next();
};
