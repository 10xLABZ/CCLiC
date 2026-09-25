import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, RefreshCw, Save, ShoppingBag, Pencil, Crown, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { getPlayerData } from "../utils/playerStorage";
import { equipCosmetics, saveProfileCore } from "@/lib/playerServerSync";
import { getOwnedFrames } from "../frames/framesStorage";
import { getFrameById } from "../frames/framesData";
import { ALL_SCENES } from "@/components/store/scenesData";
import { ALL_THEMES } from "@/components/store/themesData";
import { AVATARS } from "@/components/store/catalogData";
import CosmeticSaveOverlay from "./CosmeticSaveOverlay";
import MiniProfilePreview from "./MiniProfilePreview";
import CustomizeSelectionColumn from "./CustomizeSelectionColumn";
import ProfileImageSubPicker from "./ProfileImageSubPicker";
import { getAvatarUrl, DEFAULT_AVATARS } from "./avatarUtils";

const BG_URL = "https://media.base44.com/images/public/699169456a354d6cb7082777/39addec8d_a-bg-city1.jpg";
const HEADER_URL = "https://media.base44.com/images/public/699169456a354d6cb7082777/60d4a2234_customizeprofile1.jpg";

export default function CustomizeProfileOverlay({ open, onClose }) {
  const navigate = useNavigate();
  const [playerData, setPlayerData] = useState(() => getPlayerData());
  const [draftAvatar, setDraftAvatar] = useState(null);
  const [draftScene, setDraftScene] = useState(null);
  const [draftTheme, setDraftTheme] = useState(null);
  const [draftProfileImage, setDraftProfileImage] = useState(null);
  const [draftFrameId, setDraftFrameId] = useState(null);
  const [draftUsername, setDraftUsername] = useState("");
  const [draftGender, setDraftGender] = useState(null);
  const [subPickerOpen, setSubPickerOpen] = useState(false);
  const [shopPromptOpen, setShopPromptOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // Initialize drafts from server-backed state when overlay opens
  useEffect(() => {
    if (open) {
      const pd = getPlayerData();
      setPlayerData(pd);
      setDraftAvatar(pd.equippedAvatarId);
      setDraftScene(pd.equippedSceneId);
      setDraftTheme(pd.equippedThemeId);
      setDraftProfileImage(pd.profileImageDataUrl);
      setDraftFrameId(pd.equippedFrameId);
      setDraftUsername(pd.username || "");
      setDraftGender(pd.gender || null);
    }
  }, [open]);

  // Listen for player_synced events to keep local copy fresh
  useEffect(() => {
    if (!open) return;
    const handleSync = () => setPlayerData(getPlayerData());
    window.addEventListener('player_synced', handleSync);
    return () => window.removeEventListener('player_synced', handleSync);
  }, [open]);

  const isDirty = open && (
    draftAvatar !== playerData.equippedAvatarId ||
    draftScene !== playerData.equippedSceneId ||
    draftTheme !== playerData.equippedThemeId ||
    draftProfileImage !== playerData.profileImageDataUrl ||
    draftFrameId !== playerData.equippedFrameId ||
    (draftUsername.trim() !== (playerData.username || "")) ||
    draftGender !== playerData.gender
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

  // Central save logic — returns true on success, false on failure
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
      if (draftFrameId !== playerData.equippedFrameId) {
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

  const handleSave = async () => {
    const success = await performSave();
    if (success) {
      setTimeout(() => {
        setSaveStatus(null);
        onClose();
      }, 800);
    }
  };

  // Shop handlers — prompt if dirty
  const handleShop = () => {
    if (isDirty) {
      setShopPromptOpen(true);
    } else {
      onClose();
      navigate(createPageUrl("ShopPage"));
    }
  };

  const handleShopSaveAndGo = async () => {
    setShopPromptOpen(false);
    const success = await performSave();
    if (success) {
      setTimeout(() => {
        setSaveStatus(null);
        onClose();
        navigate(createPageUrl("ShopPage"));
      }, 800);
    }
  };

  const handleShopLeaveWithoutSaving = () => {
    setShopPromptOpen(false);
    onClose();
    navigate(createPageUrl("ShopPage"));
  };

  const hasSpace = /\s/.test(draftUsername);

  if (!open) return null;

  return ReactDOM.createPortal(
    <>
      <div
        className="fixed inset-0 z-[9998] overflow-y-auto"
        style={{
          backgroundImage: `url(${BG_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="min-h-full bg-black/50">
          {/* Header with back button */}
          <div className="flex items-center gap-2 p-3 sticky top-0 bg-black/70 backdrop-blur-sm z-10">
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 border border-slate-600 text-white hover:bg-slate-700 transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <img
              src={HEADER_URL}
              alt="Customize Your Profile"
              className="flex-1 max-h-10 object-contain min-w-0"
            />
          </div>

          <div className="max-w-md mx-auto px-3 pb-6">
            {/* ── TOP PREVIEW SECTION ── */}
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

              {/* Username + Shop row */}
              <div className="flex gap-2 mt-3 items-center">
                <div
                  className={`flex-1 flex items-center gap-1 rounded-lg px-2 py-1.5 relative ${hasSpace ? 'ring-2 ring-red-500' : ''}`}
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
                  {hasSpace ? (
                    <span className="text-[8px] text-red-400 font-bold whitespace-nowrap shrink-0">NO SPACES ALLOWED</span>
                  ) : (
                    <Pencil className="w-3 h-3 text-slate-500 shrink-0" />
                  )}
                </div>
                <button
                  onClick={handleShop}
                  className="px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors shrink-0"
                  style={{ backgroundColor: '#00a8ff', color: '#fff' }}
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> SHOP
                </button>
              </div>
            </div>

            {/* ── 3 COLUMNS ── */}
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

            {/* ── SAVE BUTTON ── */}
            <div>
              <button
                onClick={handleSave}
                disabled={!isDirty || saveStatus !== null}
                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:pointer-events-none"
                style={{ backgroundColor: '#2ecc71', color: '#fff' }}
              >
                <Save className="w-4 h-4" /> SAVE & CONTINUE
              </button>
              <p className="text-center text-[10px] text-slate-400 mt-1.5">
                All your changes will be saved together.
              </p>
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

      {/* Shop Prompt — save or lose changes */}
      <Dialog open={shopPromptOpen} onOpenChange={() => setShopPromptOpen(false)}>
        <DialogContent className="bg-[#0a0f1a] border border-slate-700 text-white max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-amber-400">Unsaved Changes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-300">
            You have unsaved changes. Save before going to Shop?
          </p>
          <div className="flex flex-col gap-2 mt-2">
            <Button
              onClick={handleShopSaveAndGo}
              className="w-full text-white"
              style={{ backgroundColor: '#2ecc71' }}
            >
              Save & Go to Shop
            </Button>
            <Button
              onClick={handleShopLeaveWithoutSaving}
              variant="outline"
              className="w-full border-red-700 text-red-400"
            >
              Leave Without Saving
            </Button>
            <Button
              onClick={() => setShopPromptOpen(false)}
              variant="ghost"
              className="w-full text-slate-400"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Overlay — blocks all interaction until server confirms */}
      <CosmeticSaveOverlay status={saveStatus} />
    </>,
    document.body
  );
}