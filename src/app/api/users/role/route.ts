import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { allowedStaffEmails, users } from "@/db/schema";
import { assignUserRoleSchema } from "@/lib/validators";
import { getRoleLabel, isNodalOfficer } from "@/lib/roles";
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

/** Staff accounts live on the bare college domain; students use @<dept>.sjcetpalai.ac.in. */
const STAFF_EMAIL_DOMAIN = "sjcetpalai.ac.in";

/**
 * PATCH /api/users/role — Nodal Officer only.
 *
 * Assigns a role to an account that already exists in the portal. The change is
 * written to `users.role` (which every guard reads through the session) and the
 * staff whitelist is kept in sync so the proxy's auto-promotion never reverts it.
 */
export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actorRole = (session.user as Record<string, unknown>).role as string;
  if (!isNodalOfficer(actorRole)) {
    return NextResponse.json(
      { error: "Only the Nodal Officer can assign roles" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = assignUserRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please provide a valid email and role", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const role = parsed.data.role;

  const [target] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`);

  if (!target) {
    return NextResponse.json(
      { error: `No portal account found for ${email}. The user must sign in once before a role can be assigned.` },
      { status: 404 }
    );
  }

  if (target.id === session.user.id) {
    return NextResponse.json(
      { error: "You cannot change your own role. Ask another Nodal Officer to do it." },
      { status: 400 }
    );
  }

  if (target.role === role) {
    return NextResponse.json(
      { error: `${target.email} already holds the ${getRoleLabel(role)} role.` },
      { status: 400 }
    );
  }

  const previousRole = target.role;

  const [updated] = await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, target.id))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    });

  // Keep the staff whitelist consistent with the assignment. Only bare-domain
  // (staff) addresses are whitelisted — the proxy ignores the list for student
  // department domains, so an entry there would be noise.
  const isStaffDomain = target.email.split("@")[1] === STAFF_EMAIL_DOMAIN;
  if (isStaffDomain) {
    const [existing] = await db
      .select({ id: allowedStaffEmails.id })
      .from(allowedStaffEmails)
      .where(eq(allowedStaffEmails.email, target.email));

    if (role === "student") {
      // Leaving the entry behind would let the proxy re-promote them on the next request.
      if (existing) {
        await db.delete(allowedStaffEmails).where(eq(allowedStaffEmails.id, existing.id));
      }
    } else if (existing) {
      await db
        .update(allowedStaffEmails)
        .set({ role, addedBy: session.user.id })
        .where(eq(allowedStaffEmails.id, existing.id));
    } else {
      await db.insert(allowedStaffEmails).values({
        email: target.email,
        role,
        addedBy: session.user.id,
      });
    }
  }

  return NextResponse.json({
    success: true,
    user: updated,
    previousRole,
    message: `${updated.name || updated.email} is now ${getRoleLabel(role)}.`,
  });
}
