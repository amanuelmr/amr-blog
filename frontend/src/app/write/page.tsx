"use client";

import { RequireAuth } from "@/components/RequireAuth";
import { BlogForm } from "@/components/BlogForm";

export default function WritePage() {
  return (
    <RequireAuth>
      <BlogForm mode="create" />
    </RequireAuth>
  );
}
