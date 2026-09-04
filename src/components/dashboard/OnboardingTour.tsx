"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ShieldCheck, User, RefreshCw, Trash2, ArrowRight, ArrowLeft, X, Sparkles, Smartphone } from "lucide-react";

export interface Step {
  targetSelector: string;
  title: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
}

const getTourSteps = (isMobile: boolean): Step[] => [
  {
    targetSelector: isMobile ? '[data-tour="install-pwa"]' : '[data-tour="security-badge"]',
    title: isMobile ? "Install as Web App" : "Data Security",
    badge: isMobile ? "Web App" : "Encrypted",
    description: isMobile ? "Add to your home screen for fast 1-tap access anytime." : "All records are end-to-end encrypted.",
    icon: isMobile ? <Smartphone size={20} style={{ color: "#00ADB5" }} /> : <ShieldCheck size={20} style={{ color: "#10b981" }} />,
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
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== "undefined" && window.innerWidth <= 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const tourSteps = useMemo(() => getTourSteps(isMobile), [isMobile]);
  const currentStep = tourSteps[currentStepIdx] || tourSteps[0];

  const updateSpotlight = useCallback(() => {
    if (!currentStep) return;
    
    // On mobile Step 1 (Install as App), center smoothly as a welcome modal
    if (isMobile && currentStepIdx === 0) {
      setSpotlightRect(null);
      return;
    }

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
  }, [currentStep, isMobile, currentStepIdx]);

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
  const isLastStep = currentStepIdx === tourSteps.length - 1;

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
    const mobileTop = Math.max(20, (window.innerHeight - estimatedCardHeight) / 2);

    // Specially center Step 1 pop-up OR any step when target element is not on current page in middle of screen on mobile
    if (isMobile && (currentStepIdx === 0 || !spotlightRect)) {
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
      const desktopLeft = Math.max(20, (window.innerWidth - cardWidth) / 2);
      const desktopTop = Math.max(20, (window.innerHeight - estimatedCardHeight) / 2);
      return {
        position: "fixed",
        top: `${desktopTop}px`,
        left: `${desktopLeft}px`,
        width: `${cardWidth}px`,
        margin: 0,
        zIndex: 10001,
        pointerEvents: "auto",
        transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
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
            <span>Step {currentStepIdx + 1} of {tourSteps.length}</span>
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
            {tourSteps.map((stepItem, idx) => (
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
    </div>
  );
};

export default OnboardingTour;
