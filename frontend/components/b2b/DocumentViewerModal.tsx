"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils/b2bApplications.utils";

interface DocumentViewerModalProps {
  doc: {
    key: string;
    label: string;
    url: string;
    uploadedAt: string;
    verified?: boolean;
  };
  onClose: () => void;
  onVerify: () => void;
  onUnverify: () => void;
}

export const DocumentViewerModal = memo(function DocumentViewerModal({
  doc,
  onClose,
  onVerify,
  onUnverify,
}: DocumentViewerModalProps) {
  const isPdf = doc.url.toLowerCase().includes(".pdf") || doc.url.includes("pdf");

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between shrink-0">
          <div>
            <p className="font-semibold text-sm">{doc.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Uploaded {formatDate(doc.uploadedAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 min-h-[300px]">
          {isPdf ? (
            <iframe
              src={doc.url}
              className="w-full h-[400px] border-0 rounded-lg"
              title={doc.label}
            />
          ) : (
            <img
              src={doc.url}
              alt={doc.label}
              className="w-full rounded-lg object-contain"
            />
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t flex items-center justify-between shrink-0">
          <a
            href={doc.url}
            download
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" variant="outline" className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> Download
            </Button>
          </a>

          <div className="flex items-center gap-2">
            {doc.verified ? (
              <Button
                size="sm"
                variant="outline"
                onClick={onUnverify}
                className="gap-1.5 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Unmark Verified
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onVerify}
                className="gap-1.5 bg-emerald-500 text-white hover:bg-emerald-600"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Verified
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});