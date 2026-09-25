import React from 'react';
import { VIP_FRAME_URL } from '@/lib/vipHelper';

/**
 * Wraps a profile image with the VIP golden frame overlay.
 * Usage: wrap any img or avatar element inside this.
 * Props:
 *   active: bool — show frame if true
 *   size: CSS size string (default '100%')
 *   className: extra classes on the outer wrapper
 */
export default function VipFrame({ active, children, className = '' }) {
  if (!active) return <>{children}</>;

  return (
    <div className={`relative ${className}`} style={{ isolation: 'isolate' }}>
      <div className="relative" style={{ zIndex: 1 }}>{children}</div>
      <img
        src={VIP_FRAME_URL}
        alt="VIP Frame"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none"
        style={{ zIndex: 20 }}
      />
    </div>
  );
}