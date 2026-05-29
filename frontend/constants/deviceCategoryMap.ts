import { DeviceType } from '@/types/listings/listings.types';

// Map DeviceType values to likely product category names (used for better matching)
export const DEVICE_CATEGORY_MAP: Record<DeviceType, string[]> = {
  laptop: ['Computers & Laptops'],
  desktop: ['Computers & Laptops'],
  tablet: ['Consumer Electronics', 'Computers & Laptops'],
  monitor: ['Peripherals & Accessories', 'Computers & Laptops'],
  printer: ['Peripherals & Accessories'],
  other: ['Other'],
  phone: ['Consumer Electronics'],
  headphones: ['Peripherals & Accessories', 'Consumer Electronics'],
  camera: ['Consumer Electronics'],
};

export default DEVICE_CATEGORY_MAP;
