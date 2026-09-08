"use client";

import { Sidebar, nodalNavItems } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { NODAL_OFFICER_ROLE } from "@/lib/roles";

/**
 * Nodal Officer workspace — the portal's top authority.
 *
 * The screens under /nodal are the Execom screens re-used verbatim (see the thin
 * page wrappers in this folder); they adapt their links and headings through
 * `useAdminSection()`. Access is enforced in `src/proxy.ts` and again in every
 * route handler.
 */
export default function NodalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F6F5F3]">
      <Sidebar items={nodalNavItems} role={NODAL_OFFICER_ROLE} />
      <div className="md:ml-20 lg:ml-[305px] flex flex-col min-h-screen">
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Header items={nodalNavItems} role={NODAL_OFFICER_ROLE} />
          {children}
        </main>
      </div>
    </div>
  );
}
