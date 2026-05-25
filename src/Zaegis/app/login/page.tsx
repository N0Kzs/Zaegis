"use client";

import { useState } from "react";
import NavBar from "@/app/components/navbar";

export default function Login() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [staySignedIn, setStaySignedIn] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid credentials");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      window.location.href = "/dashboard";
    } catch (err) {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground transition-colors duration-300 overflow-x-hidden">
      
      {/* Fixed Public Header */}
      <header className="h-16 w-full fixed top-0 left-0 right-0 z-50">
        <NavBar />
      </header>

      {/* Main Content Area */}
      <div className="flex-1 relative flex items-center justify-center p-4 pt-16 overflow-hidden">
        
        {/* Blurred background pattern - using semantic theme colors */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-50 dark:opacity-20">
          <div className="absolute top-[10%] left-[10%] w-[40vw] h-[40vw] rounded-full bg-primary/30 blur-[80px] sm:blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
          <div className="absolute bottom-[10%] right-[5%] w-[35vw] h-[35vw] rounded-full bg-cyan-500/20 blur-[80px] sm:blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
          <div className="absolute top-[40%] right-[30%] w-[25vw] h-[25vw] rounded-full bg-blue-500/20 blur-[80px] sm:blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
        </div>

        {/* Solid Card - Perfectly aligned with Navbar theme */}
        <div className="relative z-10 w-full max-w-md p-8 sm:p-10 bg-card rounded-3xl shadow-xl border border-border transition-colors duration-300">
          
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-14 h-14 bg-background rounded-2xl flex items-center justify-center p-2 border border-border">
              <img src="zaegis logo.svg" alt="Zaegis Logo" className="w-full h-full object-contain" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-card-foreground">Sign in</h1>
            <p className="text-sm text-muted-foreground mt-2">Welcome back to Zaegis</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <svg className="w-5 h-5 text-destructive shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-destructive leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-card-foreground">Email Address</label>
              <div className="relative group">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl py-3 px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-card-foreground">Password</label>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl py-3 pl-4 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={staySignedIn}
                    onChange={(e) => setStaySignedIn(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-4 h-4 border border-input rounded bg-background peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                    <svg className="w-3 h-3 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors select-none">Remember me</span>
              </label>
              <a href="#" className="text-sm text-primary hover:underline transition-colors font-medium">Forgot password?</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-xl shadow-sm hover:shadow-md hover:bg-primary/90 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Don't have an account? <a href="#" className="text-primary hover:underline font-medium transition-colors">Request access</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}