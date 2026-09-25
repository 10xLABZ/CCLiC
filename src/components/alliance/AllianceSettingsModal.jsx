import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Trash2, LogOut, AlertTriangle, Edit2 } from "lucide-react";

export default function AllianceSettingsModal({ open, onClose, isLeader, onDisband, onLeave, allianceName, allianceTag, onSaveInfo }) {
  const [disbandStep, setDisbandStep] = useState(0);
  const [leaveStep, setLeaveStep] = useState(0);
  const [editingInfo, setEditingInfo] = useState(false);
  const [nameInput, setNameInput] = useState(allianceName || "");
  const [tagInput, setTagInput] = useState(allianceTag || "");

  if (!open) return null;

  const handleClose = () => {
    setDisbandStep(0);
    setLeaveStep(0);
    setEditingInfo(false);
    onClose();
  };

  const handleSaveInfo = () => {
    if (onSaveInfo) onSaveInfo(nameInput.trim(), tagInput.trim().replace(/[\[\]]/g, '').slice(0, 5).toUpperCase());
    setEditingInfo(false);
  };

  const DISBAND_PROMPTS = [
    "Are you sure you want to disband this Alliance? This cannot be undone.",
    "This will remove ALL members and delete the alliance permanently. Continue?",
    "Final warning: Click CONFIRM to permanently disband the Alliance.",
  ];

  const LEAVE_PROMPTS = [
    "Are you sure you want to leave this Fund/Alliance?",
    "You will lose access to alliance chat and member benefits.",
    "Final confirmation: Leave the Alliance?",
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center px-4 pb-24">
      <div className="bg-[#0d1526] border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-800">
          <span className="text-sm font-bold text-white">⚙️ Alliance Settings</span>
          <button onClick={handleClose}><X className="w-4 h-4 text-slate-500" /></button>
        </div>

        <div className="p-4 space-y-3">
          {/* Edit Name/Tag — Leader Only */}
          {isLeader && (
            <div className="bg-slate-900/60 border border-amber-900/30 rounded-xl p-3">
              <div className="text-xs text-amber-400 font-semibold mb-2 flex items-center gap-1.5"><Edit2 className="w-3.5 h-3.5" /> Edit Alliance Info (Leader Only)</div>
              {!editingInfo ? (
                <Button onClick={() => { setNameInput(allianceName || ""); setTagInput(allianceTag || ""); setEditingInfo(true); }} variant="outline" className="w-full border-amber-700 text-amber-400 hover:bg-amber-950 text-xs">
                  Edit Name & Tag
                </Button>
              ) : (
                <div className="space-y-2">
                  <Input value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="Alliance name" className="bg-slate-800 border-slate-600 text-white text-xs h-8" maxLength={30} />
                  <Input value={tagInput} onChange={e => setTagInput(e.target.value.toUpperCase())} placeholder="TAG (2-5 chars)" className="bg-slate-800 border-slate-600 text-white text-xs h-8" maxLength={5} />
                  <div className="flex gap-2">
                    <Button onClick={handleSaveInfo} className="flex-1 bg-amber-600 hover:bg-amber-500 text-black text-xs">Save</Button>
                    <Button onClick={() => setEditingInfo(false)} variant="outline" className="flex-1 border-slate-700 text-slate-400 text-xs">Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Leave Alliance */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <div className="text-xs text-slate-400 font-semibold mb-2 flex items-center gap-1.5"><LogOut className="w-3.5 h-3.5" /> Leave Fund / Alliance</div>
            {leaveStep === 0 ? (
              <Button onClick={() => setLeaveStep(1)} variant="outline" className="w-full border-orange-700 text-orange-400 hover:bg-orange-950 text-xs">
                Leave Alliance
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-orange-300 bg-orange-950/40 border border-orange-800/40 rounded-lg p-2 flex gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {LEAVE_PROMPTS[leaveStep - 1]}
                </div>
                <div className="flex gap-2">
                  {leaveStep < 3 ? (
                    <>
                      <Button onClick={() => setLeaveStep(s => s + 1)} className="flex-1 bg-orange-700 hover:bg-orange-600 text-xs">Continue</Button>
                      <Button onClick={() => setLeaveStep(0)} variant="outline" className="flex-1 border-slate-700 text-slate-400 text-xs">Cancel</Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={() => { onLeave(); handleClose(); }} className="flex-1 bg-orange-700 hover:bg-orange-600 text-xs">CONFIRM LEAVE</Button>
                      <Button onClick={() => setLeaveStep(0)} variant="outline" className="flex-1 border-slate-700 text-slate-400 text-xs">Cancel</Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Disband - Leader Only */}
          {isLeader && (
            <div className="bg-slate-900/60 border border-red-900/30 rounded-xl p-3">
              <div className="text-xs text-red-400 font-semibold mb-2 flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Disband Alliance (Leader Only)</div>
              {disbandStep === 0 ? (
                <Button onClick={() => setDisbandStep(1)} variant="outline" className="w-full border-red-800 text-red-500 hover:bg-red-950 text-xs">
                  Disband Alliance
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-red-300 bg-red-950/40 border border-red-800/40 rounded-lg p-2 flex gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-400" />
                    {DISBAND_PROMPTS[disbandStep - 1]}
                  </div>
                  <div className="flex gap-2">
                    {disbandStep < 3 ? (
                      <>
                        <Button onClick={() => setDisbandStep(s => s + 1)} className="flex-1 bg-red-800 hover:bg-red-700 text-xs">Continue</Button>
                        <Button onClick={() => setDisbandStep(0)} variant="outline" className="flex-1 border-slate-700 text-slate-400 text-xs">Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button onClick={() => { onDisband(); handleClose(); }} className="flex-1 bg-red-700 hover:bg-red-600 text-xs">CONFIRM DISBAND</Button>
                        <Button onClick={() => setDisbandStep(0)} variant="outline" className="flex-1 border-slate-700 text-slate-400 text-xs">Cancel</Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}