"use client";

import React, { useEffect } from "react";

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const registerSW = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.log("[PWA] Service Worker registered scope:", reg.scope))
          .catch((err) => console.error("[PWA] Service Worker registration failed:", err));
      };

      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
        return () => window.removeEventListener("load", registerSW);
      }
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
