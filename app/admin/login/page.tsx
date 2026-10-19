"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await createClient().auth.signInWithPassword({
        email,
        password,
      });
      if (err) throw new Error(err.message);
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-line bg-surface px-3 py-2 text-foreground outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Password</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-line bg-surface px-3 py-2 text-foreground outline-none focus:border-accent"
        />
      </label>

      {error ? (
        <p className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-warn">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Masuk…" : "Masuk"}
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="mx-auto w-full max-w-sm px-5 py-16">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Masuk admin</h1>
      <p className="mb-8 text-sm text-muted">
        Gunakan akun Supabase Auth yang terdaftar.
      </p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
