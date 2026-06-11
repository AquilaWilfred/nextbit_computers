"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/auth/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useFetch, useProxyFetch } from "@/lib/api-hooks";
import { Button } from "@/components/ui/button";
import { Menu, Search, ShoppingCart, Sun, Moon, Monitor, Heart } from "lucide-react";
import { AIChat } from "@/components/ai/AIChat";
import { Logo, DesktopNav, MobileMenu, SearchBar, UserMenu } from "@/components/navbar";
import { useNavbarState } from "@/hooks/navbar/useNavbarState";
import { useSearchAutocomplete } from "@/hooks/navbar/useSearchAutocomplete";
import { useCartCount } from "@/hooks/navbar/useCartCount";
import { navbarService } from "@/lib/services/navbar/navbar.service";
import { dynamicIconMap } from "@/lib/iconMap";
import { categoryIcons } from "@/constants/navbar/navbar.constants";
import { Category } from "@/types/navbar/navbar.types";

type SettingsData = {
  general?: { storeName?: string };
};

export default function Navbar() {
  const { theme, cycleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const { mobileOpen, setMobileOpen, searchOpen, setSearchOpen, scrolled, mounted } = useNavbarState();
  const { searchQuery, setSearchQuery, searchResults, isSearching, searchRef } = useSearchAutocomplete();

  const { data: categoriesData } = useFetch("/api/categories");
  const { data: cartData } = useProxyFetch("/api/cart", { enabled: isAuthenticated });
  const { data: settingsData } = useFetch("/api/settings/public");

  const categories = (categoriesData ?? []) as Category[];
  const settings = settingsData as SettingsData | undefined;
  const orderedCategories = navbarService.getOrderedCategories(categories);
  const rootCategories = navbarService.getRootCategories(orderedCategories);
  const storeName = settings?.general?.storeName ?? "Store";
  const cartCount = useCartCount(isAuthenticated, (cartData as any[] | undefined)?.length ?? 0);

  const getCategoryIcon = (cat: Category): React.ReactNode => {
    if (cat.icon && dynamicIconMap[cat.icon]) {
      const Icon = dynamicIconMap[cat.icon];
      return <Icon className="w-4 h-4" />;
    }
    const icon = categoryIcons[cat.slug] ?? categoryIcons.default;
    // categoryIcons may return a LucideIcon component — render it as JSX
    if (typeof icon === "function") {
      const Icon = icon as React.ComponentType<{ className?: string }>;
      return <Icon className="w-4 h-4" />;
    }
    return icon as React.ReactNode;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    setSearchOpen(false);
    setSearchQuery("");
  };

  const getCartContext = () => {
    return isAuthenticated
      ? ((cartData as any[]) ?? []).map((i: any) => ({ productId: i.productId, quantity: i.quantity }))
      : [];
  };

  return (
    <>
      <header
        className={`sticky top-0 z-[99998] transition-all duration-500 ${
          scrolled
            ? "bg-background/80 backdrop-blur-xl shadow-sm border-b border-border"
            : "bg-background border-b border-transparent"
        }`}
      >
        <div className="container">
          <div className="flex items-center justify-between h-16 gap-4">
            <Logo settings={settingsData} storeName={storeName} />

            <DesktopNav
              pathname={pathname}
              rootCategories={rootCategories}
              orderedCategories={orderedCategories}
              getCategoryIcon={getCategoryIcon}
            />

            <div className="flex items-center gap-2">
              {searchOpen ? (
                <SearchBar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onSearchSubmit={handleSearchSubmit}
                  onClose={() => setSearchOpen(false)}
                  searchResults={searchResults}
                  isSearching={isSearching}
                  inputRef={searchRef}
                />
              ) : (
                <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} className="hidden md:flex" aria-label="Open search">
                  <Search className="w-4 h-4" />
                </Button>
              )}

              {/* AIChat toggle — isOpen is managed inside AIChat via useAIChat */}
              <AIChat
                isAuthenticated={isAuthenticated}
                cartContext={getCartContext()}
                storeName={storeName}
              />

              {isAuthenticated && (
                <Link href="/dashboard?tab=wishlist">
                  <Button variant="ghost" size="icon" className="hidden md:flex" aria-label="Wishlist">
                    <Heart className="w-4 h-4" />
                  </Button>
                </Link>
              )}

              <Link href="/cart">
                <Button variant="ghost" size="icon" className="relative" aria-label="Cart">
                  <ShoppingCart className="w-4 h-4" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--brand)] text-white text-[10px] font-bold flex items-center justify-center">
                      {cartCount > 9 ? "9+" : cartCount}
                    </span>
                  )}
                </Button>
              </Link>

              {cycleTheme && (
                <Button variant="ghost" size="icon" onClick={cycleTheme} aria-label="Cycle theme">
                  {theme === "dark" ? <Moon className="w-4 h-4" /> : theme === "light" ? <Sun className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                </Button>
              )}

              <UserMenu user={user} isAuthenticated={isAuthenticated} pathname={pathname} onLogout={logout} />

              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open mobile menu">
                <Menu className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {mounted && (
          <MobileMenu
            isOpen={mobileOpen}
            onClose={() => setMobileOpen(false)}
            pathname={pathname}
            rootCategories={rootCategories}
            orderedCategories={orderedCategories}
            getCategoryIcon={getCategoryIcon}
            isAuthenticated={isAuthenticated}
            user={user}
            storeName={storeName}
          />
        )}
      </header>
    </>
  );
}