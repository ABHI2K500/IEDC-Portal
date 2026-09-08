"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Loader2,
  UserPlus,
  ShieldCheck,
  Users,
  Search,
  Sparkles,
  Mail,
  UserCheck,
  Filter,
  GraduationCap,
  Award,
  Trash2,
  CheckCircle2,
  UserX,
  RefreshCw,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";
import { useAdminSection } from "@/lib/admin-section";
import { NODAL_OFFICER_ROLE, isNodalOfficer } from "@/lib/roles";

interface StaffEmail {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean | null;
  lastLogin: string | null;
  createdAt: string | null;
  studentDept?: string | null;
  studentBatch?: string | null;
  studentPoints?: number | null;
  studentAdmission?: string | null;
  facultyDept?: string | null;
  facultyDesignation?: string | null;
}

const EXECOM_ROLES_LIST = [
  { value: "ceo", label: "CEO (Chief Executive Officer)", category: "c-suite" },
  { value: "cto", label: "CTO (Chief Technical Officer)", category: "c-suite" },
  { value: "to", label: "TO (Technical Officer)", category: "officer" },
  { value: "cfo", label: "CFO (Chief Finance Officer)", category: "c-suite" },
  { value: "fo", label: "FO (Finance Officer)", category: "officer" },
  { value: "cco", label: "CCO (Chief Creative Officer)", category: "c-suite" },
  { value: "co", label: "CO (Creative Officer)", category: "officer" },
  { value: "cio", label: "CIO (Chief Innovation Officer)", category: "c-suite" },
  { value: "io", label: "IO (Innovation Officer)", category: "officer" },
  { value: "cmo", label: "CMO (Chief Marketing Officer)", category: "c-suite" },
  { value: "mo", label: "MO (Marketing Officer)", category: "officer" },
  { value: "coo", label: "COO (Chief Operations Officer)", category: "c-suite" },
  { value: "oo", label: "OO (Operations Officer)", category: "officer" },
  { value: "cso", label: "CSO (Chief Skills Officer)", category: "c-suite" },
  { value: "so", label: "SO (Skills Officer)", category: "officer" },
  { value: "cvo", label: "CVO (Chief Vibes Officer)", category: "c-suite" },
  { value: "vo", label: "VO (Vibes Officer)", category: "officer" },
  { value: "cwit", label: "CWIT (Chief Women in Tech)", category: "c-suite" },
  { value: "wit", label: "WIT (Women in Tech)", category: "officer" },
];

/** Roles the Nodal Officer can hand out, grouped for the assignment dropdown. */
const GOVERNANCE_ROLES_LIST = [
  { value: NODAL_OFFICER_ROLE, label: "Nodal Officer (Super Admin)" },
  { value: "faculty", label: "Faculty Member" },
  { value: "student", label: "Student" },
];

const STAFF_FILTER_ITEMS = [
  { key: "all", label: "All Whitelisted Roles" },
  { key: "faculty", label: "Faculty" },
  { key: "c-suite", label: "C-Suite Chiefs" },
  { key: "officer", label: "Executive Officers" },
];

const REGISTERED_FILTER_ITEMS = [
  { key: "all", label: "All Platform Users" },
  { key: "student", label: "Students" },
  { key: "faculty", label: "Faculty Members" },
  { key: "execom", label: "Execom Team" },
];

export default function ExecomUsersPage() {
  // `isNodalWorkspace` follows the URL (/nodal vs /execom); `isNodal` below
  // follows the signed-in role and is what gates the privileged controls.
  const { isNodal: isNodalWorkspace } = useAdminSection();
  const { data: session } = useSession();
  const currentRole = (session?.user as Record<string, unknown> | undefined)
    ?.role as string | undefined;
  // Role assignment is the Nodal Officer's power alone — gated by role, not by
  // route, and enforced again by PATCH /api/users/role.
  const isNodal = isNodalOfficer(currentRole);

  const [mainTab, setMainTab] = useState<"whitelist" | "directory" | "roles">(
    "whitelist"
  );

  // Whitelist state
  const [staffEmails, setStaffEmails] = useState<StaffEmail[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [staffActiveTab, setStaffActiveTab] = useState("all");

  // Registered Users Directory state
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [regLoading, setRegLoading] = useState(true);
  const [regSearchQuery, setRegSearchQuery] = useState("");
  const [regActiveTab, setRegActiveTab] = useState("all");

  // Role assignment state (Nodal Officer only)
  const [assignEmail, setAssignEmail] = useState("");
  const [assignRole, setAssignRole] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");

  useEffect(() => {
    fetchStaff();
    fetchRegisteredUsers();
  }, []);

  async function fetchStaff() {
    try {
      setStaffLoading(true);
      const res = await fetch("/api/users/staff");
      if (res.ok) {
        setStaffEmails(await res.json());
      }
    } catch (err) {
      console.error("Error fetching staff emails:", err);
    } finally {
      setStaffLoading(false);
    }
  }

  async function fetchRegisteredUsers() {
    try {
      setRegLoading(true);
      const res = await fetch("/api/users");
      if (res.ok) {
        setRegisteredUsers(await res.json());
      }
    } catch (err) {
      console.error("Error fetching registered users:", err);
    } finally {
      setRegLoading(false);
    }
  }

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError("");
    setSuccessMessage("");

    const cleanEmail = newEmail.trim().toLowerCase();

    try {
      const res = await fetch("/api/users/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, role: newRole }),
      });

      const data = await res.json();
      if (res.ok) {
        setNewEmail("");
        setNewRole("");
        setSuccessMessage(`Successfully whitelisted ${cleanEmail} as ${getRoleLabel(newRole)}.`);
        fetchStaff();
      } else {
        setError(data.error || "Failed to add staff email");
      }
    } catch {
      setError("Something went wrong while whitelisting staff email");
    } finally {
      setAdding(false);
    }
  }

  async function deleteStaff(id: string, email: string) {
    if (!confirm(`Are you sure you want to remove ${email} from the whitelist?`)) {
      return;
    }

    setDeletingId(id);
    setError("");
    setSuccessMessage("");

    try {
      const res = await fetch(`/api/users/staff?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSuccessMessage(`Revoked whitelist access for ${email}`);
        fetchStaff();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to remove staff email");
      }
    } catch {
      setError("Failed to revoke whitelist entry");
    } finally {
      setDeletingId(null);
    }
  }

  async function submitRoleAssignment(e: React.FormEvent) {
    e.preventDefault();
    setAssigning(true);
    setAssignError("");
    setAssignSuccess("");

    const cleanEmail = assignEmail.trim().toLowerCase();

    try {
      const res = await fetch("/api/users/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, role: assignRole }),
      });

      const data = await res.json();
      if (res.ok) {
        setAssignSuccess(
          data.message || `${cleanEmail} is now ${getRoleLabel(assignRole)}.`
        );
        setAssignEmail("");
        setAssignRole("");
        // The whitelist mirrors staff assignments, so refresh both views.
        fetchRegisteredUsers();
        fetchStaff();
      } else {
        setAssignError(data.error || "Failed to assign role");
      }
    } catch {
      setAssignError("Something went wrong while assigning the role");
    } finally {
      setAssigning(false);
    }
  }

  function startRoleAssignment(email: string) {
    setAssignEmail(email);
    setAssignError("");
    setAssignSuccess("");
    setMainTab("roles");
  }

  const getRoleCategory = (roleValue: string) => {
    if (roleValue === "faculty") return "faculty";
    const found = EXECOM_ROLES_LIST.find((r) => r.value === roleValue);
    return found ? found.category : "officer";
  };

  const getRoleLabel = (roleValue: string) => {
    if (roleValue === NODAL_OFFICER_ROLE) return "Nodal Officer";
    if (roleValue === "faculty") return "Faculty Member";
    if (roleValue === "student") return "Student";
    const found = EXECOM_ROLES_LIST.find((r) => r.value === roleValue);
    return found ? found.label : roleValue.toUpperCase();
  };

  const getRoleBadgeStyle = (roleValue: string) => {
    if (roleValue === NODAL_OFFICER_ROLE) {
      return "bg-amber-50 text-amber-700 border-amber-200/60 font-bold uppercase";
    }
    if (roleValue === "faculty") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
    }
    if (roleValue === "student") {
      return "bg-blue-50 text-blue-700 border-blue-200/60";
    }
    const cat = getRoleCategory(roleValue);
    if (cat === "c-suite") {
      return "bg-rose-50 text-[#D9383A] border-rose-200/60 font-bold uppercase";
    }
    return "bg-purple-50 text-purple-700 border-purple-200/60 font-semibold";
  };

  // Filtered staff emails
  const filteredStaff = staffEmails.filter((staff) => {
    const q = staffSearchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      staff.email.toLowerCase().includes(q) ||
      staff.role.toLowerCase().includes(q) ||
      getRoleLabel(staff.role).toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (staffActiveTab === "all") return true;
    if (staffActiveTab === "faculty") return staff.role === "faculty";
    if (staffActiveTab === "c-suite") return getRoleCategory(staff.role) === "c-suite";
    if (staffActiveTab === "officer") return getRoleCategory(staff.role) === "officer";

    return true;
  });

  // Filtered registered users
  const filteredRegisteredUsers = registeredUsers.filter((user) => {
    const q = regSearchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      user.name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.role.toLowerCase().includes(q) ||
      (user.studentDept && user.studentDept.toLowerCase().includes(q)) ||
      (user.studentAdmission && user.studentAdmission.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (regActiveTab === "all") return true;
    if (regActiveTab === "student") return user.role === "student";
    if (regActiveTab === "faculty") return user.role === "faculty";
    if (regActiveTab === "execom") {
      return EXECOM_ROLES_LIST.some((r) => r.value === user.role);
    }

    return true;
  });

  // Matches the typed email against the directory so the officer sees exactly who
  // they are about to change before submitting.
  const assignTarget = registeredUsers.find(
    (u) => u.email.toLowerCase() === assignEmail.trim().toLowerCase()
  );

  const governanceUsers = registeredUsers.filter(
    (u) => u.role !== "student"
  );

  const facultyCount = staffEmails.filter((s) => s.role === "faculty").length;
  const cSuiteCount = staffEmails.filter((s) => getRoleCategory(s.role) === "c-suite").length;
  const officerCount = staffEmails.filter((s) => getRoleCategory(s.role) === "officer").length;

  return (
    <div className="w-full space-y-6 font-['Hanken_Grotesk'] text-[#1A0D0C] pb-16">
      {/* Header Banner */}
      <div className="w-full max-w-[1014px] min-h-[200px] rounded-[38px] bg-white p-8 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden shadow-sm border border-gray-100/80 my-8 gap-6 group">
        <div className="z-10 max-w-xl space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-0.5 rounded-full bg-[#D9383A]/10 text-[#D9383A] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />{" "}
              {isNodalWorkspace ? "Nodal Governance" : "Execom Governance"}
            </span>
          </div>
          <h1 className="text-[36px] md:text-[46px] font-semibold text-[#1A0D0C] tracking-[-1.38px] leading-tight">
            User & Whitelist Management
          </h1>
          <p className="text-[16px] md:text-[20px] font-semibold text-[#B0B0B0] tracking-[-0.6px] leading-snug">
            Query registered users, manage staff email whitelists, and oversee platform access permissions.
          </p>
        </div>

        <div className="z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="bg-[#100A0A] text-white px-5 py-3 rounded-[31px] text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-sm shrink-0">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#D9383A]" />
              <span>{staffLoading ? "..." : `${staffEmails.length} Whitelisted`}</span>
            </div>
            <span className="text-gray-500">|</span>
            <div className="flex items-center gap-2 text-emerald-400">
              <UserCheck className="w-4 h-4" />
              <span>{regLoading ? "..." : `${registeredUsers.length} Registered`}</span>
            </div>
          </div>
        </div>

        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#D9383A]/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Main Mode Selector Tabs */}
      <div className="max-w-[1014px] flex items-center gap-3 bg-gray-100/70 p-1.5 rounded-[28px] border border-gray-200/60">
        <button
          type="button"
          onClick={() => setMainTab("whitelist")}
          className={cn(
            "flex-1 py-3 px-5 rounded-[22px] text-sm font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer",
            mainTab === "whitelist"
              ? "bg-white text-[#1A0D0C] shadow-sm border border-gray-100"
              : "text-gray-600 hover:text-[#1A0D0C] hover:bg-white/50"
          )}
        >
          <UserPlus className="w-4 h-4 text-[#D9383A]" />
          <span>Staff Email Whitelist</span>
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-red-50 text-[#D9383A] font-semibold">
            {staffEmails.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab("directory")}
          className={cn(
            "flex-1 py-3 px-5 rounded-[22px] text-sm font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer",
            mainTab === "directory"
              ? "bg-white text-[#1A0D0C] shadow-sm border border-gray-100"
              : "text-gray-600 hover:text-[#1A0D0C] hover:bg-white/50"
          )}
        >
          <Search className="w-4 h-4 text-purple-600" />
          <span>Registered Users Directory</span>
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-purple-50 text-purple-700 font-semibold">
            {registeredUsers.length}
          </span>
        </button>

        {isNodal && (
          <button
            type="button"
            onClick={() => setMainTab("roles")}
            className={cn(
              "flex-1 py-3 px-5 rounded-[22px] text-sm font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer",
              mainTab === "roles"
                ? "bg-white text-[#1A0D0C] shadow-sm border border-gray-100"
                : "text-gray-600 hover:text-[#1A0D0C] hover:bg-white/50"
            )}
          >
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>Role Assignment</span>
          </button>
        )}
      </div>

      {/* TAB 1: WHITELIST MANAGEMENT */}
      {mainTab === "whitelist" && (
        <>
          {/* Add Whitelisted Staff Card */}
          <div className="max-w-[1014px] bg-white rounded-[38px] border border-gray-100 p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#D9383A] flex items-center justify-center font-bold shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#1A0D0C] tracking-tight">
                    Add / Update Whitelisted Staff
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Authorize institutional @sjcetpalai.ac.in emails for faculty and Execom leadership roles
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={addStaff} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-5 space-y-2">
                  <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">
                    Institutional Email (@sjcetpalai.ac.in)
                  </Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-4 top-3.5 text-gray-400 pointer-events-none" />
                    <Input
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="h-[50px] rounded-2xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#D9383A] focus:ring-1 focus:ring-[#D9383A] text-sm text-[#1A0D0C] transition-all pl-11 pr-4"
                      placeholder="staff@sjcetpalai.ac.in"
                      type="email"
                      required
                    />
                  </div>
                </div>

                <div className="md:col-span-4 space-y-2">
                  <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">
                    Designated Role
                  </Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger className="h-[50px] rounded-2xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#D9383A] text-sm text-[#1A0D0C] transition-all px-4 font-['Hanken_Grotesk'] font-sans">
                      <SelectValue placeholder="Select assigned role" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl max-h-72 font-['Hanken_Grotesk'] font-sans">
                      <SelectGroup>
                        <SelectLabel className="text-xs font-bold text-emerald-600 px-3 py-1">
                          Faculty Leadership
                        </SelectLabel>
                        <SelectItem value="faculty" className="rounded-xl cursor-pointer">
                          Faculty Member
                        </SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-xs font-bold text-[#D9383A] px-3 py-1 mt-1">
                          C-Suite Chiefs
                        </SelectLabel>
                        {EXECOM_ROLES_LIST.filter((r) => r.category === "c-suite").map((r) => (
                          <SelectItem key={r.value} value={r.value} className="rounded-xl cursor-pointer">
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-xs font-bold text-purple-600 px-3 py-1 mt-1">
                          Executive Officers
                        </SelectLabel>
                        {EXECOM_ROLES_LIST.filter((r) => r.category === "officer").map((r) => (
                          <SelectItem key={r.value} value={r.value} className="rounded-xl cursor-pointer">
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-3">
                  <Button
                    type="submit"
                    disabled={adding || !newRole || !newEmail}
                    suppressHydrationWarning
                    className="h-[50px] w-full rounded-[31px] bg-[#100A0A] hover:bg-[#2A2020] active:scale-98 text-white font-medium text-sm tracking-tight transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {adding ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#D9383A]" />
                        <span>Whitelisting...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 text-[#D9383A]" />
                        <span>Add to Whitelist</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-2xl bg-red-50 border border-red-100 text-xs font-medium text-red-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-xs font-medium text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  {successMessage}
                </div>
              )}
            </form>
          </div>

          {/* Roster & Live Query Card */}
          <div className="max-w-[1014px] bg-white rounded-[38px] border border-gray-100 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <h2 className="text-2xl font-bold text-[#1A0D0C] tracking-tight flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-[#D9383A]" /> Authorized Staff Whitelist Roster
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Live index of all staff accounts permitted to register and access Execom capabilities
                </p>
              </div>

              <div className="flex items-center gap-2 w-full md:w-80">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by email or role..."
                    value={staffSearchQuery}
                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                    className="w-full h-[42px] bg-gray-50/60 border border-gray-200 rounded-2xl pl-10 pr-4 text-xs text-[#1A0D0C] placeholder-gray-400 focus:outline-none focus:border-[#D9383A] focus:bg-white transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchStaff}
                  title="Refresh Whitelist"
                  className="w-10 h-[42px] shrink-0 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
                >
                  <RefreshCw className={cn("w-4 h-4", staffLoading && "animate-spin text-[#D9383A]")} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {STAFF_FILTER_ITEMS.map((item) => {
                  const isActive = staffActiveTab === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setStaffActiveTab(item.key)}
                      className={cn(
                        "inline-flex items-center justify-center px-4 py-1.5 rounded-[26.92px] border text-[12px] font-normal tracking-[-0.39px] whitespace-nowrap transition-all duration-200 cursor-pointer h-[34px]",
                        isActive
                          ? "bg-[#100A0A] border-[#A5A5A5] text-white shadow-sm"
                          : "bg-[#E2E2E2] border-[#A5A5A5] text-[#3C3C3C] hover:bg-gray-200"
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-4 text-xs font-medium text-gray-500 px-2">
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-600" /> {facultyCount} Faculty
                </span>
                <span className="h-3 w-px bg-gray-200" />
                <span className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#D9383A]" /> {cSuiteCount} Chiefs
                </span>
                <span className="h-3 w-px bg-gray-200" />
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-600" /> {officerCount} Officers
                </span>
              </div>
            </div>

            {staffLoading ? (
              <div className="space-y-3 pt-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-[24px] animate-pulse" />
                ))}
              </div>
            ) : filteredStaff.length > 0 ? (
              <div className="space-y-3 pt-2">
                {filteredStaff.map((staff) => {
                  const roleLabel = getRoleLabel(staff.role);
                  const badgeStyle = getRoleBadgeStyle(staff.role);
                  const isDeleting = deletingId === staff.id;

                  return (
                    <div
                      key={staff.id}
                      className="p-4 sm:p-5 rounded-[24px] border border-gray-100/90 hover:border-gray-300 hover:bg-gray-50/60 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-sm group-hover:bg-[#100A0A] group-hover:text-white transition-colors shrink-0">
                          {staff.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-sm font-bold text-[#1A0D0C] group-hover:text-[#D9383A] transition-colors truncate">
                            {staff.email}
                          </p>
                          <p className="text-[11px] text-gray-400 font-medium">
                            Whitelisted on{" "}
                            {new Date(staff.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <Badge
                          className={cn(
                            "px-3.5 py-1 rounded-full text-xs border shadow-2xs tracking-tight flex items-center gap-1.5",
                            badgeStyle
                          )}
                          variant="secondary"
                        >
                          <Sparkles className="w-3 h-3 opacity-70" />
                          <span>{roleLabel}</span>
                        </Badge>

                        <button
                          type="button"
                          onClick={() => deleteStaff(staff.id, staff.email)}
                          disabled={isDeleting}
                          title="Revoke Whitelist"
                          className="w-9 h-9 rounded-xl border border-red-100 bg-red-50/50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center bg-gray-50/50 rounded-[28px] border border-gray-100 my-4 flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-red-50 text-[#D9383A] flex items-center justify-center">
                  <Filter className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-gray-800 font-bold text-base">No whitelisted staff emails found</p>
                  <p className="text-gray-400 text-xs max-w-sm">
                    Try adjusting your search query or role filter tab above to view other whitelisted users.
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: REGISTERED USERS DIRECTORY */}
      {mainTab === "directory" && (
        <div className="max-w-[1014px] bg-white rounded-[38px] border border-gray-100 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
            <div>
              <h2 className="text-2xl font-bold text-[#1A0D0C] tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" /> Registered System Users Directory
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Query and inspect all accounts registered on the IEDC Portal across students, faculty, and Execom
              </p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-80">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, dept..."
                  value={regSearchQuery}
                  onChange={(e) => setRegSearchQuery(e.target.value)}
                  className="w-full h-[42px] bg-gray-50/60 border border-gray-200 rounded-2xl pl-10 pr-4 text-xs text-[#1A0D0C] placeholder-gray-400 focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
                />
              </div>
              <button
                type="button"
                onClick={fetchRegisteredUsers}
                title="Refresh Registered Users"
                className="w-10 h-[42px] shrink-0 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
              >
                <RefreshCw className={cn("w-4 h-4", regLoading && "animate-spin text-purple-600")} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {REGISTERED_FILTER_ITEMS.map((item) => {
                const isActive = regActiveTab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setRegActiveTab(item.key)}
                    className={cn(
                      "inline-flex items-center justify-center px-4 py-1.5 rounded-[26.92px] border text-[12px] font-normal tracking-[-0.39px] whitespace-nowrap transition-all duration-200 cursor-pointer h-[34px]",
                      isActive
                        ? "bg-[#100A0A] border-[#A5A5A5] text-white shadow-sm"
                        : "bg-[#E2E2E2] border-[#A5A5A5] text-[#3C3C3C] hover:bg-gray-200"
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="text-xs font-semibold text-gray-500">
              Showing {filteredRegisteredUsers.length} of {registeredUsers.length} users
            </div>
          </div>

          {regLoading ? (
            <div className="space-y-3 pt-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-[24px] animate-pulse" />
              ))}
            </div>
          ) : filteredRegisteredUsers.length > 0 ? (
            <div className="space-y-3 pt-2">
              {filteredRegisteredUsers.map((user) => {
                const roleLabel = getRoleLabel(user.role);
                const badgeStyle = getRoleBadgeStyle(user.role);

                return (
                  <div
                    key={user.id}
                    className="p-4 sm:p-5 rounded-[24px] border border-gray-100 hover:border-gray-300 hover:bg-gray-50/60 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-[#100A0A] text-white flex items-center justify-center font-bold text-base shrink-0 group-hover:scale-105 transition-transform">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-[#1A0D0C] group-hover:text-[#D9383A] transition-colors truncate">
                            {user.name || "Unnamed User"}
                          </p>
                          <Badge
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] border tracking-tight",
                              badgeStyle
                            )}
                            variant="secondary"
                          >
                            {roleLabel}
                          </Badge>
                        </div>

                        <p className="text-xs text-gray-500 font-medium truncate">
                          {user.email}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap pt-0.5">
                          {user.studentDept && (
                            <span className="font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                              Dept: {user.studentDept} ({user.studentBatch || "N/A"})
                            </span>
                          )}
                          {user.studentAdmission && (
                            <span>Adm: #{user.studentAdmission}</span>
                          )}
                          {user.facultyDept && (
                            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              Faculty: {user.facultyDept}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-gray-100">
                      {isNodal && (
                        <button
                          type="button"
                          onClick={() => startRoleAssignment(user.email)}
                          className="px-3 py-1.5 rounded-full border border-amber-200/70 bg-amber-50/70 text-[11px] font-bold text-amber-700 hover:bg-amber-100 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Assign Role
                        </button>
                      )}

                      {user.studentPoints !== undefined && user.studentPoints !== null && (
                        <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/60 px-3 py-1 rounded-full text-xs font-bold text-amber-700">
                          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span>{user.studentPoints} Points</span>
                        </div>
                      )}

                      <div className="text-right text-[11px] text-gray-400">
                        <p>
                          Joined:{" "}
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                            : "N/A"}
                        </p>
                        {user.lastLogin && (
                          <p className="text-[10px] text-gray-400">
                            Active: {new Date(user.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center bg-gray-50/50 rounded-[28px] border border-gray-100 my-4 flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                <UserX className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-gray-800 font-bold text-base">No registered users match search</p>
                <p className="text-gray-400 text-xs max-w-sm">
                  Try adjusting your search query or role filter tab above to view other registered users.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ROLE ASSIGNMENT — Nodal Officer only */}
      {mainTab === "roles" && isNodal && (
        <>
          <div className="max-w-[1014px] bg-white rounded-[38px] border border-gray-100 p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#1A0D0C] tracking-tight">
                  Assign Role to a Portal Account
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Enter an email that already exists on the portal and grant it a new role. The change is written to the user record and applies on their next request.
                </p>
              </div>
            </div>

            <form onSubmit={submitRoleAssignment} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-5 space-y-2">
                  <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">
                    Registered Portal Email
                  </Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-4 top-3.5 text-gray-400 pointer-events-none" />
                    <Input
                      value={assignEmail}
                      onChange={(e) => setAssignEmail(e.target.value)}
                      list="portal-account-emails"
                      className="h-[50px] rounded-2xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm text-[#1A0D0C] transition-all pl-11 pr-4"
                      placeholder="member@sjcetpalai.ac.in"
                      type="email"
                      required
                    />
                    <datalist id="portal-account-emails">
                      {registeredUsers.map((u) => (
                        <option key={u.id} value={u.email}>
                          {u.name || "Unnamed"} — {getRoleLabel(u.role)}
                        </option>
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="md:col-span-4 space-y-2">
                  <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">
                    New Role
                  </Label>
                  <Select value={assignRole} onValueChange={setAssignRole}>
                    <SelectTrigger className="h-[50px] rounded-2xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-amber-500 text-sm text-[#1A0D0C] transition-all px-4 font-['Hanken_Grotesk'] font-sans">
                      <SelectValue placeholder="Select role to grant" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl max-h-72 font-['Hanken_Grotesk'] font-sans">
                      <SelectGroup>
                        <SelectLabel className="text-xs font-bold text-amber-600 px-3 py-1">
                          Governance
                        </SelectLabel>
                        {GOVERNANCE_ROLES_LIST.map((r) => (
                          <SelectItem key={r.value} value={r.value} className="rounded-xl cursor-pointer">
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-xs font-bold text-[#D9383A] px-3 py-1 mt-1">
                          C-Suite Chiefs
                        </SelectLabel>
                        {EXECOM_ROLES_LIST.filter((r) => r.category === "c-suite").map((r) => (
                          <SelectItem key={r.value} value={r.value} className="rounded-xl cursor-pointer">
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-xs font-bold text-purple-600 px-3 py-1 mt-1">
                          Executive Officers
                        </SelectLabel>
                        {EXECOM_ROLES_LIST.filter((r) => r.category === "officer").map((r) => (
                          <SelectItem key={r.value} value={r.value} className="rounded-xl cursor-pointer">
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-3">
                  <Button
                    type="submit"
                    disabled={assigning || !assignRole || !assignEmail}
                    suppressHydrationWarning
                    className="h-[50px] w-full rounded-[31px] bg-[#100A0A] hover:bg-[#2A2020] active:scale-98 text-white font-medium text-sm tracking-tight transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {assigning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                        <span>Assigning...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                        <span>Assign Role</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {assignEmail.trim() && (
                <div
                  className={cn(
                    "p-3 rounded-2xl border text-xs font-medium flex items-center gap-2",
                    assignTarget
                      ? "bg-gray-50 border-gray-200 text-gray-700"
                      : "bg-amber-50/70 border-amber-100 text-amber-700"
                  )}
                >
                  {assignTarget ? (
                    <>
                      <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {assignTarget.name || "Unnamed User"} is currently{" "}
                        <Badge
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] border align-middle",
                            getRoleBadgeStyle(assignTarget.role)
                          )}
                          variant="secondary"
                        >
                          {getRoleLabel(assignTarget.role)}
                        </Badge>
                      </span>
                    </>
                  ) : (
                    <>
                      <UserX className="w-4 h-4 shrink-0" />
                      <span>
                        No portal account matches this email yet. The user must sign in once before a role can be assigned.
                      </span>
                    </>
                  )}
                </div>
              )}

              {assignError && (
                <div className="p-3 rounded-2xl bg-red-50 border border-red-100 text-xs font-medium text-red-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                  {assignError}
                </div>
              )}

              {assignSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-xs font-medium text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  {assignSuccess}
                </div>
              )}
            </form>
          </div>

          {/* Current governance roster */}
          <div className="max-w-[1014px] bg-white rounded-[38px] border border-gray-100 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <h2 className="text-2xl font-bold text-[#1A0D0C] tracking-tight flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-600" /> Current Governance Roster
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Every account holding a role above Student. Reassign any of them in one click.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchRegisteredUsers}
                title="Refresh Roster"
                className="w-10 h-[42px] shrink-0 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
              >
                <RefreshCw className={cn("w-4 h-4", regLoading && "animate-spin text-amber-600")} />
              </button>
            </div>

            {regLoading ? (
              <div className="space-y-3 pt-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-[24px] animate-pulse" />
                ))}
              </div>
            ) : governanceUsers.length > 0 ? (
              <div className="space-y-3 pt-2">
                {governanceUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 sm:p-5 rounded-[24px] border border-gray-100/90 hover:border-gray-300 hover:bg-gray-50/60 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-sm group-hover:bg-[#100A0A] group-hover:text-white transition-colors shrink-0">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-sm font-bold text-[#1A0D0C] truncate">
                          {user.name || "Unnamed User"}
                        </p>
                        <p className="text-xs text-gray-500 font-medium truncate">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <Badge
                        className={cn(
                          "px-3.5 py-1 rounded-full text-xs border shadow-2xs tracking-tight flex items-center gap-1.5",
                          getRoleBadgeStyle(user.role)
                        )}
                        variant="secondary"
                      >
                        <Sparkles className="w-3 h-3 opacity-70" />
                        <span>{getRoleLabel(user.role)}</span>
                      </Badge>

                      <button
                        type="button"
                        onClick={() => startRoleAssignment(user.email)}
                        className="px-3.5 h-9 rounded-xl border border-amber-200/70 bg-amber-50/70 text-[11px] font-bold text-amber-700 hover:bg-amber-100 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Change
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center bg-gray-50/50 rounded-[28px] border border-gray-100 my-4 flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                  <UserX className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-gray-800 font-bold text-base">No elevated accounts yet</p>
                  <p className="text-gray-400 text-xs max-w-sm">
                    Every registered account is still a Student. Assign a role above to build the leadership roster.
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Footer Branding */}
      <div className="max-w-[1014px] pt-12 flex justify-end">
        <p className="w-[242px] h-[26px] text-[#AAA] text-right font-['Hanken_Grotesk'] text-[16px] font-normal leading-[94.331%] tracking-[-0.48px]">
          IEDC 2026 SJCET - TECH TEAM
        </p>
      </div>
    </div>
  );
}