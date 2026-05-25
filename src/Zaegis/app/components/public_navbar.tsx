"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
export function PublicNavbar() {
  const router = useRouter();

  return (
    <nav className="bg-white/10 backdrop-blur-md border-b fixed top-0 w-full h-16 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex justify-between items-center h-full">
          <Link href="/dashboard" className="flex items-center group">
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
          <div>
            <Button
              onClick={() => router.push("/login")}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Login
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
} 