"use client";

import React from "react";

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-wrapper">
      <main className="content">
        {children}
      </main>
    </div>
  );
}
