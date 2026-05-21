import { ReactNode } from "react";
import { SideNav } from "../components/sidenavbar";
import NavBar from "../components/navbar";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    const user = await getCurrentUser();

    return (
      <div className="h-screen flex flex-col overflow-x-hidden">
        {/* Fixed Header */}
        <header className="h-16 w-full fixed top-0 left-0 right-0 z-50">
          <NavBar userEmail={user.user_email} userRole={user.role} />
        </header>

        {/* Main layout container */}
        <div className="flex flex-1 pt-16">
          {/* Sidebar */}
          <aside
            id="sidebar"
            className="hidden md:block w-[var(--sidebar-width)] border-r border-sidebar-border fixed left-0 top-16 bottom-0 transition-[width] duration-300 z-40 overflow-hidden"
            style={{ "--sidebar-width": "250px" } as React.CSSProperties}
          >
            <SideNav userRole={user.role} />
          </aside>

          {/* Main content area */}
          <main
            id="main-content"
            // CHANGE HERE: Changed min-h-screen to min-h-[calc(100vh-4rem)]
            className="flex-1 ml-0 md:ml-[var(--sidebar-width)] transition-[margin-left] duration-300 min-h-[calc(100vh-4rem)] bg-background overflow-x-hidden"
            style={{ "--sidebar-width": "250px" } as React.CSSProperties}
          >
            <div className="w-full h-full">{children}</div>
          </main>
        </div>
      </div>
    );
  } catch (error) {
    redirect("/");
  }
}
