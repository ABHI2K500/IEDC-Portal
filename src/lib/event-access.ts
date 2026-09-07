import { db } from "@/db";
import { eventRegistrations, studentProfiles } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

/**
 * Execom (chief / officer) roles. Kept in one place so every event guard
 * agrees on who counts as Execom.
 */
export const EXECOM_ROLES = [
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
] as const;

export function isExecomRole(role: string | null | undefined): boolean {
  return !!role && (EXECOM_ROLES as readonly string[]).includes(role);
}

export function getRoleFromSession(session: unknown): string {
  const user = (session as { user?: Record<string, unknown> } | null)?.user;
  return (user?.role as string) || "";
}

export interface EventAccess {
  /** Session user id, when signed in. */
  userId: string | null;
  /** The signed-in user's role. */
  role: string;
  isExecom: boolean;
  isFaculty: boolean;
  /** Student profile id of the signed-in user, when they have one. */
  studentProfileId: string | null;
  /** True when the user holds an active volunteer registration for this event. */
  isVolunteer: boolean;
  /** Execom + faculty + assigned volunteers may read event operations data. */
  canView: boolean;
  /** Only Execom may mutate the event or its volunteer roster. */
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
      isFaculty: false,
      studentProfileId: null,
      isVolunteer: false,
      canView: false,
      canManage: false,
    };
  }

  const role = getRoleFromSession(session);
  const isExecom = isExecomRole(role);
  const isFaculty = role === "faculty";

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
    isFaculty,
    studentProfileId: profile?.id ?? null,
    isVolunteer,
    canView: isExecom || isFaculty || isVolunteer,
    canManage: isExecom,
  };
}