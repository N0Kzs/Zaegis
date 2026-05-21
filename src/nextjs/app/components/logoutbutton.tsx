"use client"
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const LogoutButton = () => {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/logout", {
      method: "POST",
    });
    window.location.href = ("/"); // Redirect to login or homepage after logout
  };

  return <Button onClick={handleLogout} variant="ghost">Logout</Button>;
};

export default LogoutButton;
