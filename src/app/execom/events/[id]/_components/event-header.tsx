"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Users, TrendingUp, UserCheck, QrCode } from "lucide-react";
import Link from "next/link";
import { EventDetail } from "../types";
import { useAdminSection } from "@/lib/admin-section";

interface EventHeaderProps {
  event: EventDetail;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  published: "bg-blue-50 text-blue-700 border-blue-200",
  ongoing: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-purple-50 text-purple-700 border-purple-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

export function EventHeader({ event }: EventHeaderProps) {
  const { base } = useAdminSection();
  const start = new Date(event.startDatetime);
  const end = new Date(event.endDatetime);

  return (
    <div className="space-y-6 font-['Hanken_Grotesk'] text-[#1A0D0C]">
      {/* Event Poster Banner */}
      {event.posterUrl && (
        <div className="w-full rounded-[32px] border border-gray-100/80 overflow-hidden bg-[#100A0A] max-h-96 flex items-center justify-center shadow-sm relative group">
          <img
            src={event.posterUrl}
            alt="Event Poster"
            className="w-full object-contain max-h-96"
          />
        </div>
      )}

      {/* Main Event Info Card */}
      <div className="bg-white rounded-[32px] border border-gray-100/80 p-8 md:p-10 shadow-sm relative overflow-hidden space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="px-3.5 py-1 rounded-full bg-red-50 text-[#D9383A] text-xs font-bold uppercase tracking-wider inline-block">
              {event.eventType.replace("_", " ")}
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#1A0D0C] tracking-tight leading-tight">
              {event.title}
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            <span
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase border shadow-xs ${statusColors[event.status || "draft"]
                }`}
            >
              {event.status}
            </span>
            <Link href={`${base}/events/${event.id}/scan`}>
              <Button size="sm" className="h-[42px] px-5 rounded-full bg-[#100A0A] text-white hover:bg-[#2A2020] text-xs font-semibold cursor-pointer shadow-sm transition-all flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                Scan QR
              </Button>
            </Link>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50/60 rounded-[20px] p-4 border border-gray-100/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#D9383A] flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Date</p>
              <p className="text-xs font-bold text-[#1A0D0C]">
                {start.toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="bg-gray-50/60 rounded-[20px] p-4 border border-gray-100/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Time</p>
              <p className="text-xs font-bold text-[#1A0D0C]">
                {start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} – {end.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>

          {event.venue && (
            <div className="bg-gray-50/60 rounded-[20px] p-4 border border-gray-100/80 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Venue</p>
                <p className="text-xs font-bold text-[#1A0D0C] truncate max-w-[140px]">{event.venue}</p>
              </div>
            </div>
          )}

          <div className="bg-gray-50/60 rounded-[20px] p-4 border border-gray-100/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Registrations</p>
              <p className="text-xs font-bold text-[#1A0D0C]">
                {event.registrationCount} {event.registrationLimit ? `/ ${event.registrationLimit}` : "registered"}
              </p>
            </div>
          </div>
        </div>

        {/* Points & Attendance Pills */}
        <div className="flex flex-wrap gap-3 pt-2">
          <div className="flex items-center gap-2 bg-emerald-50/80 border border-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-xs font-bold shadow-xs">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>+{event.participationPoints} pts (Participant)</span>
          </div>
          <div className="flex items-center gap-2 bg-blue-50/80 border border-blue-100 text-blue-700 px-4 py-2 rounded-full text-xs font-bold shadow-xs">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>+{event.volunteerPoints} pts (Volunteer)</span>
          </div>
          <div className="flex items-center gap-2 bg-purple-50/80 border border-purple-100 text-purple-700 px-4 py-2 rounded-full text-xs font-bold shadow-xs">
            <UserCheck className="w-4 h-4 text-purple-600" />
            <span>{event.attendanceCount} Attended</span>
          </div>
        </div>

        {/* Description Section */}
        {event.description && (
          <div className="pt-6 border-t border-gray-100 space-y-2">
            <h3 className="text-sm font-bold text-[#1A0D0C] uppercase tracking-wider">About This Event</h3>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {event.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}