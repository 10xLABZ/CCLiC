import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { RefreshCw, Save, GraduationCap, Play, Crown, Info, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { getPlayerData } from "@/components/utils/playerStorage";
import { equipCosmetics, saveProfileCore } from "@/lib/playerServerSync";
import { getOwnedFrames } from "@/components/frames/framesStorage";
import { getFrameById } from "@/components/frames/framesData";
import { ALL_SCENES } from "@/components/store/scenesData";
import { ALL_THEMES } from "@/components/store/themesData";
import { AVATARS } from "@/components/store/catalogData";
import CosmeticSaveOverlay from "@/components/profile/CosmeticSaveOverlay";
import MiniProfilePreview from "@/components/profile/MiniProfilePreview";
import CustomizeSelectionColumn from "@/components/profile/CustomizeSelectionColumn";
import ProfileImageSubPicker from "@/components/profile/ProfileImageSubPicker";
import { getAvatarUrl, DEFAULT_AVATARS } from "@/components/profile/avatarUtils";

const BG_URL = "https://media.base44.com/images/public/699169456a354d6cb7082777/39addec8d_a-bg-city1.jpg";

/**
 * Onboarding customize step — duplicate of CustomizeProfileOverlay, modified
 * for the onboarding flow. Cannot be exited. Pre-fills username and profile
 * image from the Welcome step. Two save buttons: "Save & Go to Tutorial" and
 * "Save & Play Now". Save logic is identical to the original.
 */
export default function OnboardingCustomizeStep({ initialUsername, initialProfileImage, onPlayNow, onGoToTutorial }) {
  const [playerData, setPlayerData] = useState(() => getPlayerData());
  const [draftAvatar, setDraftAvatar] = useState(() => getPlayerData().equippedAvatarId || 'avatar_male_01');
  const [draftScene, setDraftScene] = useState(() => getPlayerData().equippedSceneId || 'scene_default_01');
  const [draftTheme, setDraftTheme] = useState(() => getPlayerData().equippedThemeId || 'theme_001_rusty_hotness');
  const [draftProfileImage, setDraftProfileImage] = useState(initialProfileImage);
  const [draftFrameId, setDraftFrameId] = useState(null);
  const [draftUsername, setDraftUsername] = useState(initialUsername || "");
  const [draftGender, setDraftGender] = useState(() => getPlayerData().gender || 'M');
  const [subPickerOpen, setSubPickerOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // Listen for player_synced events to keep local copy fresh
  useEffect(() => {
    const handleSync = () => setPlayerData(getPlayerData());
    window.addEventListener('player_synced', handleSync);
    return () => window.removeEventListener('player_synced', handleSync);
  }, []);

  const isDirty = (
    draftAvatar !== (playerData.equippedAvatarId || 'avatar_male_01') ||
    draftScene !== (playerData.equippedSceneId || 'scene_default_01') ||
    draftTheme !== (playerData.equippedThemeId || 'theme_001_rusty_hotness') ||
    draftProfileImage !== (playerData.profileImageDataUrl) ||
    draftFrameId !== (playerData.equippedFrameId || null) ||
    (draftUsername.trim() !== (playerData.username || "")) ||
    draftGender !== (playerData.gender || null)
  );

  // Build item lists for columns
  const avatarItems = [
    ...DEFAULT_AVATARS.male.map(a => ({ id: a.id, imageUrl: a.url, name: a.name })),
    ...DEFAULT_AVATARS.female.map(a => ({ id: a.id, imageUrl: a.url, name: a.name })),
    ...AVATARS
      .filter(a => (playerData.inventory?.avatars || {})[a.id] > 0)
      .map(a => ({ id: a.id, imageUrl: a.imageUrl, name: a.name })),
  ];

  const defaultSceneIds = ['scene_default_01', 'scene_default_02', 'scene_default_03'];
  const sceneInventory = playerData.inventory?.scenes || {};
  const sceneItems = ALL_SCENES
    .filter(s => defaultSceneIds.includes(s.id) || sceneInventory[s.id] > 0)
    .map(s => ({ id: s.id, imageUrl: s.imageUrl, name: s.name }));

  const defaultThemeIds = ['theme_001_rusty_hotness'];
  const themeInventory = playerData.inventory?.themes || {};
  const themeItems = ALL_THEMES
    .filter(t => defaultThemeIds.includes(t.id) || themeInventory[t.id] > 0)
    .map(t => ({ id: t.id, imageUrl: t.previewImage, name: t.name }));

  // Frame URL for center preview
  const ownedFrames = getOwnedFrames(playerData);
  const draftFrameUrl = (() => {
    if (!draftFrameId) return null;
    const isOwned = ownedFrames.some(f => f.id === draftFrameId);
    if (!isOwned) return null;
    return getFrameById(draftFrameId)?.imageUrl || null;
  })();

  // Resolve selected theme's username plate image
  const draftThemeObj = ALL_THEMES.find(t => t.id === draftTheme);
  const themeUsernameImage = draftThemeObj?.usernameImage || null;

  // Central save logic — identical to CustomizeProfileOverlay. Returns true on success.
  const performSave = async () => {
    setSaveStatus('saving');
    try {
      const trimmedUsername = draftUsername.trim();

      // Username validation (only if changed)
      if (trimmedUsername !== (playerData.username || "")) {
        if (trimmedUsername.length < 3 || trimmedUsername.length > 16) {
          toast.error("Name must be 3-16 characters");
          setSaveStatus(null);
          return false;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
          toast.error("Only letters, numbers, and underscore allowed");
          setSaveStatus(null);
          return false;
        }
        const existing = await base44.entities.PlayerProfile.filter({ username: trimmedUsername });
        if (existing && existing.length > 0) {
          toast.error("That username is already taken.");
          setSaveStatus(null);
          return false;
        }
      }

      // Save cosmetics (avatar/scene/theme) atomically
      await equipCosmetics({ avatar: draftAvatar, scene: draftScene, theme: draftTheme });

      // Save core profile fields atomically
      const coreUpdates = {};
      if (draftProfileImage !== playerData.profileImageDataUrl) {
        coreUpdates.profileImageDataUrl = draftProfileImage;
      }
      if (draftFrameId !== (playerData.equippedFrameId || null)) {
        coreUpdates.equippedFrameId = draftFrameId;
      }
      if (trimmedUsername !== (playerData.username || "")) {
        coreUpdates.username = trimmedUsername;
      }
      if (draftGender !== playerData.gender) {
        coreUpdates.gender = draftGender;
      }
      if (Object.keys(coreUpdates).length > 0) {
        await saveProfileCore(coreUpdates);
      }

      setPlayerData(getPlayerData());
      setSaveStatus('success');
      return true;
    } catch (err) {
      toast.error("Failed to save. Please try again.");
      setSaveStatus(null);
      return false;
    }
  };

  const handleSaveAndTutorial = async () => {
    const success = await performSave();
    if (success) {
      setTimeout(() => {
        setSaveStatus(null);
        onGoToTutorial();
      }, 800);
    }
  };

  const handleSaveAndPlay = async () => {
    const success = await performSave();
    if (success) {
      setTimeout(() => {
        setSaveStatus(null);
        onPlayNow();
      }, 800);
    }
  };

  return ReactDOM.createPortal(
    <>
      <div
        className="fixed inset-0 z-[10001] overflow-y-auto"
        style={{
          backgroundImage: `url(${BG_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="min-h-full bg-black/50">
          {/* Header — no back button (non-skippable) */}
          <div className="flex items-center gap-2 p-3 sticky top-0 bg-black/70 backdrop-blur-sm z-10">
            <div className="flex-1 text-center">
              <h1 className="text-amber-400 text-lg font-bold tracking-wide">CUSTOMIZE YOUR PROFILE</h1>
            </div>
          </div>

          <div className="max-w-md mx-auto px-3 pb-6">
            {/* TOP PREVIEW SECTION */}
            <div className="bg-[#0a0c0e]/90 border border-slate-800 rounded-xl p-3 mb-3">
              <div className="flex gap-2 items-start">
                {/* Left: mini preview */}
                <MiniProfilePreview
                  playerData={playerData}
                  draftAvatar={draftAvatar}
                  draftScene={draftScene}
                  draftUsername={draftUsername}
                  draftProfileImage={draftProfileImage}
                  draftFrameId={draftFrameId}
                />

                {/* Center: profile image + frame + edit */}
                <div className="flex flex-col items-center justify-center gap-1 shrink-0">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-xl border-2 border-[#2ecc71] overflow-hidden bg-slate-900">
                      {draftProfileImage ? (
                        <img src={draftProfileImage} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600 text-3xl">👤</div>
                      )}
                      {draftFrameUrl && (
                        <img
                          src={draftFrameUrl}
                          alt="Frame"
                          className="absolute inset-0 w-full h-full object-fill pointer-events-none"
                        />
                      )}
                    </div>
                    <button
                      onClick={() => setSubPickerOpen(true)}
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#2ecc71] hover:bg-[#27ae60] flex items-center justify-center shadow-lg border-2 border-[#0a0c0e] transition-colors"
                    >
                      <RefreshCw className="w-3 h-3 text-white" />
                    </button>
                  </div>
                  <div className="text-[8px] text-[#2ecc71] font-bold uppercase tracking-wider">PROFILE PIC</div>
                  <div className="flex gap-0.5 mt-0.5">
                    {[
                      { key: 'M', icon: '🚹' },
                      { key: 'F', icon: '🚺' },
                      { key: 'NB', icon: '⚧' },
                    ].map(g => (
                      <button
                        key={g.key}
                        onClick={() => setDraftGender(g.key)}
                        className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-colors ${
                          draftGender === g.key
                            ? 'bg-[#2ecc71] text-white'
                            : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                        }`}
                      >
                        {g.icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right: REMEMBER container */}
                <div className="flex-1 bg-amber-950/20 border border-amber-700/30 rounded-lg p-2.5 flex flex-col">
                  <div className="text-[#f1c40f] text-[11px] font-bold flex items-center gap-1 mb-1.5">
                    <Crown className="w-3.5 h-3.5" /> REMEMBER
                    <Info
                      className="w-3 h-3 text-amber-500 ml-auto cursor-help shrink-0"
                      title="Change your avatar, scene, and theme anytime. All changes will be saved together."
                    />
                  </div>
                  <div className="text-[10px] text-slate-300 leading-snug">
                    Change your avatar, scene, and theme anytime. All changes will be saved together.
                  </div>
                </div>
              </div>

              {/* Username row */}
              <div className="flex gap-2 mt-3 items-center">
                <div
                  className="flex-1 flex items-center gap-1 rounded-lg px-2 py-1.5 relative"
                  style={themeUsernameImage ? {
                    backgroundImage: `url(${themeUsernameImage})`,
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                  } : {
                    backgroundColor: 'rgba(15,23,42,0.6)',
                    border: '1px solid hsl(217, 33%, 17%)',
                  }}
                >
                  <input
                    value={draftUsername}
                    onChange={e => setDraftUsername(e.target.value)}
                    maxLength={16}
                    className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder-slate-600 text-center font-bold"
                    placeholder="Enter username"
                  />
                </div>
              </div>
            </div>

            {/* 3 COLUMNS */}
            <div className="grid grid-cols-3 gap-2 mb-3" style={{ height: '300px' }}>
              <CustomizeSelectionColumn
                title="CHOOSE AVATAR"
                items={avatarItems}
                selectedId={draftAvatar}
                onSelect={setDraftAvatar}
                aspectRatio="3/4"
              />
              <CustomizeSelectionColumn
                title="CHOOSE SCENE"
                items={sceneItems}
                selectedId={draftScene}
                onSelect={setDraftScene}
                aspectRatio="9/16"
              />
              <CustomizeSelectionColumn
                title="CHOOSE THEME"
                items={themeItems}
                selectedId={draftTheme}
                onSelect={setDraftTheme}
                aspectRatio="16/9"
              />
            </div>

            {/* TWO SAVE BUTTONS */}
            <div className="space-y-2">
              <button
                onClick={handleSaveAndTutorial}
                disabled={saveStatus !== null}
                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:pointer-events-none"
                style={{ backgroundColor: '#3b82f6', color: '#fff' }}
              >
                <GraduationCap className="w-4 h-4" /> SAVE & GO TO TUTORIAL
              </button>
              <button
                onClick={handleSaveAndPlay}
                disabled={saveStatus !== null}
                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:pointer-events-none"
                style={{ backgroundColor: '#2ecc71', color: '#fff' }}
              >
                <Play className="w-4 h-4" /> SAVE & PLAY NOW!
              </button>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <AlertTriangle className="w-3 h-3 text-[#f1c40f]" />
                <p className="text-[10px] text-[#f1c40f]">
                  You can keep changing your selections anytime before saving.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Image / Frame Sub-Picker */}
      <ProfileImageSubPicker
        open={subPickerOpen}
        onClose={() => setSubPickerOpen(false)}
        draftProfileImage={draftProfileImage}
        draftFrameId={draftFrameId}
        onSelectImage={setDraftProfileImage}
        onSelectFrame={setDraftFrameId}
        playerData={playerData}
      />

      {/* Save Overlay — blocks all interaction until server confirms */}
      <CosmeticSaveOverlay status={saveStatus} />
    </>,
    document.body
  );
}