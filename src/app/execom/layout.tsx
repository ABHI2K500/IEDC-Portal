"use client";

import {
  Sidebar,
  execomNavItems,
  studentNavItems,
} from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useSession } from "@/lib/auth-client";

const execomRoles = [
  "ceo", "cto", "to", "cfo", "fo", "cco", "co", "cio", "io", "cmo", "mo", "coo", "oo", "cso", "so", "cvo", "vo", "cwit", "wit"
];

export default function ExecomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = useSession();

  // Event volunteers are students who are allowed into a single event's
  // management + scanner screens. Give them their own navigation instead of
  // Execom links they cannot open.
  const userRole = (session?.user as Record<string, unknown> | undefined)
    ?.role as string | undefined;
  const isExecom = isPending || !userRole || execomRoles.includes(userRole);

  const navItems = isExecom ? execomNavItems : studentNavItems;
  const navRole = isExecom ? "execom" : "student";

  return (
    <div className="min-h-screen bg-[#F6F5F3]">
      <Sidebar items={navItems} role={navRole} />
      <div className="md:ml-20 lg:ml-[305px] flex flex-col min-h-screen">
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Header items={navItems} role={navRole} />
          {children}
        </main>
      </div>
    </div>
  );
}
