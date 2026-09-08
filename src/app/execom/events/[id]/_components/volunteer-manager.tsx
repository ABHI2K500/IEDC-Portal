"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Mail,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";

export interface EventVolunteer {
  registrationId: string;
  studentId: string;
  name: string;
  email: string;
  iecdId: string;
  department: string;
  batch: string;
  addedAt: string | null;
}

interface VolunteerManagerProps {
  eventId: string;
  /** Notified whenever the roster changes, so the page can refresh counts. */
  onVolunteersChanged?: (volunteers: EventVolunteer[]) => void;
}

export function VolunteerManager({
  eventId,
  onVolunteersChanged,
}: VolunteerManagerProps) {
  const [volunteers, setVolunteers] = useState<EventVolunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const applyRoster = useCallback(
    (list: EventVolunteer[]) => {
      setVolunteers(list);
      onVolunteersChanged?.(list);
    },
    [onVolunteersChanged]
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchVolunteers() {
      try {
        const res = await fetch(`/api/events/${eventId}/volunteers`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setVolunteers(data.volunteers || []);
        }
      } catch (error) {
        console.error("Failed to fetch volunteers:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchVolunteers();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const addVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setAdding(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/events/${eventId}/volunteers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();

      if (res.ok) {
        applyRoster(data.volunteers || []);
        setEmail("");
        setFeedback({ type: "success", text: data.message || "Volunteer added" });
      } else {
        setFeedback({ type: "error", text: data.error || "Failed to add volunteer" });
      }
    } catch {
      setFeedback({ type: "error", text: "Something went wrong" });
    } finally {
      setAdding(false);
    }
  };

  const removeVolunteer = async (volunteer: EventVolunteer) => {
    if (
      !window.confirm(
        `Remove ${volunteer.name} as a volunteer? Their registration for this event is removed and they lose scanner and analytics access. Already-awarded volunteer points are kept.`
      )
    ) {
      return;
    }

    setRemovingId(volunteer.studentId);
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/events/${eventId}/volunteers?studentId=${encodeURIComponent(volunteer.studentId)}`,
        { method: "DELETE" }
      );
      const data = await res.json();

      if (res.ok) {
        applyRoster(data.volunteers || []);
        setFeedback({ type: "success", text: `${volunteer.name} removed` });
      } else {
        setFeedback({ type: "error", text: data.error || "Failed to remove volunteer" });
      }
    } catch {
      setFeedback({ type: "error", text: "Something went wrong" });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="bg-white rounded-[32px] border border-gray-100/80 p-8 shadow-sm font-['Hanken_Grotesk'] text-[#1A0D0C] space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#1A0D0C]">Event Volunteers</h3>
          <p className="text-xs font-medium text-gray-400">
            Grant a registered student scanner and analytics access for this event only.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-2xl px-4 py-3 text-xs font-semibold border ${feedback.type === "success"
            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
            : "bg-red-50 text-red-600 border-red-100"
            }`}
        >
          {feedback.text}
        </div>
      )}

      <form onSubmit={addVolunteer} className="space-y-2">
        <Label
          htmlFor="volunteerEmail"
          className="text-xs font-bold text-gray-500 uppercase tracking-wider"
        >
          Volunteer Email
        </Label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              id="volunteerEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@cs.sjcetpalai.ac.in"
              autoComplete="off"
              className="pl-10 h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-sm"
            />
          </div>
          <Button
            type="submit"
            disabled={adding || !email.trim()}
            className="h-11 px-7 rounded-full bg-[#100A0A] hover:bg-[#2A2020] text-white text-xs font-bold cursor-pointer shadow-sm active:scale-98 transition-all flex items-center gap-2 shrink-0"
          >
            {adding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span>Add Volunteer</span>
          </Button>
        </div>
        <p className="text-[11px] text-gray-400 font-medium">
          The person must already have signed in to the portal and completed onboarding.
        </p>
      </form>

      <div className="space-y-3 pt-2 border-t border-gray-100">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
          Assigned Volunteers ({volunteers.length})
        </p>

        {loading ? (
          <div className="h-16 bg-gray-100/70 rounded-2xl animate-pulse" />
        ) : volunteers.length === 0 ? (
          <div className="p-6 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <p className="text-gray-400 text-xs font-medium">
              No volunteers assigned yet. Add one using the email field above.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {volunteers.map((volunteer) => (
              <li
                key={volunteer.studentId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-bold text-[#1A0D0C] truncate">
                    {volunteer.name}
                  </p>
                  <p className="text-[11px] font-medium text-gray-500 truncate">
                    {volunteer.email}
                  </p>
                  <p className="text-[11px] font-medium text-gray-400">
                    <span className="font-mono">{volunteer.iecdId}</span> •{" "}
                    {volunteer.department} ({volunteer.batch})
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => removeVolunteer(volunteer)}
                  disabled={removingId === volunteer.studentId}
                  className="h-9 px-4 rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 text-xs font-bold cursor-pointer shrink-0 self-start sm:self-auto flex items-center gap-1.5"
                >
                  {removingId === volunteer.studentId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Remove</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}