import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createClient as createSupabaseClient } from "@/utils/supabase/middleware";
import { db } from "@/db";
import { studentProfiles, allowedStaffEmails, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const execomRoles = [
  "ceo",
  "cto",
  "to",
  "cfo",
  "fo",
  "cco",
  "co",
  "cio",
  "io",
  "cmo",
  "mo",
  "coo",
  "oo",
  "cso",
  "so",
  "cvo",
  "vo",
  "cwit",
  "wit",
];

const protectedRoutes: Record<string, string[]> = {
  "/student": ["student"],
  "/execom": execomRoles,
  "/faculty": ["faculty"],
};

const authRoutes = ["/auth/login", "/auth/register"];

export async function proxy(request: NextRequest) {
  const supabaseResponse = createSupabaseClient(request);
  const { pathname } = request.nextUrl;

  // Check if this is an auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Get session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // If session is present, process automatic role updates & onboarding redirects
  if (session) {
    const email = session.user.email;
    const isCollegeEmail =
      email.endsWith("@sjcetpalai.ac.in") ||
      email.endsWith(".sjcetpalai.ac.in") 
    if (!isCollegeEmail) {
      return NextResponse.redirect(
        new URL("/auth/login?error=Only SJCET college email IDs are allowed.", request.url)
      );
    }

    let role = (session.user as Record<string, unknown>).role as string;

    // 1. Auto-update whitelisted staff role upon first request/login
    //    Staff use top-level @sjcetpalai.ac.in accounts; students use @<dept>.sjcetpalai.ac.in.
    const emailDomain = email.split("@")[1] ?? "";
    if (role === "student" && emailDomain === "sjcetpalai.ac.in") {
      const [staff] = await db
        .select()
        .from(allowedStaffEmails)
        .where(eq(allowedStaffEmails.email, email));
      if (staff) {
        await db
          .update(users)
          .set({ role: staff.role })
          .where(eq(users.id, session.user.id));
        role = staff.role;
      }
    }

    // 2. Redirect student to onboarding page if they do not have a profile yet
    if (role === "student") {
      const [profile] = await db
        .select({ id: studentProfiles.id })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, session.user.id));

      const isOnboardingRoute =
        pathname === "/student/onboarding" || pathname === "/api/student/onboarding";

      if (!profile && !isOnboardingRoute) {
        return NextResponse.redirect(new URL("/student/onboarding", request.url));
      }

      if (profile && pathname === "/student/onboarding") {
        return NextResponse.redirect(new URL("/student/dashboard", request.url));
      }
    }
  }

  // If on auth route and already logged in, redirect to dashboard
  if (isAuthRoute && session) {
    const role = (session.user as Record<string, unknown>).role as string;
    const dashboardUrl = getDashboardForRole(role);
    return NextResponse.redirect(new URL(dashboardUrl, request.url));
  }

  // Intercept specific event management & scan routes to allow chiefs and event volunteers
  const eventIdMatch = pathname.match(/^\/execom\/events\/([a-zA-Z0-9-]+)(?:\/scan)?$/);
  if (eventIdMatch) {
    const eventId = eventIdMatch[1];
    if (eventId !== "create") {
      if (!session) {
        return NextResponse.redirect(new URL("/auth/login", request.url));
      }
      const role = (session.user as Record<string, unknown>).role as string;
      let allowed = execomRoles.includes(role);

      if (!allowed) {
        const [profile] = await db
          .select({ id: studentProfiles.id })
          .from(studentProfiles)
          .where(eq(studentProfiles.userId, session.user.id));

        if (profile) {
          const { eventRegistrations } = await import("@/db/schema");
          const { and, isNull } = await import("drizzle-orm");

          const [volunteerReg] = await db
            .select()
            .from(eventRegistrations)
            .where(
              and(
                eq(eventRegistrations.eventId, eventId),
                eq(eventRegistrations.studentId, profile.id),
                eq(eventRegistrations.role, "volunteer"),
                isNull(eventRegistrations.cancelledAt)
              )
            );
          if (volunteerReg) {
            allowed = true;
          }
        }
      }

      if (!allowed) {
        return NextResponse.redirect(new URL("/auth/login?error=Forbidden", request.url));
      }

      return supabaseResponse;
    }
  }

  // Check protected routes
  for (const [prefix, allowedRoles] of Object.entries(protectedRoutes)) {
    if (pathname.startsWith(prefix)) {
      // Allow guests to view student event details page
      if (prefix === "/student" && pathname.match(/^\/student\/events\/[a-zA-Z0-9-]+$/)) {
        continue;
      }

      if (!session) {
        return NextResponse.redirect(new URL("/auth/login", request.url));
      }
      const role = (session.user as Record<string, unknown>).role as string;
      if (!allowedRoles.includes(role)) {
        const dashboardUrl = getDashboardForRole(role);
        return NextResponse.redirect(new URL(dashboardUrl, request.url));
      }
    }
  }

  return supabaseResponse;
}

function getDashboardForRole(role: string): string {
  if (execomRoles.includes(role)) {
    return "/execom/analytics";
  }
  switch (role) {
    case "student":
      return "/student/dashboard";
    case "faculty":
      return "/faculty/reports";
    default:
      return "/student/dashboard";
  }
}

export const config = {
  matcher: [
    "/student/:path*",
    "/execom/:path*",
    "/faculty/:path*",
    "/auth/login",
    "/auth/register",
  ],
};