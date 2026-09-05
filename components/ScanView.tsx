"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icons } from "./icons";

interface ScanResult {
  status: "valid" | "pending" | "cancelled" | "not_found" | "invalid";
  ticketCode?: string;
  bookingId?: string;
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string | null;
  venue?: string | null;
  isOnline?: boolean;
  quantity?: number;
  amount?: number;
  booker?: string;
  email?: string;
  phone?: string | null;
  bookingStatus?: string;
}

interface HistoryEntry {
  code: string;
  result: ScanResult;
  at: number;
}

const STATUS_LABEL: Record<ScanResult["status"], string> = {
  valid: "VALID TICKET",
  pending: "PAYMENT PENDING",
  cancelled: "CANCELLED",
  not_found: "NOT FOUND",
  invalid: "INVALID CODE",
};

function beep(ok: boolean) {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = ok ? 880 : 220;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (ok ? 0.28 : 0.45));
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.3 : 0.5));
  } catch {
    // audio unavailable — ignore
  }
}

export default function ScanView() {
  const readerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);
  const lastScanAt = useRef(0);
  const lastCode = useRef("");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [starting, setStarting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<"ok" | "deny" | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [manual, setManual] = useState("");

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    if (scanner) {
      scannerRef.current = null;
      try {
        await scanner.stop();
        scanner.clear();
      } catch {
        // ignore
      }
    }
    setCameraOn(false);
  }, []);

  const verify = useCallback(
    async (raw: string, fromCamera = false) => {
      const code = raw.trim();
      if (!code) return;
      if (fromCamera) {
        const now = Date.now();
        // Debounce: ignore repeats for 2s after a capture so it doesn't re-fire
        // on the same barcode while the result is on screen.
        if (now - lastScanAt.current < 2000) return;
        if (code === lastCode.current && now - lastScanAt.current < 3000) return;
        lastScanAt.current = now;
        lastCode.current = code;
        // Pause the camera briefly so the same code isn't scanned again.
        try {
          await scannerRef.current?.pause?.(true);
        } catch {
          // ignore
        }
      }
      setBusy(true);
      try {
        const res = await fetch("/api/scan/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const data = await res.json();
        const scanResult: ScanResult = data.result;
        setResult(scanResult);
        const okScan = scanResult.status === "valid";
        beep(okScan);
        setFlash(okScan ? "ok" : "deny");
        setHistory((h) => [{ code, result: scanResult, at: Date.now() }, ...h].slice(0, 12));
      } catch {
        const fail: ScanResult = { status: "invalid" };
        setResult(fail);
        beep(false);
        setFlash("deny");
      } finally {
        setBusy(false);
        if (fromCamera) {
          // Resume scanning after the result has been shown.
          setTimeout(() => {
            try {
              scannerRef.current?.resume?.();
            } catch {
              // ignore
            }
            setFlash(null);
          }, 2500);
        } else {
          setTimeout(() => setFlash(null), 2500);
        }
      }
    },
    []
  );

  const startCamera = useCallback(async () => {
    if (scannerRef.current) return;
    setCameraError("");
    setStarting(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const el = readerRef.current;
      if (!el) return;
      const scanner = new Html5Qrcode(el.id, { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10 },
        (decodedText: string) => {
          verify(decodedText, true);
        },
        () => {
          // per-frame errors are expected between detections
        }
      );
      setCameraOn(true);
    } catch (e: any) {
      setCameraError(e?.message ?? "Could not start the camera.");
      setCameraOn(false);
    } finally {
      setStarting(false);
    }
  }, [verify]);

  useEffect(() => {
    startCamera();
    return () => {
      const scanner = scannerRef.current;
      if (scanner) {
        try {
          scanner.stop();
          scanner.clear();
        } catch {
          // ignore
        }
      }
    };
  }, [startCamera]);

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    verify(manual);
  }

  const label = result ? STATUS_LABEL[result.status] : "";
  const ok = result?.status === "valid";

  return (
    <div className="scan-layout">
      <div className="scan-left">
        <div className="card">
          <div className="card-header">
            <h2>Ticket scanner</h2>
            {cameraOn && <span className="count-pill live">Live</span>}
          </div>
          <div className="card-body scan-camera">
            <div className="scan-viewport">
              <div ref={readerRef} id="qr-reader" className="qr-reader" />
              {cameraOn && (
                <div className={`scan-frame ${flash ? `scan-frame--${flash}` : ""}`} aria-hidden="true">
                  <span className="corner tl" />
                  <span className="corner tr" />
                  <span className="corner bl" />
                  <span className="corner br" />
                  <span className="scan-line" />
                  <div className="scan-hint">Hold steady — scanning automatically…</div>
                </div>
              )}
              {!cameraOn && !cameraError && (
                <div className="scan-placeholder">
                  <span className="scan-placeholder-icon">{Icons.scan}</span>
                  <p>
                    {starting
                      ? "Starting camera…"
                      : "Point the camera at a ticket barcode to verify it automatically."}
                  </p>
                </div>
              )}
            </div>
            {cameraError && (
              <div className="scan-camera-error">
                <span className="banner-icon">{Icons.alert}</span>
                <div>
                  <strong>Camera unavailable</strong>
                  <p>{cameraError} Use the manual field below instead.</p>
                </div>
              </div>
            )}
            {cameraOn && (
              <div className="scan-controls">
                <button type="button" className="btn ghost" onClick={stopCamera}>
                  Stop camera
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Manual entry</h2>
          </div>
          <form className="scan-manual" onSubmit={submitManual}>
            <input
              type="text"
              placeholder="Scan code, paste URL, or BVN-XXXX…"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
            />
            <button type="submit" className="btn" disabled={busy || !manual.trim()}>
              {busy ? "Checking…" : "Verify"}
            </button>
          </form>
        </div>
      </div>

      <div className="scan-right">
        <div className={`scan-result scan-result--${result ? result.status : "idle"}`}>
          {result ? (
            <>
              <div className="scan-result-badge">
                {ok ? "✓" : "✕"} {label}
              </div>
              {result.status === "valid" && (
                <>
                  <h3>{result.eventTitle}</h3>
                  <p className="scan-meta">
                    {result.eventDate}
                    {result.eventTime ? ` at ${result.eventTime}` : ""}
                  </p>
                  <p className="scan-meta">
                    {result.isOnline ? "Online event" : result.venue ?? "Venue TBC"}
                  </p>
                  <div className="scan-row">
                    <span>Number of users</span>
                    <b>
                      {result.quantity} {result.quantity && result.quantity > 1 ? "people" : "person"}
                    </b>
                  </div>
                  <div className="scan-row">
                    <span>Booked by</span>
                    <b>
                      {result.booker}
                      {result.email ? <em> · {result.email}</em> : null}
                    </b>
                  </div>
                  {result.phone && (
                    <div className="scan-row">
                      <span>Phone</span>
                      <b>{result.phone}</b>
                    </div>
                  )}
                  {result.amount && result.amount > 0 && (
                    <div className="scan-row">
                      <span>Amount</span>
                      <b>KES {result.amount.toLocaleString("en-KE")}</b>
                    </div>
                  )}
                </>
              )}
              {result.status === "pending" && (
                <p className="scan-note">This ticket is waiting for payment confirmation.</p>
              )}
              {result.status === "cancelled" && (
                <p className="scan-note">This ticket has been cancelled and is no longer valid.</p>
              )}
              {result.status === "not_found" && (
                <p className="scan-note">No ticket found for that code.</p>
              )}
              {result.status === "invalid" && (
                <p className="scan-note">The scanned value is not a valid Brevan Events ticket.</p>
              )}
              {result.ticketCode && <p className="scan-code">Ticket {result.ticketCode}</p>}
              <button type="button" className="btn ghost" onClick={() => setResult(null)}>
                Clear
              </button>
            </>
          ) : (
            <div className="scan-idle">
              <span className="scan-idle-icon">{Icons.scan}</span>
              <p>Scan or enter a ticket to see the verification result here.</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Recent scans</h2>
            {history.length > 0 && <span className="count-pill">{history.length}</span>}
          </div>
          {history.length === 0 ? (
            <div className="empty-state small">
              <p>No scans in this session yet.</p>
            </div>
          ) : (
            <div className="scan-history">
              {history.map((h, i) => (
                <div key={`${h.at}-${i}`} className="scan-history-row">
                  <span
                    className={`scan-history-dot scan-history-dot--${h.result.status}`}
                    aria-hidden
                  />
                  <div className="scan-history-info">
                    <div className="scan-history-title">
                      {h.result.eventTitle ?? STATUS_LABEL[h.result.status]}
                    </div>
                    <div className="scan-history-sub">{h.code}</div>
                  </div>
                  <span className={`badge status-${h.result.bookingStatus ?? h.result.status}`}>
                    {h.result.status === "valid"
                      ? `Admit ${h.result.quantity ?? 0}`
                      : STATUS_LABEL[h.result.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
