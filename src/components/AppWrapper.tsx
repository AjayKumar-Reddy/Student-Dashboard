"use client";

import React, { useEffect } from "react";

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.log("[PWA] Service Worker registered scope:", reg.scope))
          .catch((err) => console.error("[PWA] Service Worker registration failed:", err));
      });
    }
  }, []);

  return (
    <div className="app-wrapper">
      <main className="content">
        {children}
      </main>
    </div>
  );
}
