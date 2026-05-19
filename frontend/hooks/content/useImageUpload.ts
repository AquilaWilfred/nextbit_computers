import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { API_ENDPOINTS } from "@/constants/content.constants";
import { apiFetch } from "@/lib/utils/content.utils";

interface UseImageUploadProps {
  onSuccess: (url: string) => void;
}

export function useImageUpload({ onSuccess }: UseImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const { uploadUrl, publicUrl } = await apiFetch<{
      uploadUrl: string;
      publicUrl: string;
    }>(API_ENDPOINTS.presignedUrl, {
      method: "POST",
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    });

    const s3Res = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    if (!s3Res.ok) throw new Error("S3 upload failed");

    return publicUrl;
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size should be less than 2MB.");
      return;
    }

    const toastId = toast.loading(`Uploading ${file.name}…`);
    setIsUploading(true);

    try {
      const publicUrl = await uploadImage(file);
      onSuccess(publicUrl);
      toast.success("Image uploaded!", { id: toastId });
    } catch {
      toast.error("Failed to upload image.", { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [uploadImage, onSuccess]);

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