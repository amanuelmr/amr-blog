// Parse page/limit query params into safe skip/limit values.
const getPagination = (query = {}, { defaultLimit = 10, maxLimit = 50 } = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(query.limit, 10) || defaultLimit)
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

module.exports = getPagination;
