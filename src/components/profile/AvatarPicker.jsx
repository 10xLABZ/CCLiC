import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RectangleVertical, ShoppingBag, Save } from "lucide-react";
import { getPlayerData } from "../utils/playerStorage";
import { ALL_SCENES } from "@/components/store/scenesData";
import { ALL_THEMES } from "@/components/store/themesData";
import { AVATARS } from "@/components/store/catalogData";
import { AVATAR_ABILITIES, getAvatarStarProgress, getMaxStarForLevel } from "@/components/avatar/avatarAbilities";
import { DEFAULT_AVATARS, getAvatarUrl } from "./avatarUtils";

export { getAvatarUrl };

/**
 * Draft-based customization picker.
 *
 * The user selects avatar, scene, and theme entirely in local draft state.
 * Nothing touches the server until they click SAVE — at which point
 * onSave({ avatar, scene, theme }) is called and the parent blocks the UI
 * with a save overlay until the server confirms.
 */
export default function AvatarPicker({ open, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('avatars');
  const [draftAvatar, setDraftAvatar] = useState(null);
  const [draftScene, setDraftScene] = useState(null);
  const [draftTheme, setDraftTheme] = useState(null);

  const playerData = getPlayerData();

  // Initialize draft from current server-backed state when modal opens
  useEffect(() => {
    if (open) {
      setDraftAvatar(playerData.equippedAvatarId);
      setDraftScene(playerData.equippedSceneId);
      setDraftTheme(playerData.equippedThemeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isDirty =
    draftAvatar !== playerData.equippedAvatarId ||
    draftScene !== playerData.equippedSceneId ||
    draftTheme !== playerData.equippedThemeId;

  const handleSave = () => {
    if (!isDirty) { onClose(); return; }
    onSave({ avatar: draftAvatar, scene: draftScene, theme: draftTheme });
  };

  const allAvatars = [...DEFAULT_AVATARS.male, ...DEFAULT_AVATARS.female];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0f1a] border border-slate-800 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-emerald-400">Customize Profile</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4 items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'avatars' ? 'default' : 'outline'}
              onClick={() => setActiveTab('avatars')}
              className={activeTab === 'avatars' ? 'bg-emerald-600 hover:bg-emerald-500' : 'border-slate-700 text-black hover:bg-slate-100'}
            >
              Avatars
            </Button>
            <Button
              variant={activeTab === 'scenes' ? 'default' : 'outline'}
              onClick={() => setActiveTab('scenes')}
              className={activeTab === 'scenes' ? 'bg-emerald-600 hover:bg-emerald-500' : 'border-slate-700 text-black hover:bg-slate-100'}
            >
              Scenes
            </Button>
            <Button
              variant={activeTab === 'themes' ? 'default' : 'outline'}
              onClick={() => setActiveTab('themes')}
              className={activeTab === 'themes' ? 'bg-emerald-600 hover:bg-emerald-500' : 'border-slate-700 text-black hover:bg-slate-100'}
            >
              Themes
            </Button>
          </div>
          <Link to={createPageUrl("ShopPage")} onClick={onClose}>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-500 gap-1.5 text-xs">
              <ShoppingBag className="w-3.5 h-3.5" />
              Shop
            </Button>
          </Link>
        </div>

        {activeTab === 'avatars' ? (
          <div className="mt-4 space-y-4">
            <div>
              <div className="text-sm text-slate-400 mb-3">Default Avatars (Free)</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {allAvatars.map((avatar) => {
                  const isSelected = draftAvatar === avatar.id;
                  const ab = AVATAR_ABILITIES[avatar.id];
                  const totalSpent = (playerData.avatarUpgrades || {})[avatar.id] || 0;
                  const { star } = getAvatarStarProgress(totalSpent);
                  const maxStar = getMaxStarForLevel(playerData.level || 1);
                  return (
                    <button
                      key={avatar.id}
                      onClick={() => setDraftAvatar(avatar.id)}
                      className={`flex flex-col rounded-lg overflow-hidden border-2 hover:border-emerald-500 cursor-pointer transition-all ${isSelected ? 'border-emerald-500' : 'border-slate-700'}`}
                    >
                      <div className="relative bg-slate-900/30" style={{ aspectRatio: '3/4' }}>
                        <img src={avatar.url} alt={avatar.name} className="w-full h-full object-contain" />
                        {isSelected && <div className="absolute top-1 right-1 bg-emerald-600 rounded-full p-0.5"><CheckCircle2 className="w-3 h-3 text-white" /></div>}
                      </div>
                      <div className="bg-[#0a0f1a] px-1.5 py-1 border-t border-slate-800">
                        <div className="text-[9px] text-slate-300 font-semibold truncate">{avatar.name}</div>
                        {ab && <div className="text-[8px] text-emerald-400">{ab.icon} {ab.label}</div>}
                        <div className="flex gap-0.5 mt-0.5 justify-center">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <span key={i} className={`text-[8px] ${i < star ? 'text-yellow-400' : i >= maxStar ? 'text-slate-800' : 'text-slate-700'}`}>{i < star ? '★' : '☆'}</span>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            {(() => {
              const avatarInventory = playerData.inventory?.avatars || {};
              const ownedAvatars = AVATARS.filter(a => avatarInventory[a.id] > 0);
              if (ownedAvatars.length === 0) return null;
              return (
                <div>
                  <div className="text-sm text-slate-400 mb-3">Your Avatars</div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {ownedAvatars.map((avatar) => {
                      const isSelected = draftAvatar === avatar.id;
                      const ab = AVATAR_ABILITIES[avatar.id];
                      const totalSpent = (playerData.avatarUpgrades || {})[avatar.id] || 0;
                      const { star } = getAvatarStarProgress(totalSpent);
                      const maxStar = getMaxStarForLevel(playerData.level || 1);
                      return (
                        <button
                          key={avatar.id}
                          onClick={() => setDraftAvatar(avatar.id)}
                          className={`flex flex-col rounded-lg overflow-hidden border-2 hover:border-emerald-500 cursor-pointer transition-all ${isSelected ? 'border-emerald-500' : 'border-slate-700'}`}
                        >
                          <div className="relative bg-slate-900/30" style={{ aspectRatio: '3/4' }}>
                            <img src={avatar.imageUrl} alt={avatar.name} className="w-full h-full object-contain" />
                            {isSelected && <div className="absolute top-1 right-1 bg-emerald-600 rounded-full p-0.5"><CheckCircle2 className="w-3 h-3 text-white" /></div>}
                          </div>
                          <div className="bg-[#0a0f1a] px-1.5 py-1 border-t border-slate-800">
                            <div className="text-[9px] text-slate-300 font-semibold truncate">{avatar.name}</div>
                            {ab && <div className="text-[8px] text-emerald-400">{ab.icon} {ab.label}</div>}
                            <div className="flex gap-0.5 mt-0.5 justify-center">
                              {Array.from({ length: 10 }).map((_, i) => (
                                <span key={i} className={`text-[8px] ${i < star ? 'text-yellow-400' : i >= maxStar ? 'text-slate-800' : 'text-slate-700'}`}>{i < star ? '★' : '☆'}</span>
                              ))}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : activeTab === 'scenes' ? (
          <div className="mt-4">
            <div className="text-sm text-slate-400 mb-3">Your Scenes</div>
            <div className="grid grid-cols-2 gap-4">
              {(() => {
                const defaultScenes = ['scene_default_01', 'scene_default_02', 'scene_default_03'];
                const sceneInventory = playerData.inventory?.scenes || {};
                const allScenesToShow = ALL_SCENES.filter(scene =>
                  defaultScenes.includes(scene.id) || sceneInventory[scene.id] > 0
                );
                return allScenesToShow.map((scene) => {
                  const isSelected = draftScene === scene.id;
                  return (
                    <div
                      key={scene.id}
                      className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                        isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-slate-700 hover:border-slate-500'
                      }`}
                      style={{ aspectRatio: '9/16', maxHeight: '280px' }}
                      onClick={() => setDraftScene(scene.id)}
                    >
                      <img src={scene.imageUrl} alt={scene.name} className="w-full h-full object-contain bg-slate-900" />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-xs text-white mb-1">{scene.name}</p>
                        {isSelected ? (
                          <div className="w-full text-xs border border-emerald-600 text-emerald-400 rounded py-1 text-center font-semibold flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Selected
                          </div>
                        ) : (
                          <div className="w-full text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded py-1 text-center font-semibold">
                            Select
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <div className="text-sm text-slate-400 mb-3">Your Themes</div>
            <div className="grid grid-cols-2 gap-4">
              {(() => {
                const defaultThemes = ['theme_001_rusty_hotness'];
                const themeInventory = playerData.inventory?.themes || {};
                const allThemesToShow = ALL_THEMES.filter(theme =>
                  defaultThemes.includes(theme.id) || themeInventory[theme.id] > 0
                );
                return allThemesToShow.map((theme) => {
                  const isSelected = draftTheme === theme.id;
                  return (
                    <div
                      key={theme.id}
                      className={`flex flex-col rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                        isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-slate-700 hover:border-slate-500'
                      }`}
                      onClick={() => setDraftTheme(theme.id)}
                    >
                      <div style={{ aspectRatio: '16/9' }}>
                        <img src={theme.previewImage} alt={theme.name} className="w-full h-full object-cover bg-slate-900" />
                      </div>
                      <div className="bg-[#0a0f1a] px-2 py-2 border-t border-slate-800">
                        <p className="text-xs text-white mb-1.5 font-semibold">{theme.name}</p>
                        {isSelected ? (
                          <div className="w-full text-xs border border-emerald-600 text-emerald-400 rounded py-1 text-center font-semibold flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Selected
                          </div>
                        ) : (
                          <div className="w-full text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded py-1 text-center font-semibold">
                            Select
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* SAVE / CANCEL — bottom bar */}
        <div className="mt-4 flex gap-2 sticky bottom-0 bg-[#0a0f1a] py-3 border-t border-slate-800">
          <Button
            onClick={handleSave}
            disabled={!isDirty}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none gap-1.5"
          >
            <Save className="w-4 h-4" />
            {isDirty ? 'Save Changes' : 'No Changes'}
          </Button>
          <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-400">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}