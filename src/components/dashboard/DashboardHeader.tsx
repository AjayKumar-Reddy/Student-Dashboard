"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";

interface DashboardHeaderProps {
  name?: string;
  sectionTitle?: string;
  sectionSubtitle?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ 
  name, 
  sectionTitle, 
  sectionSubtitle,
  children,
  actions
}) => {
  const displayName = name || "Student";

  return (
    <header className="dashboard-header-container">
      {/* Primary Welcome Block */}
      <div className="welcome-block" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 className="welcome-title">
            Welcome back, <span className="highlight-name">{displayName}</span>
          </h1>
          <p className="welcome-tagline">
            Here’s your current semester performance overview
          </p>
        </div>

        {/* Security & Database Encryption Trust Badge */}
        <div 
          data-tour="security-badge"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            color: "#10b981",
            padding: "6px 12px",
            borderRadius: "20px",
            fontSize: "0.75rem",
            fontWeight: "700",
            letterSpacing: "0.02em"
          }}
          title="Data is end-to-end encrypted in database"
        >
          <ShieldCheck size={14} />
          <span>Encrypted Database</span>
        </div>
      </div>

      {/* Primary Divider (Moved Up) */}
      <hr className="header-divider-main" />

      {/* Secondary Section Header */}
      {(sectionTitle || sectionSubtitle || children || actions) && (
        <div className="section-header-block">
          <div className="section-header-top">
            <div className="section-header-titles">
              {sectionTitle && <h2 className="section-title">{sectionTitle}</h2>}
              {sectionSubtitle && <p className="section-subtitle">{sectionSubtitle}</p>}
            </div>
            {actions && <div className="section-header-actions">{actions}</div>}
          </div>
          {children && <div className="section-meta-wrap">{children}</div>}
        </div>
      )}
    </header>
  );
};

export default DashboardHeader;

