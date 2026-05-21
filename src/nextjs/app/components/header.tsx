"use client";

import { ReactNode } from "react";

interface HeaderProps {
  icon?: ReactNode; // allows passing Lucide icons or any JSX
  title: string;
  caption?: string;
}

export default function Header({ icon, title, caption }: HeaderProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon && <div className="text-primary w-8 h-8">{icon}</div>}
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      </div>
      {caption && <p className="text-muted-foreground">{caption}</p>}
    </div>
  );
}
