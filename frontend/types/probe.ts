export interface Device {
  id: string;
  device_id: string;
  serial?: string;
  machine_id?: string;
  mac_addresses?: string[];
  manufacturer?: string;
  model?: string;
  shop_id?: string;
  created_at: string;
  last_seen: string;
}

export interface Scan {
  id: string;
  device_id: string;
  scan_id: string;
  data: any;
  created_at: string;
}

export interface Score {
  pct: number;
  overall: string;
  checks: Check[];
}

export interface Check {
  name: string;
  passed: boolean;
  detail: string;
  weight: number;
}

export interface DiagResult {
  system?: any;
  battery?: any;
  cpu_throttle?: any;
  ram_test?: any;
  disks?: any;
  gpu?: any;
  temperature?: any;
  network?: any;
  peripherals?: any;
  security?: any;
  performance?: any;
  events?: any;
  display?: any;
  oem?: any;
}