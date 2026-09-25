import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { generateOfflineAttacks } from "./components/attacks/offlineAttackSystem";
import OfflineAttackSummary from "./components/attacks/OfflineAttackSummary";
import LevelUpModal from "./components/dashboard/LevelUpModal";
import GlobalJobNotification from "./components/jobs/GlobalJobNotification";
import GlobalTradeNotification from "./components/trading/GlobalTradeNotification";
import HolidayPopup from "./components/holidays/HolidayPopup";
import { useJobManager } from "./lib/useJobManager";
import {
  getPendingLevelUp, clearPendingLevelUp,
  hasVisitedThisSession, markSessionVisited,
  getLastOfflineAttackCheck, setLastOfflineAttackCheck,
} from "./lib/playerMemory";

export default function Layout({ children, currentPageName }) {
  const [offlineAttackData, setOfflineAttackData] = useState(null);
  const [levelUpLevels, setLevelUpLevels] = useState(null);
  const [humanAttackNotif, setHumanAttackNotif] = useState(null);
  const navigate = useNavigate();

  // Mount global job manager — survives navigation, processes jobs on any page
  useJobManager();

  useEffect(() => {
    const handleHumanAttack = (e) => setHumanAttackNotif(e.detail);
    window.addEventListener('human_attack_received', handleHumanAttack);
    return () => window.removeEventListener('human_attack_received', handleHumanAttack);
  }, []);

  useEffect(() => {
    const handleLevelUpPending = () => {
      const pending = getPendingLevelUp();
      if (pending && pending.levels && pending.levels.length > 0) {
        setLevelUpLevels(pending.levels);
        clearPendingLevelUp();
      }
    };
    window.addEventListener('levelup_pending', handleLevelUpPending);
    // Also check on mount in case it was set before this component mounted
    handleLevelUpPending();
    return () => window.removeEventListener('levelup_pending', handleLevelUpPending);
  }, []);

  useEffect(() => {
    // Only redirect to MapsPage when landing on root "/" (app open).
    // Do NOT redirect when user navigates directly to a specific page URL.
    if (!hasVisitedThisSession()) {
      markSessionVisited();
      if (window.location.pathname === '/' && currentPageName !== 'MapsPage') {
        navigate(createPageUrl('MapsPage'));
        return;
      }
    }
    
    // Check for offline attacks on any page load
    const lastCheck = getLastOfflineAttackCheck();
    const now = Date.now();
    
    // Only check once per session or after 30 seconds
    if (!lastCheck || (now - lastCheck) > 30000) {
      const offlineData = generateOfflineAttacks();
      if (offlineData) {
        setOfflineAttackData(offlineData);
      }
      setLastOfflineAttackCheck(now);
    }
  }, [currentPageName]);

  return (
    <>
      {children}

      {/* Global Job Notifications — assist/sabotage toasts + completion modal on any page */}
      <GlobalJobNotification />

      {/* Global Trade Notification — trade result modal persists across navigation */}
      <GlobalTradeNotification />

      {/* Holiday Event Popup — shows on app open when an event is advertised */}
      <HolidayPopup />

      {/* Global Offline Attack Summary */}
      <OfflineAttackSummary
        open={!!offlineAttackData}
        data={offlineAttackData}
        onClose={() => setOfflineAttackData(null)}
      />

      {/* Level Up Rewards Modal */}
      <LevelUpModal
        open={!!levelUpLevels && levelUpLevels.length > 0}
        levels={levelUpLevels}
        onClose={() => setLevelUpLevels(null)}
      />

      {/* Human Attack Notification */}
      {humanAttackNotif && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-red-950 border border-red-700 rounded-xl px-6 py-4 text-white shadow-xl max-w-sm w-full text-center">
          <div className="text-2xl mb-1">⚔️</div>
          <div className="font-bold text-red-400 mb-1">You Were Attacked!</div>
          <div className="text-sm text-slate-300 mb-3">
            <span className="text-amber-400 font-semibold">{humanAttackNotif.attackerUsername}</span> attacked you while you were away!
          </div>
          <button onClick={() => setHumanAttackNotif(null)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-1.5 rounded-lg">
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}