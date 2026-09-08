"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileDown, FileText, Users, Loader2, Search, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Registration {
  id: string;
  role: string;
  registeredAt: string;
  student: {
    id: string;
    name: string;
    department: string;
    batch: string;
    iecdId: string;
    admissionNumber?: string;
    phone?: string | null;
  };
  attended: boolean;
}

export interface EventRegistrationsTableProps {
  eventId: string;
  eventTitle?: string;
  eventType?: string;
  venue?: string | null;
  startDatetime?: string;
  initialRegistrations?: Registration[];
  /** Volunteers may read the roster but not export it. */
  canExport?: boolean;
}

export function EventRegistrationsTable({
  eventId,
  eventTitle = "Event",
  eventType = "Event",
  venue,
  startDatetime,
  initialRegistrations,
  canExport = true,
}: EventRegistrationsTableProps) {
  const [registrations, setRegistrations] = useState<Registration[]>(
    initialRegistrations || []
  );
  const [loading, setLoading] = useState(!initialRegistrations);
  const [downloading, setDownloading] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "attended" | "registered">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchRegistrations() {
      try {
        const res = await fetch(`/api/events/${eventId}/registrations`);
        if (res.ok) {
          const data = await res.json();
          setRegistrations(data.registrations || []);
        }
      } catch (error) {
        console.error("Failed to fetch registrations:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRegistrations();
  }, [eventId]);

  const totalCount = registrations.length;
  const attendedCount = registrations.filter((r) => r.attended).length;
  const pendingCount = totalCount - attendedCount;

  const filteredRegistrations = registrations.filter((reg) => {
    const matchesFilter =
      statusFilter === "all"
        ? true
        : statusFilter === "attended"
        ? reg.attended
        : !reg.attended;

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      reg.student.name.toLowerCase().includes(query) ||
      reg.student.department.toLowerCase().includes(query) ||
      reg.student.iecdId.toLowerCase().includes(query) ||
      reg.student.batch.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  const downloadPDF = async () => {
    const exportList = filteredRegistrations;
    if (exportList.length === 0) return;
    setDownloading(true);
    try {
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([600, 800]);
      const { height } = page.getSize();

      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const drawHeader = (p: typeof page) => {
        p.drawText(eventTitle, {
          x: 50,
          y: height - 60,
          size: 18,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.18),
        });

        const filterSuffix =
          statusFilter === "attended"
            ? " [Attended Only]"
            : statusFilter === "registered"
            ? " [Not Marked Only]"
            : "";

        const eventInfo = `Type: ${eventType.replace("_", " ").toUpperCase()}   |   Venue: ${venue || "N/A"}${filterSuffix}`;
        p.drawText(eventInfo, {
          x: 50,
          y: height - 80,
          size: 9,
          font: fontRegular,
          color: rgb(0.4, 0.4, 0.4),
        });

        const dateFormatted = startDatetime
          ? `Date: ${new Date(startDatetime).toLocaleDateString("en-IN")}   |   Time: ${new Date(startDatetime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
          : "";
        if (dateFormatted) {
          p.drawText(dateFormatted, {
            x: 50,
            y: height - 95,
            size: 9,
            font: fontRegular,
            color: rgb(0.4, 0.4, 0.4),
          });
        }

        p.drawText("Registered Attendees List", {
          x: 50,
          y: height - 130,
          size: 12,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.18),
        });

        const tableTop = height - 150;
        p.drawLine({
          start: { x: 50, y: tableTop },
          end: { x: 550, y: tableTop },
          thickness: 1,
          color: rgb(0.8, 0.8, 0.8),
        });

        const headers = ["Name", "Department", "Batch", "Status"];
        const colWidths = [180, 110, 100, 110];
        const startX = 50;

        let currentX = startX;
        for (let i = 0; i < headers.length; i++) {
          p.drawText(headers[i], {
            x: currentX,
            y: tableTop - 12,
            size: 9,
            font: fontBold,
            color: rgb(0.2, 0.2, 0.2),
          });
          currentX += colWidths[i];
        }

        p.drawLine({
          start: { x: 50, y: tableTop - 20 },
          end: { x: 550, y: tableTop - 20 },
          thickness: 1,
          color: rgb(0.8, 0.8, 0.8),
        });
      };

      drawHeader(page);

      const colWidths = [180, 110, 100, 110];
      const startX = 50;
      let currentY = height - 190;

      for (let index = 0; index < exportList.length; index++) {
        const reg = exportList[index];

        if (currentY < 50) {
          page = pdfDoc.addPage([600, 800]);
          drawHeader(page);
          currentY = height - 190;
        }

        let currentX = startX;

        // Name
        page.drawText(reg.student.name, {
          x: currentX,
          y: currentY,
          size: 9,
          font: fontRegular,
          color: rgb(0.1, 0.1, 0.1),
        });
        currentX += colWidths[0];

        // Dept
        page.drawText(reg.student.department, {
          x: currentX,
          y: currentY,
          size: 9,
          font: fontRegular,
          color: rgb(0.3, 0.3, 0.3),
        });
        currentX += colWidths[1];

        // Batch
        page.drawText(reg.student.batch, {
          x: currentX,
          y: currentY,
          size: 9,
          font: fontRegular,
          color: rgb(0.3, 0.3, 0.3),
        });
        currentX += colWidths[2];

        // Status
        const statusText = reg.attended ? "Attended" : "Registered";
        page.drawText(statusText, {
          x: currentX,
          y: currentY,
          size: 9,
          font: fontBold,
          color: reg.attended ? rgb(0.1, 0.6, 0.2) : rgb(0.5, 0.5, 0.5),
        });

        currentY -= 20;
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], {
        type: "application/pdf",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${eventTitle.replace(/\s+/g, "_")}_${statusFilter}_Attendance.pdf`;
      link.click();
    } catch (e) {
      console.error("PDF generation failed:", e);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const downloadDOCX = async () => {
    const exportList = filteredRegistrations;
    if (exportList.length === 0) return;
    setDownloadingDocx(true);
    try {
      const { generateRegistrationsDocx } = await import("@/lib/docx-export");
      const blob = await generateRegistrationsDocx(
        {
          title: eventTitle,
          category: eventType,
          venue: venue,
          startDatetime: startDatetime,
          totalRegistrations: registrations.length,
          totalAttended: attendedCount,
        },
        exportList.map((reg, idx) => ({
          slNo: idx + 1,
          name: reg.student.name,
          admissionNumber: reg.student.admissionNumber || "N/A",
          department: reg.student.department,
          batch: reg.student.batch,
          iecdId: reg.student.iecdId,
          phone: reg.student.phone || "N/A",
          role: reg.role,
          attended: reg.attended,
        }))
      );

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${eventTitle.replace(/\s+/g, "_")}_${statusFilter}_Attendance.docx`;
      link.click();
    } catch (e) {
      console.error("DOCX generation failed:", e);
      alert("Failed to generate DOCX. Please try again.");
    } finally {
      setDownloadingDocx(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-[32px] border border-gray-100/80 p-8 shadow-sm font-['Hanken_Grotesk'] text-[#1A0D0C] space-y-4">
        <div className="h-6 bg-gray-200/60 rounded-full w-48 animate-pulse" />
        <div className="h-32 bg-gray-200/60 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[32px] border border-gray-100/80 p-8 shadow-sm font-['Hanken_Grotesk'] text-[#1A0D0C] space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1A0D0C]">
              Registered Students
            </h3>
            <p className="text-xs font-medium text-gray-400">
              {totalCount} student{totalCount === 1 ? "" : "s"} total • {attendedCount} attended
            </p>
          </div>
        </div>

        {canExport && registrations.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <Button
              onClick={downloadPDF}
              disabled={downloading || downloadingDocx}
              className="h-9.5 px-4 rounded-full bg-[#100A0A] hover:bg-[#2A2020] text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span>Download PDF</span>
            </Button>
            <Button
              onClick={downloadDOCX}
              disabled={downloading || downloadingDocx}
              className="h-9.5 px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              {downloadingDocx ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>Download DOCX</span>
            </Button>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      {registrations.length > 0 && (
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
          {/* Status Filter Tabs */}
          <div className="inline-flex items-center p-1 rounded-full bg-gray-100/80 border border-gray-200/60 w-full md:w-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={cn(
                "flex-1 md:flex-none px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
                statusFilter === "all"
                  ? "bg-white text-[#100A0A] shadow-xs"
                  : "text-gray-500 hover:text-[#100A0A]"
              )}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter("attended")}
              className={cn(
                "flex-1 md:flex-none px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                statusFilter === "attended"
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "text-gray-500 hover:text-emerald-600"
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Attended ({attendedCount})
            </button>
            <button
              onClick={() => setStatusFilter("registered")}
              className={cn(
                "flex-1 md:flex-none px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                statusFilter === "registered"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-gray-500 hover:text-amber-600"
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              Not Marked ({pendingCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student or dept..."
              className="pl-9 h-9 rounded-full text-xs bg-gray-50/60 border-gray-200 focus:bg-white"
            />
          </div>
        </div>
      )}

      {/* Table Content */}
      {registrations.length === 0 ? (
        <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
          <p className="text-gray-400 text-xs font-medium">
            No student registrations recorded yet for this event.
          </p>
        </div>
      ) : filteredRegistrations.length === 0 ? (
        <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
          <p className="text-gray-500 text-xs font-bold">No matching students found</p>
          <p className="text-gray-400 text-[11px] mt-1">
            Try changing the status filter tab or clear your search query.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100/80">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50/80 text-[#1A0D0C] font-bold uppercase text-[10px] tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-5 py-3.5">Student Name</th>
                <th className="px-5 py-3.5">IECD ID</th>
                <th className="px-5 py-3.5">Dept & Year</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/80 bg-white">
              {filteredRegistrations.map((reg) => (
                <tr key={reg.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-[#1A0D0C]">
                    {reg.student.name}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 font-mono text-[11px]">
                    {reg.student.iecdId}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-gray-600">
                    {reg.student.department} ({reg.student.batch})
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                        reg.role === "volunteer"
                          ? "bg-purple-50 text-purple-700 border-purple-100"
                          : "bg-blue-50 text-blue-700 border-blue-100"
                      }`}
                    >
                      {reg.role || "participant"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {reg.attended ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold uppercase inline-flex items-center gap-1">
                        Present ✓
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold uppercase inline-flex items-center gap-1">
                        Not Marked
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

