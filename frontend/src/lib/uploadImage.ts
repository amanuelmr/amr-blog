import { api } from "./api";

// Upload an image to the backend (Cloudinary) and return its hosted URL.
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  const res = await api<{ url: string }>("/blogs/upload-image", {
    method: "POST",
    form,
  });
  return res.url;
}
