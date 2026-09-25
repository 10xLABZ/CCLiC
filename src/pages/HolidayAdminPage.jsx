import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import TopHUD from "@/components/dashboard/TopHUD";
import BottomNav from "@/components/dashboard/BottomNav";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Eye, EyeOff, Power, PowerOff } from "lucide-react";

const HOLIDAY_PRESETS = [
  { holiday_key: "valentines", display_name: "Valentine's Day Sale", tagline: "Love. Loyalty. Power.", start_date: "2026-02-01", end_date: "2026-02-15", theme_color: "#ec4899" },
  { holiday_key: "stpatricks", display_name: "St. Patrick's Day Sale", tagline: "Lucky & Lethal.", start_date: "2026-03-10", end_date: "2026-03-17", theme_color: "#22c55e" },
  { holiday_key: "easter", display_name: "Easter Sale", tagline: "Hunt. Gather. Dominate.", start_date: "2026-04-01", end_date: "2026-04-07", theme_color: "#f59e0b" },
  { holiday_key: "memorial", display_name: "Memorial Day Sale", tagline: "Honor the Fallen.", start_date: "2026-05-20", end_date: "2026-05-27", theme_color: "#ef4444" },
  { holiday_key: "independence", display_name: "Independence Day Sale", tagline: "Freedom & Firepower.", start_date: "2026-06-28", end_date: "2026-07-07", theme_color: "#3b82f6" },
  { holiday_key: "labor", display_name: "Labor Day Sale", tagline: "Work Hard. Hit Harder.", start_date: "2026-08-25", end_date: "2026-09-01", theme_color: "#f97316" },
  { holiday_key: "halloween", display_name: "Halloween Sale", tagline: "Trick. Treat. Terror.", start_date: "2026-10-25", end_date: "2026-10-31", theme_color: "#a855f7" },
  { holiday_key: "thanksgiving", display_name: "Thanksgiving Sale", tagline: "Feast & Fight.", start_date: "2026-11-20", end_date: "2026-11-27", theme_color: "#d97706" },
  { holiday_key: "christmas", display_name: "Christmas Sale", tagline: "Tis the Season to Strike.", start_date: "2026-12-18", end_date: "2026-12-25", theme_color: "#dc2626" },
  { holiday_key: "newyear", display_name: "New Year's Sale", tagline: "New Year. New Power.", start_date: "2026-12-26", end_date: "2027-01-02", theme_color: "#06b6d4" }
];

const EMPTY_FORM = {
  holiday_key: "",
  display_name: "",
  tagline: "",
  start_date: "",
  end_date: "",
  is_active: false,
  is_advertised: false,
  pack_name: "",
  pack_description: "",
  pack_items: "",
  pack_price_cryd: 0,
  pack_price_usd: 0,
  poster_image_url: "",
  banner_image_url: "",
  theme_color: "#ec4899",
  sort_order: 0
};

export default function HolidayAdminPage() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null); // null or { isEditing, id, form }
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchHolidays = async () => {
    try {
      const list = await base44.entities.HolidayEvent.list("sort_order");
      setHolidays(list || []);
    } catch (e) {
      toast.error("Failed to load holidays");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleCreate = () => {
    setEditModal({ isEditing: false, id: null, form: { ...EMPTY_FORM } });
  };

  const handleEdit = (holiday) => {
    setEditModal({
      isEditing: true,
      id: holiday.id,
      form: { ...EMPTY_FORM, ...holiday }
    });
  };

  const handlePresetSelect = (preset) => {
    setEditModal(prev => ({
      ...prev,
      form: { ...prev.form, ...preset }
    }));
  };

  const handleFormChange = (field, value) => {
    setEditModal(prev => ({
      ...prev,
      form: { ...prev.form, [field]: value }
    }));
  };

  const handleSave = async () => {
    const { form, isEditing, id } = editModal;
    if (!form.holiday_key || !form.display_name || !form.start_date || !form.end_date) {
      toast.error("Fill in all required fields");
      return;
    }
    try {
      if (isEditing) {
        await base44.entities.HolidayEvent.update(id, form);
        toast.success("Holiday updated");
      } else {
        await base44.entities.HolidayEvent.create(form);
        toast.success("Holiday created");
      }
      setEditModal(null);
      fetchHolidays();
    } catch (e) {
      toast.error("Save failed: " + (e.message || "unknown error"));
    }
  };

  const handleToggle = async (holiday, field) => {
    try {
      await base44.entities.HolidayEvent.update(holiday.id, { [field]: !holiday[field] });
      toast.success(`${field === "is_active" ? "Sale" : "Advertising"} ${!holiday[field] ? "enabled" : "disabled"}`);
      fetchHolidays();
    } catch (e) {
      toast.error("Toggle failed");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await base44.entities.HolidayEvent.delete(deleteConfirm.id);
      toast.success("Holiday deleted");
      setDeleteConfirm(null);
      fetchHolidays();
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#060a12] text-white pb-[108px]">
      <TopHUD />

      <div className="pt-[114px] max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-orange-400">Holiday Event Manager</h1>
          <Button onClick={handleCreate} className="bg-orange-600 hover:bg-orange-500">
            <Plus className="w-4 h-4 mr-1" /> New Holiday
          </Button>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-8">Loading...</div>
        ) : holidays.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 mb-3">No holidays configured yet.</p>
            <p className="text-xs text-slate-600">Tap "New Holiday" and pick a preset to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {holidays.map((h) => (
              <div key={h.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: h.theme_color }} />
                      <h3 className="text-sm font-bold text-white truncate">{h.display_name}</h3>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {h.start_date} → {h.end_date}
                    </div>
                    {h.pack_name && (
                      <div className="text-[10px] text-slate-400 mt-1">
                        Pack: <span className="text-slate-300">{h.pack_name}</span>
                        {" · "}
                        {h.pack_price_cryd > 0 && <span className="text-purple-400">{h.pack_price_cryd} CRYD</span>}
                        {h.pack_price_usd > 0 && <span className="text-green-400"> ${h.pack_price_usd}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggle(h, "is_active")}
                      title={h.is_active ? "Sale is LIVE" : "Sale is OFF"}
                      className={`p-1.5 rounded ${h.is_active ? "bg-green-900/40 text-green-400" : "bg-slate-800 text-slate-500"}`}
                    >
                      {h.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleToggle(h, "is_advertised")}
                      title={h.is_advertised ? "Popup ON" : "Popup OFF"}
                      className={`p-1.5 rounded ${h.is_advertised ? "bg-blue-900/40 text-blue-400" : "bg-slate-800 text-slate-500"}`}
                    >
                      {h.is_advertised ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleEdit(h)}
                      className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(h)}
                      className="p-1.5 rounded bg-slate-800 text-red-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit / Create Modal */}
      {editModal && (
        <Dialog open={!!editModal} onOpenChange={() => setEditModal(null)}>
          <DialogContent className="bg-slate-900 border-orange-600 text-white max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-orange-400">
                {editModal.isEditing ? "Edit Holiday" : "New Holiday"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              {/* Preset quick-select */}
              {!editModal.isEditing && (
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Quick Preset</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {HOLIDAY_PRESETS.map((p) => (
                      <button
                        key={p.holiday_key}
                        onClick={() => handlePresetSelect(p)}
                        className="text-[9px] px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:border-orange-500"
                      >
                        {p.display_name.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase">Holiday Key *</label>
                <input
                  value={editModal.form.holiday_key}
                  onChange={(e) => handleFormChange("holiday_key", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
                  placeholder="valentines"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase">Display Name *</label>
                <input
                  value={editModal.form.display_name}
                  onChange={(e) => handleFormChange("display_name", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
                  placeholder="Valentine's Day Sale"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase">Tagline</label>
                <input
                  value={editModal.form.tagline}
                  onChange={(e) => handleFormChange("tagline", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
                  placeholder="Love. Loyalty. Power."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Start Date *</label>
                  <input
                    type="date"
                    value={editModal.form.start_date}
                    onChange={(e) => handleFormChange("start_date", e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase">End Date *</label>
                  <input
                    type="date"
                    value={editModal.form.end_date}
                    onChange={(e) => handleFormChange("end_date", e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase">Pack Name</label>
                <input
                  value={editModal.form.pack_name}
                  onChange={(e) => handleFormChange("pack_name", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
                  placeholder="Heartbreaker Bundle"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase">Pack Description</label>
                <textarea
                  value={editModal.form.pack_description}
                  onChange={(e) => handleFormChange("pack_description", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white h-16"
                  placeholder="Exclusive holiday items..."
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase">
                  Pack Items (one per line: category|item_id|item_name)
                </label>
                <textarea
                  value={editModal.form.pack_items}
                  onChange={(e) => handleFormChange("pack_items", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white font-mono h-24"
                  placeholder={"avatars|valentine_rose|Rose Assassin\nfirearms|cupid_glock|Cupid's Glock\nvehicles|pink_rolls|Pink Rolls Royce"}
                />
                <p className="text-[9px] text-slate-500 mt-1">Categories: avatars, firearms, weapons, vehicles, pets, power, scenes, themes, consumables</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Price (CRYD)</label>
                  <input
                    type="number"
                    value={editModal.form.pack_price_cryd}
                    onChange={(e) => handleFormChange("pack_price_cryd", parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editModal.form.pack_price_usd}
                    onChange={(e) => handleFormChange("pack_price_usd", parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase">Poster Image URL (popup)</label>
                <input
                  value={editModal.form.poster_image_url}
                  onChange={(e) => handleFormChange("poster_image_url", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase">Banner Image URL (shop)</label>
                <input
                  value={editModal.form.banner_image_url}
                  onChange={(e) => handleFormChange("banner_image_url", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Theme Color</label>
                  <input
                    type="color"
                    value={editModal.form.theme_color}
                    onChange={(e) => handleFormChange("theme_color", e.target.value)}
                    className="w-full h-8 bg-slate-800 border border-slate-700 rounded"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Sort Order</label>
                  <input
                    type="number"
                    value={editModal.form.sort_order}
                    onChange={(e) => handleFormChange("sort_order", parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={editModal.form.is_active}
                    onChange={(e) => handleFormChange("is_active", e.target.checked)}
                    className="w-4 h-4"
                  />
                  Sale Live (is_active)
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={editModal.form.is_advertised}
                    onChange={(e) => handleFormChange("is_advertised", e.target.checked)}
                    className="w-4 h-4"
                  />
                  Popup On (is_advertised)
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditModal(null)} className="border-slate-600 text-slate-300">
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-orange-600 hover:bg-orange-500">
                {editModal.isEditing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="bg-red-950 border-red-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-red-400">Delete Holiday?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-300">
              Delete <span className="font-bold text-white">{deleteConfirm.display_name}</span>? This cannot be undone.
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="border-slate-600 text-slate-300">
                Cancel
              </Button>
              <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-500">
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <BottomNav />
    </div>
  );
}