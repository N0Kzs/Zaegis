"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Loader from "./loader";



export function LogInButton({ loading }: { loading: boolean }) {
  return (
    <Button disabled={loading} className="w-fit">
      {loading ? (
        <>
          <Loader size={16} color="white" />Signing In
        </>
      ) : (
        "Sign In"
      )}
    </Button>
  );
}
