import { DeviceType } from '@/types/listings/listings.types';

export const DEVICE_LABELS: Record<DeviceType, string> = {
  laptop: "Laptop",
  desktop: "Desktop / PC",
  tablet: "Tablet",
  monitor: "Monitor",
  printer: "Printer",
  other: "Other",
  phone: "Smartphone",
  headphones: "Headphones",
  camera: "Camera",
};

export default DEVICE_LABELS;
