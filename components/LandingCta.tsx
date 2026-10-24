"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PrimaryButton } from "@/components/PrimaryButton";
import { getDraft, getUserId, isVerified, onboardingHref } from "@/lib/client";

/**
 * Phone OTP is both signup and login — one primary CTA to /phone
 * (or clear an old session first). Mid-draft resumes onboarding.
 */
export function LandingCta() {
  const pathname = usePathname();
  const [phoneHref, setPhoneHref] = useState("/phone");
  const [resumeHref, setResumeHref] = useState<string | null>(null);

  useEffect(() => {
    const userId = getUserId();
    const draft = getDraft();

    // Old localStorage session would skip the phone screen — clear it first.
    setPhoneHref(userId ? "/logout" : "/phone");

    if (!userId && isVerified(draft)) {
      setResumeHref(onboardingHref(draft));
      return;
    }
    setResumeHref(null);
  }, [pathname]);

  if (resumeHref) {
    return <PrimaryButton href={resumeHref}>Continue</PrimaryButton>;
  }

  return <PrimaryButton href={phoneHref}>Get started</PrimaryButton>;
}
