"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import type { UploadCategory } from "@/lib/image-upload";

type Props = {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  category: UploadCategory;
  label?: string;
  emptyHint?: string;
  previewAspect?: string;
};

export function SingleImageUploader({
  value,
  onChange,
  category,
  label = "Image",
  emptyHint = "No image yet — upload from your device",
  previewAspect = "aspect-[16/7]",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("category", category);

      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? `Failed to upload ${file.name}`);
        return;
      }

      onChange(data.url as string);
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed — try again");
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  const isLocalUpload = value?.startsWith("/uploads/") ?? false;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <span className="text-xs text-slate-500">JPEG, PNG, WebP, GIF · max 5 MB</span>
      </div>

      {value ? (
        <div
          className={`group relative mb-3 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 ${previewAspect}`}
        >
          <Image
            src={value}
            alt={label}
            fill
            className="object-cover"
            sizes="400px"
            unoptimized={isLocalUpload}
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 rounded-md bg-slate-950/80 p-1.5 text-slate-200 opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="Remove image"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          className={`mb-3 flex items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/40 text-slate-500 ${previewAspect}`}
        >
          <div className="text-center">
            <ImagePlus className="mx-auto mb-2 h-8 w-8 opacity-60" />
            <p className="text-sm">{emptyHint}</p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={uploading}
        onChange={(e) => void uploadFile(e.target.files)}
      />

      <Button
        type="button"
        variant="outline"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            {value ? "Replace image" : "Upload image"}
          </>
        )}
      </Button>
    </div>
  );
}
