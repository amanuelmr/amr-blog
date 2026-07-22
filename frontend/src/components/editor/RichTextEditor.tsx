"use client";

import { useRef, useCallback, useState, ReactNode } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import Image from "@tiptap/extension-image";
import { uploadImage } from "@/lib/uploadImage";
import { ApiError } from "@/lib/api";
import {
  BoldIcon, ItalicIcon, CodeIcon, LinkIcon, H2Icon, H3Icon, QuoteIcon,
  BulletListIcon, OrderedListIcon, ImageIcon, DividerIcon, CheckIcon, TrashIcon,
} from "./EditorIcons";

function MenuButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep editor selection
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`grid h-9 min-w-9 place-items-center rounded-md px-2 transition-colors ${
        active ? "bg-accent text-accent-fg" : "text-fg hover:bg-subtle"
      }`}
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="mx-1 h-5 w-px bg-border" />;

export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Stable across renders; reads the live editor from a ref so it works from
  // paste/drop handlers (which capture this closure once at editor creation).
  const insertImageFile = useCallback(async (file: File) => {
    const ed = editorRef.current;
    if (!ed) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("That file isn’t an image.");
      return;
    }
    setUploadError("");
    setUploading(true);
    try {
      const url = await uploadImage(file);
      ed.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Image upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, []);

  const editor = useEditor({
    immediatelyRender: false, // required for Next.js SSR
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener nofollow", target: "_blank" },
        },
      }),
      Placeholder.configure({ placeholder: "Tell your story…" }),
      Image.configure({ HTMLAttributes: { class: "rounded-xl" } }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-stone dark:prose-invert prose-lg max-w-none min-h-[360px] focus:outline-none",
      },
      handlePaste(view, event) {
        const file = event.clipboardData?.files?.[0];
        if (file && file.type.startsWith("image/")) {
          event.preventDefault();
          void insertImageFile(file);
          return true;
        }
        return false;
      },
      handleDrop(view, event) {
        const file = (event as DragEvent).dataTransfer?.files?.[0];
        if (file && file.type.startsWith("image/")) {
          event.preventDefault();
          void insertImageFile(file);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Keep the ref pointing at the live editor for the stable callbacks above.
  editorRef.current = editor;

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void insertImageFile(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const openLink = useCallback(() => {
    if (!editor) return;
    setLinkValue((editor.getAttributes("link").href as string) || "https://");
    setLinkMode(true);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    const url = linkValue.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    setLinkMode(false);
  }, [editor, linkValue]);

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkMode(false);
  }, [editor]);

  if (!editor) {
    return <div className="min-h-[360px]" />;
  }

  const e = editor as Editor;

  return (
    <div className="relative">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />

      {/* Upload status */}
      {(uploading || uploadError) && (
        <div
          className={`mb-3 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
            uploadError ? "border-red-500/30 bg-red-500/5 text-red-500" : "border-border bg-subtle text-muted"
          }`}
        >
          {uploading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
          {uploading ? "Uploading image…" : uploadError}
          {uploadError && (
            <button type="button" onClick={() => setUploadError("")} className="ml-1 text-muted hover:text-fg" aria-label="Dismiss">
              ×
            </button>
          )}
        </div>
      )}

      {/* Selection toolbar (Medium-style) */}
      <BubbleMenu
        editor={editor}
        className="flex items-center gap-0.5 rounded-xl border border-border bg-card p-1 shadow-xl"
      >
        {linkMode ? (
          <div className="flex items-center gap-1 px-1">
            <input
              autoFocus
              value={linkValue}
              onChange={(ev) => setLinkValue(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") { ev.preventDefault(); applyLink(); }
                if (ev.key === "Escape") { ev.preventDefault(); setLinkMode(false); }
              }}
              placeholder="Paste or type a link…"
              className="w-56 rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-fg focus:border-accent focus:outline-none"
            />
            <MenuButton title="Apply link" onClick={applyLink}><CheckIcon /></MenuButton>
            <MenuButton title="Remove link" onClick={removeLink}><TrashIcon width={16} height={16} /></MenuButton>
          </div>
        ) : (
          <>
            <MenuButton title="Bold" active={e.isActive("bold")} onClick={() => e.chain().focus().toggleBold().run()}><BoldIcon /></MenuButton>
            <MenuButton title="Italic" active={e.isActive("italic")} onClick={() => e.chain().focus().toggleItalic().run()}><ItalicIcon /></MenuButton>
            <MenuButton title="Inline code" active={e.isActive("code")} onClick={() => e.chain().focus().toggleCode().run()}><CodeIcon /></MenuButton>
            <MenuButton title="Link" active={e.isActive("link")} onClick={openLink}><LinkIcon /></MenuButton>
            <Divider />
            <MenuButton title="Heading 2" active={e.isActive("heading", { level: 2 })} onClick={() => e.chain().focus().toggleHeading({ level: 2 }).run()}><H2Icon /></MenuButton>
            <MenuButton title="Heading 3" active={e.isActive("heading", { level: 3 })} onClick={() => e.chain().focus().toggleHeading({ level: 3 }).run()}><H3Icon /></MenuButton>
            <MenuButton title="Quote" active={e.isActive("blockquote")} onClick={() => e.chain().focus().toggleBlockquote().run()}><QuoteIcon /></MenuButton>
            <MenuButton title="Add image" onClick={() => fileRef.current?.click()}><ImageIcon /></MenuButton>
          </>
        )}
      </BubbleMenu>

      {/* Insert menu on empty lines (Medium-style "+") */}
      <FloatingMenu
        editor={editor}
        className="flex items-center gap-0.5 rounded-xl border border-border bg-card p-1 shadow-xl"
      >
        <MenuButton title="Heading" onClick={() => e.chain().focus().toggleHeading({ level: 2 }).run()}><H2Icon /></MenuButton>
        <MenuButton title="Bullet list" onClick={() => e.chain().focus().toggleBulletList().run()}><BulletListIcon /></MenuButton>
        <MenuButton title="Numbered list" onClick={() => e.chain().focus().toggleOrderedList().run()}><OrderedListIcon /></MenuButton>
        <MenuButton title="Quote" onClick={() => e.chain().focus().toggleBlockquote().run()}><QuoteIcon /></MenuButton>
        <MenuButton title="Code block" onClick={() => e.chain().focus().toggleCodeBlock().run()}><CodeIcon /></MenuButton>
        <MenuButton title="Divider" onClick={() => e.chain().focus().setHorizontalRule().run()}><DividerIcon /></MenuButton>
        <MenuButton title="Image" onClick={() => fileRef.current?.click()}><ImageIcon /></MenuButton>
      </FloatingMenu>

      <EditorContent editor={editor} />
    </div>
  );
}
