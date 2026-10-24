import { createHash, randomInt, timingSafeEqual } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type OtpRow = {
  phone: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
};

const memory = globalThis as typeof globalThis & { __resonateOtps?: Map<string, OtpRow> };

function bucket(): Map<string, OtpRow> {
  if (!memory.__resonateOtps) memory.__resonateOtps = new Map();
  return memory.__resonateOtps;
}

function hashCode(phone: string, code: string): string {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

function sameHash(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function supabase(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) return null;
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
  if (!url) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

export function shouldExposeDevCode(): boolean {
  if (process.env.AUTH_DEV_MODE === "1") return true;
  if (process.env.NODE_ENV === "production") return false;
  return !process.env.TWILIO_ACCOUNT_SID?.trim();
}

export async function saveOtp(phone: string, code: string): Promise<void> {
  const codeHash = hashCode(phone, code);
  const expiresAt = Date.now() + OTP_TTL_MS;
  const client = supabase();
  if (client) {
    const { error } = await client.from("phone_otps").upsert({
      phone,
      code_hash: codeHash,
      expires_at: new Date(expiresAt).toISOString(),
      attempts: 0,
      created_at: new Date().toISOString(),
    });
    if (error) throw error;
    return;
  }
  bucket().set(phone, { phone, codeHash, expiresAt, attempts: 0 });
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) return false;

  const client = supabase();
  if (client) {
    const { data, error } = await client.from("phone_otps").select("*").eq("phone", phone).maybeSingle();
    if (error) throw error;
    if (!data || typeof data !== "object") return false;
    const row = data as {
      code_hash?: string;
      expires_at?: string;
      attempts?: number;
    };
    const expiresAt = row.expires_at ? Date.parse(row.expires_at) : 0;
    const attempts = typeof row.attempts === "number" ? row.attempts : 0;
    if (!row.code_hash || !Number.isFinite(expiresAt) || expiresAt < Date.now() || attempts >= MAX_ATTEMPTS) {
      return false;
    }
    const ok = sameHash(row.code_hash, hashCode(phone, trimmed));
    if (!ok) {
      await client
        .from("phone_otps")
        .update({ attempts: attempts + 1 })
        .eq("phone", phone);
      return false;
    }
    await client.from("phone_otps").delete().eq("phone", phone);
    return true;
  }

  const row = bucket().get(phone);
  if (!row || row.expiresAt < Date.now() || row.attempts >= MAX_ATTEMPTS) return false;
  const ok = sameHash(row.codeHash, hashCode(phone, trimmed));
  if (!ok) {
    row.attempts += 1;
    bucket().set(phone, row);
    return false;
  }
  bucket().delete(phone);
  return true;
}

/** Optional Twilio send. Returns true if an SMS was sent. */
export async function sendSms(phone: string, code: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  if (!sid || !token || !from) return false;

  const body = new URLSearchParams({
    To: phone,
    From: from,
    Body: `Your Resonate code is ${code}`,
  });
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!response.ok) {
    const text = await response.text();
    console.error("Twilio SMS failed", text);
    throw new Error("Could not send text");
  }
  return true;
}
