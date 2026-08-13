"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ShieldCheck, User, RefreshCw, Trash2, ArrowRight, ArrowLeft, X, Sparkles } from "lucide-react";

export interface Step {
  targetSelector: string;
  title: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
}

const TOUR_STEPS: Step[] = [
  {
    targetSelector: '[data-tour="security-badge"]',
    title: "Data Security",
    badge: "Encrypted",
    description: "All records are end-to-end encrypted.",
    icon: <ShieldCheck size={20} style={{ color: "#10b981" }} />,
  },
  {
    targetSelector: '[data-tour="update-btn"]',
    title: "Live Sync",
    badge: "Updates",
    description: "Sync latest grades directly from portal.",
    icon: <RefreshCw size={20} style={{ color: "#00ADB5" }} />,
  },
  {
    targetSelector: '[data-tour="sidebar-profile"]',
    title: "Student Profile",
    badge: "Account",
    description: "View seat number and profile details.",
    icon: <User size={20} style={{ color: "#3b82f6" }} />,
  },
  {
    targetSelector: '[data-tour="delete-account"]',
    title: "Account Control",
    badge: "Privacy",
    description: "Permanently erase your data anytime.",
    icon: <Trash2 size={20} style={{ color: "#ef4444" }} />,
  },
];

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose }) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  const currentStep = TOUR_STEPS[currentStepIdx];

  const updateSpotlight = useCallback(() => {
    if (!currentStep) return;
    let targetEl = document.querySelector(currentStep.targetSelector);
    
    // Mobile element fallback checks if desktop sidebar/header elements are hidden or unmeasured
    if (!targetEl || targetEl.getBoundingClientRect().width === 0) {
      if (currentStep.targetSelector.includes("security-badge")) {
        targetEl = document.querySelector('[data-tour="security-badge"]') || document.querySelector(".welcome-block") || document.querySelector(".dashboard-header-container");
      } else if (currentStep.targetSelector.includes("sidebar-profile") || currentStep.targetSelector.includes("delete-account")) {
        targetEl = document.querySelector(".mobile-nav-profile") || document.querySelector(".mobile-top-navbar");
      }
    }

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      const rect = targetEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSpotlightRect(rect);
        return;
      }
    }
    setSpotlightRect(null);
  }, [currentStep]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStepIdx(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      updateSpotlight();
    }, 50);

    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
    };
  }, [isOpen, currentStepIdx, updateSpotlight]);

  if (!isOpen) return null;

  const isFirstStep = currentStepIdx === 0;
  const isLastStep = currentStepIdx === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIdx((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStepIdx((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    const studentUsn = typeof window !== "undefined" ? localStorage.getItem("studentUsn") : null;
    if (studentUsn) {
      localStorage.setItem(`hasCompletedOnboardingTour_${studentUsn}`, "true");
    }
    localStorage.setItem("hasCompletedOnboardingTour", "true");
    onClose();
  };

  // Compute dynamic card positioning (Strict Viewport Clamping for Desktop & Mobile)
  const getCardPositionStyle = (): React.CSSProperties => {
    if (typeof window === "undefined") {
      return {};
    }

    const isMobile = window.innerWidth <= 640;
    const cardWidth = isMobile ? Math.min(300, window.innerWidth - 24) : 310;
    const estimatedCardHeight = 200;

    // Horizontally center card on all mobile screen sizes
    const mobileLeft = Math.max(12, (window.innerWidth - cardWidth) / 2);

    // Specially center Step 1 pop-up in middle of screen ONLY on mobile
    if (isMobile && currentStepIdx === 0) {
      const mobileTop = Math.max(20, (window.innerHeight - estimatedCardHeight) / 2);
      return {
        position: "fixed",
        top: `${mobileTop}px`,
        left: `${mobileLeft}px`,
        width: `${cardWidth}px`,
        margin: 0,
        zIndex: 10001,
        pointerEvents: "auto",
        transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      };
    }

    if (!spotlightRect) {
      return {
        position: "fixed",
        top: isMobile ? "50%" : "20%",
        left: "50%",
        width: `${cardWidth}px`,
        transform: "translate(-50%, -50%)",
        margin: 0,
        zIndex: 10001,
        pointerEvents: "auto",
      };
    }

    const gap = 12;

    let top = spotlightRect.bottom + gap;
    let left = isMobile
      ? mobileLeft
      : Math.max(12, Math.min(window.innerWidth - cardWidth - 12, spotlightRect.left + (spotlightRect.width / 2) - (cardWidth / 2)));

    // Target is in left sidebar (desktop)
    if (!isMobile && spotlightRect.left < 320 && (window.innerWidth - spotlightRect.right) > cardWidth + gap) {
      left = spotlightRect.right + gap;
      top = Math.max(20, Math.min(spotlightRect.top - 60, window.innerHeight - estimatedCardHeight - 40));
    }
    // If placing below extends past bottom of viewport, place card above target
    else if (top + estimatedCardHeight > window.innerHeight - 20) {
      top = spotlightRect.top - estimatedCardHeight - gap;
    }

    // Strict clamping: ensure card never goes off-screen
    const maxTop = Math.max(20, window.innerHeight - estimatedCardHeight - 30);
    top = Math.max(20, Math.min(maxTop, top));

    return {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${cardWidth}px`,
      margin: 0,
      zIndex: 10001,
      pointerEvents: "auto",
      transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
    };
  };

  return (
    <div className="onboarding-tour-overlay">
      {/* 4 Backdrop Overlay Panels surrounding the spotlight target (100% Crisp Target Cutout) */}
      {spotlightRect ? (
        <>
          {/* Top Panel */}
          <button
            type="button"
            aria-label="Next tour step"
            onClick={handleNext}
            className="spotlight-panel"
            style={{
              top: 0,
              left: 0,
              width: "100vw",
              height: `${Math.max(0, spotlightRect.top - 6)}px`,
            }}
          />
          {/* Bottom Panel */}
          <button
            type="button"
            aria-label="Next tour step"
            onClick={handleNext}
            className="spotlight-panel"
            style={{
              top: `${spotlightRect.bottom + 6}px`,
              left: 0,
              width: "100vw",
              height: `${Math.max(0, (typeof window !== "undefined" ? window.innerHeight : 800) - (spotlightRect.bottom + 6))}px`,
            }}
          />
          {/* Left Panel */}
          <button
            type="button"
            aria-label="Next tour step"
            onClick={handleNext}
            className="spotlight-panel"
            style={{
              top: `${Math.max(0, spotlightRect.top - 6)}px`,
              left: 0,
              width: `${Math.max(0, spotlightRect.left - 6)}px`,
              height: `${spotlightRect.height + 12}px`,
            }}
          />
          {/* Right Panel */}
          <button
            type="button"
            aria-label="Next tour step"
            onClick={handleNext}
            className="spotlight-panel"
            style={{
              top: `${Math.max(0, spotlightRect.top - 6)}px`,
              left: `${spotlightRect.right + 6}px`,
              width: `${Math.max(0, (typeof window !== "undefined" ? window.innerWidth : 1200) - (spotlightRect.right + 6))}px`,
              height: `${spotlightRect.height + 12}px`,
            }}
          />
        </>
      ) : (
        <button
          type="button"
          aria-label="Next tour step"
          onClick={handleNext}
          className="spotlight-panel"
          style={{ inset: 0, width: "100vw", height: "100vh" }}
        />
      )}

      {/* Target Element Spotlight Pulsing Border Box */}
      {spotlightRect && (
        <div
          className="spotlight-box"
          style={{
            top: `${Math.max(0, spotlightRect.top - 6)}px`,
            left: `${Math.max(0, spotlightRect.left - 6)}px`,
            width: `${spotlightRect.width + 12}px`,
            height: `${spotlightRect.height + 12}px`,
          }}
        />
      )}

      {/* Tour Card Dialog floating next to spotlight target */}
      <div className="tour-card-container fade-in" style={getCardPositionStyle()}>
        <div className="tour-card-header">
          <div className="tour-step-badge">
            <Sparkles size={12} className="sparkle-icon" />
            <span>Step {currentStepIdx + 1} of {TOUR_STEPS.length}</span>
          </div>
          <button type="button" onClick={handleComplete} className="tour-close-btn" title="Skip tour">
            <X size={15} />
          </button>
        </div>

        <div className="tour-card-body">
          <div className="tour-icon-wrap">
            {currentStep.icon}
          </div>
          <div className="tour-text-content">
            <div className="tour-badge-pill">{currentStep.badge}</div>
            <h3 className="tour-title">{currentStep.title}</h3>
            <p className="tour-description">{currentStep.description}</p>
          </div>
        </div>

        {/* Progress Dots & Action Controls */}
        <div className="tour-card-footer">
          <div className="tour-progress-bar">
            {TOUR_STEPS.map((stepItem, idx) => (
              <button
                type="button"
                key={stepItem.title}
                aria-label={`Go to tour step ${idx + 1}`}
                className={`tour-dot ${idx === currentStepIdx ? "active" : ""} ${idx < currentStepIdx ? "completed" : ""}`}
                onClick={() => setCurrentStepIdx(idx)}
              />
            ))}
          </div>

          <div className="tour-nav-btns">
            {!isFirstStep && (
              <button type="button" onClick={handleBack} className="tour-btn tour-back-btn">
                <ArrowLeft size={13} /> Back
              </button>
            )}
            <button type="button" onClick={handleNext} className="tour-btn tour-next-btn">
              {isLastStep ? "Done" : "Next"} {!isLastStep && <ArrowRight size={13} />}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .onboarding-tour-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          pointer-events: none;
        }

        .spotlight-panel {
          position: fixed;
          background: rgba(10, 15, 26, 0.75);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 9999;
          pointer-events: auto;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .spotlight-box {
          position: fixed;
          border-radius: 12px;
          border: 2px solid var(--accent-primary, #00ADB5);
          box-shadow: 0 0 20px rgba(0, 173, 181, 0.6);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          pointer-events: none;
          z-index: 10000;
          animation: pulseBorder 2s infinite ease-in-out;
        }

        .tour-card-container {
          position: relative;
          z-index: 10001;
          pointer-events: auto;
          background: var(--bg-card, #131A26);
          border: 1px solid var(--border-bright, rgba(0, 173, 181, 0.35));
          border-radius: 14px;
          padding: 16px;
          max-width: 310px;
          width: 100%;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.65);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .tour-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .tour-step-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(0, 173, 181, 0.12);
          color: var(--accent-primary, #00ADB5);
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .tour-close-btn {
          background: transparent;
          border: none;
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
          padding: 2px;
          border-radius: 50%;
          transition: all 0.2s ease;
        }
        .tour-close-btn:hover {
          color: var(--text-primary, #fff);
          background: rgba(255, 255, 255, 0.1);
        }

        .tour-card-body {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }

        .tour-icon-wrap {
          background: var(--bg-secondary, #1B2333);
          border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
          padding: 8px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .tour-text-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .tour-badge-pill {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--accent-primary, #00ADB5);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .tour-title {
          font-size: 0.98rem;
          font-weight: 800;
          color: var(--text-primary, #fff);
          margin: 0;
          line-height: 1.2;
        }

        .tour-description {
          font-size: 0.78rem;
          color: var(--text-secondary, #cbd5e1);
          line-height: 1.35;
          margin: 2px 0 0 0;
        }

        .tour-progress-bar {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .tour-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--bg-secondary, rgba(255, 255, 255, 0.18));
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tour-dot.active {
          width: 16px;
          border-radius: 8px;
          background: var(--accent-primary, #00ADB5);
        }

        .tour-dot.completed {
          background: rgba(0, 173, 181, 0.5);
        }

        .tour-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 6px;
          border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
        }

        .tour-btn {
          border: none;
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 0.76rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s ease;
        }

        .tour-nav-btns {
          display: flex;
          gap: 6px;
        }

        .tour-back-btn {
          background: var(--bg-secondary, #1B2333);
          color: var(--text-secondary, #cbd5e1);
          border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
        }
        .tour-back-btn:hover {
          background: var(--bg-surface, #232D3F);
          color: var(--text-primary, #fff);
        }

        .tour-next-btn {
          background: var(--accent-primary, #00ADB5);
          color: #fff;
          font-weight: 700;
          padding: 5px 14px;
        }
        .tour-next-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        @keyframes pulseBorder {
          0%, 100% {
            border-color: var(--accent-primary, #00ADB5);
            box-shadow: 0 0 14px rgba(0, 173, 181, 0.4);
          }
          50% {
            border-color: #3b82f6;
            box-shadow: 0 0 22px rgba(59, 130, 246, 0.6);
          }
        }
      `}</style>
    </div>
  );
};

export default OnboardingTour;
