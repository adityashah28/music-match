"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearDraft } from "@/lib/client";

const USER_KEY = "resonate_user_id";

/** Clears saved login and sends you to phone signup/login. */
export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      localStorage.removeItem(USER_KEY);
      clearDraft();
      sessionStorage.removeItem("resonate_dev_otp");
    } catch {
      /* ignore */
    }
    router.replace("/phone");
  }, [router]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <p className="text-base text-[var(--muted)]">Signing out…</p>
    </main>
  );
}
