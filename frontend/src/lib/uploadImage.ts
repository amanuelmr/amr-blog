import { uploadToCloudinary } from "./uploadToCloudinary";

// Inline editor images upload directly to Cloudinary (content folder).
export const uploadImage = (file: File): Promise<string> =>
  uploadToCloudinary(file, "content");
