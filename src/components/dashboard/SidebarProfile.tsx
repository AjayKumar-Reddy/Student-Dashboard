"use client";

import React from "react";
import Image from "next/image";
import { LogOut, User as UserIcon } from "lucide-react";

interface SidebarProfileProps {
  user: {
    name: string;
    profileImage?: string;
    usn?: string;
  } | null;
  onLogout: () => void;
  onDeleteData?: () => void;
  onStartTour?: () => void;
}

const SidebarProfile: React.FC<SidebarProfileProps> = ({ user, onLogout, onDeleteData, onStartTour }) => {
  if (!user) {
    return (
      <div className="sidebar-profile-skeleton">
        <div className="skeleton-avatar"></div>
        <div className="skeleton-info">
          <div className="skeleton-line"></div>
          <div className="skeleton-line short"></div>
        </div>
      </div>
    );
  }

  // Fallback initials for profile image
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "ST";

  return (
    <div className="sidebar-profile-section" data-tour="sidebar-profile">
      <div className="profile-card">
        <div className="profile-image-container">
          {user.profileImage ? (
            <Image
              src={user.profileImage}
              alt={user.name}
              width={40}
              height={40}
              className="profile-avatar"
              onError={(e) => {
                // For demonstration, if image fails, we could potentially show initials
                // But typically onError would handle fallback
              }}
            />
          ) : (
            <div className="profile-initials-avatar">
              {initials}
            </div>
          )}
        </div>
        <div className="profile-details" style={{ display: "flex", flexDirection: "column" }}>
          <span className="profile-name" title={user.name}>
            {user.name}
          </span>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginTop: "4px", gap: "6px", flexWrap: "wrap" }}>
            <button onClick={onLogout} className="profile-logout-link" title="Logout">
              <LogOut size={12} />
              <span>Logout</span>
            </button>

            {onStartTour && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartTour();
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent-primary, #00ADB5)",
                  fontSize: "10px",
                  fontWeight: "600",
                  cursor: "pointer",
                  padding: "4px 0",
                  textDecoration: "underline",
                  transition: "opacity 0.2s"
                }}
                title="Replay onboarding tour"
              >
                Replay Tour
              </button>
            )}

            {onDeleteData && (
              <button 
                data-tour="delete-account"
                onClick={onDeleteData} 
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted, #94a3b8)",
                  fontSize: "10px",
                  fontWeight: "600",
                  cursor: "pointer",
                  padding: "4px 0",
                  textDecoration: "underline",
                  transition: "color 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#ef4444"}
                onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted, #94a3b8)"}
              >
                Delete Account
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidebarProfile;
