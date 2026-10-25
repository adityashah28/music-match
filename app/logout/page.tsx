"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearDraft, clearUser } from "@/lib/client";

/** Clears saved login (and any Supabase session) and sends you home. */
export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function logout() {
      try {
        clearUser();
        clearDraft();
      } catch {
        /* ignore */
      }

      try {
        const { signOutGoogle } = await import("@/lib/supabase-browser");
        await signOutGoogle();
      } catch {
        /* ignore missing env / already signed out */
      }

      if (!cancelled) router.replace("/");
    }

    void logout();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <p className="text-base text-[var(--muted)]">Signing out…</p>
    </main>
  );
}
