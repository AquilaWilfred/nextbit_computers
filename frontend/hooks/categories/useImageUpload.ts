import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/utils/category.utils";

interface UseImageUploadProps {
  onUploadSuccess: (url: string) => void;
}

export function useImageUpload({ onUploadSuccess }: UseImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const res = await apiFetch<{ uploadUrl: string; publicUrl: string }>(
      "/api/admin/upload/presign",
      {
        method: "POST",
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      }
    );
    
    const put = await fetch(res.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    
    if (!put.ok) throw new Error("S3 upload failed");
    return res.publicUrl;
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Max image size is 2 MB.");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading(`Uploading ${file.name}…`);
    
    try {
      const publicUrl = await uploadImage(file);
      onUploadSuccess(publicUrl);
      toast.success("Image uploaded!", { id: toastId });
    } catch {
      toast.error("Upload failed.", { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [uploadImage, onUploadSuccess]);

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