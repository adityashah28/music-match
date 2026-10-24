"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PrimaryButton } from "@/components/PrimaryButton";
import { getDraft, getUserId } from "@/lib/client";

/**
 * Same destination rules as SiteHeader:
 * guest → Get started /pick, signed-in → Continue /matches,
 * mid-draft → Continue /pick.
 */
export function LandingCta() {
  const pathname = usePathname();
  const [cta, setCta] = useState({ href: "/pick", label: "Get started" });

  useEffect(() => {
    const userId = getUserId();
    if (userId) {
      setCta({ href: "/matches", label: "Continue" });
      return;
    }

    const draft = getDraft();
    if (draft.artists.length > 0 || draft.handle.trim()) {
      setCta({ href: "/pick", label: "Continue" });
      return;
    }

    setCta({ href: "/pick", label: "Get started" });
  }, [pathname]);

  return <PrimaryButton href={cta.href}>{cta.label}</PrimaryButton>;
}
