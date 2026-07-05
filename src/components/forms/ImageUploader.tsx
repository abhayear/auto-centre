"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import type { UploadCategory } from "@/lib/image-upload";

type Props = {
  value: string[];
  onChange: (urls: string[]) => void;
  category: UploadCategory;
  label?: string;
  maxFiles?: number;
};

export function ImageUploader({
  value,
  onChange,
  category,
  label = "Photos",
  maxFiles = 6,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList?.length) return;

    const remaining = maxFiles - value.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${maxFiles} images allowed`);
      return;
    }

    const files = Array.from(fileList).slice(0, remaining);
    setUploading(true);

    try {
      const uploaded: string[] = [];

      for (const file of files) {
        const body = new FormData();
        body.append("file", file);
        body.append("category", category);

        const res = await fetch("/api/uploads", { method: "POST", body });
        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error ?? `Failed to upload ${file.name}`);
          continue;
        }

        uploaded.push(data.url as string);
      }

      if (uploaded.length > 0) {
        onChange([...value, ...uploaded]);
        toast.success(
          uploaded.length === 1 ? "Image uploaded" : `${uploaded.length} images uploaded`,
        );
      }
    } catch {
      toast.error("Upload failed — try again");
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <span className="text-xs text-slate-500">
          {value.length}/{maxFiles} · JPEG, PNG, WebP, GIF · max 5 MB
        </span>
      </div>

      {value.length > 0 ? (
        <ul className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((url, index) => (
            <li
              key={`${url}-${index}`}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-700 bg-slate-900"
            >
              <Image
                src={url}
                alt={`Vehicle photo ${index + 1}`}
                fill
                className="object-cover"
                sizes="160px"
                unoptimized={url.startsWith("/uploads/")}
              />
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="absolute right-2 top-2 rounded-md bg-slate-950/80 p-1.5 text-slate-200 opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove image"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              {index === 0 ? (
                <span className="absolute bottom-2 left-2 rounded bg-red-600/90 px-2 py-0.5 text-[10px] font-medium text-white">
                  Cover
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mb-3 flex aspect-[16/7] items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/40 text-slate-500">
          <div className="text-center">
            <ImagePlus className="mx-auto mb-2 h-8 w-8 opacity-60" />
            <p className="text-sm">No photos yet — upload from your device</p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        disabled={uploading || value.length >= maxFiles}
        onChange={(e) => void uploadFiles(e.target.files)}
      />

      <Button
        type="button"
        variant="outline"
        disabled={uploading || value.length >= maxFiles}
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
            Upload photos
          </>
        )}
      </Button>
    </div>
  );
}
