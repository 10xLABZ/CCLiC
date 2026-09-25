import React, { useState, useEffect } from "react";

const FRAMES = [
  "https://media.base44.com/images/public/699169456a354d6cb7082777/726e83624_tradedeskB.jpg",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/4f27b4b71_tradedeskBa.JPG",
];

const FRAME_DURATION = 400; // ms per frame

export default function TradeDeskButton() {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % FRAMES.length);
    }, FRAME_DURATION);
    return () => clearInterval(interval);
  }, []);

  return (
    <img
      src={FRAMES[frameIndex]}
      alt="Enter Trade Desk"
      className="w-full block"
    />
  );
}