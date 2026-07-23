import { api } from "./api";

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

// Upload an image directly from the browser to Cloudinary (signed), so large
// files never pass through the API/serverless function (avoids Vercel's body
// limit). Returns the hosted secure URL.
export async function uploadToCloudinary(
  file: File,
  type: "cover" | "content" = "cover"
): Promise<string> {
  const sig = await api<UploadSignature>(`/blogs/upload-signature?type=${type}`);

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("folder", sig.folder);
  form.append("signature", sig.signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
    { method: "POST", body: form }
  );
  if (!res.ok) {
    throw new Error("Image upload failed. Please try again.");
  }
  const data = (await res.json()) as { secure_url?: string };
  if (!data.secure_url) throw new Error("Image upload failed. Please try again.");
  return data.secure_url;
}
