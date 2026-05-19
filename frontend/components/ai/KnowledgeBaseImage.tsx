"use client";

import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface KnowledgeBaseImageProps {
  url: string;
  index: number;
  onRemove: () => void;
}

async function trainOnDocument(fileUrl: string, fileName: string) {
  const res = await fetch("/api/admin/ai/train", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileUrl, fileName }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export const KnowledgeBaseImage = memo(function KnowledgeBaseImage({
  url,
  index,
  onRemove,
}: KnowledgeBaseImageProps) {
  const [training, setTraining] = useState(false);

  const handleTrain = async () => {
    setTraining(true);
    try {
      await trainOnDocument(url, `Document_${index}`);
      toast.success("AI successfully trained on document!");
    } catch (err: any) {
      toast.error(err?.message ?? "Training failed");
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="relative aspect-square rounded-md overflow-hidden border border-border group bg-muted/30">
      <img src={url} alt={`Knowledge ${index}`} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-2 gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-full text-[10px]"
          onClick={handleTrain}
          disabled={training}
        >
          {training ? <Loader2 className="w-3 h-3 animate-spin" /> : "Train"}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="h-7 w-full text-[10px]"
          onClick={onRemove}
        >
          Remove
        </Button>
      </div>
    </div>
  );
});