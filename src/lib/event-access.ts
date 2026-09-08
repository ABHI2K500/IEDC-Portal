import { db } from "@/db";
import { eventRegistrations, studentProfiles } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getRoleFromSession, isAdminRole, isExecomRole, isNodalOfficer } from "@/lib/roles";

export { EXECOM_ROLES, isExecomRole, getRoleFromSession } from "@/lib/roles";

export interface EventAccess {
  /** Session user id, when signed in. */
  userId: string | null;
  /** The signed-in user's role. */
  role: string;
  isExecom: boolean;
  /** The Nodal Officer outranks Execom and holds every Execom power. */
  isNodal: boolean;
  isFaculty: boolean;
  /** Student profile id of the signed-in user, when they have one. */
  studentProfileId: string | null;
  /** True when the user holds an active volunteer registration for this event. */
  isVolunteer: boolean;
  /** Execom / Nodal Officer + faculty + assigned volunteers may read event operations data. */
  canView: boolean;
  /** Only Execom and the Nodal Officer may mutate the event or its volunteer roster. */
  canManage: boolean;
}

/**
 * Resolves what the signed-in user is allowed to do on a single event.
 *
 * A volunteer only ever gains access to the event they were assigned to —
 * the lookup is scoped by `eventId`, and cancelled registrations are ignored.
 */
export async function getEventAccess(
  session: { user: { id: string } } | null,
  eventId: string
): Promise<EventAccess> {
  if (!session?.user?.id) {
    return {
      userId: null,
      role: "",
      isExecom: false,
      isNodal: false,
      isFaculty: false,
      studentProfileId: null,
      isVolunteer: false,
      canView: false,
      canManage: false,
    };
  }

  const role = getRoleFromSession(session);
  const isExecom = isExecomRole(role);
  const isNodal = isNodalOfficer(role);
  const isFaculty = role === "faculty";
  const isAdmin = isAdminRole(role);

  const [profile] = await db
    .select({ id: studentProfiles.id })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, session.user.id));

  let isVolunteer = false;
  if (profile) {
    const [volunteerReg] = await db
      .select({ id: eventRegistrations.id })
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.eventId, eventId),
          eq(eventRegistrations.studentId, profile.id),
          eq(eventRegistrations.role, "volunteer"),
          isNull(eventRegistrations.cancelledAt)
        )
      );
    isVolunteer = !!volunteerReg;
  }

  return {
    userId: session.user.id,
    role,
    isExecom,
    isNodal,
    isFaculty,
    studentProfileId: profile?.id ?? null,
    isVolunteer,
    canView: isAdmin || isFaculty || isVolunteer,
    canManage: isAdmin,
  };
}