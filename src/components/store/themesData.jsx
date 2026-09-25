// Profile theme sets - each theme contains 3 background images
// category: 'universal' = all genders, 'female' = female/NB only

const BASE = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/';

export const DEFAULT_THEMES = [
  {
    id: 'theme_001_rusty_hotness',
    name: 'Rusty Hotness',
    strengthImage: BASE + '604225359_Theme_001_StrengthBox_RustyHotness.jpg',
    performanceImage: BASE + '913a43062_Theme_001_PerformanceBox_RustyHotness.jpg',
    usernameImage: BASE + '1cb4bea85_Theme_001_UsernameBox-RustyHotness.jpg',
    previewImage: BASE + '604225359_Theme_001_StrengthBox_RustyHotness.jpg',
    category: 'universal',
    price: 0,
    level: 1,
    isDefault: true
  }
];

export const PREMIUM_THEMES = [
  {
    id: 'theme_002_neon_cyan_zone',
    name: 'Neon Cyan Zone',
    strengthImage: BASE + 'a9cecb419_Theme_002_StrengthBox-Neon_Cyan_Zone.jpg',
    performanceImage: BASE + 'fc21e4859_Theme_002_PerformanceBox-Neon_Cyan_Zone.jpg',
    usernameImage: BASE + 'b3bc4eab7_Theme_002_UsernameBox-Neon_Cyan_Zone.jpg',
    previewImage: BASE + 'a9cecb419_Theme_002_StrengthBox-Neon_Cyan_Zone.jpg',
    category: 'universal',
    priceCash: 0,
    priceCrypto: 250,
    level: 1
  },
  {
    id: 'theme_003_hearty_glitz',
    name: 'Hearty Glitz',
    strengthImage: BASE + 'dd4d1cd39_Theme_003_StrengthBox-female-Hearty_Glitz.jpg',
    performanceImage: BASE + 'ea3bf9fdf_Theme_003_PerformanceBox-female-Hearty_Glitz.jpg',
    usernameImage: BASE + '48367c587_Theme_003_UsernameBox-female-Hearty_Glitz.jpg',
    previewImage: BASE + 'dd4d1cd39_Theme_003_StrengthBox-female-Hearty_Glitz.jpg',
    category: 'female',
    priceCash: 0,
    priceCrypto: 300,
    level: 1
  },
  {
    id: 'theme_004_flowerful_delight',
    name: 'Flowerful Delight',
    strengthImage: BASE + '6d39070ae_Theme_004_StrengthBox-female-Flowerful_Delight.jpg',
    performanceImage: BASE + 'e3b1fa72a_Theme_004_PerformanceBox-female-Flowerful_Delight.jpg',
    usernameImage: BASE + '912c2fda7_Theme_004_UsernameBox-female-Flowerful_Delight.jpg',
    previewImage: BASE + '6d39070ae_Theme_004_StrengthBox-female-Flowerful_Delight.jpg',
    category: 'female',
    priceCash: 0,
    priceCrypto: 300,
    level: 1
  },
  {
    id: 'theme_005_chained',
    name: 'Chained',
    strengthImage: BASE + '6a009ed35_Theme_005_StrengthBox-Chained.jpg',
    performanceImage: BASE + '8e5b06803_Theme_005_PerformanceBox-Chained.jpg',
    usernameImage: BASE + 'b544d28c3_Theme_005_UsernameBox-Chained.jpg',
    previewImage: BASE + '6a009ed35_Theme_005_StrengthBox-Chained.jpg',
    category: 'universal',
    priceCash: 0,
    priceCrypto: 350,
    level: 1
  },
  {
    id: 'theme_006_capital_dow',
    name: 'Capital Dow',
    strengthImage: BASE + 'b1515dae7_Theme_006_StrengthBox-Capital_Dow.jpg',
    performanceImage: BASE + '4ce195604_Theme_006_PerformanceBox-Capital_Dow.jpg',
    usernameImage: BASE + 'cd6413f31_Theme_006_UsernameBox-Capital_Dow.jpg',
    previewImage: BASE + 'b1515dae7_Theme_006_StrengthBox-Capital_Dow.jpg',
    category: 'universal',
    priceCash: 0,
    priceCrypto: 350,
    level: 1
  },
  {
    id: 'theme_007_bullets_galore',
    name: 'Bullets Galore',
    strengthImage: BASE + 'f39cc9a6a_Theme_007_StrengthBox-Bullets_Galore.jpg',
    performanceImage: BASE + 'ea3b490b8_Theme_007_PerformanceBox-Bullets_Galore.jpg',
    usernameImage: BASE + '1ed474169_Theme_007_UsernameBox-Bullets_Galore.jpg',
    previewImage: BASE + 'f39cc9a6a_Theme_007_StrengthBox-Bullets_Galore.jpg',
    category: 'universal',
    priceCash: 0,
    priceCrypto: 350,
    level: 1
  },
  {
    id: 'theme_008_glamourous',
    name: 'Glamourous',
    strengthImage: BASE + 'ab38c3ff3_Theme_008_StengthBox-female-Glamourous.jpg',
    performanceImage: BASE + '8ee406250_Theme_008_PerformanceBox-female-Glamourous.jpg',
    usernameImage: BASE + '4e7e568f3_Theme_008_UsernameBox-female-Glamourous.jpg',
    previewImage: BASE + 'ab38c3ff3_Theme_008_StengthBox-female-Glamourous.jpg',
    category: 'female',
    priceCash: 0,
    priceCrypto: 400,
    level: 1
  },
  {
    id: 'theme_009_demonic',
    name: 'Demonic',
    strengthImage: BASE + '410549ccb_Theme_009_StrengthBox-Demonic.jpg',
    performanceImage: BASE + 'f00997c1c_Theme_009_PerformanceBox-Demonic.jpg',
    usernameImage: BASE + 'aac38578a_Theme_009_UsernameBox-Demonic.jpg',
    previewImage: BASE + '410549ccb_Theme_009_StrengthBox-Demonic.jpg',
    category: 'universal',
    priceCash: 0,
    priceCrypto: 400,
    level: 1
  },
  {
    id: 'theme_010_futuristic',
    name: 'Futuristic',
    strengthImage: BASE + '30c419012_Theme_010_StrengthBox-Futuristic.jpg',
    performanceImage: BASE + '7484b6c2e_Theme_010_PerformanceBox-Futuristic.jpg',
    usernameImage: BASE + '6ac38ce02_Theme_010_UsernameBox-Futuristic.jpg',
    previewImage: BASE + '30c419012_Theme_010_StrengthBox-Futuristic.jpg',
    category: 'universal',
    priceCash: 0,
    priceCrypto: 400,
    level: 1
  },
  {
    id: 'theme_011_stock_charts',
    name: 'Stock Charts',
    strengthImage: BASE + '9e9b4949a_Theme_011_StrengthBox-Stock_Charts.jpg',
    performanceImage: BASE + 'a092ec4a9_Theme_011_PerformanceBox-Stock_Charts.jpg',
    usernameImage: BASE + 'c6e134dfb_Theme_011_UsernameBox-Stock_Charts.jpg',
    previewImage: BASE + '9e9b4949a_Theme_011_StrengthBox-Stock_Charts.jpg',
    category: 'universal',
    priceCash: 0,
    priceCrypto: 350,
    level: 1
  },
  {
    id: 'theme_013_wall_street',
    name: 'Wall Street',
    strengthImage: BASE + '8028228c6_Theme_013_StrengthBox-Wall_Street.jpg',
    performanceImage: BASE + '87b64fe0a_Theme_013_PerformanceBox-Wall_Street.jpg',
    usernameImage: BASE + '0dec60345_Theme_013_UsernameBox-Wall_Street.jpg',
    previewImage: BASE + '8028228c6_Theme_013_StrengthBox-Wall_Street.jpg',
    category: 'universal',
    priceCash: 0,
    priceCrypto: 450,
    level: 1
  },
  {
    id: 'theme_012_illuminati',
    name: 'Illuminati',
    strengthImage: BASE + 'a01c177b9_Theme_012_StrengthBox-Illuminati.jpg',
    performanceImage: BASE + 'd09dff242_Theme_012_PerformanceBox-Illuminati.jpg',
    usernameImage: BASE + 'f779093a0_Theme_012_UsernameBox-Illuminati.jpg',
    previewImage: BASE + 'a01c177b9_Theme_012_StrengthBox-Illuminati.jpg',
    category: 'universal',
    priceCash: 0,
    priceCrypto: 1000,
    level: 1,
    isIlluminati: true
  }
];

export const ALL_THEMES = [...DEFAULT_THEMES, ...PREMIUM_THEMES];

export const getThemeById = (themeId) => {
  return ALL_THEMES.find(theme => theme.id === themeId);
};

export const getThemesByCategory = (category) => {
  if (category === 'all') return ALL_THEMES;
  return ALL_THEMES.filter(theme => theme.category === category);
};

// Filter themes eligible for a given gender
export const getEligibleThemes = (themes, gender) => {
  return themes.filter(theme => {
    if (theme.category === 'universal') return true;
    if (theme.category === 'female') return gender === 'F' || gender === 'NB';
    return true;
  });
};