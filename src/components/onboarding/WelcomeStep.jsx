import React, { useState } from "react";
import ReactDOM from "react-dom";
import { ArrowRight, User } from "lucide-react";
import { PROFILE_IMAGES } from "@/components/profile/avatarUtils";

const BG_URL = "https://media.base44.com/images/public/699169456a354d6cb7082777/39addec8d_a-bg-city1.jpg";

/**
 * Welcome popup — shown to new players. Cannot be skipped or exited.
 * Collects a username and profile image, then passes them to the
 * onboarding customize step.
 */
export default function WelcomeStep({ onContinue }) {
  const [username, setUsername] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [error, setError] = useState(null);

  const canContinue = username.trim().length >= 3 && selectedImage !== null;

  const handleContinue = () => {
    const trimmed = username.trim();
    if (trimmed.length < 3 || trimmed.length > 16) {
      setError("Username must be 3-16 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setError("Only letters, numbers, and underscore allowed");
      return;
    }
    if (!selectedImage) {
      setError("Please select a profile image");
      return;
    }
    setError(null);
    onContinue({ username: trimmed, profileImage: selectedImage });
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[10001] overflow-y-auto"
      style={{
        backgroundImage: `url(${BG_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="min-h-full bg-black/70 flex flex-col items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-md">
          {/* Welcome header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-600/20 border-2 border-amber-500 mb-4">
              <User className="w-10 h-10 text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-wide">WELCOME</h1>
            <p className="text-sm text-slate-300">
              Create your username and pick a profile image to get started.
            </p>
          </div>

          {/* Username field */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
              Choose Your Username
            </label>
            <input
              value={username}
              onChange={e => { setUsername(e.target.value); setError(null); }}
              maxLength={16}
              placeholder="Enter username (3-16 chars)"
              className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border-2 border-slate-700 text-white text-center font-bold focus:border-amber-500 focus:outline-none transition-colors"
            />
            <p className="text-[10px] text-slate-500 mt-1 text-center">
              Letters, numbers, and underscore only
            </p>
          </div>

          {/* Profile image selection */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
              Select Your Profile Image
            </label>
            <div className="grid grid-cols-5 gap-2 max-h-[40vh] overflow-y-auto p-1">
              {PROFILE_IMAGES.map((url, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedImage(url); setError(null); }}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                    selectedImage === url
                      ? 'border-amber-500 ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/20'
                      : 'border-slate-700 hover:border-amber-600'
                  }`}
                >
                  <img src={url} alt={`Profile ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 text-center text-red-400 text-sm font-semibold bg-red-950/40 border border-red-800/40 rounded-lg py-2 px-4">
              {error}
            </div>
          )}

          {/* Continue button */}
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:pointer-events-none"
            style={{ backgroundColor: '#f59e0b', color: '#000' }}
          >
            CONTINUE <ArrowRight className="w-5 h-5" />
          </button>

          <p className="text-center text-[10px] text-slate-500 mt-3">
            You can customize your avatar, scene, and theme on the next screen.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}