"use client";

import { IconMenu2 } from "@tabler/icons-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SideNav } from "./sidenavbar";


type MobSideProps = {
  userRole?: string;
};

export function MobSide({ userRole }: MobSideProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-gray-100"
        >
          <IconMenu2 stroke={1} className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-left text-xl font-bold text-indigo-600">
            Zaegis
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100vh-73px)]">

          <SideNav
            userRole={userRole}
            onLinkClick={() => setIsOpen(false)}
          />

        </div>
      </SheetContent>
    </Sheet>
  );
}