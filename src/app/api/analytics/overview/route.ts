import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  studentProfiles,
  events,
  eventRegistrations,
  eventAttendance,
  projects,
  certificates,
} from "@/db/schema";
import { eq, count, sql, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/roles";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;

    if (role !== "faculty" && !isAdminRole(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [
      [totalStudents],
      [totalEvents],
      [publishedEvents],
      [completedEvents],
      [totalRegistrations],
      [totalAttendance],
      [totalProjects],
      [totalCertificates],
    ] = await Promise.all([
      db
        .select({ count: count() })
        .from(studentProfiles)
        .where(eq(studentProfiles.isDeleted, false)),
      db
        .select({ count: count() })
        .from(events)
        .where(eq(events.isDeleted, false)),
      db
        .select({ count: count() })
        .from(events)
        .where(sql`${events.isDeleted} = false AND ${events.status} = 'published'`),
      db
        .select({ count: count() })
        .from(events)
        .where(sql`${events.isDeleted} = false AND ${events.status} = 'completed'`),
      db.select({ count: count() }).from(eventRegistrations),
      db.select({ count: count() }).from(eventAttendance),
      db
        .select({ count: count() })
        .from(projects)
        .where(eq(projects.isDeleted, false)),
      db.select({ count: count() }).from(certificates),
    ]);

    // Department breakdown
    const deptBreakdown = await db
      .select({
        department: studentProfiles.department,
        count: count(),
      })
      .from(studentProfiles)
      .where(eq(studentProfiles.isDeleted, false))
      .groupBy(studentProfiles.department);

    // Active Students list with department, name, batch, admission, points
    const activeStudentsList = await db
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

    // Showcased Projects detailed list
    const projectsList = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        githubUrl: projects.githubUrl,
        demoUrl: projects.demoUrl,
        tags: projects.tags,
        status: projects.status,
        submittedAt: projects.submittedAt,
        studentName: studentProfiles.name,
        department: studentProfiles.department,
      })
      .from(projects)
      .leftJoin(studentProfiles, eq(projects.submittedBy, studentProfiles.id))
      .where(eq(projects.isDeleted, false))
      .orderBy(desc(projects.submittedAt))
      .limit(30);

    // Verified Certificates detailed list
    const certificatesList = await db
      .select({
        id: certificates.id,
        certificateNumber: certificates.certificateNumber,
        issuedAt: certificates.issuedAt,
        studentName: studentProfiles.name,
        department: studentProfiles.department,
        eventTitle: events.title,
      })
      .from(certificates)
      .leftJoin(studentProfiles, eq(certificates.studentId, studentProfiles.id))
      .leftJoin(events, eq(certificates.eventId, events.id))
      .orderBy(desc(certificates.issuedAt))
      .limit(30);

    // Event performance details (top events with registration and attendance counts)
    const recentEvents = await db
      .select({
        id: events.id,
        title: events.title,
        eventType: events.eventType,
        startDatetime: events.startDatetime,
        status: events.status,
        venue: events.venue,
        participationPoints: events.participationPoints,
      })
      .from(events)
      .where(eq(events.isDeleted, false))
      .orderBy(desc(events.startDatetime))
      .limit(20);

    const eventIds = recentEvents.map((e) => e.id);

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

    const eventsPerformance = recentEvents.map((e) => {
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

    const regCountVal = totalRegistrations?.count || 0;
    const attCountVal = totalAttendance?.count || 0;
    const turnoutPercentage =
      regCountVal > 0 ? Math.round((attCountVal / regCountVal) * 1000) / 10 : 0;

    return NextResponse.json({
      totalStudents: totalStudents?.count || 0,
      totalEvents: totalEvents?.count || 0,
      publishedEvents: publishedEvents?.count || 0,
      completedEvents: completedEvents?.count || 0,
      totalRegistrations: regCountVal,
      totalAttendance: attCountVal,
      turnoutRate: turnoutPercentage,
      totalProjects: totalProjects?.count || 0,
      totalCertificates: totalCertificates?.count || 0,
      departmentBreakdown: deptBreakdown || [],
      students: activeStudentsList || [],
      projects: projectsList || [],
      certificates: certificatesList || [],
      eventsPerformance,
    });
  } catch (error) {
    console.error("Error in analytics overview:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}