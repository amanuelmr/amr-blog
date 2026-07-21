// Wrap an async route handler so any rejected promise is forwarded to the
// Express error-handling middleware instead of becoming an unhandled rejection.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Wrap every function on a controller module in one call.
const wrapAll = (controller) =>
  Object.fromEntries(
    Object.entries(controller).map(([name, fn]) => [
      name,
      typeof fn === "function" ? asyncHandler(fn) : fn,
    ])
  );

module.exports = { asyncHandler, wrapAll };
