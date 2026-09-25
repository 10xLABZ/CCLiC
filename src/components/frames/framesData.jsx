// All profile frames available in the game

export const FRAMES = {
  vip: {
    id: 'vip',
    name: 'VIP',
    imageUrl: 'https://media.base44.com/images/public/699169456a354d6cb7082777/bbb7b1e48_profile_frame_vip3.png',
    type: 'temporary',
    description: 'TEMPORARY — 30 DAYS',
    source: 'VIP Subscription',
    color: 'text-yellow-400',
    borderColor: 'border-yellow-500/50',
  },
  cc_top: {
    id: 'cc_top',
    name: '1ST',
    imageUrl: 'https://media.base44.com/images/public/699169456a354d6cb7082777/6ec19a32d_CCTPI-frames1st.png',
    type: 'temporary',
    description: 'TEMPORARY — 1 WEEK (until next event ends)',
    source: 'Capital Clash #1 Winner',
    color: 'text-yellow-300',
    borderColor: 'border-yellow-400/60',
  },
  cc_2nd: {
    id: 'cc_2nd',
    name: '2ND',
    imageUrl: 'https://media.base44.com/images/public/699169456a354d6cb7082777/029033c6b_CCTPI-frames2nda.png',
    type: 'temporary',
    description: 'TEMPORARY — 1 WEEK (until next event ends)',
    source: 'Capital Clash Top 2',
    color: 'text-sky-400',
    borderColor: 'border-sky-500/50',
  },
  cc_3rd: {
    id: 'cc_3rd',
    name: '3RD',
    imageUrl: 'https://media.base44.com/images/public/699169456a354d6cb7082777/31cb6d569_CCTPI-frames3rda.png',
    type: 'temporary',
    description: 'TEMPORARY — 1 WEEK (until next event ends)',
    source: 'Capital Clash Top 3',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/50',
  },
  vip_legend: {
    id: 'vip_legend',
    name: 'VIP LEGEND',
    imageUrl: 'https://media.base44.com/images/public/699169456a354d6cb7082777/0020582d7_profile_frame_viplegend1b.png',
    type: 'temporary',
    description: 'VIP LEVEL 10+ — ACTIVE VIP REQUIRED',
    source: 'VIP Level 10 Reward',
    color: 'text-purple-400',
    borderColor: 'border-purple-500/50',
  },
};

export const getFrameById = (id) => FRAMES[id] || null;