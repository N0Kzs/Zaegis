"use client";

import NavBar from "./components/navbar";
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
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-12">
          
          {/* Logo with zoom stretch animation */}
          <div className="w-40 h-40 flex items-center justify-center animate-[logo-entrance_0.8s_ease-out_both]">
            <img 
              src="/zaegis logo.svg" 
              alt="Zaegis Logo" 
              className="w-full h-full object-contain drop-shadow-2xl" 
            />
          </div>
          
          {/* Indeterminate loading bar - fades in slightly after logo */}
          <div className="w-64 h-1.5 bg-muted overflow-hidden rounded-full relative animate-[fade-in_0.5s_ease-out_0.5s_both]">
            <div className="absolute top-0 bottom-0 bg-primary rounded-full animate-[youtube-progress_1.5s_ease-in-out_infinite]" />
          </div>
          
        </div>
        
        {/* Inline styles for custom animations */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes logo-entrance {
            0% { transform: scale(0.3) scaleY(1.5); opacity: 0; }
            50% { transform: scale(1.1) scaleY(0.9); opacity: 1; }
            75% { transform: scale(0.95) scaleY(1.05); }
            100% { transform: scale(1) scaleY(1); opacity: 1; }
          }
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes youtube-progress {
            0% { left: -40%; width: 30%; }
            50% { left: 20%; width: 80%; }
            100% { left: 110%; width: 30%; }
          }
        `}} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-x-hidden bg-background text-foreground">
      <header className="h-16 w-full fixed top-0 left-0 right-0 z-50">
        <NavBar />
      </header>
      <div className="pt-16 flex-1">
        <DashboardHome />
      </div>
    </div>
  );
}
