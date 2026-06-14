import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X, Search, ChevronRight, Wrench, Recycle, Shield, CreditCard, Crown, Headphones, List, Activity } from "lucide-react";
import { getLoginUrl } from "@/lib/const";
import { Category } from "@/types/navbar/navbar.types";
import { SERVICE_ITEMS } from "@/constants/navbar/navbar.constants";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
  rootCategories: Category[];
  orderedCategories: Category[];
  getCategoryIcon: (cat: Category) => React.ReactNode;
  isAuthenticated: boolean;
  user: { name?: string; email?: string; role?: string } | null;
  storeName: string; 
}

export function MobileMenu({ 
  isOpen, 
  onClose, 
  pathname, 
  rootCategories, 
  orderedCategories, 
  getCategoryIcon, 
  isAuthenticated, 
  user,
  storeName  // ADD THIS
}: MobileMenuProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const getChildren = (parentId: string) => orderedCategories.filter((c) => c.parentId === parentId);
  const authProtectedPaths = new Set(["/insurance", "/e-waste", "/repairs", "/conflicts", "/listings", "/nextbit-wallet", "/vip"]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    onClose();
    setSearchQuery("");
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[2147483647] lg:hidden backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="fixed top-0 left-0 h-full w-[85%] max-w-sm bg-background border-r border-border z-[2147483647] transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col shadow-2xl translate-x-0">
        {/* Header */}
        <div className="h-16 px-4 border-b border-border flex items-center justify-between shrink-0">
          <span className="font-display font-bold text-sm sm:text-base lg:text-lg tracking-tight">{storeName}</span>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close mobile menu">
            <X className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>

        {/* Rest of the component remains the same */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col">
          <form onSubmit={handleSearch} className="flex gap-2 mb-6">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              aria-label="Search products"
              className="flex-1 h-11 px-4 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-[var(--brand)] shadow-sm"
            />
            <Button type="submit" size="icon" className="bg-[var(--brand)] text-white h-11 w-11 rounded-xl shadow-sm hover:opacity-90 shrink-0" aria-label="Submit search">
              <Search className="w-4 h-4" />
            </Button>
          </form>

          <div className="space-y-1.5 mb-6">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">Navigation</p>
            {[
              { href: "/", label: "Home" },
              { href: "/products", label: "All Products" },
              { href: "/products?featured=true", label: "Deals" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium hover:bg-[var(--brand)]/10 hover:text-[var(--brand)] transition-colors"
              >
                {label}
              </Link>
            ))}
            
            {rootCategories.map((cat) => {
              const children = getChildren(cat.id);
              return (
                <div key={cat.id} className="space-y-1">
                  <Link
                    href={`/products?category=${cat.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium hover:bg-[var(--brand)]/10 hover:text-[var(--brand)] transition-colors"
                  >
                    {getCategoryIcon(cat)} {cat.name}
                  </Link>
                  {children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/products?category=${child.slug}`}
                      onClick={onClose}
                      className="flex items-center gap-3 px-6 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-[var(--brand)]/10 hover:text-[var(--brand)] transition-colors ml-4"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Services</p>
            {SERVICE_ITEMS.map(({ href, label, icon }) => {
              const IconMap: Record<string, React.ReactNode> = {
                Wrench: <Wrench className="w-4 h-4" />,
                Recycle: <Recycle className="w-4 h-4" />,
                List: <List className="w-4 h-4" />,
                Shield: <Shield className="w-4 h-4" />,
                CreditCard: <CreditCard className="w-4 h-4" />,
                Crown: <Crown className="w-4 h-4" />,
                Headphones: <Headphones className="w-4 h-4" />,
              };

              const requiresAuth = !isAuthenticated && authProtectedPaths.has(href);
              const targetHref = requiresAuth ? getLoginUrl(href) : href;

              return (
                <Link
                  key={href}
                  href={targetHref}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium hover:bg-[var(--brand)]/10 hover:text-[var(--brand)] transition-colors"
                >
                  {IconMap[icon]} {label}
                  {requiresAuth && (
                    <span className="ml-auto rounded-full bg-yellow-100 text-yellow-800 px-2 py-0.5 text-[10px] font-semibold">
                      Login required
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Help & Resolve</p>
            <Link
              href={isAuthenticated ? "/conflicts" : getLoginUrl("/conflicts")}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium hover:bg-[var(--brand)]/10 hover:text-[var(--brand)] transition-colors"
            >
              Resolution Hub
              {!isAuthenticated && (
                <span className="ml-auto rounded-full bg-yellow-100 text-yellow-800 px-2 py-0.5 text-[10px] font-semibold">
                  Login required
                </span>
              )}
            </Link>
          </div>

          {isAuthenticated && (
            <div className="mt-4 pt-4 border-t border-border">
              <Link
                href="/dashboard/diagnostics"
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium hover:bg-[var(--brand)]/10 hover:text-[var(--brand)] transition-colors"
              >
                <Activity className="w-4 h-4" /> Device Diagnostics
              </Link>
            </div>
          )}

          <div className="mt-auto space-y-3">
            {isAuthenticated ? (
              <Button variant="secondary" size="sm" className="w-full" onClick={() => { onClose(); router.push("/dashboard"); }}>
                Dashboard
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { onClose(); router.push(getLoginUrl(pathname)); }}>
                  Sign In
                </Button>
                <Button className="flex-1 bg-[var(--brand)] text-white" onClick={() => { onClose(); router.push(getLoginUrl(pathname, "register")); }}>
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}