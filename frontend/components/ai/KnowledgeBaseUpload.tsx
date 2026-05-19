"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Loader2 } from "lucide-react";
import { useFileUpload } from "@/hooks/ai/useFileUpload";
import { KnowledgeBaseImage } from "./KnowledgeBaseImage";

interface KnowledgeBaseUploadProps {
  files: string[];
  onAddFile: (url: string) => void;
  onRemoveFile: (index: number) => void;
}

export const KnowledgeBaseUpload = memo(function KnowledgeBaseUpload({
  files,
  onAddFile,
  onRemoveFile,
}: KnowledgeBaseUploadProps) {
  const { uploading, fileInputRef, uploadFiles, triggerFileSelect } = useFileUpload(onAddFile);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      await uploadFiles(e.target.files);
    }
  };

  return (
    <div className="space-y-3 pt-4 border-t border-border">
      <div>
        <Label className="text-lg font-semibold">Knowledge Base</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Upload documents or images (return policies, manuals, FAQs) for the AI to reference.
        </p>
      </div>
      
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {files.map((url, idx) => (
          <KnowledgeBaseImage
            key={idx}
            url={url}
            index={idx}
            onRemove={() => onRemoveFile(idx)}
          />
        ))}
        
        <button
          type="button"
          onClick={triggerFileSelect}
          disabled={uploading}
          className="aspect-square rounded-md border-2 border-dashed border-border hover:border-[var(--brand)] hover:bg-[var(--brand)]/5 flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          <span className="text-xs">Upload</span>
        </button>
        
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept="image/*,application/pdf"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
});