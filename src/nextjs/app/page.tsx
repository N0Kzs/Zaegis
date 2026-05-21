"use client";

import { PublicNavbar } from "./components/public-navbar";
import DashboardHome from "./dashboard/page";
import { useState, useEffect } from "react";
import Loader from "./components/loader";


export default function Home() {
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    // Simulate initial app loading (Gmail/LinkedIn style)
    const timer = setTimeout(() => {
      setInitialLoad(false);
    }, 2000); // 2 seconds splash screen

    return () => clearTimeout(timer);
  }, []);

  if (initialLoad) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <Loader size={80} />
      </div>
    );
  }

  return (
    <>
      <PublicNavbar />
      <div className="pt-12">
        <DashboardHome />
      </div>
    </>
  );

}

