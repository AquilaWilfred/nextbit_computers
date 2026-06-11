import { Button } from "@/components/ui/button";
import { Loader2, Package, X } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/cart";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  searchResults: any[];
  isSearching: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function SearchBar({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onClose,
  searchResults,
  isSearching,
  inputRef,
}: SearchBarProps) {
  return (
    <form onSubmit={onSearchSubmit} className="flex items-center gap-2 relative">
      <input
        ref={inputRef}
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search products..."
        aria-label="Search products"
        className="w-48 sm:w-64 lg:w-80 h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close search">
        <X className="w-4 h-4" />
      </Button>
      
      {searchQuery.trim().length > 1 && (
        <div className="absolute top-full left-0 right-0 mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
          {isSearching ? (
            <div className="p-4 flex justify-center text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="flex flex-col">
              {searchResults.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  onClick={onClose}
                  className="flex items-center gap-3 p-2 hover:bg-muted transition-colors border-b border-border last:border-0"
                >
                  <div className="w-10 h-10 rounded overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-[var(--brand)] font-semibold">{formatPrice(product.price)}</p>
                  </div>
                </Link>
              ))}
              <button
                type="submit"
                className="p-2 text-xs text-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-medium border-t border-border"
              >
                View all results for "{searchQuery}"
              </button>
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">No products found</div>
          )}
        </div>
      )}
    </form>
  );
}