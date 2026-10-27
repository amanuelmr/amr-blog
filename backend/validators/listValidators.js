const { z } = require("zod");

const name = z.string().trim().min(1, "Name is required").max(60, "Name is too long (max 60 characters)");
const description = z.string().trim().max(280, "Description is too long (max 280 characters)");
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const createListSchema = z.object({
  name,
  description: description.optional(),
  isPublic: z.boolean().optional(),
});

const updateListSchema = z.object({
  name: name.optional(),
  description: description.optional(),
  isPublic: z.boolean().optional(),
});

const listItemSchema = z.object({ blogId: objectId });

module.exports = { createListSchema, updateListSchema, listItemSchema };
