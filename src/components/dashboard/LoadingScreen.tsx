"use client";

import React from "react";

const LoadingScreen: React.FC = () => {
    return (
        <div className="fresh-loading-container" aria-label="Loading" aria-busy="true">
            {/* Ambient background glow */}
            <div className="ambient-backdrop-glow" />

            <div className="loader-central-hub">
                {/* Orbital System around centered logo */}
                <div className="orbit-wrapper">
                    {/* Outer Rotating Glowing Ring with Beacon */}
                    <div className="orbit-ring outer-ring">
                        <div className="orbital-beacon" />
                    </div>

                    {/* Counter-Rotating Inner Segmented Ring */}
                    <div className="orbit-ring inner-ring" />

                    {/* Ambient Breathing Backdrop Glow */}
                    <div className="emblem-backdrop-glow" />

                    {/* Emblem Pedestal Pod */}
                    <div className="emblem-pedestal">
                        <img 
                            src="/logo-icon.svg" 
                            alt="Loading" 
                            className="emblem-svg"
                        />
                        <div className="specular-shimmer-sweep" />
                    </div>
                </div>

                {/* Sleek Minimalist Glass Progress Beam */}
                <div className="progress-glass-track">
                    <div className="progress-gradient-beam" />
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
