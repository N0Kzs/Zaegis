"use client";

import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [staySignedIn, setStaySignedIn] = useState<boolean>(false);

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
        setLoading(false); // Stop loading if error
        return;
      }

      // 1. Store token in localStorage (Optional backup for UI)
      localStorage.setItem("token", data.token);

      // 2. CRITICAL FIX: Force a hard browser navigation.
      // This completely bypasses the Next.js client-side router cache on Vercel
      // and guarantees your Server Components will see the new HTTP-only cookie.
      window.location.href = "/dashboard";

    } catch (err) {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
    // Note: We don't set loading(false) on success because we want the spinner 
    // to keep showing while the page redirects.
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Enhanced Background */}
      <div className="absolute inset-0 z-0">
        {/* Animated gradient orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#00a9e6] to-blue-400 rounded-full opacity-20 transform translate-x-1/3 -translate-y-1/3 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#00a9e6] to-cyan-300 rounded-full opacity-15 transform -translate-x-1/3 translate-y-1/3 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-r from-red-400 to-red-300 rounded-full opacity-10 transform -translate-x-1/2 -translate-y-1/2 blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(#00a9e6 1px, transparent 1px), linear-gradient(90deg, #00a9e6 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}></div>

        {/* Diagonal accent lines */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-5">
          <div className="absolute top-1/4 -left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-[#00a9e6] to-transparent transform rotate-45"></div>
          <div className="absolute top-1/2 -right-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-[#00a9e6] to-transparent transform -rotate-45"></div>
          <div className="absolute bottom-1/4 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-red-500 to-transparent transform rotate-45"></div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Logo Placeholder */}
        <div className="flex justify-center mb-8">
          <img src="zaegis logo.svg" alt="" width={60} height={60} />
        </div>

        {/* Sign In Title */}
        <h1 className="text-2xl font-bold text-center mb-8 text-gray-800">
          Sign in
        </h1>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-xs font-medium text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Username Input */}
          <div className="relative group">
            <label className="block text-xs font-bold text-gray-700 mb-2 tracking-wide uppercase">
              Username
            </label>
            <div className="relative">
              {/* Icon */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 transition-colors duration-200 group-focus-within:text-[#00a9e6] text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>

              {/* Input */}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-900 rounded-lg focus:outline-none focus:border-[#00a9e6] focus:shadow-lg focus:shadow-[#00a9e6]/20 transition-all duration-300 text-gray-900 text-sm font-medium placeholder:text-gray-400"
                placeholder="Enter your username"
              />

              {/* Animated underline */}
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#00a9e6] to-blue-500 transform scale-x-0 group-focus-within:scale-x-100 transition-transform duration-300 origin-left rounded-full"></div>
            </div>
          </div>

          {/* Password Input */}
          <div className="relative group">
            <label className="block text-xs font-bold text-gray-700 mb-2 tracking-wide uppercase">
              Password
            </label>
            <div className="relative">
              {/* Icon */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 transition-colors duration-200 group-focus-within:text-[#00a9e6] text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              {/* Input */}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-12 py-3 bg-gray-50 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#00a9e6] focus:bg-white focus:shadow-lg focus:shadow-[#00a9e6]/20 transition-all duration-300 text-gray-900 text-sm font-medium placeholder:text-gray-400"
                placeholder="Enter your password"
              />

              {/* Animated underline */}
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#00a9e6] to-blue-500 transform scale-x-0 group-focus-within:scale-x-100 transition-transform duration-300 origin-left rounded-full"></div>

              {/* Show/Hide Password Toggle */}
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#00a9e6] transition-colors duration-200"
                onClick={(e) => {
                  e.preventDefault();
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  if (input) {
                    input.type = input.type === 'password' ? 'text' : 'password';
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Stay Signed In & Forgot Password */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center cursor-pointer group/checkbox">
              <div className="relative">
                <input
                  type="checkbox"
                  id="staySignedIn"
                  checked={staySignedIn}
                  onChange={(e) => setStaySignedIn(e.target.checked)}
                  className="peer w-4 h-4 text-[#00a9e6] border-2 border-gray-300 rounded focus:ring-2 focus:ring-[#00a9e6] focus:ring-offset-2 cursor-pointer transition-all duration-200 checked:border-[#00a9e6] checked:bg-[#00a9e6]"
                />
                {/* Custom checkmark animation */}
                <svg
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity duration-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="ml-2 text-xs text-gray-700 select-none group-hover/checkbox:text-gray-900 transition-colors font-medium">
                Stay signed in
              </span>
            </label>
            <a
              href="#"
              className="text-xs text-[#00a9e6] hover:text-[#0098d1] font-semibold transition-colors relative group/link"
            >
              Forgot password?
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#00a9e6] group-hover/link:w-full transition-all duration-300"></span>
            </a>
          </div>

          {/* Submit Button */}
          <div className="pt-5">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden"
            >
              {/* Button background with gradient */}
              <div className="relative w-14 h-14 mx-auto bg-gradient-to-br from-[#00a9e6] to-[#0098d1] hover:from-[#0098d1] hover:to-[#0087ba] rounded-2xl transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-2xl hover:shadow-[#00a9e6]/40 flex items-center justify-center">
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 rounded-2xl"></div>

                {/* Ripple effect on hover */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute inset-0 rounded-2xl animate-ping bg-[#00a9e6]/30"></div>
                </div>

                {/* Icon */}
                {loading ? (
                  <svg
                    className="relative animate-spin h-6 w-6 text-white z-10"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="relative h-6 w-6 text-white transform group-hover:translate-x-1 transition-transform duration-300 z-10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                )}
              </div>

              {/* Sign In Text Below Button */}
              <div className="mt-2 text-xs font-semibold text-gray-600 group-hover:text-[#00a9e6] transition-colors duration-300">
                {loading ? 'Signing in...' : 'Sign In'}
              </div>
            </button>
          </div>
        </form>

        {/* Footer Links */}
        <div className="mt-5 text-center">
          <a href="#" className="text-xs text-gray-600 hover:text-[#00a9e6] transition-colors inline-block">
            Need help signing in?
          </a>
        </div>

        {/* Footer Info */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secure
            </span>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span>© 2026 Zaegis</span>
          </div>
        </div>
      </div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Cyan particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-[#00a9e6] rounded-full opacity-40 animate-ping" style={{ animationDuration: '3s' }}></div>
        <div className="absolute top-1/3 left-1/3 w-1.5 h-1.5 bg-[#00a9e6] rounded-full opacity-30 animate-ping" style={{ animationDuration: '4s', animationDelay: '0.5s' }}></div>
        <div className="absolute top-2/3 left-1/5 w-1 h-1 bg-cyan-400 rounded-full opacity-50 animate-ping" style={{ animationDuration: '5s', animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/5 left-2/3 w-1.5 h-1.5 bg-[#00a9e6] rounded-full opacity-35 animate-ping" style={{ animationDuration: '3.5s', animationDelay: '2s' }}></div>

        {/* Blue particles */}
        <div className="absolute top-3/4 right-1/4 w-2 h-2 bg-blue-400 rounded-full opacity-30 animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }}></div>
        <div className="absolute top-1/6 right-1/3 w-1 h-1 bg-blue-500 rounded-full opacity-40 animate-ping" style={{ animationDuration: '4.5s', animationDelay: '2.5s' }}></div>
        <div className="absolute top-5/6 right-1/5 w-1.5 h-1.5 bg-blue-300 rounded-full opacity-35 animate-ping" style={{ animationDuration: '5.5s', animationDelay: '0.8s' }}></div>
        <div className="absolute top-2/5 right-2/5 w-1 h-1 bg-blue-400 rounded-full opacity-45 animate-ping" style={{ animationDuration: '3.8s', animationDelay: '1.2s' }}></div>

        {/* Red/accent particles */}
        <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-red-400 rounded-full opacity-50 animate-ping" style={{ animationDuration: '5s', animationDelay: '2s' }}></div>
        <div className="absolute top-4/5 left-2/5 w-1 h-1 bg-red-300 rounded-full opacity-40 animate-ping" style={{ animationDuration: '4.2s', animationDelay: '1.8s' }}></div>
      </div>
    </div>
  );
}