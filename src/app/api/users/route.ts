import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { users, studentProfiles, facultyProfiles } from "@/db/schema";
import { isAdminRole, isExecomRole } from "@/lib/roles";
import { NextResponse } from "next/server";
import { eq, or, ilike, and, desc } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as Record<string, unknown>).role as string;
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim().toLowerCase() || "";
  const roleFilter = searchParams.get("role")?.trim() || "";

  try {
    const rawUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        studentDept: studentProfiles.department,
        studentBatch: studentProfiles.batch,
        studentPoints: studentProfiles.totalPoints,
        studentAdmission: studentProfiles.admissionNumber,
        facultyDept: facultyProfiles.department,
        facultyDesignation: facultyProfiles.designation,
      })
      .from(users)
      .leftJoin(studentProfiles, eq(users.id, studentProfiles.userId))
      .leftJoin(facultyProfiles, eq(users.id, facultyProfiles.userId))
      .orderBy(desc(users.createdAt));

    let filteredUsers = rawUsers;

    if (query) {
      filteredUsers = filteredUsers.filter((u) => {
        const matchesName = u.name?.toLowerCase().includes(query);
        const matchesEmail = u.email?.toLowerCase().includes(query);
        const matchesRole = u.role?.toLowerCase().includes(query);
        const matchesDept = u.studentDept?.toLowerCase().includes(query) || u.facultyDept?.toLowerCase().includes(query);
        const matchesAdmission = u.studentAdmission?.toLowerCase().includes(query);
        return matchesName || matchesEmail || matchesRole || matchesDept || matchesAdmission;
      });
    }

    if (roleFilter && roleFilter !== "all") {
      if (roleFilter === "execom") {
        filteredUsers = filteredUsers.filter((u) => isExecomRole(u.role));
      } else {
        filteredUsers = filteredUsers.filter((u) => u.role === roleFilter);
      }
    }

    return NextResponse.json(filteredUsers);
  } catch (error) {
    console.error("Error fetching registered users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}