"use client";

// The Nodal Officer shares the Execom attendance scanner; it adapts its links to
// the /nodal prefix through useAdminSection().
import ExecomScanPage from "@/app/execom/events/[id]/scan/page";

export default function NodalScanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ExecomScanPage params={params} />;
}
