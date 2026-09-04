"use client";

import React from "react";

const LoadingScreen: React.FC = () => {
    return (
        <div className="fresh-loading-container" role="status" aria-label="Loading" suppressHydrationWarning>
            {/* Ambient background glow */}
            <div className="ambient-backdrop-glow" suppressHydrationWarning />

            <div className="loader-central-hub" suppressHydrationWarning>
                {/* Orbital System around centered logo */}
                <div className="orbit-wrapper" suppressHydrationWarning>
                    {/* Outer Rotating Glowing Ring with Beacon */}
                    <div className="orbit-ring outer-ring" suppressHydrationWarning>
                        <div className="orbital-beacon" suppressHydrationWarning />
                    </div>

                    {/* Counter-Rotating Inner Segmented Ring */}
                    <div className="orbit-ring inner-ring" suppressHydrationWarning />

                    {/* Ambient Breathing Backdrop Glow */}
                    <div className="emblem-backdrop-glow" suppressHydrationWarning />

                    {/* Emblem Pedestal Pod */}
                    <div className="emblem-pedestal" suppressHydrationWarning>
                        <img 
                            src="/logo-icon.svg" 
                            alt="Loading" 
                            className="emblem-svg"
                            suppressHydrationWarning
                        />
                        <div className="specular-shimmer-sweep" suppressHydrationWarning />
                    </div>
                </div>

                {/* Sleek Minimalist Glass Progress Beam */}
                <div className="progress-glass-track" suppressHydrationWarning>
                    <div className="progress-gradient-beam" suppressHydrationWarning />
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
