import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  eventAttendance,
  eventRegistrations,
  events,
  studentProfiles,
} from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getEventAccess } from "@/lib/event-access";

/**
 * Analytics for a single event.
 *
 * Readable by Execom, faculty, and the volunteers assigned to *this* event —
 * a volunteer gets nothing for events they were not assigned to.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await getEventAccess(session, eventId);
  if (!access.canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event || event.isDeleted) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Every active registration for this event, with its attendance state.
    const rows = await db
      .select({
        role: eventRegistrations.role,
        studentId: studentProfiles.id,
        name: studentProfiles.name,
        department: studentProfiles.department,
        batch: studentProfiles.batch,
        iecdId: studentProfiles.iecdId,
        scannedAt: eventAttendance.scannedAt,
      })
      .from(eventRegistrations)
      .innerJoin(
        studentProfiles,
        eq(eventRegistrations.studentId, studentProfiles.id)
      )
      .leftJoin(
        eventAttendance,
        and(
          eq(eventAttendance.eventId, eventRegistrations.eventId),
          eq(eventAttendance.studentId, studentProfiles.id)
        )
      )
      .where(
        and(
          eq(eventRegistrations.eventId, eventId),
          isNull(eventRegistrations.cancelledAt)
        )
      );

    const totalRegistrations = rows.length;
    const participants = rows.filter((r) => r.role !== "volunteer").length;
    const volunteers = rows.filter((r) => r.role === "volunteer").length;
    const attended = rows.filter((r) => !!r.scannedAt).length;
    const turnoutRate =
      totalRegistrations > 0
        ? Math.round((attended / totalRegistrations) * 1000) / 10
        : 0;

    // Department split
    const deptMap = new Map<string, { registered: number; attended: number }>();
    const batchMap = new Map<string, { registered: number; attended: number }>();

    for (const row of rows) {
      const dept = row.department || "Unknown";
      const batch = row.batch || "Unknown";

      const deptEntry = deptMap.get(dept) || { registered: 0, attended: 0 };
      deptEntry.registered += 1;
      if (row.scannedAt) deptEntry.attended += 1;
      deptMap.set(dept, deptEntry);

      const batchEntry = batchMap.get(batch) || { registered: 0, attended: 0 };
      batchEntry.registered += 1;
      if (row.scannedAt) batchEntry.attended += 1;
      batchMap.set(batch, batchEntry);
    }

    const departmentBreakdown = Array.from(deptMap.entries())
      .map(([department, counts]) => ({ department, ...counts }))
      .sort((a, b) => b.registered - a.registered);

    const batchBreakdown = Array.from(batchMap.entries())
      .map(([batch, counts]) => ({ batch, ...counts }))
      .sort((a, b) => b.registered - a.registered);

    // Most recent check-ins — includes walk-ins who were never pre-registered.
    const recentScans = await db
      .select({
        studentId: studentProfiles.id,
        name: studentProfiles.name,
        iecdId: studentProfiles.iecdId,
        department: studentProfiles.department,
        scannedAt: eventAttendance.scannedAt,
      })
      .from(eventAttendance)
      .innerJoin(
        studentProfiles,
        eq(eventAttendance.studentId, studentProfiles.id)
      )
      .where(eq(eventAttendance.eventId, eventId))
      .orderBy(desc(eventAttendance.scannedAt))
      .limit(10);

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        eventType: event.eventType,
        status: event.status,
        venue: event.venue,
        startDatetime: event.startDatetime,
        endDatetime: event.endDatetime,
        registrationLimit: event.registrationLimit,
        participationPoints: event.participationPoints,
        volunteerPoints: event.volunteerPoints,
      },
      totals: {
        registrations: totalRegistrations,
        participants,
        volunteers,
        attended,
        notAttended: totalRegistrations - attended,
        turnoutRate,
        capacityUsed: event.registrationLimit
          ? Math.round((totalRegistrations / event.registrationLimit) * 1000) / 10
          : null,
      },
      departmentBreakdown,
      batchBreakdown,
      recentScans,
      viewer: {
        isExecom: access.isExecom,
        isNodal: access.isNodal,
        canManage: access.canManage,
        isVolunteer: access.isVolunteer,
      },
    });
  } catch (error) {
    console.error("Failed to build event analytics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
