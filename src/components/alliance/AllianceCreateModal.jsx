import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import FundImagePicker, { getAllianceImageUrl } from "@/components/fund/FundImagePicker";

const DEFAULT_EMBLEM_ID = "alliance_00";

export default function AllianceCreateModal({ open, onClose, onSubmit, loading }) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [emblem, setEmblem] = useState(DEFAULT_EMBLEM_ID);
  const [isOpen, setIsOpen] = useState(true);
  const [minLevel, setMinLevel] = useState(1);
  const [showEmblemPicker, setShowEmblemPicker] = useState(false);

  const handleSubmit = () => {
    if (!name.trim() || name.trim().length < 3) return;
    const cleanTag = tag.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
    if (cleanTag.length < 2) return;
    onSubmit({ name: name.trim(), tag: cleanTag, description: description.trim(), emblem, is_open: isOpen, min_level: minLevel });
  };

  const emblemUrl = getAllianceImageUrl(emblem);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-[#0a0f1a] border border-amber-900/40 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-amber-400 flex items-center gap-2 text-lg">🤝 Create Alliance</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-slate-400 text-xs">Alliance Name <span className="text-slate-600">(3-30 chars)</span></Label>
              <Input value={name} onChange={e => setName(e.target.value)} maxLength={30} placeholder="e.g. Apex Syndicate" className="bg-slate-900 border-slate-700 text-white mt-1" />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Tag <span className="text-slate-600">(2-3 letters)</span></Label>
              <Input value={tag} onChange={e => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0,3))} maxLength={3} placeholder="APX" className="bg-slate-900 border-slate-700 text-white mt-1 uppercase" />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Description <span className="text-slate-600">(optional)</span></Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} maxLength={100} placeholder="Brief alliance description" className="bg-slate-900 border-slate-700 text-white mt-1" />
            </div>
            <div>
              <Label className="text-slate-400 text-xs mb-2 block">Emblem</Label>
              <button
                onClick={() => setShowEmblemPicker(true)}
                className="flex items-center gap-3 w-full p-2 rounded-lg border border-slate-700 bg-slate-900 hover:border-amber-600 transition-colors"
              >
                <div className="w-14 h-14 flex items-center justify-center bg-black/40 rounded-lg border border-amber-700/50 overflow-hidden shrink-0">
                  {emblemUrl
                    ? <img src={emblemUrl} alt="emblem" className="w-full h-full object-cover" />
                    : <span className="text-3xl">🏰</span>}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-xs text-slate-300 font-semibold">Tap to choose emblem</div>
                  <div className="text-[10px] text-slate-500">{showEmblemPicker ? "Selecting..." : "Tap to browse all emblems"}</div>
                </div>
                <Pencil className="w-4 h-4 text-amber-500 shrink-0" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-slate-400 text-xs">Open Alliance (anyone can join)</Label>
              <Switch checked={isOpen} onCheckedChange={setIsOpen} />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Min Level: {minLevel}</Label>
              <input type="range" min={1} max={50} value={minLevel} onChange={e => setMinLevel(Number(e.target.value))} className="w-full mt-1 accent-amber-500" />
            </div>
            <div className="bg-sky-950/30 border border-sky-700/30 rounded-lg p-2 text-center">
              <span className="text-xs text-sky-300 font-semibold">Cost: 50 CRYD</span>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={onClose} className="flex-1 border-slate-700 text-slate-400">Cancel</Button>
              <Button onClick={handleSubmit} disabled={loading || name.trim().length < 3 || tag.replace(/[^A-Z0-9]/gi,"").length < 2} className="flex-1 bg-amber-600 hover:bg-amber-500 text-black font-bold">
                {loading ? "Creating..." : "Create (50 CRYD)"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <FundImagePicker
        open={showEmblemPicker}
        onClose={() => setShowEmblemPicker(false)}
        onSelect={(imageId) => setEmblem(imageId)}
        currentImageId={emblem}
      />
    </>
  );
}