/**
 * Single source of truth for portal roles.
 *
 * Role hierarchy (highest authority first):
 *   1. nodal_officer — super admin. Everything Execom can do, plus role assignment.
 *   2. Execom chiefs / officers — day to day event, project and user operations.
 *   3. faculty — read-only reporting.
 *   4. student — participant.
 *
 * Every guard (proxy, route handlers, UI) must derive its checks from here so the
 * definition of "who counts as staff" can never drift between layers.
 */

export const NODAL_OFFICER_ROLE = "nodal_officer";

/** Execom (chief / officer) roles. Mirrors the `user_role` enum in the database. */
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

export type ExecomRole = (typeof EXECOM_ROLES)[number];

/** Every role the `user_role` database enum accepts. */
export const USER_ROLES = [
  "student",
  "faculty",
  NODAL_OFFICER_ROLE,
  ...EXECOM_ROLES,
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Roles a Nodal Officer may assign to an existing portal account. */
export const ASSIGNABLE_ROLES = USER_ROLES;

export function isExecomRole(role: string | null | undefined): boolean {
  return !!role && (EXECOM_ROLES as readonly string[]).includes(role);
}

export function isNodalOfficer(role: string | null | undefined): boolean {
  return role === NODAL_OFFICER_ROLE;
}

/**
 * True for anyone who holds Execom management powers — the Execom team itself and
 * the Nodal Officer, who outranks them. Use this for every "can manage events /
 * projects / users" check; use `isNodalOfficer` for super-admin-only actions.
 */
export function isAdminRole(role: string | null | undefined): boolean {
  return isExecomRole(role) || isNodalOfficer(role);
}

/** Landing route for a role after login or a failed authorization check. */
export function getDashboardForRole(role: string | null | undefined): string {
  if (isNodalOfficer(role)) return "/nodal/analytics";
  if (isExecomRole(role)) return "/execom/analytics";
  switch (role) {
    case "faculty":
      return "/faculty/reports";
    case "student":
    default:
      return "/student/dashboard";
  }
}

/** Human readable role names, used in badges, ID cards and dropdowns. */
export const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  faculty: "Faculty Member",
  [NODAL_OFFICER_ROLE]: "Nodal Officer",
  ceo: "CEO (Chief Executive Officer)",
  cto: "CTO (Chief Technical Officer)",
  to: "TO (Technical Officer)",
  cfo: "CFO (Chief Finance Officer)",
  fo: "FO (Finance Officer)",
  cco: "CCO (Chief Creative Officer)",
  co: "CO (Creative Officer)",
  cio: "CIO (Chief Innovation Officer)",
  io: "IO (Innovation Officer)",
  cmo: "CMO (Chief Marketing Officer)",
  mo: "MO (Marketing Officer)",
  coo: "COO (Chief Operations Officer)",
  oo: "OO (Operations Officer)",
  cso: "CSO (Chief Skills Officer)",
  so: "SO (Skills Officer)",
  cvo: "CVO (Chief Vibes Officer)",
  vo: "VO (Vibes Officer)",
  cwit: "CWIT (Chief Women in Tech)",
  wit: "WIT (Women in Tech)",
};

export function getRoleLabel(role: string | null | undefined): string {
  if (!role) return "Unknown";
  return ROLE_LABELS[role] || role.toUpperCase();
}

/** Short badge text (e.g. sidebar chip). */
export function getRoleBadgeText(role: string | null | undefined): string {
  if (!role) return "";
  if (isNodalOfficer(role)) return "NODAL OFFICER";
  return role.toUpperCase();
}

/** Reads the role off a Better Auth session without leaking `any` into callers. */
export function getRoleFromSession(session: unknown): string {
  const user = (session as { user?: Record<string, unknown> } | null)?.user;
  return (user?.role as string) || "";
}
