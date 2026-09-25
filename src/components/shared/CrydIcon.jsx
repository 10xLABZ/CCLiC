import React from 'react';

// Reusable CRYD icon with purple glow - replaces the Octagon icon everywhere CRYD is shown
export default function CrydIcon({ size = 14, className = '' }) {
  return (
    <img
      src="https://media.base44.com/images/public/699169456a354d6cb7082777/0b165cb20_cryd3b.png"
      alt="CRYD"
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        filter: 'drop-shadow(0 0 4px rgba(168,85,247,0.8)) drop-shadow(0 0 8px rgba(139,92,246,0.5))',
        verticalAlign: 'middle',
      }}
      className={className}
    />
  );
}