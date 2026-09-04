"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { LogOut, Compass, Trash2, ChevronUp } from "lucide-react";

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
  const [showPopover, setShowPopover] = useState(false);
  const profileContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileContainerRef.current && !profileContainerRef.current.contains(event.target as Node)) {
        setShowPopover(false);
      }
    };
    if (showPopover) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPopover]);

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
    <div className="sidebar-profile-section" data-tour="sidebar-profile" ref={profileContainerRef}>
      {showPopover && (
        <div className="sidebar-profile-popover">
          <div className="dropdown-student-header">
            <div className="dropdown-student-avatar">
              {user.profileImage ? (
                <Image
                  src={user.profileImage}
                  alt={user.name}
                  width={42}
                  height={42}
                  className="profile-avatar"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="dropdown-student-info">
              <div className="dropdown-student-name" title={user.name}>
                {user.name}
              </div>
              {user.usn && <div className="dropdown-student-usn">{user.usn}</div>}
              <div className="dropdown-student-status">Active Student</div>
            </div>
          </div>

          <div className="dropdown-divider" />

          {onStartTour && (
            <button
              type="button"
              className="dropdown-glass-btn tour"
              onClick={() => {
                setShowPopover(false);
                onStartTour();
              }}
            >
              <Compass size={16} />
              <span>Interactive Tour</span>
            </button>
          )}

          <button
            type="button"
            className="dropdown-glass-btn logout"
            onClick={() => {
              setShowPopover(false);
              onLogout();
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>

          {onDeleteData && (
            <>
              <div className="dropdown-divider" />
              <button
                type="button"
                data-tour="delete-account"
                className="dropdown-glass-btn delete"
                onClick={() => {
                  setShowPopover(false);
                  onDeleteData();
                }}
              >
                <Trash2 size={15} />
                <span>Delete Account & Data</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Profile Card Trigger */}
      <div
        className={`profile-card interactive ${showPopover ? "active" : ""}`}
        onClick={() => setShowPopover(!showPopover)}
        role="button"
        tabIndex={0}
        aria-expanded={showPopover}
        aria-label="Student profile and menu"
      >
        <div className="profile-image-container" style={{ position: "relative" }}>
          {user.profileImage ? (
            <Image
              src={user.profileImage}
              alt={user.name}
              width={38}
              height={38}
              className="profile-avatar"
            />
          ) : (
            <div className="profile-initials-avatar">
              {initials}
            </div>
          )}
          <span className="online-status-dot" />
        </div>

        <div className="profile-details">
          <span className="profile-name" title={user.name}>
            {user.name}
          </span>
          {user.usn && (
            <span style={{ fontSize: "11px", color: "var(--accent-primary, #00ADB5)", fontFamily: "monospace", letterSpacing: "0.03em" }}>
              {user.usn}
            </span>
          )}
        </div>

        <div className="profile-options-trigger" title="Options">
          <ChevronUp
            size={16}
            style={{
              transform: showPopover ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SidebarProfile;
