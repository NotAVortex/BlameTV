"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto mt-16 w-full max-w-sm card p-8">
      <h1 className="mb-1 text-2xl font-bold">
        {mode === "login" ? "Sign in" : "Create your account"}
      </h1>
      <p className="mb-6 text-sm text-[#aaaaaa]">
        {mode === "login" ? "to BlameTV" : "to start watching and uploading"}
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "register" && (
          <>
            <div>
              <label className="mb-1 block text-xs text-[#aaaaaa]">Email</label>
              <input name="email" type="email" required maxLength={254} className="input" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#aaaaaa]">Username</label>
              <input
                name="username"
                required
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_-]+"
                className="input"
                placeholder="letters, numbers, _ and -"
                onChange={(e) => {
                  e.target.value = e.target.value.replace(/[^a-zA-Z0-9_-]/g, "");
                }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#aaaaaa]">Display name</label>
              <input name="displayName" required maxLength={50} className="input" />
            </div>
          </>
        )}
        {mode === "login" && (
          <div>
            <label className="mb-1 block text-xs text-[#aaaaaa]">Email</label>
            <input name="email" type="email" required className="input" />
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs text-[#aaaaaa]">Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={mode === "register" ? 8 : 1}
            className="input"
          />
        </div>

        {error && <p className="text-sm text-[#ff6b6b]">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#aaaaaa]">
        {mode === "login" ? (
          <>
            No account?{" "}
            <Link href="/register" className="text-[#3ea6ff] hover:underline">
              Create one
            </Link>
          </>
        ) : (
          <>
            Already have one?{" "}
            <Link href="/login" className="text-[#3ea6ff] hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
      {mode === "register" && (
        <p className="mt-4 text-center text-[11px] leading-4 text-[#717171]">
          By creating an account you agree to our{" "}
          <Link href="/legal/terms" className="underline">Terms</Link> and{" "}
          <Link href="/legal/privacy" className="underline">Privacy Policy</Link>.
        </p>
      )}
    </div>
  );
}
