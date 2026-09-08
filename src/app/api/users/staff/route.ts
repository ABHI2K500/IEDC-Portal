import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { allowedStaffEmails } from "@/db/schema";
import { addStaffEmailSchema } from "@/lib/validators";
import { NODAL_OFFICER_ROLE, isAdminRole, isNodalOfficer } from "@/lib/roles";
import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as Record<string, unknown>).role as string;
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const staffEmails = await db
    .select()
    .from(allowedStaffEmails)
    .orderBy(desc(allowedStaffEmails.createdAt));

  return NextResponse.json(staffEmails);
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as Record<string, unknown>).role as string;
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = addStaffEmailSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const isCollegeEmail =
    email.endsWith("@sjcetpalai.ac.in") ||
    email.endsWith(".sjcetpalai.ac.in");

  if (!isCollegeEmail) {
    return NextResponse.json(
      { error: "Only SJCET college email IDs (@sjcetpalai.ac.in) can be whitelisted." },
      { status: 400 }
    );
  }

  const [existing] = await db
    .select()
    .from(allowedStaffEmails)
    .where(eq(allowedStaffEmails.email, email));

  if (existing) {
    // Execom may not overwrite (and thereby demote) a Nodal Officer entry.
    if (existing.role === NODAL_OFFICER_ROLE && !isNodalOfficer(role)) {
      return NextResponse.json(
        { error: "Only the Nodal Officer can change a Nodal Officer whitelist entry." },
        { status: 403 }
      );
    }

    const [updated] = await db
      .update(allowedStaffEmails)
      .set({
        role: parsed.data.role,
        addedBy: session.user.id,
      })
      .where(eq(allowedStaffEmails.id, existing.id))
      .returning();

    return NextResponse.json(updated, { status: 200 });
  }

  const [staff] = await db
    .insert(allowedStaffEmails)
    .values({
      email,
      role: parsed.data.role,
      addedBy: session.user.id,
    })
    .returning();

  return NextResponse.json(staff, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as Record<string, unknown>).role as string;
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const email = searchParams.get("email")?.trim().toLowerCase();

  if (!id && !email) {
    return NextResponse.json(
      { error: "Whitelist ID or Email is required for removal" },
      { status: 400 }
    );
  }

  // Execom may not revoke a Nodal Officer entry.
  const [existingEntry] = id
    ? await db.select().from(allowedStaffEmails).where(eq(allowedStaffEmails.id, id))
    : await db.select().from(allowedStaffEmails).where(eq(allowedStaffEmails.email, email!));

  if (existingEntry?.role === NODAL_OFFICER_ROLE && !isNodalOfficer(role)) {
    return NextResponse.json(
      { error: "Only the Nodal Officer can revoke a Nodal Officer whitelist entry." },
      { status: 403 }
    );
  }

  let deleted;
  if (id) {
    [deleted] = await db
      .delete(allowedStaffEmails)
      .where(eq(allowedStaffEmails.id, id))
      .returning();
  } else if (email) {
    [deleted] = await db
      .delete(allowedStaffEmails)
      .where(eq(allowedStaffEmails.email, email))
      .returning();
  }

  if (!deleted) {
    return NextResponse.json({ error: "Staff email not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, deleted });
}