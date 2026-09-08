"use client";

import { usePathname } from "next/navigation";

/**
 * The Execom and Nodal Officer workspaces render the same screens under two
 * different route prefixes (`/execom/...` and `/nodal/...`). Shared pages use
 * this hook so their internal links and headings follow whichever workspace the
 * user is actually browsing, instead of hard-coding `/execom`.
 */
export interface AdminSection {
  /** True while browsing the Nodal Officer workspace. */
  isNodal: boolean;
  /** Route prefix to build links with: `/nodal` or `/execom`. */
  base: string;
  /** Badge text for page hero sections. */
  workspaceLabel: string;
}

export function useAdminSection(): AdminSection {
  const pathname = usePathname();
  const isNodal = pathname === "/nodal" || pathname.startsWith("/nodal/");

  return {
    isNodal,
    base: isNodal ? "/nodal" : "/execom",
    workspaceLabel: isNodal ? "Nodal Office" : "Execom Workspace",
  };
}
