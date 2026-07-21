// Generic request-validation middleware backed by zod.
// Usage: router.post("/x", validate(schema), handler)
//        validate(schema, "query") / validate(schema, "params")
// On success the parsed (and coerced) data replaces req[source].
const validate = (schema, source = "body") => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      msg: "Validation error",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join(".") || source,
        message: issue.message,
      })),
    });
  }
  req[source] = result.data;
  next();
};

module.exports = validate;
