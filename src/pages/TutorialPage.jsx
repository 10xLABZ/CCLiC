import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowRight, ArrowLeft, X } from "lucide-react";
import TopHUD from "@/components/dashboard/TopHUD";

const BG_URL = "https://media.base44.com/images/public/699169456a354d6cb7082777/39addec8d_a-bg-city1.jpg";

const IMG = {
  overview: "https://media.base44.com/images/public/699169456a354d6cb7082777/8c7c7e279_map-icon-overviewallicons.png",
  battleIcon: "https://media.base44.com/images/public/699169456a354d6cb7082777/1e02f0370_mapicon-battleicon.png",
  battleProfile: "https://media.base44.com/images/public/699169456a354d6cb7082777/5b837e13f_battleprofileview.png",
  jobIcon: "https://media.base44.com/images/public/699169456a354d6cb7082777/ca999fcda_mapicon-jobicon.png",
  jobPopup: "https://media.base44.com/images/public/699169456a354d6cb7082777/78e3bdad3_jobs-popup-example.png",
  assistIcon: "https://media.base44.com/images/public/699169456a354d6cb7082777/4d000e4c3_mapicon-assistsabotageicon.png",
  assistPopup: "https://media.base44.com/images/public/699169456a354d6cb7082777/40266bdeb_assist-sabotage-popupexample.png",
  moIcon: "https://media.base44.com/images/public/699169456a354d6cb7082777/b6e6ef36b_mapicon-mayorsofficeicon.png",
  moLeaderboard: "https://media.base44.com/images/public/699169456a354d6cb7082777/99ff9ee20_mayorsofficeleaderboardexample.png",
  resources: "https://media.base44.com/images/public/699169456a354d6cb7082777/7f2c82821_coverenergystaminahq.png",
  tutorialStart: "https://media.base44.com/images/public/699169456a354d6cb7082777/36c3787ef_tutorial-start.jpg",
  tutorialEnd: "https://media.base44.com/images/public/699169456a354d6cb7082777/4b7c14bc6_tutorial-end.jpg",
  coverTopHud: "https://media.base44.com/images/public/699169456a354d6cb7082777/a8bb9c9ea_covertophudexample.png",
  energyTopHud: "https://media.base44.com/images/public/699169456a354d6cb7082777/3779d408c_energytophudexample.png",
  staminaTopHud: "https://media.base44.com/images/public/699169456a354d6cb7082777/09fdb0a50_staminatophudexample.png",
  hqTopHud: "https://media.base44.com/images/public/699169456a354d6cb7082777/8c37ea3bb_hqtophudexample.png",
  hqPage: "https://media.base44.com/images/public/699169456a354d6cb7082777/b3a1a3482_hqpagescreenshot.png",
  tradePage: "https://media.base44.com/images/public/699169456a354d6cb7082777/3640a176d_tradepage.png",
};

const SLIDES = [
  {
    title: "WELCOME TO THE GAME!",
    color: "#f59e0b",
    images: [{ src: IMG.tutorialStart, label: "" }],
    body: "You're about to enter a world of strategy, alliances, and power. This quick walkthrough will show you the map icons, resources, and core mechanics. Let's get started!",
  },
  {
    title: "THE MAP",
    color: "#3b82f6",
    images: [{ src: IMG.overview, label: "Your map is the central hub of the game" }],
    body: "The map is your home base. Different icons appear across the city — battle pins, job buildings, assist/sabotage pins, and the Mayor's Office. Tap any icon to interact with it. Let's break down each one.",
  },
  {
    title: "TRADE WARS — BATTLE PINS",
    color: "#ef4444",
    images: [
      { src: IMG.battleIcon, label: "Battle pin on the map" },
      { src: IMG.battleProfile, label: "What you see when you tap it" },
    ],
    body: "The crossed-swords pin represents a Trade War battle. Tap it to see your opponent's full profile — their Strength, ATK, DEF, TP, and Performance stats. Compare your loadout against theirs, then decide: fight or sneak away. Winning earns you cash, XP, and respect.",
  },
  {
    title: "JOBS",
    color: "#22c55e",
    images: [
      { src: IMG.jobIcon, label: "Job building on the map" },
      { src: IMG.jobPopup, label: "Job details when you tap it" },
    ],
    body: "The storefront building with the briefcase icon is a Job. Tap it to see the payout — cash, XP, and how much Op Cover it costs. Jobs are your main way to earn cash and level up. Some jobs require assists from alliance members to complete, so team up!",
  },
  {
    title: "ASSIST & SABOTAGE",
    color: "#8b5cf6",
    images: [
      { src: IMG.assistIcon, label: "Assist/Sabotage pin on the map" },
      { src: IMG.assistPopup, label: "Choose Assist or Sabotage" },
    ],
    body: "The handshake pin lets you interact with other players' active jobs. ASSIST helps an ally finish their job faster — you both earn cash and XP. SABOTAGE attacks an enemy's job to disrupt them, earning you XP and Op Cover. Assist to build alliances, sabotage to weaken rivals.",
  },
  {
    title: "MAYOR'S OFFICE",
    color: "#a855f7",
    images: [
      { src: IMG.moIcon, label: "Mayor's Office on the map" },
      { src: IMG.moLeaderboard, label: "Territory leaderboard" },
    ],
    body: "The Mayor's Office is in every city in the game. Tap it to see the territory leaderboard — 50 control slots ranked by power. Battle other players to climb ranks and claim a slot. Higher slots earn more passive cash DAILY. But fight at least once every 48 hours or you'll drop ranks for inactivity!",
  },
  {
    title: "INSIDER TRADE TIPS",
    color: "#eab308",
    images: [{ src: IMG.tradePage, label: "Example of a trade tip card" }],
    body: "The Insider Trade Tips page shows investment opportunities. Each tip displays the ticker, a risk level (like HIGH RISK), the trend direction, and your potential Win vs Loss payout. The cost to enter the trade is shown on the green BUY/TRADE button. Higher risk means bigger potential profit — but also bigger losses if the trade goes south. Study the trends and pick your tips wisely!",
  },
  {
    title: "YOUR RESOURCES",
    color: "#f28b49",
    images: [{ src: IMG.resources, label: "Cover, Energy, Stamina & HQ in the top bar", glow: true }],
    subImages: [
      { src: IMG.coverTopHud, caption: "COVER — spent on jobs, assists & battles. Regenerates over time." },
      { src: IMG.energyTopHud, caption: "ENERGY — powers jobs and assists. Regenerates over time." },
      { src: IMG.staminaTopHud, caption: "STAMINA — powers sabotages and trade wars. Regenerates over time." },
      { src: IMG.hqTopHud, paired: IMG.hqPage, caption: "HQ — upgrade to boost ATK, DEF & trade income. Higher levels grow the building and strengthen your stats." },
    ],
    body: "These four bars are your lifeline. COVER protects you in jobs and battles. ENERGY powers your hustles. STAMINA fuels sabotage and trade wars. All three regenerate over time. Your HQ level boosts your ATK, DEF, and trade earnings — upgrade it to grow stronger!",
  },
  {
    title: "CRYD — YOUR PREMIUM CURRENCY",
    color: "#a855f7",
    images: [],
    body: "CRYD is the lifeblood of your empire. It's the premium currency used to buy the best weapons, vehicles, avatars, scenes, themes, consumables, and HQ upgrades. You earn CRYD by leveling up, winning trade wars, and climbing leaderboards — but the fastest way to stock up is through the Shop. Tap the CRYD balance in your top bar anytime to jump straight to the top-up section. Spend it wisely — the right gear at the right time can make or break your rise to power.",
  },
  {
    title: "READY TO PLAY!",
    color: "#f59e0b",
    images: [{ src: IMG.tutorialEnd, label: "" }],
    body: "You now know the map icons, trade tips, resources, and core mechanics. Join or create an alliance, climb the territory leaderboards, and dominate the map. You can revisit this tutorial anytime from Settings. Good luck out there!",
  },
];

export default function TutorialPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const isLastSlide = currentSlide === SLIDES.length - 1;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    if (isLastSlide) {
      navigate(createPageUrl('MapsPage'));
    } else {
      setCurrentSlide(prev => prev + 1);
      scrollToTop();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
      scrollToTop();
    }
  };

  const handleExit = () => {
    navigate(createPageUrl('MapsPage'));
  };

  const slide = SLIDES[currentSlide];

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: `url(${BG_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="min-h-screen bg-black/75">
        <TopHUD />

        {/* Exit button */}
        <div className="max-w-md mx-auto px-4 pt-[118px] flex justify-end">
          <button
            onClick={handleExit}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors text-xs font-bold"
          >
            <X className="w-3.5 h-3.5" /> SKIP TO GAME
          </button>
        </div>

        {/* Slide content */}
        <div className="max-w-md mx-auto px-4 py-4 flex flex-col items-center" style={{ minHeight: '72vh' }}>
          {/* Progress dots */}
          <div className="flex gap-1.5 mb-5">
            {SLIDES.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === currentSlide ? 'w-6' : 'w-2 bg-slate-600'
                }`}
                style={i === currentSlide ? { backgroundColor: slide.color } : {}}
              />
            ))}
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold text-white text-center mb-4 tracking-wide" style={{ color: slide.color }}>
            {slide.title}
          </h1>

          {/* Main images */}
          {slide.images.length > 0 && (
            <div className="w-full flex flex-col gap-3 mb-4">
              {slide.images.map((img, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div
                    className={`rounded-xl overflow-hidden border-2 border-slate-700 bg-black/50 max-w-[340px] w-full ${img.glow ? 'tutorial-glow-pulse' : ''}`}
                  >
                    <img src={img.src} alt={img.label} className="w-full h-auto" />
                  </div>
                  {img.label && (
                    <p className="text-xs text-slate-400 mt-1.5 text-center">{img.label}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Sub images (individual resource breakdowns) */}
          {slide.subImages && slide.subImages.length > 0 && (
            <div className="w-full flex flex-col gap-3 mb-4">
              {slide.subImages.map((sub, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="flex gap-2 justify-center w-full">
                    <div className="rounded-lg overflow-hidden border border-slate-700 bg-black/40" style={{ maxWidth: sub.paired ? '140px' : '200px', flex: '0 0 auto' }}>
                      <img src={sub.src} alt="" className="w-full h-auto" />
                    </div>
                    {sub.paired && (
                      <div className="rounded-lg overflow-hidden border border-slate-700 bg-black/40" style={{ maxWidth: '140px', flex: '0 0 auto' }}>
                        <img src={sub.paired} alt="" className="w-full h-auto" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 text-center leading-snug max-w-[300px]">{sub.caption}</p>
                </div>
              ))}
            </div>
          )}

          {/* Body */}
          <p className="text-sm text-slate-300 text-center leading-relaxed max-w-sm">
            {slide.body}
          </p>
        </div>

        {/* Navigation buttons */}
        <div className="max-w-md mx-auto px-4 pb-8 flex items-center gap-3">
          {currentSlide > 0 ? (
            <button
              onClick={handlePrev}
              className="flex items-center gap-1 px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors text-sm font-bold"
            >
              <ArrowLeft className="w-4 h-4" /> BACK
            </button>
          ) : (
            <div className="w-[88px]" />
          )}

          <div className="flex-1 text-center text-xs text-slate-500 font-bold">
            {currentSlide + 1} / {SLIDES.length}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-4 py-3 rounded-xl font-bold text-sm transition-all text-black"
            style={{ backgroundColor: slide.color }}
          >
            {isLastSlide ? 'PLAY NOW!' : 'NEXT'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}