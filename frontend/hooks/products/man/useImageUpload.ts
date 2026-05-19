import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { PresignedUrlResponse } from "@/types/products/man/products.types";
import { apiFetch } from "@/lib/utils/products/man/man.products.utils";

export function useImageUpload(onImagesUploaded: (urls: string[]) => void) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadSingleImage = useCallback(async (file: File): Promise<string> => {
    const { uploadUrl, publicUrl } = await apiFetch<PresignedUrlResponse>("/api/admin/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    });
    
    const res = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    
    if (!res.ok) throw new Error("S3 Upload Failed");
    return publicUrl;
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    setIsUploading(true);
    const uploadedUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not a valid image.`);
        continue;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 2MB.`);
        continue;
      }

      const toastId = toast.loading(`Uploading ${file.name}...`);
      try {
        const url = await uploadSingleImage(file);
        uploadedUrls.push(url);
        toast.success(`${file.name} uploaded!`, { id: toastId });
      } catch {
        toast.error(`Failed to upload ${file.name}`, { id: toastId });
      }
    }

    if (uploadedUrls.length > 0) {
      onImagesUploaded(uploadedUrls);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsUploading(false);
  }, [uploadSingleImage, onImagesUploaded]);

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    isUploading,
    fileInputRef,
    handleFileUpload,
    triggerFileSelect,
  };
}