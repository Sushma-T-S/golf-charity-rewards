import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.split(" ")[1];
}

export async function getUserFromToken(token: string) {
  if (!token) return null;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && token === serviceKey) {
    return { id: "service-role", email: null } as any;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return null;
  }

  return data.user;
}

export async function requireAdmin(request: Request) {
  const token = await getBearerToken(request);
  if (!token) {
    return { ok: false, status: 401, error: "Missing Authorization header" };
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return { ok: false, status: 401, error: "Invalid token" };
  }

  // Allow service role to bypass all admin checks.
  if ((user as any).id === "service-role") {
    return { ok: true, user };
  }

  // Prefer DB-driven admin flag (profiles.is_admin) if available.
  // This avoids fragile allowlist mismatch between UI and API.
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("is_admin, email")
    .eq("id", (user as any).id)
    .maybeSingle();

  // Fallback to email allowlist.
  const adminEmails = (process.env.SUPABASE_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const isAllowlisted = Boolean(user.email && adminEmails.includes(user.email.toLowerCase()));

  // If we got a profile row, trust it first.
  // Supabase may return `error` even when `data` is present depending on client behavior,
  // so we only use `error` to decide whether the row is missing.
  if (profile) {
    if (profile.is_admin === true) {
      return { ok: true, user: { ...user, email: user.email || profile.email } };
    }

    // Profile exists but is not admin.
    if (isAllowlisted) {
      return { ok: true, user };
    }

    return { ok: false, status: 403, error: "Forbidden" };
  }

  // No profile row available (or lookup errored). Allow only if allowlisted.
  if (isAllowlisted) {
    return { ok: true, user };
  }

  return { ok: false, status: 403, error: "Forbidden" };
}

export async function requireUser(request: Request) {
  const token = await getBearerToken(request);
  if (!token) {
    return { ok: false, status: 401, error: "Missing Authorization header" };
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return { ok: false, status: 401, error: "Invalid token" };
  }

  return { ok: true, user };
}
