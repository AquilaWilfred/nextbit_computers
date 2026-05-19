"use client";
import Link from "next/link";
import { Package, Cpu, Battery, Monitor, Keyboard, HardDrive } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { toast } from "sonner";

interface SparePart {
  id: string;
  name: string;
  compatibility: string;
  price: number;
  condition: string;
  category: string;
  supplier?: string;
  stock: number;
  warrantyDays?: number;
}

function PartCategoryIcon({ category }: { category: string }) {
  const icons: Record<string, React.ReactNode> = {
    Screens: <Monitor className="h-4 w-4 text-emerald-600" />,
    Batteries: <Battery className="h-4 w-4 text-emerald-600" />,
    Keyboards: <Keyboard className="h-4 w-4 text-emerald-600" />,
    RAM: <Cpu className="h-4 w-4 text-emerald-600" />,
    Storage: <HardDrive className="h-4 w-4 text-emerald-600" />,
  };
  return (
    <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center">{
      icons[category] ?? <Package className="h-5 w-5 text-emerald-600" />
    }</div>
  );
}

export default function PartCard({ part }: { part: SparePart }) {
  const image = "/assets/placeholder.png";

  const handleEnquire = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.success(`Enquiry sent to supplier: ${part.supplier ?? "Supplier"}`);
  };

  return (
    <Link href={`/repairs/parts/${encodeURIComponent(part.id)}`}>
      <div className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer h-full flex flex-col">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted flex items-center justify-center">
          <img src={image} alt={part.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" decoding="async" />
        </div>

        <div className="p-4 flex flex-col flex-1 gap-2">
          <h3 className="font-display font-semibold text-sm leading-snug line-clamp-2 group-hover:text-[var(--brand)] transition-colors">{part.name}</h3>
          <div className="text-xs text-muted-foreground">{part.compatibility}</div>
          <div className="flex items-center gap-2 mt-auto">
            <div className="flex-1">
              <div className="font-display font-bold text-base">KES {part.price.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">{part.supplier} · {part.stock} in stock</div>
            </div>
            <div className="flex flex-col gap-2">
              <Badge className="text-xs">{part.condition.toUpperCase()}</Badge>
              <Button size="sm" className="h-8 px-3" onClick={handleEnquire}>Enquire</Button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
