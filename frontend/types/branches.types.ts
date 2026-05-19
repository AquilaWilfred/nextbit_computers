export interface HourRow {
  label: string;
  value: string;
}

export interface Branch {
  id: number;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  lat: string;
  lng: string;
  isMain: boolean;
  active: boolean;
  hours?: HourRow[];
}

export interface BranchFormData {
  name: string;
  address: string;
  phone: string;
  email: string;
  lat: string;
  lng: string;
  isMain: boolean;
  active: boolean;
  hours: HourRow[];
}