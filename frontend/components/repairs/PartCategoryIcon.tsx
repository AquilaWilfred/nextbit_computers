// components/PartCategoryIcon.tsx
import { Monitor, Battery, Keyboard, Cpu, HardDrive, Package } from "lucide-react";
import { PART_CATEGORY_ICONS } from "@/constants/repairs.constants";

const iconMap: Record<string, React.ReactNode> = {
  Screens: <Monitor className="h-4 w-4 text-emerald-600" />,
  Batteries: <Battery className="h-4 w-4 text-emerald-600" />,
  Keyboards: <Keyboard className="h-4 w-4 text-emerald-600" />,
  RAM: <Cpu className="h-4 w-4 text-emerald-600" />,
  Storage: <HardDrive className="h-4 w-4 text-emerald-600" />,
};

interface PartCategoryIconProps {
  category: string;
}

export function PartCategoryIcon({ category }: PartCategoryIconProps) {
  return (
    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
      {iconMap[category] ?? <Package className="h-4 w-4 text-emerald-600" />}
    </div>
  );
}