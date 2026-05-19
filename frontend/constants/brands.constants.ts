import { Brand } from "@/types/brands.types";
import { Monitor, Wifi, Server, Globe, Package, Tag } from "lucide-react";

export const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "Consumer Electronics": Monitor,
  "Computers & Laptops": Monitor,
  "Networking & Internet": Wifi,
  "Servers & Enterprise": Server,
  "Software & Cloud": Globe,
  "Peripherals & Accessories": Package,
  "Other": Tag,
};

export const ALL_CATEGORIES = [
  "Consumer Electronics",
  "Computers & Laptops",
  "Networking & Internet",
  "Servers & Enterprise",
  "Software & Cloud",
  "Peripherals & Accessories",
  "Other",
];

export const PRESET_BRANDS: Brand[] = [
  // Consumer Electronics
  { name: "Samsung", category: "Consumer Electronics" },
  { name: "Sony", category: "Consumer Electronics" },
  { name: "LG", category: "Consumer Electronics" },
  { name: "Panasonic", category: "Consumer Electronics" },
  { name: "Philips", category: "Consumer Electronics" },
  { name: "Hisense", category: "Consumer Electronics" },
  { name: "TCL", category: "Consumer Electronics" },
  { name: "Sharp", category: "Consumer Electronics" },

  // Computers & Laptops
  { name: "Apple", category: "Computers & Laptops" },
  { name: "Dell", category: "Computers & Laptops" },
  { name: "HP", category: "Computers & Laptops" },
  { name: "Lenovo", category: "Computers & Laptops" },
  { name: "Asus", category: "Computers & Laptops" },
  { name: "Acer", category: "Computers & Laptops" },
  { name: "MSI", category: "Computers & Laptops" },
  { name: "Toshiba", category: "Computers & Laptops" },
  { name: "Razer", category: "Computers & Laptops" },
  { name: "Microsoft Surface", category: "Computers & Laptops" },

  // Networking & Internet
  { name: "Cisco", category: "Networking & Internet" },
  { name: "TP-Link", category: "Networking & Internet" },
  { name: "Netgear", category: "Networking & Internet" },
  { name: "Ubiquiti", category: "Networking & Internet" },
  { name: "D-Link", category: "Networking & Internet" },
  { name: "ASUS ROG Networking", category: "Networking & Internet" },
  { name: "Linksys", category: "Networking & Internet" },
  { name: "MikroTik", category: "Networking & Internet" },
  { name: "Juniper", category: "Networking & Internet" },
  { name: "Huawei Enterprise", category: "Networking & Internet" },
  { name: "ZTE", category: "Networking & Internet" },

  // Servers & Enterprise
  { name: "IBM", category: "Servers & Enterprise" },
  { name: "HPE", category: "Servers & Enterprise" },
  { name: "Dell EMC", category: "Servers & Enterprise" },
  { name: "Supermicro", category: "Servers & Enterprise" },
  { name: "Fujitsu", category: "Servers & Enterprise" },
  { name: "Oracle", category: "Servers & Enterprise" },
  { name: "Intel", category: "Servers & Enterprise" },
  { name: "AMD", category: "Servers & Enterprise" },
  { name: "NVIDIA", category: "Servers & Enterprise" },
  { name: "Quanta", category: "Servers & Enterprise" },

  // Software & Cloud
  { name: "Microsoft", category: "Software & Cloud" },
  { name: "Adobe", category: "Software & Cloud" },
  { name: "VMware", category: "Software & Cloud" },
  { name: "Fortinet", category: "Software & Cloud" },
  { name: "Palo Alto Networks", category: "Software & Cloud" },
  { name: "Symantec", category: "Software & Cloud" },
  { name: "Kaspersky", category: "Software & Cloud" },

  // Peripherals & Accessories
  { name: "Logitech", category: "Peripherals & Accessories" },
  { name: "Corsair", category: "Peripherals & Accessories" },
  { name: "SteelSeries", category: "Peripherals & Accessories" },
  { name: "Belkin", category: "Peripherals & Accessories" },
  { name: "Anker", category: "Peripherals & Accessories" },
  { name: "Kingston", category: "Peripherals & Accessories" },
  { name: "Western Digital", category: "Peripherals & Accessories" },
  { name: "Seagate", category: "Peripherals & Accessories" },
  { name: "Sandisk", category: "Peripherals & Accessories" },
];

export const API_BASE = "/api/admin/settings";