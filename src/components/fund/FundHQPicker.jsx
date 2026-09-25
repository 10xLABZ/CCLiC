import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import STATES_DATA from "../travel/statesData";
import { MapPin, Check } from "lucide-react";

export default function FundHQPicker({ open, onClose, onSelect, currentHQ }) {
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);

  const handleStateClick = (state) => {
    setSelectedState(state);
    setSelectedCity(null);
  };

  const handleCityClick = (city) => {
    setSelectedCity(city);
  };

  const handleConfirm = () => {
    if (selectedState && selectedCity) {
      onSelect({ state: selectedState.name, city: selectedCity });
      setSelectedState(null);
      setSelectedCity(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0f1a] border-emerald-900/40 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-emerald-400">Select HQ Location</DialogTitle>
        </DialogHeader>

        {!selectedState ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-600 mb-3">
              Current HQ: {currentHQ.city && currentHQ.state ? `${currentHQ.city}, ${currentHQ.state}` : "Not set"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {STATES_DATA.map((state) => (
                <button
                  key={state.name}
                  onClick={() => handleStateClick(state)}
                  className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg hover:border-emerald-600/50 transition-colors text-left"
                >
                  <div className="text-sm font-semibold text-slate-200">{state.name}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300">{selectedState.name}</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedState(null)}
                className="text-slate-500 hover:text-slate-300"
              >
                Back
              </Button>
            </div>

            <div className="space-y-2">
              {selectedState.cities.map((city) => (
                <button
                  key={city}
                  onClick={() => handleCityClick(city)}
                  className={`w-full p-3 border rounded-lg transition-colors text-left ${
                    selectedCity === city
                      ? "bg-emerald-950/40 border-emerald-600"
                      : "bg-slate-900/50 border-slate-800 hover:border-emerald-600/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-200">{city}</div>
                    {selectedCity === city && <Check className="w-4 h-4 text-emerald-400" />}
                  </div>
                  {city === selectedState.capital && (
                    <div className="text-xs text-slate-600 mt-1">State Capital</div>
                  )}
                </button>
              ))}
            </div>

            {selectedCity && (
              <Button
                onClick={handleConfirm}
                className="w-full bg-emerald-600 hover:bg-emerald-500"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Set HQ to {selectedCity}, {selectedState.name}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}