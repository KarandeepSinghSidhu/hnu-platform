"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AdminLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const redirectTo = searchParams.get("next") || "/admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }

      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage:
          "linear-gradient(112deg, #092d65 0%, #06699b 50%, #02a8d0 100%)",
        backgroundColor: "#092d65",
      }}
    >
      <div className="w-full max-w-md bg-white rounded-[30px] shadow-[0_0_40px_rgba(0,0,0,0.25)] p-10">
        <p className="text-xs uppercase tracking-[2px] text-[#0a4479]/70">
          HNU
        </p>
        <h1 className="text-3xl font-extrabold text-[#0c0c48] mt-1 tracking-tight">
          Admin Console
        </h1>
        <p className="text-[#0a4479]/70 mt-2 mb-7">
          Enter your password to manage site content.
        </p>

        {error && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-5 text-sm"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-[#0c0c48] mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full px-5 py-3 border-2 border-[#cac7c7] rounded-full text-base text-[#0c0c48] placeholder:text-[#cac7c7] focus:outline-none focus:border-[#0a4479] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center bg-[#0a4479] text-white py-3 px-5 rounded-full font-semibold hover:bg-[#083559] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-xs text-[#8e8d8d] mt-6 text-center">
          The admin password is set via the{" "}
          <code className="bg-[#f5f5f7] px-1.5 py-0.5 rounded">
            ADMIN_PASSWORD
          </code>{" "}
          environment variable.
        </p>
      </div>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <Suspense fallback={null}>
      <AdminLoginInner />
    </Suspense>
  );
}
