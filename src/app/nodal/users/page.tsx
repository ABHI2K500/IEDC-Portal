"use client";

// The Nodal Officer shares the Execom screen; it adapts its links and headings
// to the /nodal prefix through useAdminSection(). Role assignment is unlocked here by role, not by route.
import ExecomUsersPage from "@/app/execom/users/page";

export default function NodalUsersPage() {
  return <ExecomUsersPage />;
}
