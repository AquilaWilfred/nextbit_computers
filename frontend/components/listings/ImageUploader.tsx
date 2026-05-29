// components/listings/ImageUploader.tsx
"use client";

import { FC, useRef, useState } from 'react';
import { Image as ImageIcon, X, Star } from 'lucide-react';
import { MAX_IMAGES } from '@/constants/listings/listings.constants';

interface ImageUploaderProps {
  images: File[];
  previews: string[];
  onAddImages: (files: File[]) => void;
  onRemoveImage: (index: number) => void;
  maxImages?: number;
  primaryIndex?: number;
  onSetPrimary?: (index: number) => void;
}

export const ImageUploader: FC<ImageUploaderProps> = ({
  images,
  previews,
  onAddImages,
  onRemoveImage,
  maxImages = MAX_IMAGES,
  primaryIndex = 0,
  onSetPrimary,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) onAddImages(files);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length) onAddImages(imageFiles);
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Device Photos (Max {maxImages})
      </label>
      
      <div 
        className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
          isDragging 
            ? 'border-blue-500 bg-blue-50 shadow-md' 
            : 'border-gray-300 bg-gray-50 hover:border-blue-400'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <ImageIcon className={`w-10 h-10 mx-auto mb-2 ${
          isDragging ? 'text-blue-500' : 'text-gray-400'
        }`} />
        <p className={`text-sm ${isDragging ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
          {isDragging ? 'Drop your images here' : 'Click to upload or drag and drop'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          PNG, JPG up to 5MB each. {images.length}/{maxImages} selected.
        </p>
      </div>
      
      {previews.length > 0 && (
        <div className="grid grid-cols-5 gap-3 mt-4">
          {previews.map((preview, idx) => (
            <div key={idx} className="relative group">
              <img 
                src={preview} 
                alt={`Preview ${idx + 1}`} 
                className={`w-full h-24 object-cover rounded-lg border ${idx === primaryIndex ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
              />

              <button
                type="button"
                onClick={() => onRemoveImage(idx)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition shadow-md"
              >
                <X className="w-3 h-3" />
              </button>

              {onSetPrimary && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onSetPrimary(idx); }}
                  className={`absolute -top-2 -left-2 bg-white text-gray-700 rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-gray-100 transition shadow-sm ${idx === primaryIndex ? 'border border-blue-300' : 'border'}`}
                  title={idx === primaryIndex ? 'Primary image' : 'Make primary'}
                >
                  <Star className={`w-4 h-4 ${idx === primaryIndex ? 'text-yellow-400' : 'text-gray-400'}`} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};