import React from 'react';

export default function GoogleSpinner({ 
  size = 48, 
  strokeWidth = 3.6, 
  variant = 'google', // 'google' (4 signature colors) or 'primary' (blue)
  className = '',
  style = {}
}) {
  return (
    <div 
      className={`google-spinner ${className}`} 
      style={{ width: `${size}px`, height: `${size}px`, ...style }}
    >
      <svg 
        className="google-spinner-circular" 
        viewBox="0 0 50 50"
      >
        <circle 
          className={`google-spinner-path ${variant === 'primary' ? 'primary' : ''}`}
          cx="25" 
          cy="25" 
          r="20" 
          fill="none" 
          strokeWidth={strokeWidth} 
          strokeMiterlimit="10"
        />
      </svg>
    </div>
  );
}

export function LoadingScreen({
  fullPage = false,
  size = 50,
  variant = 'google'
}) {
  if (fullPage) {
    return (
      <div className="google-loading-screen">
        <GoogleSpinner size={size} variant={variant} strokeWidth={3.8} />
      </div>
    );
  }

  return (
    <div className="google-loading-container">
      <GoogleSpinner size={size} variant={variant} strokeWidth={3.8} />
    </div>
  );
}

