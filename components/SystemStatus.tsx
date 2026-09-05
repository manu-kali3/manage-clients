"use client";
import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const upd = () => setOffline(!navigator.onLine);
    upd();
    window.addEventListener("online", upd);
    window.addEventListener("offline", upd);
    return () => { window.removeEventListener("online", upd); window.removeEventListener("offline", upd); };
  }, []);
  if (!offline) return null;
  return <div style={{ background: "#1a2138", color: "#fff", textAlign: "center", padding: "10px 16px", fontSize: 13, fontWeight: 600 }}>You’re offline — check your connection. Changes will sync when back online.</div>;
}

export function MaintenanceBanner({ isDown }: { isDown: boolean }) {
  if (!isDown) return null;
  return <div style={{ background: "#fff7e8", color: "#7a4a00", borderBottom: "1px solid #f3dfb0", textAlign: "center", padding: "12px 16px", fontSize: 13, fontWeight: 600 }}>System under maintenance — back in a short while. If this persists, contact brevansoftwares@gmail.com.</div>;
}
