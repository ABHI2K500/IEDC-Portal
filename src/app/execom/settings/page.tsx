"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Plus,
  Edit3,
  Trash2,
  Save,
  Loader2,
  Shield,
  Users,
  Trophy,
  Wrench,
  Zap,
  Sparkles,
  RefreshCw,
  Award,
} from "lucide-react";
import type { BadgeCriteria } from "@/lib/points";
import { cn } from "@/lib/utils";
import { useAdminSection } from "@/lib/admin-section";

// TYPES

interface BadgeData {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  criteria: BadgeCriteria;
  isActive?: boolean;
  earnedCount?: number;
}

type CriteriaType = BadgeCriteria["type"];

const CRITERIA_TYPE_OPTIONS: Array<{
  value: CriteriaType;
  label: string;
  icon: typeof Trophy;
  valueLabel: string;
}> = [
    { value: "points", label: "Points Threshold", icon: Trophy, valueLabel: "Min Points" },
    { value: "event_count", label: "Events Attended", icon: Sparkles, valueLabel: "Min Events" },
    { value: "project_count", label: "Approved Projects", icon: Wrench, valueLabel: "Min Projects" },
    { value: "volunteer_count", label: "Times Volunteered", icon: Users, valueLabel: "Min Volunteered" },
    { value: "streak", label: "Event Streak", icon: Zap, valueLabel: "Min Streak" },
  ];

const EMOJI_PRESETS = [
  "🌱", "⭐", "💡", "🔥", "👑", "👣", "🧭", "🎯", "🏆", "🛠️",
  "🏗️", "🚀", "🤝", "🏛️", "💎", "📈", "⚡", "🏅", "🎖️", "🥇",
];

function BadgeForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: BadgeData;
  onSave: (data: {
    name: string;
    description: string;
    icon: string;
    criteria: BadgeCriteria;
  }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [icon, setIcon] = useState(initial?.icon || "🏅");
  const [criteriaType, setCriteriaType] = useState<CriteriaType>(
    initial?.criteria?.type || "points"
  );
  const [criteriaValue, setCriteriaValue] = useState<number>(() => {
    if (!initial?.criteria) return 100;
    if (initial.criteria.type === "points") return initial.criteria.threshold;
    return initial.criteria.min;
  });

  function buildCriteria(): BadgeCriteria {
    if (criteriaType === "points") {
      return { type: "points", threshold: criteriaValue };
    }
    return { type: criteriaType, min: criteriaValue } as BadgeCriteria;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      icon,
      criteria: buildCriteria(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-gray-50/70 border border-gray-100 rounded-[28px] p-6">
      <div className="flex items-center justify-between border-b border-gray-200/60 pb-3">
        <h3 className="text-base font-bold text-[#1A0D0C] flex items-center gap-2">
          <Award className="w-4 h-4 text-[#D9383A]" />
          <span>{initial ? `Editing "${initial.name}" Badge` : "Create New Gamification Badge"}</span>
        </h3>
        <span className="text-xs text-gray-400">Specify criteria and reward details</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
        <div className="sm:col-span-9 space-y-1.5">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">
            Badge Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Innovation Maverick"
            className="w-full h-[46px] px-4 text-sm font-medium rounded-2xl border border-gray-200 focus:border-[#D9383A] outline-none transition-all bg-white text-[#1A0D0C]"
            required
            minLength={2}
          />
        </div>
        <div className="sm:col-span-3 space-y-1.5">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">
            Selected Icon
          </label>
          <div className="w-full h-[46px] rounded-2xl border border-gray-200 flex items-center justify-center text-2xl bg-white shadow-2xs">
            {icon}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">
          Preset Icons
        </label>
        <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-2xl border border-gray-200/70">
          {EMOJI_PRESETS.map((emoji) => (
            <button
              type="button"
              key={emoji}
              onClick={() => setIcon(emoji)}
              className={cn(
                "w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer",
                icon === emoji
                  ? "bg-[#100A0A] text-white scale-110 shadow-md"
                  : "bg-gray-50 hover:bg-gray-100"
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">
          Badge Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of how students unlock this badge..."
          rows={2}
          className="w-full p-3 text-sm rounded-2xl border border-gray-200 focus:border-[#D9383A] outline-none transition-all bg-white resize-none text-[#1A0D0C]"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">
          Unlock Criteria Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CRITERIA_TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = criteriaType === opt.value;
            return (
              <button
                type="button"
                key={opt.value}
                onClick={() => setCriteriaType(opt.value)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border",
                  isSelected
                    ? "bg-[#100A0A] border-[#100A0A] text-white shadow-sm"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isSelected ? "text-[#D9383A]" : "text-gray-400")} />
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">
          {CRITERIA_TYPE_OPTIONS.find((o) => o.value === criteriaType)?.valueLabel || "Target Value"}
        </label>
        <input
          type="number"
          min={1}
          value={criteriaValue}
          onChange={(e) => setCriteriaValue(parseInt(e.target.value) || 1)}
          className="w-full h-[46px] px-4 text-sm font-medium rounded-2xl border border-gray-200 focus:border-[#D9383A] outline-none transition-all bg-white text-[#1A0D0C]"
          required
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-[44px] px-6 text-gray-600 bg-white border border-gray-200 rounded-[31px] text-xs font-medium hover:bg-gray-100 transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || name.trim().length < 2}
          suppressHydrationWarning
          className="h-[44px] flex items-center gap-2 px-6 bg-[#100A0A] hover:bg-[#2A2020] active:scale-98 text-white rounded-[31px] text-xs font-medium transition-all cursor-pointer shadow-sm disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D9383A]" />
          ) : (
            <Save className="w-3.5 h-3.5 text-[#D9383A]" />
          )}
          <span>{initial ? "Save Badge Changes" : "Create Badge"}</span>
        </button>
      </div>
    </form>
  );
}

function getCriteriaLabel(criteria: BadgeCriteria): string {
  switch (criteria.type) {
    case "points":
      return `${criteria.threshold}+ pts`;
    case "event_count":
      return `${criteria.min}+ events`;
    case "project_count":
      return `${criteria.min}+ projects`;
    case "volunteer_count":
      return `${criteria.min}+ volunteered`;
    case "streak":
      return `${criteria.min}+ streak`;
    default:
      return "Custom";
  }
}

function getBadgePoints(criteria: BadgeCriteria): number {
  if (!criteria) return 0;
  switch (criteria.type) {
    case "points":
      return criteria.threshold ?? 0;
    case "event_count":
      return (criteria.min ?? 0) * 10;
    case "project_count":
      return (criteria.min ?? 0) * 25;
    case "volunteer_count":
      return (criteria.min ?? 0) * 20;
    case "streak":
      return (criteria.min ?? 0) * 10;
    default:
      return 0;
  }
}

export default function ExecomSettingsPage() {
  const { workspaceLabel } = useAdminSection();
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBadge, setEditingBadge] = useState<BadgeData | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchBadges();
  }, []);

  async function fetchBadges() {
    try {
      setLoading(true);
      const res = await fetch("/api/badges");
      if (res.ok) {
        const data = await res.json();
        const loaded: BadgeData[] = data.badges || [];
        loaded.sort(
          (a, b) =>
            getBadgePoints(a.criteria) - getBadgePoints(b.criteria) ||
            a.name.localeCompare(b.name)
        );
        setBadges(loaded);
      }
    } catch (e) {
      console.error("Failed to load badges", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data: {
    name: string;
    description: string;
    icon: string;
    criteria: BadgeCriteria;
  }) {
    setSaving(true);
    try {
      const res = await fetch("/api/badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setShowForm(false);
        await fetchBadges();
      }
    } catch (e) {
      console.error("Create failed", e);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(data: {
    name: string;
    description: string;
    icon: string;
    criteria: BadgeCriteria;
  }) {
    if (!editingBadge) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/badges/${editingBadge.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setEditingBadge(null);
        await fetchBadges();
      }
    } catch (e) {
      console.error("Update failed", e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: string) {
    try {
      const res = await fetch(`/api/badges/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchBadges();
      }
    } catch (e) {
      console.error("Deactivate failed", e);
    }
  }

  async function handleSeedBadges() {
    setSeeding(true);
    try {
      const res = await fetch("/api/badges/seed", { method: "POST" });
      if (res.ok) {
        await fetchBadges();
      }
    } catch (e) {
      console.error("Seed failed", e);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="w-full space-y-6 font-['Hanken_Grotesk'] text-[#1A0D0C] pb-16">
      <div className="w-full max-w-[1014px] min-h-[200px] rounded-[38px] bg-white p-8 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden shadow-sm border border-gray-100/80 my-8 gap-6 group">
        <div className="z-10 max-w-xl space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-0.5 rounded-full bg-[#D9383A]/10 text-[#D9383A] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5" /> {workspaceLabel}
            </span>
          </div>
          <h1 className="text-[36px] md:text-[46px] font-semibold text-[#1A0D0C] tracking-[-1.38px] leading-tight">
            Portal Configuration & Badges
          </h1>
          <p className="text-[16px] md:text-[20px] font-semibold text-[#B0B0B0] tracking-[-0.6px] leading-snug">
            Configure gamification badges, point rules, and portal management parameters.
          </p>
        </div>

        <div className="z-10 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setEditingBadge(null);
            }}
            className="flex items-center justify-center h-[52px] px-7 gap-2.5 rounded-[31px] bg-[#100A0A] text-white text-[15px] font-normal tracking-[-0.5px] shadow-sm hover:bg-[#2A2020] active:scale-98 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-[#D9383A]" />
            <span>Create New Badge</span>
          </button>
        </div>

        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#D9383A]/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="max-w-[1014px] bg-white rounded-[38px] border border-gray-100 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#D9383A] flex items-center justify-center font-bold shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#1A0D0C] tracking-tight">
                Gamification Badges Management
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {badges.length} active badge{badges.length !== 1 ? "s" : ""} configured across all criteria types
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {badges.length === 0 && (
              <button
                type="button"
                onClick={handleSeedBadges}
                disabled={seeding}
                suppressHydrationWarning
                className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-[31px] text-xs font-bold hover:bg-amber-100 transition-all cursor-pointer disabled:opacity-50"
              >
                {seeding ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span>Seed Defaults (17 Badges)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setShowForm(true);
                setEditingBadge(null);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#100A0A] text-white rounded-[31px] text-xs font-medium hover:bg-[#2A2020] transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#D9383A]" />
              <span>New Badge</span>
            </button>
          </div>
        </div>

        {showForm && (
          <div className="pt-2">
            <BadgeForm
              onSave={handleCreate}
              onCancel={() => setShowForm(false)}
              saving={saving}
            />
          </div>
        )}

        {loading ? (
          <div className="space-y-3 pt-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-[24px] animate-pulse" />
            ))}
          </div>
        ) : badges.length === 0 ? (
          <div className="p-12 text-center bg-gray-50/50 rounded-[28px] border border-gray-100 my-4 flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-red-50 text-[#D9383A] flex items-center justify-center">
              <Shield className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <p className="text-gray-800 font-bold text-base">No badges created yet</p>
              <p className="text-gray-400 text-xs max-w-sm">
                Click &quot;Seed Defaults&quot; above to auto-populate 17 starter badges or create a custom badge.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {badges.map((badge) => {
              const isEditing = editingBadge?.id === badge.id;
              return (
                <div key={badge.id} className="space-y-3">
                  <div
                    className={cn(
                      "p-4 sm:p-5 rounded-[24px] border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group",
                      isEditing
                        ? "border-[#D9383A] bg-red-50/20 shadow-sm ring-1 ring-[#D9383A]/30"
                        : "border-gray-100/90 hover:border-gray-300 hover:bg-gray-50/60"
                    )}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50/70 border border-amber-100 text-2xl flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        {badge.icon || "🏅"}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-base font-bold text-[#1A0D0C] group-hover:text-[#D9383A] transition-colors truncate">
                            {badge.name}
                          </span>
                          <span className="text-[11px] font-semibold px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                            {getCriteriaLabel(badge.criteria)}
                          </span>
                        </div>
                        {badge.description && (
                          <p className="text-xs text-gray-500 font-medium truncate max-w-xl">
                            {badge.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                      {badge.earnedCount !== undefined && (
                        <div className="text-right px-3 py-1 bg-gray-50 rounded-2xl border border-gray-100">
                          <span className="text-xs font-black text-[#1A0D0C] block">
                            {badge.earnedCount}
                          </span>
                          <span className="text-[9px] text-gray-400 uppercase font-semibold">earned</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setShowForm(false);
                            setEditingBadge((prev) => (prev?.id === badge.id ? null : badge));
                          }}
                          className={cn(
                            "w-9 h-9 rounded-2xl flex items-center justify-center transition-all cursor-pointer",
                            isEditing
                              ? "bg-[#D9383A] text-white shadow-xs"
                              : "bg-gray-100 text-gray-600 hover:bg-[#100A0A] hover:text-white"
                          )}
                          title={isEditing ? "Close edit" : "Edit badge"}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditing) setEditingBadge(null);
                            handleDeactivate(badge.id);
                          }}
                          className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all cursor-pointer"
                          title="Deactivate badge"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="pt-1 pb-2 pl-2 sm:pl-4 border-l-2 border-[#D9383A] animate-in fade-in-50 slide-in-from-top-2 duration-200">
                      <BadgeForm
                        initial={badge}
                        onSave={handleUpdate}
                        onCancel={() => setEditingBadge(null)}
                        saving={saving}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="max-w-[1014px] bg-white rounded-[38px] border border-gray-100 p-8 sm:p-10 shadow-sm text-center space-y-3 relative overflow-hidden">
        <div className="w-14 h-14 rounded-full bg-gray-50 text-gray-500 flex items-center justify-center mx-auto mb-2">
          <Settings className="w-7 h-7 text-[#D9383A]" />
        </div>
        <h3 className="text-xl font-bold text-[#1A0D0C]">
          Point Criteria &amp; Automated Rules
        </h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
          Platform-wide point allocation rules for event check-ins, volunteers, coordinators, and hackathon submissions are active and managed dynamically.
        </p>
      </div>

      <div className="max-w-[1014px] pt-12 flex justify-end">
        <p className="w-[242px] h-[26px] text-[#AAA] text-right font-['Hanken_Grotesk'] text-[16px] font-normal leading-[94.331%] tracking-[-0.48px]">
          IEDC 2026 SJCET - TECH TEAM
        </p>
      </div>
    </div>
  );
}