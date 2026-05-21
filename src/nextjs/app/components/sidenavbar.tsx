"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  IconLayoutDashboard,
  IconMap,
  IconReport,
  IconShield,
  IconBuilding,
  IconBell,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconArrowBackUp
} from "@tabler/icons-react";

interface SideNavProps {
  userRole?: string;
  onLinkClick?: () => void;
}

export function SideNav({ userRole, onLinkClick }: SideNavProps) {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState({
    top: 0,
    height: 0,
    opacity: 0,
  });
  const userManuallyToggled = useRef<boolean>(false);
  const navRef = useRef<HTMLDivElement>(null);

  const isDashboardPath =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/crime_mapping");

  const isDeploymentPath =
    pathname.startsWith("/dashboard/reports") ||
    pathname.startsWith("/dashboard/hybrid") ||
    pathname.startsWith("/dashboard/5mrt");

  const navItems = [
    {
      name: "Dashboard",
      icon: IconLayoutDashboard,
      children: [
        { name: "Overview", href: "/dashboard", icon: IconLayoutDashboard },
        { name: "Crime Mapping", href: "/dashboard/crime_mapping", icon: IconMap },
      ],
    },
    { name: "GeoData", href: "/dashboard/pcensus", icon: IconBuilding },
    { name: "Resources", href: "/dashboard/mpdetails", icon: IconBell },
    {
      name: "Deployment",
      icon: IconReport,
      children: [
        { name: "Standard", href: "/dashboard/reports", icon: IconReport },
        { name: "Hybrid", href: "/dashboard/hybrid", icon: IconReport },
        { name: "5MRT", href: "/dashboard/5mrt", icon: IconReport },
      ],
    },
    ...(userRole === "admin"
      ? [
        { name: "CIRAS", href: "/dashboard/ciras_rep", icon: IconReport },
        { name: "Administration", href: "/dashboard/administration", icon: IconShield },
      ]
      : []),
  ];

  // Apply width changes to layout dynamically
  useEffect(() => {
    const sidebar = document.getElementById("sidebar");
    const mainContent = document.getElementById("main-content");
    const newWidth = isCollapsed ? "64px" : "250px";

    if (sidebar) sidebar.style.setProperty("--sidebar-width", newWidth);
    if (mainContent) mainContent.style.setProperty("--sidebar-width", newWidth);
  }, [isCollapsed]);

  // Auto open/close dropdowns based on route
  useEffect(() => {
    if (!userManuallyToggled.current) {
      if (isCollapsed) {
        setOpenDropdown(null);
        return;
      }

      if (isDashboardPath) {
        setOpenDropdown("Dashboard");
      } else if (isDeploymentPath) {
        setOpenDropdown("Deployment");
      } else {
        setOpenDropdown(null);
      }
    }
    userManuallyToggled.current = false;
  }, [pathname, isDashboardPath, isDeploymentPath, isCollapsed]);

  // Close all dropdowns when collapsed
  useEffect(() => {
    if (isCollapsed) setOpenDropdown(null);
  }, [isCollapsed]);

  const updateIndicator = useCallback(
    (element: HTMLElement | null) => {
      if (!element || !navRef.current || isCollapsed) {
        setIndicatorStyle({ top: 0, height: 0, opacity: 0 });
        return;
      }

      const navRect = navRef.current.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      setIndicatorStyle({
        top: elementRect.top - navRect.top,
        height: elementRect.height,
        opacity: 1,
      });
    },
    [isCollapsed]
  );

  const handleDropdownToggle = useCallback(
    (dropdownName: string) => {
      if (isCollapsed) return;
      userManuallyToggled.current = true;
      setOpenDropdown((prev) => (prev === dropdownName ? null : dropdownName));
    },
    [isCollapsed]
  );

  const handleChildClick = useCallback(() => {
    userManuallyToggled.current = false;
    onLinkClick?.();
  }, [onLinkClick]);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLElement>, itemName: string) => {
      if (!isCollapsed) {
        setHoveredItem(itemName);
        updateIndicator(e.currentTarget);
      }
    },
    [updateIndicator, isCollapsed]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredItem(null);
    setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
  }, []);

  return (
    <div className="h-full flex flex-col border-r overflow-x-hidden transition-[width] duration-300 relative">
      <nav
        className={cn(
          "relative flex-1 flex flex-col gap-1 p-2 overflow-x-hidden",
          isCollapsed ? "overflow-hidden" : "overflow-y-auto"
        )}
        ref={navRef}
        aria-label="Main navigation"
      >
        {!isCollapsed && (
          <div
            className="absolute left-2 right-2 rounded-sm pointer-events-none transition-all duration-200 ease-out"
            style={{
              top: `${indicatorStyle.top}px`,
              height: `${indicatorStyle.height}px`,
              opacity: indicatorStyle.opacity,
            }}
            aria-hidden="true"
          />
        )}

        {navItems.map((item, index) =>
          item.children ? (
            <div key={index} className="relative z-10">
              <button
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium cursor-pointer transition-all duration-200 hover-elevate active-elevate-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  openDropdown === item.name || hoveredItem === item.name
                    ? "text-sidebar-foreground"
                    : "text-sidebar-foreground/80",
                  isCollapsed && "justify-center"
                )}
                onClick={() => !isCollapsed && handleDropdownToggle(item.name)}
                onMouseEnter={(e) => handleMouseEnter(e, item.name)}
                onMouseLeave={handleMouseLeave}
              >
                <item.icon
                  stroke={1}
                  className={cn(
                    "w-5 h-5 flex-shrink-0",
                    openDropdown === item.name
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left">{item.name}</span>
                    <IconChevronDown
                      stroke={1}
                      className={cn(
                        "h-4 w-4 transition-transform duration-200 ease-in-out flex-shrink-0",
                        openDropdown === item.name ? "rotate-180" : "rotate-0"
                      )}
                    />
                  </>
                )}

                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-sm opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg">
                    {item.name}
                  </div>
                )}
              </button>

              {!isCollapsed && (
                <div
                  className={cn(
                    "ml-6 mt-1 space-y-1 overflow-hidden transition-all duration-200",
                    openDropdown === item.name
                      ? "max-h-96 opacity-100"
                      : "max-h-0 opacity-0"
                  )}
                >
                  {item.children.map((child, childIndex) => {
                    const isActive = pathname === child.href;
                    const isHovered = hoveredItem === child.name;
                    return (
                      <Link
                        key={childIndex}
                        href={child.href}
                        onClick={handleChildClick}
                        onMouseEnter={(e) => handleMouseEnter(e, child.name)}
                        onMouseLeave={handleMouseLeave}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium cursor-pointer transition-all duration-200 ease-in-out relative hover-elevate active-elevate-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-foreground"
                            : "text-sidebar-foreground/80",
                          isHovered && !isActive ? "translate-x-0.5" : ""
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-foreground rounded-r-full" />
                        )}
                        <child.icon
                          stroke={1}
                          className={cn(
                            "w-5 h-5 flex-shrink-0",
                            isActive
                              ? "text-sidebar-foreground"
                              : "text-muted-foreground"
                          )}
                        />
                        <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                          {child.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <Link
              key={index}
              href={item.href!}
              onClick={onLinkClick}
              onMouseEnter={(e) => handleMouseEnter(e, item.name)}
              onMouseLeave={handleMouseLeave}
              className="relative z-10 group"
            >
              <span
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium cursor-pointer transition-all duration-200 hover-elevate active-elevate-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary relative",
                  pathname === item.href
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-sidebar-foreground/80",
                  hoveredItem === item.name && pathname !== item.href
                    ? "translate-x-0.5"
                    : "",
                  isCollapsed && "justify-center"
                )}
              >
                {pathname === item.href && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-foreground rounded-r-full" />
                )}
                <item.icon
                  stroke={1}
                  className={cn(
                    "w-5 h-5 flex-shrink-0",
                    pathname === item.href
                      ? "text-sidebar-foreground"
                      : "text-muted-foreground"
                  )}
                />
                {!isCollapsed && (
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                    {item.name}
                  </span>
                )}

                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-sm opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg">
                    {item.name}
                  </div>
                )}
              </span>
            </Link>
          )
        )}
      </nav>

      <div className="border-t border-sidebar-border p-2 flex-shrink-0">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-sm group relative text-sm font-medium transition-all duration-200 hover-elevate active-elevate-2 text-sidebar-foreground/80 hover:text-sidebar-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            isCollapsed && "justify-center"
          )}
        >
          {isCollapsed ? (
            <>
              <IconChevronRight stroke={1} className="w-5 h-5" />
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-sm opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg">
                Expand menu
              </div>
            </>
          ) : (
            <>
              <IconChevronLeft stroke={1} className="w-5 h-5 flex-shrink-0" />
              <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                Collapse menu
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
