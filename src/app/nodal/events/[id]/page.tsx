"use client";

// The Nodal Officer shares the Execom screen; it adapts its links and headings
// to the /nodal prefix through useAdminSection().
import ExecomEventDetailPage from "@/app/execom/events/[id]/page";

export default function NodalEventDetailPage() {
  return <ExecomEventDetailPage />;
}
