"use client";

import { memo } from "react";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, X } from "lucide-react";

interface ProductImageUploadProps {
  images: string[];
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onUpload: () => void;
  onRemove: (index: number) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ProductImageUpload = memo(function ProductImageUpload({
  images,
  isUploading,
  fileInputRef,
  onUpload,
  onRemove,
  onFileChange,
}: ProductImageUploadProps) {
  return (
    <div className="space-y-1.5">
      <Label>Product Images</Label>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {images.map((img, idx) => (
          <div key={idx} className="relative aspect-square rounded-md overflow-hidden border border-border group">
            <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" loading="lazy" />
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="absolute top-1 right-1 w-6 h-6 bg-destructive/90 text-white rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={onUpload}
          disabled={isUploading}
          className="aspect-square rounded-md border-2 border-dashed border-border hover:border-[var(--brand)] hover:bg-[var(--brand)]/5 flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          <span className="text-xs">{isUploading ? "Uploading" : "Upload"}</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          multiple
          onChange={onFileChange}
        />
      </div>
    </div>
  );
});