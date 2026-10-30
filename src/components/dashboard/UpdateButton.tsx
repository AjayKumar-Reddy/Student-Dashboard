import React, { useState } from 'react';
import { RefreshCw, Clock } from 'lucide-react';

interface UpdateButtonProps {
  onClick: () => void;
  isLoading: boolean;
  cooldownActive: boolean;
  formattedCooldown: string;
}

/**
 * UpdateButton: The main CTA for triggering a dashboard refresh.
 * Features a pulsing glow animation on login and a cooldown timer state.
 */
export const UpdateButton: React.FC<UpdateButtonProps> = ({ 
  onClick, 
  isLoading, 
  cooldownActive, 
  formattedCooldown 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Glow is active only if not loading, not on cooldown, no hover, and no previous interaction
  const showGlow = !isLoading && !cooldownActive && !isHovered && !hasInteracted;

  const handleClick = () => {
    if (isLoading || cooldownActive) return;
    setHasInteracted(true);
    onClick();
  };

  return (
    <button 
      data-tour="update-btn"
      className={`update-dashboard-btn ${showGlow ? 'glow-cta' : ''} ${cooldownActive ? 'cooldown' : ''}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isLoading || cooldownActive}
      title={cooldownActive ? `Cooldown active. Next update in ${formattedCooldown}` : 'Refresh dashboard data'}
    >
      <div className="btn-content">
        {cooldownActive ? (
          <>
            <Clock size={16} className="btn-icon" />
            <div className="btn-text-col">
              <span className="btn-text-top">Next update</span>
              <span className="btn-text-bottom">in {formattedCooldown}</span>
            </div>
          </>
        ) : (
          <>
            <RefreshCw size={16} className={`btn-icon ${isLoading ? 'spinning' : ''}`} />
            <div className="btn-text-col">
              {isLoading ? (
                <>
                  <span className="btn-text-top">Updating</span>
                  <span className="btn-text-bottom">Dashboard...</span>
                </>
              ) : (
                <>
                  <span className="btn-text-top">Update</span>
                  <span className="btn-text-bottom">Dashboard</span>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </button>
  );
};
