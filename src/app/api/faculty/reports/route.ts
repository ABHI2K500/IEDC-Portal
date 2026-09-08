import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  users,
  studentProfiles,
  events,
  eventRegistrations,
  eventAttendance,
  projects,
} from "@/db/schema";
import { eq, count, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/roles";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as Record<string, unknown>).role as string;
  if (role !== "faculty" && !isAdminRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [totalStudents] = await db
    .select({ count: count() })
    .from(studentProfiles)
    .where(eq(studentProfiles.isDeleted, false));

  const [totalEvents] = await db
    .select({ count: count() })
    .from(events)
    .where(eq(events.isDeleted, false));

  const [totalRegistrations] = await db
    .select({ count: count() })
    .from(eventRegistrations);

  const [totalAttendance] = await db
    .select({ count: count() })
    .from(eventAttendance);

  const [pendingProjects] = await db
    .select({ count: count() })
    .from(projects)
    .where(eq(projects.status, "pending"));

  const [approvedProjects] = await db
    .select({ count: count() })
    .from(projects)
    .where(eq(projects.status, "approved"));

  // Department breakdown
  const departmentBreakdown = await db
    .select({
      department: studentProfiles.department,
      count: count(),
    })
    .from(studentProfiles)
    .where(eq(studentProfiles.isDeleted, false))
    .groupBy(studentProfiles.department);

  // Active Students list with profile details
  const students = await db
    .select({
      id: studentProfiles.id,
      name: studentProfiles.name,
      department: studentProfiles.department,
      admissionNumber: studentProfiles.admissionNumber,
      batch: studentProfiles.batch,
      iecdId: studentProfiles.iecdId,
      totalPoints: studentProfiles.totalPoints,
      phone: studentProfiles.phone,
    })
    .from(studentProfiles)
    .where(eq(studentProfiles.isDeleted, false))
    .orderBy(studentProfiles.department, studentProfiles.name);

  // Projects detailed list
  const projectsList = await db
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      githubUrl: projects.githubUrl,
      demoUrl: projects.demoUrl,
      tags: projects.tags,
      status: projects.status,
      reviewComment: projects.reviewComment,
      submittedAt: projects.submittedAt,
      studentName: studentProfiles.name,
      department: studentProfiles.department,
      admissionNumber: studentProfiles.admissionNumber,
      iecdId: studentProfiles.iecdId,
    })
    .from(projects)
    .leftJoin(studentProfiles, eq(projects.submittedBy, studentProfiles.id))
    .where(eq(projects.isDeleted, false))
    .orderBy(desc(projects.submittedAt));

  // Events list with complete details (posterUrl, description, etc.)
  const allEvents = await db
    .select({
      id: events.id,
      title: events.title,
      eventType: events.eventType,
      startDatetime: events.startDatetime,
      endDatetime: events.endDatetime,
      status: events.status,
      venue: events.venue,
      participationPoints: events.participationPoints,
      posterUrl: events.posterUrl,
      description: events.description,
    })
    .from(events)
    .where(eq(events.isDeleted, false))
    .orderBy(desc(events.startDatetime));

  const eventIds = allEvents.map((e) => e.id);
  let regCounts: Record<string, number> = {};
  let attCounts: Record<string, number> = {};

  if (eventIds.length > 0) {
    const regRows = await db
      .select({
        eventId: eventRegistrations.eventId,
        count: count(),
      })
      .from(eventRegistrations)
      .groupBy(eventRegistrations.eventId);

    const attRows = await db
      .select({
        eventId: eventAttendance.eventId,
        count: count(),
      })
      .from(eventAttendance)
      .groupBy(eventAttendance.eventId);

    regRows.forEach((r) => {
      regCounts[r.eventId] = r.count;
    });
    attRows.forEach((a) => {
      attCounts[a.eventId] = a.count;
    });
  }

  const eventsPerformance = allEvents.map((e) => {
    const reg = regCounts[e.id] || 0;
    const att = attCounts[e.id] || 0;
    const rate = reg > 0 ? Math.round((att / reg) * 100) : 0;
    return {
      ...e,
      registrationsCount: reg,
      attendanceCount: att,
      turnoutRate: rate,
    };
  });

  return NextResponse.json({
    totalStudents: totalStudents.count,
    totalEvents: totalEvents.count,
    totalRegistrations: totalRegistrations.count,
    totalAttendance: totalAttendance.count,
    pendingProjects: pendingProjects.count,
    approvedProjects: approvedProjects.count,
    departmentBreakdown,
    students,
    projects: projectsList,
    eventsPerformance,
    recentEvents: eventsPerformance.slice(0, 6),
  });
}