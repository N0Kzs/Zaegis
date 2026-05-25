'use client';

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Settings, LogOut, UserCircle, AlertTriangle, Sun, Moon } from "lucide-react";
import { MobSide } from "./mobsidenavbar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { GlobalSearch } from "./global_search";

type NavBarProps = {
  userEmail?: string;
  userRole?: string;
};

function getInitialsFromEmail(email: string) {
  const username = email.split("@")[0];
  const parts = username.split(/[\._\-]/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (
    parts[0].charAt(0).toUpperCase() +
    parts[parts.length - 1].charAt(0).toUpperCase()
  );
}

async function handleLogout() {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/";
}

export default function NavBar({ userEmail, userRole }: NavBarProps) {
  const isPublic = !userEmail;
  const pathname = usePathname();
  const initials = userEmail ? getInitialsFromEmail(userEmail) : "?";
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { theme, setTheme } = useTheme();

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    await handleLogout();
  };

  return (
    <nav className="h-full px-6 flex items-center justify-between border-b border-border bg-card/75 backdrop-blur-md">
      <div className="flex items-center gap-4">
        {/* Mobile hamburger menu - Only for logged-in users */}
        {!isPublic && (
          <div className="md:hidden">
            <MobSide userRole={userRole} />
          </div>
        )}

        <Link href={isPublic ? "/" : "/dashboard"} className="flex items-center group">
          <div>
            <Image
              src="/zaegis logo.svg"
              alt="Zaegis Logo"
              width={68}
              height={68}
              priority
            />
          </div>
        </Link>
      </div>

      {/* Right side — Search + User menu OR Theme Toggle */}
      <div className="flex items-center gap-3">
        {isPublic ? (
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="text-muted-foreground hover:text-foreground hover:bg-accent hover:text-accent-foreground rounded-full transition-colors"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            {pathname !== "/login" && (
              <Button asChild variant="default" className="rounded-xl px-5 text-sm font-semibold shadow-sm transition-all">
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            <GlobalSearch />
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm hover-elevate transition-all">
                <Avatar className="rounded-sm cursor-pointer bg-primary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all">
                  <AvatarFallback className="rounded-sm bg-primary">
                    <div className="w-10 h-10 flex items-center justify-center text-primary-foreground font-display font-bold">
                      {initials}
                    </div>
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-60 bg-popover border-popover-border rounded-lg shadow-lg"
            >
              {/* User info header */}
              <div className="px-3 py-2.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{userEmail}</p>
                  <p className="text-xs text-muted-foreground capitalize font-medium">{userRole}</p>
                </div>
              </div>

              <DropdownMenuSeparator />

              <div className="py-1">
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/settings"
                    className="cursor-pointer text-sm font-medium flex items-center gap-2.5 px-3 py-2"
                  >
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    Settings
                  </Link>
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator />

              <div className="py-1">
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setTheme(theme === 'dark' ? 'light' : 'dark');
                  }}
                  className="cursor-pointer text-sm font-medium flex items-center gap-2.5 px-3 py-2"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Moon className="w-4 h-4 text-muted-foreground" />
                  )}
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator />

              <div className="py-1">
                <DropdownMenuItem
                  onSelect={() => {
                    setTimeout(() => setIsLogoutModalOpen(true), 100);
                  }}
                  className="cursor-pointer text-sm font-medium flex items-center gap-2.5 px-3 py-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          </>
        )}
      </div>

      {!isPublic && (
        <Dialog open={isLogoutModalOpen} onOpenChange={setIsLogoutModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Confirm Logout
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to log out of your session?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setIsLogoutModalOpen(false)}
                disabled={isLoggingOut}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Logging out..." : "Log out"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </nav>
  );
}