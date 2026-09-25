// Avatar background scenes

export const DEFAULT_SCENES = [
  {
    id: 'scene_default_01',
    name: 'Hideout',
    imageUrl: 'https://media.base44.com/images/public/699169456a354d6cb7082777/3cc08a1ff_avatar-background-DEFAULT-01a.jpg',
    category: 'universal',
    price: 0,
    level: 1,
    isDefault: true
  },
  {
    id: 'scene_default_02',
    name: 'Apartment',
    imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/dfc09ac3b_avatar-background-DEFAULT-02.jpg',
    category: 'universal',
    price: 0,
    level: 1,
    isDefault: true
  },
  {
    id: 'scene_default_03',
    name: 'Street Night',
    imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/13eb0d6c0_avatar-background-DEFAULT-03.jpg',
    category: 'universal',
    price: 0,
    level: 1,
    isDefault: true
  }
];

export const PREMIUM_SCENES = [
  // Neon scenes (100 CRYD each)
  {
    id: 'scene_neon_cyan_zone',
    name: 'Neon Cyan Zone',
    imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/0141b458b_avatar-background-Neon_Cyan_Zone.jpg',
    category: 'universal',
    priceCash: 0,
    priceCrypto: 100,
    level: 1
  },
  {
    id: 'scene_neon_pink_zone',
    name: 'Neon Pink Zone',
    imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/d1b9ac3c0_avatar-background-Neon_Pink_Zone.jpg',
    category: 'universal',
    priceCash: 0,
    priceCrypto: 100,
    level: 1
  },
  // Universal Scenes
  {
    id: 'scene_trade_desk',
    name: 'Trade Desk',
    imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/574d9f6fb_avatar-background-Trade_Desk.jpg',
    category: 'universal',
    priceCash: 0,
    priceCrypto: 100,
    level: 10
  },
  {
    id: 'scene_tool_shop',
    name: 'Tool Shop',
    imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/85b4d2719_avatar-background-men-Tool_Shop.jpg',
    category: 'male',
    priceCash: 0,
    priceCrypto: 100,
    level: 12
  },
  {
    id: 'scene_cute_n_pink',
    name: 'Cute N Pink',
    imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/fbe6bd9d9_avatar-background-women-Cute_N_Pink.jpg',
    category: 'female',
    priceCash: 0,
    priceCrypto: 100,
    level: 14
  },
  {
    id: 'scene_trade_floor',
    name: 'Trade Floor',
    imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/4d0857073_avatar-background-Trade_Floor.jpg',
    category: 'universal',
    priceCash: 0,
    priceCrypto: 100,
    level: 15
  },
  {
    id: 'scene_dance_studio',
    name: 'Dance Studio',
    imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/447de1008_avatar-background-women-Dance_Studio.jpg',
    category: 'female',
    priceCash: 0,
    priceCrypto: 100,
    level: 17
  },
  {
    id: 'scene_gaming_room',
    name: 'Sweet Gaming Room',
    imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/382f6133b_avatar-background-men-Sweet_Gaming_Room.jpg',
    category: 'male',
    priceCash: 0,
    priceCrypto: 100,
    level: 18
  },
  {
    id: 'scene_pretty_game_station',
    name: 'Pretty Game Station',
    imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/83d2b2f04_avatar-background-women-Pretty_Game_Station.jpg',
    category: 'female',
    priceCash: 0,
    priceCrypto: 100,
    level: 19
  },
  {
    id: 'scene_wall_street',
    name: 'Wall Street',
    imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/da17a5103_avatar-background-Wall_Street.jpg',
    category: 'universal',
    priceCash: 0,
    priceCrypto: 100,
    level: 20
  },
  {
    id: 'scene_girl_power',
    name: 'Girl Power',
    imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/e490705de_avatar-background-women-Girl_Power.jpg',
    category: 'female',
    priceCash: 0,
    priceCrypto: 100,
    level: 21
  },
  {
    id: 'scene_sportscar_garage',
    name: 'Sportscar Garage',
    imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/a3f373e6e_avatar-background-men-Sportscar_Garage.jpg',
    category: 'male',
    priceCash: 0,
    priceCrypto: 100,
    level: 22
  },
  {
    id: 'scene_mounds_of_money',
    name: 'Mounds Of Money',
    imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/23c5a3786_avatar-background-Mounds_Of_Money.jpg',
    category: 'universal',
    priceCash: 0,
    priceCrypto: 100,
    level: 25
  },
  {
    id: 'scene_high_rise',
    name: 'High Rise',
    imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/ada999de7_avatar-background-High_Rise.jpg',
    category: 'universal',
    priceCash: 0,
    priceCrypto: 100,
    level: 30
  },
  {
    id: 'scene_futuristic_battle_pad',
    name: 'Futuristic Battle Pad',
    imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/e0468f031_avatar-background-Futuristic_Battle_Pad.jpg',
    category: 'universal',
    priceCash: 0,
    priceCrypto: 100,
    level: 32
  },
  {
    id: 'scene_evil_lair',
    name: 'Evil Lair',
    imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/532244562_avatar-background-Evil_Layer.jpg',
    category: 'universal',
    priceCash: 0,
    priceCrypto: 100,
    level: 35
  },
  {
    id: 'scene_mansion',
    name: 'Mansion',
    imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/0c914c3e8_avatar-background-Mansion.jpg',
    category: 'universal',
    priceCash: 0,
    priceCrypto: 500,
    level: 50
  },
  // Elite scenes
  {
    id: 'scene_white_house',
    name: 'The White House',
    imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/19ff5ca83_avatar-background-The_White_House.jpg',
    category: 'universal',
    priceCash: 0,
    priceCrypto: 1500,
    level: 100
  },
  {
    id: 'scene_illuminati_house',
    name: "Illuminati's House",
    imageUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/8434235e1_avatar-background-The_illuminati_house.jpg',
    category: 'universal',
    priceCash: 0,
    priceCrypto: 2500,
    level: 150
  }
];

export const ALL_SCENES = [...DEFAULT_SCENES, ...PREMIUM_SCENES];

export const getSceneById = (sceneId) => {
  return ALL_SCENES.find(scene => scene.id === sceneId);
};

export const getScenesByCategory = (category) => {
  if (category === 'all') return ALL_SCENES;
  return ALL_SCENES.filter(scene => scene.category === category);
};