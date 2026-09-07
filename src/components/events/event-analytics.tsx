"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Building2,
  Clock,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

interface Breakdown {
  registered: number;
  attended: number;
}

interface DepartmentRow extends Breakdown {
  department: string;
}

interface BatchRow extends Breakdown {
  batch: string;
}

interface RecentScan {
  studentId: string;
  name: string;
  iecdId: string;
  department: string;
  scannedAt: string | null;
}

interface EventAnalyticsData {
  totals: {
    registrations: number;
    participants: number;
    volunteers: number;
    attended: number;
    notAttended: number;
    turnoutRate: number;
    capacityUsed: number | null;
  };
  departmentBreakdown: DepartmentRow[];
  batchBreakdown: BatchRow[];
  recentScans: RecentScan[];
}

interface EventAnalyticsProps {
  eventId: string;
  /** Shown as a hint under the heading, e.g. for volunteers. */
  subtitle?: string;
}

async function fetchEventAnalytics(
  eventId: string
): Promise<{ data: EventAnalyticsData | null; error: string }> {
  try {
    const res = await fetch(`/api/events/${eventId}/analytics`);
    if (res.ok) {
      return { data: (await res.json()) as EventAnalyticsData, error: "" };
    }
    const payload = await res.json().catch(() => ({}));
    return { data: null, error: payload.error || "Failed to load event analytics" };
  } catch {
    return { data: null, error: "Failed to load event analytics" };
  }
}

function formatScanTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EventAnalytics({ eventId, subtitle }: EventAnalyticsProps) {
  const [data, setData] = useState<EventAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await fetchEventAnalytics(eventId);
      if (cancelled) return;
      setData(result.data);
      setError(result.error);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    const result = await fetchEventAnalytics(eventId);
    setData(result.data);
    setError(result.error);
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-[32px] border border-gray-100/80 p-8 shadow-sm font-['Hanken_Grotesk'] space-y-4">
        <div className="h-6 bg-gray-200/60 rounded-full w-48 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-200/60 rounded-[24px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-[32px] border border-gray-100/80 p-8 shadow-sm font-['Hanken_Grotesk'] space-y-3">
        <h3 className="text-lg font-bold text-[#1A0D0C]">Event Analytics</h3>
        <p className="text-xs font-medium text-gray-400">
          {error || "No analytics available for this event yet."}
        </p>
      </div>
    );
  }

  const { totals, departmentBreakdown, batchBreakdown, recentScans } = data;
  const maxDept = Math.max(1, ...departmentBreakdown.map((d) => d.registered));

  const tiles = [
    {
      label: "Registrations",
      value: totals.registrations,
      hint:
        totals.capacityUsed !== null
          ? `${totals.capacityUsed}% of capacity`
          : `${totals.participants} participants`,
      icon: <Users className="w-5 h-5" />,
      iconClass: "bg-blue-50 text-blue-600",
      hintClass: "text-blue-600",
    },
    {
      label: "Attended",
      value: totals.attended,
      hint: `${totals.notAttended} not marked`,
      icon: <UserCheck className="w-5 h-5" />,
      iconClass: "bg-emerald-50 text-emerald-600",
      hintClass: "text-emerald-600",
    },
    {
      label: "Turnout Rate",
      value: `${totals.turnoutRate}%`,
      hint: "Verified QR scans",
      icon: <TrendingUp className="w-5 h-5" />,
      iconClass: "bg-amber-50 text-amber-600",
      hintClass: "text-amber-600",
    },
    {
      label: "Volunteers",
      value: totals.volunteers,
      hint: "With scanner access",
      icon: <ShieldCheck className="w-5 h-5" />,
      iconClass: "bg-purple-50 text-purple-600",
      hintClass: "text-purple-600",
    },
  ];

  return (
    <div className="bg-white rounded-[32px] border border-gray-100/80 p-8 shadow-sm font-['Hanken_Grotesk'] text-[#1A0D0C] space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#D9383A] flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1A0D0C]">Event Analytics</h3>
            <p className="text-xs font-medium text-gray-400">
              {subtitle || "Live registration and attendance breakdown for this event."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-9 px-4 rounded-full bg-gray-50 border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 hover:text-[#100A0A] transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto shrink-0"
        >
          {refreshing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          <span>Refresh</span>
        </button>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="bg-gray-50/60 rounded-[24px] p-5 border border-gray-100/80 space-y-3"
          >
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${tile.iconClass}`}
            >
              {tile.icon}
            </div>
            <div>
              <p className="text-3xl font-extrabold text-[#1A0D0C] tracking-tight tabular-nums">
                {tile.value}
              </p>
              <p className="text-xs font-bold text-gray-500">{tile.label}</p>
              <p className={`text-[11px] font-semibold mt-0.5 ${tile.hintClass}`}>
                {tile.hint}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Department breakdown */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              By Department
            </p>
          </div>

          {departmentBreakdown.length === 0 ? (
            <div className="p-5 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-xs font-medium">
                No registrations recorded yet.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {departmentBreakdown.map((row) => (
                <li key={row.department} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-[#1A0D0C]">{row.department}</span>
                    <span className="text-gray-400 tabular-nums">
                      {row.attended}/{row.registered} attended
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#D9383A]/70"
                      style={{ width: `${(row.registered / maxDept) * 100}%` }}
                    >
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{
                          width: `${row.registered > 0 ? (row.attended / row.registered) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {batchBreakdown.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {batchBreakdown.map((row) => (
                <span
                  key={row.batch}
                  className="px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-[11px] font-bold text-gray-600"
                >
                  {row.batch}: {row.attended}/{row.registered}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Recent check-ins */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Latest Check-ins
            </p>
          </div>

          {recentScans.length === 0 ? (
            <div className="p-5 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-xs font-medium">
                No QR scans recorded yet.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {recentScans.map((scan) => (
                <li
                  key={`${scan.studentId}-${scan.scannedAt}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#1A0D0C] truncate">
                      {scan.name}
                    </p>
                    <p className="text-[11px] font-medium text-gray-400 truncate">
                      <span className="font-mono">{scan.iecdId}</span> • {scan.department}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 shrink-0 tabular-nums">
                    {formatScanTime(scan.scannedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}