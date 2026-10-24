"use client";

import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from "react";

const LENGTH = 6;

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  /** Enter in a digit box — same as pressing the form’s primary submit. */
  onEnter?: () => void;
  id?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
};

function onlyDigits(raw: string) {
  return raw.replace(/\D/g, "").slice(0, LENGTH);
}

export function OtpInput({
  value,
  onChange,
  onEnter,
  id = "otp",
  disabled,
  autoFocus,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (!autoFocus) return;
    refs.current[0]?.focus();
  }, [autoFocus]);

  function setDigit(index: number, digit: string) {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join("").slice(0, LENGTH));
  }

  function focusAt(index: number) {
    const el = refs.current[Math.max(0, Math.min(LENGTH - 1, index))];
    el?.focus();
    el?.select();
  }

  function handleChange(index: number, raw: string) {
    const cleaned = onlyDigits(raw);
    if (!cleaned) {
      setDigit(index, "");
      return;
    }

    // Mobile autocomplete / multi-char insert into one box
    if (cleaned.length > 1) {
      const merged = onlyDigits(value.slice(0, index) + cleaned + value.slice(index + 1));
      onChange(merged);
      focusAt(Math.min(merged.length, LENGTH - 1));
      return;
    }

    setDigit(index, cleaned);
    if (index < LENGTH - 1) focusAt(index + 1);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    // Multi-box OTP inputs do not reliably trigger native form submit on Enter.
    // Match About: treat Enter as confirming the primary action.
    if (event.key === "Enter") {
      event.preventDefault();
      if (onEnter) {
        onEnter();
      } else {
        event.currentTarget.form?.requestSubmit();
      }
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      if (digits[index]) {
        setDigit(index, "");
        return;
      }
      if (index > 0) {
        setDigit(index - 1, "");
        focusAt(index - 1);
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusAt(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < LENGTH - 1) {
      event.preventDefault();
      focusAt(index + 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = onlyDigits(event.clipboardData.getData("text"));
    if (!pasted) return;
    onChange(pasted);
    focusAt(Math.min(pasted.length, LENGTH - 1));
  }

  return (
    <div
      className="grid w-full grid-cols-6 gap-2 sm:gap-3"
      role="group"
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
    >
      {digits.map((digit, index) => (
        <label
          key={index}
          className="field field-digit flex aspect-square w-full items-center justify-center"
          htmlFor={`${id}-${index}`}
        >
          <input
            ref={(el) => {
              refs.current[index] = el;
            }}
            id={`${id}-${index}`}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            disabled={disabled}
            aria-label={`Digit ${index + 1} of ${LENGTH}`}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            onFocus={(event) => event.target.select()}
            className="field-control text-center text-xl font-normal text-[var(--foreground)] disabled:opacity-50 sm:text-2xl"
          />
        </label>
      ))}
    </div>
  );
}
