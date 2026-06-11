import Link from "next/link";
import { useRouter } from "next/navigation";
import { getLoginUrl } from "@/lib/const";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutDashboard, LogIn, LogOut, Package, Settings, UserPlus, Headphones } from "lucide-react";

interface UserMenuProps {
  user: { name?: string; email?: string; role?: string } | null;
  isAuthenticated: boolean;
  pathname: string;
  onLogout: () => void;
}

export function UserMenu({ user, isAuthenticated, pathname, onLogout }: UserMenuProps) {
  const router = useRouter();

  if (isAuthenticated) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <div className="w-7 h-7 rounded-full bg-[var(--brand)]/10 flex items-center justify-center">
              <span className="text-xs font-semibold text-[var(--brand)]">
                {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-sm font-medium truncate">{user?.name ?? "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/orders" className="flex items-center gap-2 cursor-pointer">
              <Package className="w-4 h-4" /> My Orders
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/technician" className="flex items-center gap-2 cursor-pointer">
              <Headphones className="w-4 h-4" /> Technician Portal
            </Link>
          </DropdownMenuItem>
          {user?.role === "admin" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/dashboard" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="w-4 h-4" /> Admin Panel
                </Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive cursor-pointer">
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <div className="hidden md:flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push(getLoginUrl(pathname))}>
          Sign In
        </Button>
        <Button size="sm" className="bg-[var(--brand)] text-white hover:opacity-90" onClick={() => router.push(getLoginUrl(pathname, "register"))}>
          Sign Up
        </Button>
      </div>
      <div className="flex items-center gap-1 sm:hidden">
        <Button variant="ghost" size="icon" onClick={() => router.push(getLoginUrl(pathname))} aria-label="Sign In">
          <LogIn className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => router.push(getLoginUrl(pathname, "register"))} aria-label="Sign Up">
          <UserPlus className="w-4 h-4" />
        </Button>
      </div>
    </>
  );
}