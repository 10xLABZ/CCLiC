import React from "react";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
      <img 
        src="https://media.base44.com/images/public/699169456a354d6cb7082777/f1df0f901_LoadingScreen1.png" 
        alt="Loading..." 
        className="w-full h-full object-cover"
      />
    </div>
  );
}