/**
 * Global Job Manager — singleton hook that persists job state across navigation.
 * 
 * Jobs are stored in localStorage keyed by jobId. The simulation (assist ticks,
 * sabotage popups) is driven by setTimeout chains that survive page changes because
 * this hook is mounted in Layout.jsx (always in the tree).
 *
 * Other components subscribe to job state via window events:
 *   'job_assist_tick'   — { jobId, helperName, profileImg, received, total }
 *   'job_sabotage_tick' — { jobId, name, profileImg }
 *   'job_completed'     — { result } (the full jobResult object)
 *   'job_started'       — { jobId }
 *   'active_jobs_changed' — emitted whenever the active jobs list changes
 */

import { useEffect, useRef, useCallback } from 'react';
import { applyServerReward } from '@/lib/playerServerSync';
import { kvGet, kvSet, setPendingLevelUp } from '@/lib/playerMemory';
import { getPlayerData, savePlayerData } from '@/components/utils/playerStorage';
import { generateBotName } from '@/components/utils/botNameGenerator';
import { BOT_MALE_PROFILE_IMAGES, BOT_FEMALE_PROFILE_IMAGES } from '@/components/tradewars/botGenerator';
import { getSabotageXP } from '@/components/utils/sabotageHelper';
import { logWorldTourCityAction } from '@/components/events/worldTourStorage';
import { getAccessoryIgcMultiplier } from '@/lib/igcBonusHelper';

const STORAGE_KEY = 'globalActiveJobs_v2';

function loadJobs() {
  try { return JSON.parse(kvGet(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveJobs(jobs) {
  kvSet(STORAGE_KEY, JSON.stringify(jobs));
}

function emit(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

// Singleton guard — only one timer chain per jobId
const runningJobs = new Set();

export function useJobManager() {
  const sabotageNamesRef = useRef({}); // jobId -> [{name, profileImg}]

  const completeJob = useCallback((job) => {
    runningJobs.delete(job.id);

    const current = getPlayerData();
    let cashReward = Math.floor(Math.random() * (job.cashMax - job.cashMin + 1)) + job.cashMin;

    const storedSabNames = sabotageNamesRef.current[job.id] || [];
    const sabotageCount = storedSabNames.length;
    let sabotageNotice = null;

    if (sabotageCount > 0) {
      const sabotagers = [];
      let totalCashLost = 0;
      let totalHeat = 0;
      for (let i = 0; i < sabotageCount; i++) {
        const lossPct = 0.08 + Math.random() * 0.17;
        const cashLost = Math.round(cashReward * lossPct);
        const heatGain = Math.floor(1 + Math.random() * 3);
        sabotagers.push({ name: storedSabNames[i].name, cashLost, heatGain, lossPct: Math.round(lossPct * 100) });
        totalCashLost += cashLost;
        totalHeat += heatGain;
      }
      cashReward = Math.max(0, cashReward - totalCashLost);
      sabotageNotice = { sabotagers, totalCashLost, totalHeatGain: totalHeat, count: sabotageCount };
    }
    delete sabotageNamesRef.current[job.id];

    const tierCoverCost = { "Street": 1, "Hustle": 2, "Scheme": 3, "High Stakes": 4 };
    const coverCost = (tierCoverCost[job.tier] || 1) + sabotageCount;

    const igcMult = getAccessoryIgcMultiplier(current);
    const igcBoostAmount = cashReward > 0 ? Math.round(cashReward * (igcMult - 1)) : 0;
    const totalCash = cashReward + igcBoostAmount;

    applyServerReward({
      cash_delta: totalCash,
      respect_delta: job.respectGain,
      xp_delta: job.xpGain,
      op_cover_delta: -coverCost,
      reason: 'job_complete',
      stat_fields: {
        total_jobs_completed: 1,
        jobs_completed_today: 1,
        total_assists: (job.assistsNeeded || 0),
        total_sabotages: sabotageCount,
      }
    }).then(data => {
      if (data?.new_level > (current.level || 1)) {
        const levels = [];
        for (let i = (current.level || 1) + 1; i <= data.new_level; i++) levels.push(i);
        setPendingLevelUp(levels);
      }
      window.dispatchEvent(new Event('player_synced'));
    }).catch(() => {
      window.dispatchEvent(new Event('player_synced'));
    });

    // Remove from persisted list
    const jobs = loadJobs().filter(j => j.id !== job.id);
    saveJobs(jobs);
    emit('active_jobs_changed', { jobs });

    // Notify UI
    emit('job_completed', {
      result: {
        success: true,
        cash: totalCash,
        igcBoost: igcBoostAmount,
        xp: job.xpGain,
        respect: job.respectGain,
        opCoverCost: coverCost,
        sabotageNotice,
        jobName: job.name,
        jobCity: job.locationCity,
      }
    });

    if (job.locationCity) logWorldTourCityAction(job.locationCity, 'jobs');
  }, []);

  const simulateJob = useCallback((job) => {
    if (runningJobs.has(job.id)) return; // already running
    runningJobs.add(job.id);

    const assistsNeeded = job.assistsNeeded;
    const maxTotalTime = 15000;
    const baseDelay = maxTotalTime / assistsNeeded;

    const MALE_IMGS = BOT_MALE_PROFILE_IMAGES;
    const FEMALE_IMGS = BOT_FEMALE_PROFILE_IMAGES;

    // Pre-determine sabotages upfront (only if not already set from a resume)
    if (!sabotageNamesRef.current[job.id]) {
      const sabotageRoll = Math.random();
      let sabotageCount = 0;
      if (sabotageRoll < 0.30) sabotageCount = 0;
      else if (sabotageRoll < 0.80) sabotageCount = 1;
      else if (sabotageRoll < 0.95) sabotageCount = 2;
      else sabotageCount = 3;

      const preDeterminedSabotages = [];
      for (let s = 0; s < sabotageCount; s++) {
        const gRoll = Math.random();
        const profileImg = gRoll < 0.55
          ? MALE_IMGS[Math.floor(Math.random() * MALE_IMGS.length)]
          : FEMALE_IMGS[Math.floor(Math.random() * FEMALE_IMGS.length)];
        preDeterminedSabotages.push({ name: generateBotName(Math.random() + s + 0.5), profileImg });
      }
      sabotageNamesRef.current[job.id] = preDeterminedSabotages;

      // Pick which ticks show sabotage popups
      const eligibleTicks = [];
      for (let t = 2; t <= assistsNeeded; t++) eligibleTicks.push(t);
      const shuffled = eligibleTicks.sort(() => Math.random() - 0.5);
      job._sabotagePopupTicks = new Set(shuffled.slice(0, sabotageCount));
      job._sabotagePopupIndex = 0;
    }

    // Start from wherever we left off
    let received = job._assistsReceived || 0;
    let sabotagePopupIndex = job._sabotagePopupIndex || 0;
    const sabotagePopupTicks = job._sabotagePopupTicks || new Set();

    const doNextAssist = () => {
      const delay = baseDelay * 0.8 + Math.random() * baseDelay * 0.4;
      setTimeout(() => {
        received++;
        const helperName = generateBotName(Math.random());
        const profileImg = Math.random() < 0.55
          ? MALE_IMGS[Math.floor(Math.random() * MALE_IMGS.length)]
          : FEMALE_IMGS[Math.floor(Math.random() * FEMALE_IMGS.length)];

        // Emit assist tick
        emit('job_assist_tick', { jobId: job.id, helperName, profileImg, received, total: assistsNeeded });

        // Sabotage popup if this tick was pre-selected
        const preDeterminedSabotages = sabotageNamesRef.current[job.id] || [];
        if (sabotagePopupTicks.has && sabotagePopupTicks.has(received) && sabotagePopupIndex < preDeterminedSabotages.length) {
          const sab = preDeterminedSabotages[sabotagePopupIndex++];
          emit('job_sabotage_tick', { jobId: job.id, name: sab.name, profileImg: sab.profileImg });
          job._sabotagePopupIndex = sabotagePopupIndex;
        }

        // Update persisted progress
        const jobs = loadJobs().map(j => j.id === job.id ? { ...j, _assistsReceived: received } : j);
        saveJobs(jobs);
        emit('active_jobs_changed', { jobs });

        if (received >= assistsNeeded) {
          completeJob(job);
        } else {
          doNextAssist();
        }
      }, delay);
    };

    doNextAssist();
  }, [completeJob]);

  const startJob = useCallback((job, locationCity) => {
    const jobRecord = {
      ...job,
      locationCity,
      startedAt: Date.now(),
      _assistsReceived: 0,
      _sabotagePopupTicks: null,
      _sabotagePopupIndex: 0,
    };

    const existing = loadJobs();
    if (existing.some(j => j.id === job.id)) return; // already queued
    saveJobs([...existing, jobRecord]);
    emit('active_jobs_changed', { jobs: loadJobs() });
    emit('job_started', { jobId: job.id });

    simulateJob(jobRecord);
  }, [simulateJob]);

  // On mount: resume any in-progress jobs that survived a navigation
  useEffect(() => {
    const stored = loadJobs();
    if (stored.length === 0) return;

    stored.forEach(job => {
      // Still within reasonable time window (jobs are ~15s each, give 60s buffer)
      const elapsed = Date.now() - (job.startedAt || 0);
      if (elapsed < 75000) {
        simulateJob(job);
      } else {
        // Way overdue — complete immediately
        completeJob(job);
      }
    });
  }, []);

  return { startJob, getActiveJobs: loadJobs };
}