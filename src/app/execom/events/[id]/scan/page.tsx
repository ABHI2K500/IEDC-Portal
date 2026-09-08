"use client";

import { useState, useRef, useEffect, useCallback, use } from "react";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle2, XCircle, ArrowLeft, Loader2, QrCode, Sparkles } from "lucide-react";
import type { IScannerControls } from "@zxing/browser";
import Link from "next/link";
import { useAdminSection } from "@/lib/admin-section";

interface ScanResult {
  success: boolean;
  message: string;
  studentName?: string;
  iecdId?: string;
}

export default function ExecomScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const { base } = useAdminSection();

  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const prevDeviceIdRef = useRef("");

  const processQRCode = useCallback(async (qrData: string) => {
    if (processing) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, qrData }),
      });
      const data = await res.json();

      setLastResult({
        success: data.success,
        message: data.message,
        studentName: data.studentName,
        iecdId: data.iecdId,
      });

      if (data.success) {
        setScanCount((prev) => prev + 1);
        // Play success sound
        const audio = new Audio("https://cdn.freesound.org/previews/404/404743_1427504-lq.mp3");
        audio.play().catch(() => { });
      } else {
        // Play error sound
        const audio = new Audio("https://cdn.freesound.org/previews/415/415510_5121236-lq.mp3");
        audio.play().catch(() => { });
      }
    } catch {
      setLastResult({
        success: false,
        message: "Failed to connect to server",
      });
    }

    // Cool down to prevent double scans
    setTimeout(() => {
      setProcessing(false);
    }, 2000);
  }, [processing, eventId]);

  const startScanning = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const codeReader = new BrowserQRCodeReader();

      // Request permission and list devices
      const videoDevices = await BrowserQRCodeReader.listVideoInputDevices();
      setDevices(videoDevices);

      let deviceId = selectedDeviceId;
      if (!deviceId && videoDevices.length > 0) {
        const backCam = videoDevices.find((d) =>
          d.label.toLowerCase().includes("back") ||
          d.label.toLowerCase().includes("rear") ||
          d.label.toLowerCase().includes("environment")
        );
        deviceId = backCam ? backCam.deviceId : videoDevices[0].deviceId;
        setSelectedDeviceId(deviceId);
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? {
            deviceId: { exact: deviceId },
            advanced: [{ focusMode: "continuous" } as unknown as MediaTrackConstraintSet],
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }
          : {
            facingMode: "environment",
            advanced: [{ focusMode: "continuous" } as unknown as MediaTrackConstraintSet],
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
      };

      const controls = await codeReader.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result) => {
          if (result && !processing) {
            processQRCode(result.getText());
          }
        }
      );
      controlsRef.current = controls;
      setScanning(true);
      setLastResult(null);
    } catch {
      alert("Unable to access camera. Please grant camera permissions or select a different camera source.");
    }
  }, [processing, selectedDeviceId, processQRCode]);

  const stopScanning = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    setScanning(false);
  }, []);

  // Hot-swap camera source when dropdown changes
  useEffect(() => {
    if (prevDeviceIdRef.current !== selectedDeviceId && controlsRef.current) {
      prevDeviceIdRef.current = selectedDeviceId;
      stopScanning();
      const timer = setTimeout(() => {
        startScanning();
      }, 500);
      return () => clearTimeout(timer);
    }
    prevDeviceIdRef.current = selectedDeviceId;
  }, [selectedDeviceId, startScanning, stopScanning]);

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-16 font-['Hanken_Grotesk'] text-[#1A0D0C]">
      {/* Top back button */}
      <Link
        href={`${base}/events/${eventId}`}
        className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white border border-gray-100/80 shadow-sm text-xs font-semibold text-gray-600 hover:text-[#100A0A] hover:bg-gray-50/80 transition-all cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to event details</span>
      </Link>

      {/* Header Info */}
      <div className="text-center space-y-2">
        <span className="px-3 py-1 rounded-full bg-red-50 text-[#D9383A] text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
          <QrCode className="w-3 h-3" /> Live Scanner
        </span>
        <h1 className="text-3xl font-extrabold text-[#1A0D0C] tracking-tight">Attendance QR Scanner</h1>
        <p className="text-xs font-medium text-gray-400">
          Point camera at a student&apos;s digital IEDC pass to record entry in real time.
        </p>
      </div>

      {/* Camera Selection Dropdown */}
      {devices.length > 1 && (
        <div className="bg-white rounded-[28px] border border-gray-100/80 p-5 shadow-sm space-y-2">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
            Select Camera Input
          </label>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="w-full text-xs font-bold border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 text-[#1A0D0C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#100A0A] cursor-pointer"
          >
            {devices.map((device, i) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Scanner Main Card */}
      <div className="bg-white rounded-[32px] border border-gray-100/80 overflow-hidden shadow-sm p-4 space-y-4">
        <div
          className="aspect-square relative bg-[#100A0A] rounded-[24px] overflow-hidden cursor-pointer shadow-inner"
          onClick={async () => {
            if (videoRef.current && videoRef.current.srcObject) {
              const stream = videoRef.current.srcObject as MediaStream;
              const track = stream.getVideoTracks()[0];
              try {
                await track.applyConstraints({
                  advanced: [{ focusMode: "single-shot" } as unknown as MediaTrackConstraintSet]
                });
                setTimeout(() => {
                  track.applyConstraints({
                    advanced: [{ focusMode: "continuous" } as unknown as MediaTrackConstraintSet]
                  }).catch(() => { });
                }, 1000);
              } catch (e) {
                console.log("Manual focus not supported", e);
              }
            }
          }}
        >
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {!scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#100A0A]/95 text-white p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <Camera className="w-8 h-8 text-white/80" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-white">Camera Offline</p>
                <p className="text-xs text-white/50 max-w-xs leading-relaxed">
                  Position your camera over the student&apos;s digital IEDC QR pass. Ensure proper lighting.
                </p>
              </div>
              <Button
                onClick={startScanning}
                className="h-[46px] px-8 rounded-full bg-white text-[#100A0A] hover:bg-gray-100 text-xs font-bold shadow-md cursor-pointer transition-all active:scale-98"
              >
                <Camera className="w-4 h-4 mr-2" />
                Activate Camera
              </Button>
            </div>
          )}

          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`w-64 h-64 border-2 rounded-[28px] relative transition-colors ${processing ? 'border-emerald-400' : 'border-white/60'}`}>
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-[#D9383A] rounded-tl-2xl" />
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-[#D9383A] rounded-tr-2xl" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-[#D9383A] rounded-bl-2xl" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-[#D9383A] rounded-br-2xl" />
              </div>
            </div>
          )}

          {processing && (
            <div className="absolute top-4 right-4 bg-[#100A0A]/80 backdrop-blur-md border border-white/10 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>Verifying QR...</span>
            </div>
          )}
        </div>

        {scanning && (
          <div className="p-4 flex justify-between items-center bg-gray-50/60 rounded-2xl border border-gray-100/80">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-gray-600">
                Session Scans: <span className="font-extrabold text-[#1A0D0C]">{scanCount}</span>
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 rounded-full bg-white text-xs font-bold border-gray-200 hover:bg-gray-50 text-gray-700 cursor-pointer shadow-xs"
              onClick={stopScanning}
            >
              Stop Camera
            </Button>
          </div>
        )}
      </div>

      {/* Result Alert Card */}
      {lastResult && (
        <div
          className={`rounded-[24px] border p-5 flex items-center gap-4 shadow-xs transition-all animate-in fade-in ${lastResult.success
            ? "bg-emerald-50/80 border-emerald-100 text-emerald-900"
            : "bg-red-50/80 border-red-100 text-red-900"
            }`}
        >
          {lastResult.success ? (
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <XCircle className="w-6 h-6" />
            </div>
          )}
          <div className="flex-1 space-y-0.5">
            <p className="font-extrabold text-sm tracking-tight">
              {lastResult.message}
            </p>
            {lastResult.studentName && (
              <p className="text-xs text-emerald-700 font-bold">
                {lastResult.studentName} {lastResult.iecdId ? `• ${lastResult.iecdId}` : ''}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}