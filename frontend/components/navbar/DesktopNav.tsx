import Link from "next/link";
import { ChevronDown, ChevronRight, Package } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Category } from "@/types/navbar/navbar.types";
import { SERVICE_ITEMS } from "@/constants/navbar/navbar.constants";
import { dynamicIconMap } from "@/lib/iconMap";

interface DesktopNavProps {
  pathname: string;
  rootCategories: Category[];
  orderedCategories: Category[];
  getCategoryIcon: (cat: Category) => React.ReactNode;
}

export function DesktopNav({ pathname, rootCategories, orderedCategories, getCategoryIcon }: DesktopNavProps) {
  const getChildren = (parentId: string) => orderedCategories.filter((c) => c.parentId === parentId);

  const getServiceIcon = (iconName: string) => {
    const Icon = dynamicIconMap[iconName];
    return Icon ? <Icon className="w-4 h-4" /> : <Package className="w-4 h-4" />;
  };

  return (
    <nav className="hidden lg:flex items-center gap-1">
      <Link
        href="/"
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          pathname === "/" ? "text-[var(--brand)]" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Home
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Products <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem asChild>
            <Link href="/products" className="flex items-center gap-2 cursor-pointer">
              <Package className="w-4 h-4" /> All Products
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {rootCategories.map((cat) => {
            const children = getChildren(cat.id);
            if (children.length > 0) {
              return (
                <DropdownMenuSub key={cat.id}>
                  <DropdownMenuSubTrigger className="flex items-center gap-2 cursor-pointer">
                    {getCategoryIcon(cat)} {cat.name}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-56 p-1.5 shadow-xl border-border/60">
                    <DropdownMenuItem asChild className="py-2.5 px-3">
                      <Link href={`/products?category=${cat.slug}`} className="cursor-pointer font-semibold text-[var(--brand)]">
                        All {cat.name}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {children.map((child) => (
                      <DropdownMenuItem key={child.id} asChild className="group/item py-2.5 px-3">
                        <Link
                          href={`/products?category=${child.slug}`}
                          className="cursor-pointer flex items-center justify-between w-full text-muted-foreground"
                        >
                          <span>{child.name}</span>
                          <ChevronRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-300 text-[var(--brand)]" />
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              );
            }
            return (
              <DropdownMenuItem key={cat.id} asChild>
                <Link href={`/products?category=${cat.slug}`} className="flex items-center gap-2 cursor-pointer">
                  {getCategoryIcon(cat)} {cat.name}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Link href="/products?featured=true" className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        Deals
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer">
          Services <ChevronDown className="w-4 h-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48 p-1.5">
          {SERVICE_ITEMS.map((item) => (
            <DropdownMenuItem key={item.href} asChild>
              <Link href={item.href} className="flex items-center gap-2 cursor-pointer">
                {getServiceIcon(item.icon)} {item.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Link href="/conflicts" className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        Resolution Hub
      </Link>
    </nav>
  );
}