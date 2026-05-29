import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { MAX_IMAGES, MAX_IMAGE_SIZE_MB, ALLOWED_IMAGE_TYPES } from '@/constants/listings/listings.constants';

export function useImageUpload() {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [primaryIndex, setPrimaryIndex] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): boolean => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
      toast.error(`${file.name} is not a supported image format. Use JPEG, PNG, or WebP.`);
      return false;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      toast.error(`${file.name} exceeds ${MAX_IMAGE_SIZE_MB}MB limit.`);
      return false;
    }
    return true;
  }, []);

  const addImages = useCallback((files: File[]) => {
    const remainingSlots = MAX_IMAGES - selectedImages.length;
    
    if (files.length > remainingSlots) {
      toast.error(`You can only upload up to ${MAX_IMAGES} images. You have ${selectedImages.length} already selected.`);
      return;
    }
    
    const validFiles = files.filter(validateFile);
    
    if (validFiles.length === 0) return;
    
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
    setSelectedImages(prev => [...prev, ...validFiles]);
    // if no primary set and we added at least one image, keep primary at 0
    // otherwise preserve existing primaryIndex
  }, [selectedImages.length, validateFile]);

  const removeImage = useCallback((index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPrimaryIndex(prev => {
      if (prev === index) return 0; // removed primary -> reset to first
      if (index < prev) return prev - 1; // shifted left
      return prev;
    });
  }, [imagePreviews]);

  const clearImages = useCallback(() => {
    imagePreviews.forEach(preview => URL.revokeObjectURL(preview));
    setImagePreviews([]);
    setSelectedImages([]);
    setPrimaryIndex(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [imagePreviews]);

  const getImageCount = useCallback(() => selectedImages.length, [selectedImages.length]);

  const setPrimary = useCallback((index: number) => {
    if (index < 0 || index >= selectedImages.length) return;
    // Move chosen image to position 0 so it becomes the face when uploading
    setSelectedImages(prev => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.unshift(item);
      return copy;
    });
    setImagePreviews(prev => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.unshift(item);
      return copy;
    });
    setPrimaryIndex(0);
  }, [selectedImages.length]);

  return {
    selectedImages,
    imagePreviews,
    fileInputRef,
    addImages,
    removeImage,
    clearImages,
    getImageCount,
    maxImages: MAX_IMAGES,
    primaryIndex,
    setPrimary,
  };
}