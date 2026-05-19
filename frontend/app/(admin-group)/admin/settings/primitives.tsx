"use client";

/**
 * Shared primitives for the Settings page.
 * Keeping these here avoids prop-drilling and keeps each tab lean.
 */

import React, { memo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Upload, X } from "lucide-react";

// ─── SaveButton ────────────────────────────────────────────────────────────────

interface SaveButtonProps {
  onClick: () => void;
  isSaving: boolean;
  isDirty?: boolean;
  label?: string;
}

export const SaveButton = memo(function SaveButton({
  onClick,
  isSaving,
  isDirty,
  label = "Save Changes",
}: SaveButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={isSaving}
      className="gap-2"
      aria-label={isSaving ? "Saving…" : label}
    >
      {isSaving ? (
        <Loader2 size={18} className="animate-spin" aria-hidden="true" />
      ) : (
        <Save size={18} aria-hidden="true" />
      )}
      {isSaving ? "Saving…" : label}
      {isDirty && !isSaving && (
        <span className="ml-1 h-2 w-2 rounded-full bg-amber-400" aria-label="Unsaved changes" />
      )}
    </Button>
  );
});

// ─── SectionHeader ─────────────────────────────────────────────────────────────

export const SectionHeader = memo(function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border-t border-border pt-4 mt-4">
      <h4 className="font-medium text-base">{title}</h4>
      {description && (
        <p className="text-xs text-muted-foreground mt-0.5 mb-4">{description}</p>
      )}
    </div>
  );
});

// ─── FieldLabel ────────────────────────────────────────────────────────────────

export const FieldLabel = memo(function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium mb-2"
    >
      {children}
    </label>
  );
});

// ─── ColorField ────────────────────────────────────────────────────────────────

export const ColorField = memo(function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <FieldLabel htmlFor={`${id}-hex`}>{label}</FieldLabel>
      <div className="flex gap-2">
        <Input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-16 h-10 p-1 cursor-pointer"
          aria-label={`${label} color picker`}
        />
        <Input
          id={`${id}-hex`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          aria-label={`${label} hex value`}
        />
      </div>
    </div>
  );
});

// ─── ImageUploadZone ──────────────────────────────────────────────────────────

interface ImageUploadZoneProps {
  id: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<string | null>;
  uploading?: boolean;
  accept?: string;
  hint?: string;
  previewClassName?: string;
}

export const ImageUploadZone = memo(function ImageUploadZone({
  id,
  label,
  value,
  onChange,
  onUpload,
  uploading,
  accept = "image/*",
  hint = "PNG, JPG, WEBP up to 2MB",
  previewClassName = "h-16 object-contain",
}: ImageUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const url = await onUpload(file);
    if (url) onChange(url);
  };

  return (
    <div>
      <FieldLabel htmlFor={`upload-${id}`}>{label}</FieldLabel>
      {/* Drag-and-drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Upload ${label}`}
        className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
      >
        <input
          ref={inputRef}
          id={`upload-${id}`}
          type="file"
          className="sr-only"
          accept={accept}
          aria-label={`Upload ${label}`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        {value ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={`${label} preview`}
              className={previewClassName}
              loading="lazy"
              decoding="async"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              aria-label={`Remove ${label}`}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
            >
              <X size={12} aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <div className="py-2">
            {uploading ? (
              <Loader2
                size={24}
                className="mx-auto mb-2 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            ) : (
              <Upload
                size={24}
                className="mx-auto mb-2 text-muted-foreground"
                aria-hidden="true"
              />
            )}
            <p className="text-sm text-muted-foreground">
              {uploading ? "Uploading…" : "Click or drag & drop"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{hint}</p>
          </div>
        )}
      </div>
    </div>
  );
});

// ─── ToggleRow ─────────────────────────────────────────────────────────────────

export const ToggleRow = memo(function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  id,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  id: string;
}) {
  // Import Switch lazily to avoid circular deps — caller can also pass via children
  // We keep this as a thin wrapper only; real Switch import happens in tabs.
  return (
    <div className="flex items-center justify-between p-4 bg-secondary/60 rounded-lg">
      <div>
        <label htmlFor={id} className="text-sm font-medium cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {/* Switch is passed as children via render prop for flexibility */}
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="sr-only"
        aria-checked={checked}
      />
    </div>
  );
});

// ─── LoadingSkeleton ──────────────────────────────────────────────────────────

export const FieldSkeleton = memo(function FieldSkeleton({
  rows = 3,
}: {
  rows?: number;
}) {
  return (
    <div
      role="status"
      aria-label="Loading settings"
      className="space-y-4 animate-pulse"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="h-9 rounded bg-muted" />
        </div>
      ))}
      <span className="sr-only">Loading settings…</span>
    </div>
  );
});