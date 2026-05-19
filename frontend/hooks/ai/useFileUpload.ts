import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

async function uploadSingleFile(file: File): Promise<UploadResult> {
  try {
    // Get presigned URL
    const presignRes = await fetch("/api/admin/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    });
    
    if (!presignRes.ok) throw new Error("Failed to get presigned URL");
    
    const { uploadUrl, publicUrl } = await presignRes.json();
    
    // Upload to S3
    const s3Res = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    
    if (!s3Res.ok) throw new Error("S3 upload failed");
    
    return { success: true, url: publicUrl };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Upload failed" };
  }
}

export function useFileUpload(onFileUploaded: (url: string) => void) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (!fileArray.length) return [];

    setUploading(true);
    const uploadedUrls: string[] = [];

    for (const file of fileArray) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 5 MB.`);
        continue;
      }

      const toastId = toast.loading(`Uploading ${file.name}…`);

      const result = await uploadSingleFile(file);
      
      if (result.success && result.url) {
        uploadedUrls.push(result.url);
        onFileUploaded(result.url);
        toast.success(`${file.name} uploaded!`, { id: toastId });
      } else {
        toast.error(`Failed to upload ${file.name}: ${result.error}`, { id: toastId });
      }
    }

    setUploading(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    
    return uploadedUrls;
  }, [onFileUploaded]);

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    uploading,
    fileInputRef,
    uploadFiles,
    triggerFileSelect,
  };
}