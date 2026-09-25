// ========== SEEDED RANDOM ==========
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }
  
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

// ========== MALE PREFIX POOL (NO FEMININE WORDS) ==========
const MALE_PREFIX_POOL = [
  "Sharp", "Dark", "Silent", "Wicked", "Iron", "Neon", "Ghost", "Rogue", "Rapid",
  "Cold", "Hot", "Wild", "Brutal", "Heavy", "Golden", "Crimson", "Midnight", "Storm",
  "Turbo", "Quick", "Big", "Alpha", "Omega", "Phantom", "Toxic", "Frost", "Steel",
  "Chrome", "Solar", "Cosmic", "Prime", "Ultra", "Hyper", "Dirty", "Smooth",
  "Shadow", "Diamond", "Thunder", "Lightning", "Phoenix", "Eagle", "Hawk", "Falcon",
  "Python", "Leopard", "Jaguar", "Chen", "Zhang", "Wang", "Liu", "Yang", "Wu", "Zhao",
  "Cyber", "Digital", "Nexus", "Vector", "Binary", "Code", "Street", "Urban", "Metro",
  "Block", "Zone", "District", "Royal", "Noble", "Imperial", "Prince", "Duke",
  "Blaze", "Cobra", "Dragon", "Viper", "Grizzly", "Hunter", "Maverick", "Outlaw", "Renegade",
  "Savage", "Spartan", "Titan", "Vanguard", "Warlord", "Zephyr", "Apex", "Bolt", "Crusher",
  "Dominus", "Fury", "Grim", "Inferno", "Juggernaut", "Knight", "Lazarus", "Monarch", "Nemesis",
  "Obsidian", "Predator", "Pyro", "Raptor", "Reaper", "Serpent", "Stryker", "Tyrant", "Venom",
  "Vortex", "Warlock", "Xenon", "Yakuza", "Zulu", "Blitz", "Comet", "Dread", "Eclipse",
  "Goliath", "Havoc", "Hydra", "Impact", "Kinetic", "Leviathan", "Minotaur", "Nebula", "Oracle",
  "Paradox", "Quasar", "Ragnar", "Sentry", "Specter", "Tempest", "Umbrius", "Vindicator", "Warden",
  "Xerxes", "Yeti", "Zodiac", "Ares", "Atlas", "Banshee", "Cerberus", "Colossus", "Daemon",
  "Echo", "Golem", "Harpy", "Kraken", "Medusa", "Orion", "Pegasus", "Sphinx", "Valkyrie",
  "Wyvern", "Zeus", "Achilles", "Ajax", "Apollo", "Bacchus", "Caesar", "Castor", "Cato",
  "Cicero", "Constantine", "Corvinus", "Crassus", "Crixus", "Decius", "Diomedes", "Draco",
  "Fabius", "Faunus", "Felix", "Flavius", "Gaius", "Hector", "Horatius", "Janus", "Jupiter",
  "Laertes", "Lancelot", "Leonidas", "Linus", "Lucius", "Magnus", "Marcellus", "Marcus", "Mars",
  "Maximus", "Mercury", "Milo", "Mithras", "Neptune", "Nero", "Octavius", "Odin", "Olympus",
  "Orpheus", "Pallas", "Patroclus", "Perseus", "Pluto", "Pollux", "Pontius", "Priam", "Probus",
  "Quintus", "Remus", "Romulus", "Rufus", "Scipio", "Silas", "Socrates", "Sol", "Spartacus",
  "Sulla", "Tacitus", "Tiberius", "Titus", "Trajan", "Ulysses", "Valerius", "Vespasian", "Victor",
  "Virgil", "Vulcan", "Zeno", "Long", "Wei", "Li", "Huang", "Zhou", "Xiao", "Gao", "Lin",
  "Ma", "Liang", "Feng", "Jian", "Han", "Tang", "Song", "Ming", "Qing", "Jin", "龙", "虎",
  "狼", "鹰", "熊", "豹", "蛇", "鲨", "刀", "剑", "盾", "雷", "火", "冰", "风", "云"
];

// ========== FEMALE PREFIX POOL (GIRL-TYPE NAMES) ==========
const FEMALE_PREFIX_POOL = [
  "Lucky", "Neon", "Smooth", "Crystal", "Pearl", "Ruby", "Violet", "Scarlet", "Azure",
  "Maria", "Sofia", "Elena", "Isabella", "Carmen", "Rosa", "Stella", "Diana", "Nina",
  "Ana", "Eva", "Mia", "Zoe", "Ivy", "Sky", "River", "Ocean", "Mei", "Yuki", "Sakura",
  "Hana", "Kira", "Pixel", "Amber", "Coral", "Marble", "Risky", "Sneaky", "Vicious",
  "Savage", "Calm", "Pretty", "Pink", "Blush", "Rose", "Daisy", "Lily", "Willow", "Hazel",
  "Aurora", "Luna", "Nova", "Star", "Dream", "Grace", "Belle", "Charm", "Fairy", "Angel",
  "Sweet", "Sugar", "Honey", "Velvet", "Silk", "Mystic", "Enigma", "Harmony", "Serene",
  "Melody", "Echo", "Whisper", "Glimmer", "Sparkle", "Jewel", "Gem", "Diamond", "Jade",
  "Opal", "Sapphire", "Amethyst", "Emerald", "Topaz", "Bliss", "Cherish", "Dahlia", "Elara",
  "Fleur", "Giselle", "Iris", "Jasmine", "Kaelen", "Lyra", "Maeve", "Niamh", "Orla", "Pippa",
  "Quinn", "Rhea", "Seraphina", "Thalia", "Una", "Veda", "Wren", "Xena", "Yvette", "Zara",
  "Anya", "Briar", "Cora", "Dara", "Eira", "Freya", "Gwen", "Ida", "Juno", "Keira", "Lana",
  "Mina", "Nola", "Oona", "Phoebe", "Roisin", "Siobhan", "Tamsin", "Bronte", "Cleo", "Daphne",
  "Elodie", "Flora", "Greta", "Heidi", "Ingrid", "Jana", "Lena", "Mara", "Nadia", "Odette",
  "Petra", "Sabine", "Tabitha", "Ursula", "Vita", "Willa", "Xenia", "Yara", "Zelda", "Adelaide",
  "Amelia", "Annabelle", "Beatrice", "Caroline", "Charlotte", "Clementine", "Constance", "Cordelia",
  "Dorothea", "Eleanor", "Elizabeth", "Evangeline", "Florence", "Genevieve", "Georgina", "Harriet",
  "Henrietta", "Josephine", "Louisa", "Margot", "Matilda", "Millicent", "Penelope", "Rosalind",
  "Theodora", "Victoria", "Vivian", "Adeline", "Clara", "Edith", "Esther", "Frances", "Julia",
  "Laura", "Louise", "Lucy", "Mabel", "Mary", "Nora", "Olive", "Ruth", "Sarah", "Princess",
  "Queen", "Empress", "Duchess", "Lady", "Girl", "Chick", "Babe", "Diva", "Goddess", "Siren",
  "Vixen", "Foxy", "Kitten", "Butterfly", "Peach", "Cherry", "Candy", "Cupcake", "Lotus", "Orchid",
  "Poppy", "Magnolia", "Lavender", "Tulip", "Sunflower", "Moonlight", "Stardust", "Twilight", "Dawn",
  "Sunset", "Rainbow", "Shimmer", "Twinkle", "Ling", "Xiu", "Yan", "Fang", "Hui", "Jing",
  "Qian", "Shan", "Ting", "Xia", "Ying", "Yu", "Zhen", "凤", "莲", "梅", "兰", "菊",
  "桃", "樱", "雪", "月", "星", "云", "霞", "露", "蝶", "燕"
];

// ========== GENERIC PREFIX POOL (NON-BINARY - ALL NAMES ALLOWED) ==========
const GENERIC_PREFIX_POOL = [
  "Sharp", "Dark", "Silent", "Wicked", "Lucky", "Iron", "Neon", "Ghost", "Rogue", "Rapid",
  "Cold", "Hot", "Wild", "Sneaky", "Vicious", "Savage", "Calm", "Heavy", "Golden", "Crimson",
  "Midnight", "Storm", "Turbo", "Quick", "Fat", "Thin", "Big", "Small", "Alpha", "Omega",
  "Phantom", "Toxic", "Frost", "Ember", "Steel", "Chrome", "Solar", "Lunar", "Nova", "Cosmic",
  "Prime", "Ultra", "Hyper", "Nano", "Macro", "Dirty", "Clean", "Brutal", "Smooth", "Risky",
  "Zenith", "Apex", "Vanguard", "Echo", "Quantum", "Nexus", "Kinetic", "Obsidian", "Azure",
  "Emerald", "Amber", "Opal", "Jade", "Topaz", "Sapphire", "Amethyst", "Diamond", "Crystal",
  "Pearl", "Ruby", "Glimmer", "Sparkle", "Dream", "Whisper", "Serene", "Harmony", "Mystic",
  "Enigma", "Eclipse", "Comet", "Stellar", "Galactic", "Nebula", "Quasar", "Vortex", "Aurora",
  "Pinnacle", "Summit", "Vertex", "Crown", "Royal", "Noble", "Imperial", "Sovereign", "Monarch",
  "Emperor", "Empress", "Queen", "King", "Prince", "Princess", "Duchess", "Duke", "Baron",
  "Baroness", "Count", "Countess", "Lord", "Lady", "Master", "Mistress", "Guardian", "Sentinel",
  "Watcher", "Protector", "Avenger", "Vindicator", "Warden", "Marshal", "Admiral", "Captain",
  "Commander", "General", "Colonel", "Major", "Sergeant", "Corporal", "Private", "Agent",
  "Operative", "Scout", "Ranger", "Hunter", "Tracker", "Pathfinder", "Explorer", "Voyager",
  "Nomad", "Wanderer", "Traveler", "Pilgrim", "Pioneer", "Settler", "Homesteader", "Frontier",
  "Wilderness", "Outback", "Badlands", "Wasteland", "Desert", "Jungle", "Forest", "Mountain",
  "Valley", "River", "Lake", "Ocean", "Sea", "Island", "Coast", "Shore", "Beach", "Harbor",
  "Port", "Dock", "Pier", "Bridge", "Tower", "Castle", "Fortress", "Citadel", "Keep", "Bastion",
  "Chen", "Zhang", "Wang", "Liu", "Yang", "Wu", "Zhao", "Huang", "Zhou", "Lin", "Ma", "Feng",
  "Mei", "Ling", "Xiu", "Yan", "Fang", "Hui", "Jing", "龙", "虎", "凤", "莲", "梅"
];

// ========== CORE POOL (200 NAMES - GENDER NEUTRAL) ==========
const CORE_POOL = [
  "Vic", "Options", "Candle", "Wick", "Tape", "Order", "Flow", "Beta", "Gamma", "Theta",
  "Vega", "Ripper", "Hustle", "Cash", "Coin", "Ledger", "Vault", "Margin", "Leverage",
  "Shorts", "Longs", "Bid", "Ask", "Spread", "Pump", "Dump", "Trend", "Pivot", "Breakout",
  "Reversal", "Signal", "Scanner", "Warrior", "Samurai", "Ninja", "Ronin", "Shogun",
  "Emperor", "Empress", "Fortune", "Destiny", "Legacy", "Dynasty", "Reign", "Realm",
  "Pearl", "Emerald", "Gold", "Silver", "Platinum", "Inferno", "Ice", "Snow", "Wind",
  "Spirit", "Spectre", "Wraith", "Soul", "Essence", "Aura", "Force", "Tech", "Boss",
  "Apex", "Zenith", "Summit", "Pinnacle", "Vertex", "Trader", "Market", "Profit", "Asset",
  "Equity", "Stock", "Bond", "Future", "Option", "Forex", "Crypto", "Wallet", "Exchange",
  "Broker", "Hedge", "Fund", "Capital", "Wealth", "Money", "Income", "Revenue", "Dividend",
  "Growth", "Value", "Index", "Portfolio", "Diversify", "Liquidity", "Volatile", "Bear",
  "Bull", "Whale", "Shark", "Wolf", "Lion", "Tiger", "Panther", "Cougar", "Leopard",
  "Jaguar", "Cheetah", "Lynx", "Bobcat", "Coyote", "Fox", "Hound", "Mastiff", "Shepherd",
  "Husky", "Doberman", "Rottweiler", "Cobra", "Viper", "Python", "Anaconda", "Rattler",
  "Mamba", "Lizard", "Gecko", "Komodo", "Crocodile", "Alligator", "Dolphin", "Orca",
  "Manta", "Octopus", "Squid", "Crab", "Lobster", "Seahorse", "Starfish", "Coral",
  "Trout", "Salmon", "Tuna", "Pike", "Bass", "Carp", "Catfish", "Eel", "Barracuda",
  "Swordfish", "Marlin", "Hammerhead", "Abyss", "Anchor", "Beacon", "Blast", "Blaze",
  "Blizzard", "Bolt", "Boom", "Breaker", "Bubble", "Burn", "Cannon", "Charge", "Cipher",
  "Circuit", "Claw", "Cloud", "Code", "Comet", "Core", "Cosmic", "Counter", "Cracker",
  "Crusher", "Cyber", "Cyclone", "Dagger", "Dash", "Dawn", "Deep", "Delta", "Demon",
  "Destroyer", "Devil", "Diamond", "Digital", "Disaster", "Doom", "Dragon", "Dream",
  "Drifter", "Dynamo", "Eagle", "Echo", "Edge", "Elite", "Engine", "Enigma", "Epoch",
  "Falcon", "Fang", "Fate", "Fire", "Flame", "Flash", "Fleet", "Forge", "Fortress",
  "Frost", "Fury", "Galaxy", "Gale", "Gambit", "Gem", "Ghost", "Glacier", "Gladiator",
  "Glide", "Glimmer", "Glory", "Glow", "Golem", "Gravity", "Grizzly", "Guardian", "Hammer",
  "Harbinger", "Harmony", "Havoc", "Hawk", "Heat", "Hero", "Hex", "Horizon", "Hunter",
  "Hydra", "Hyper", "Icon", "Impact", "Iron", "Jade", "Knight", "Kraken", "Laser",
  "Legend", "Leviathan", "Light", "Lightning", "Lotus", "Lunar", "Machine", "Magnet",
  "Maverick", "Meteor", "Midnight", "Monarch", "Moon", "Nebula", "Neon", "Nexus", "Nova",
  "Omega", "Onyx", "Oracle", "Orbit", "Paladin", "Phantom", "Phoenix", "Pixel", "Plasma",
  "Prism", "Pulse", "Quantum", "Quasar", "Raven", "Reactor", "Reaper", "Relic", "Rogue",
  "Ruby", "Saber", "Sage", "Sapphire", "Sentinel", "Shadow", "Shard", "Signal", "Silver",
  "Solar", "Spark", "Spectre", "Spike", "Spirit", "Star", "Steel", "Storm", "Strike",
  "Sword", "Tempest", "Thunder", "Titan", "Topaz", "Turbo", "Twilight", "Vanguard", "Vector",
  "Venom", "Vertex", "Viper", "Vortex", "Warden", "Wizard", "Zenith", "Zodiac", "剑",
  "盾", "龙", "虎", "凤", "狼", "鹰", "豹", "蛇", "鲨", "雷", "火", "冰", "风",
  "云", "月", "星", "光", "影", "魂", "力", "道", "霸", "王", "圣", "魔"
];

// ========== SUFFIX POOL (200 NAMES - GENDER NEUTRAL) ==========
const SUFFIX_POOL = [
  "Killer", "Lord", "Sniper", "Wizard", "Raider", "Hunter", "Baron", "Enforcer", "Warden",
  "Dealer", "Fixer", "Banker", "Trader", "Insider", "Operator", "Machine", "Engine",
  "Reactor", "Cannon", "Admiral", "Marshal", "Sergeant", "Elite", "Ace", "Titan",
  "Legend", "Myth", "Icon", "Star", "Hero", "Champion", "Victor", "Assassin", "Slayer",
  "Destroyer", "Terminator", "Annihilator", "Demolisher", "Vanquisher", "Conqueror",
  "Dominator", "Eliminator", "Exterminator", "Executioner", "Guardian", "Protector",
  "Sentinel", "Watcher", "Vindicator", "Avenger", "Punisher", "Reaper", "Shadow",
  "Specter", "Phantom", "Ghost", "Wraith", "Spirit", "Demon", "Devil", "Dragon",
  "Viper", "Cobra", "Wolf", "Lion", "Tiger", "Bear", "Shark", "Eagle", "Falcon",
  "Hawk", "Stinger", "Blaster", "Buster", "Crusher", "Smasher", "Striker", "Wrecker",
  "Juggernaut", "Colossus", "Goliath", "Behemoth", "Leviathan", "Kraken", "Cyclops",
  "Minotaur", "Gorgon", "Hydra", "Chimera", "Griffin", "Phoenix", "Centaur", "Sphinx",
  "Basilisk", "Wyvern", "Manticore", "Cerberus", "Harpy", "Siren", "Medusa", "Dragonfly",
  "Scorpion", "Tarantula", "Vulture", "Raptor", "Piranha", "Barracuda", "Orca",
  "Gladiator", "Spartan", "Knight", "Paladin", "Warrior", "Samurai", "Ninja", "Ronin",
  "Shogun", "Emperor", "Empress", "King", "Queen", "Prince", "Duke", "Duchess",
  "Count", "Countess", "Master", "Mistress", "Sensei", "Guru", "Sage", "Oracle",
  "Prophet", "Seer", "Sorcerer", "Mage", "Enchanter", "Witch", "Priest", "Cleric",
  "Monk", "Druid", "Bard", "Ranger", "Rogue", "Thief", "Scout", "Explorer",
  "Adventurer", "Traveler", "Nomad", "Wanderer", "Pilgrim", "Pioneer", "Settler",
  "Outlaw", "Renegade", "Bandit", "Marauder", "Pirate", "Smuggler", "Gangster",
  "Mobster", "Mafioso", "Boss", "Don", "Capo", "Underboss", "Consigliere", "Soldier",
  "Hitman", "Bodyguard", "Guard", "Watchman", "Sentry", "Bouncer", "Fighter", "Wrestler",
  "Boxer", "Brawler", "Combatant", "Duelist", "Swordsman", "Archer", "Marksman",
  "Sharpshooter", "Gunner", "Cannoneer", "Artillery", "Engineer", "Mechanic", "Technician",
  "Scientist", "Doctor", "Professor", "Scholar", "Researcher", "Analyst", "Strategist",
  "Tactician", "Commander", "General", "Captain", "Lieutenant", "Corporal", "Private",
  "Recruit", "Cadet", "Veteran", "Winner", "Grandmaster", "Prodigy", "Genius", "Creator",
  "Architect", "Builder", "Maker", "Artisan", "Craftsman", "Artist", "Musician", "Poet",
  "Writer", "Author", "Historian", "Philosopher", "Teacher", "Mentor", "Guide", "Leader",
  "Speaker", "Orator", "Diplomat", "Mediator", "Negotiator", "Ambassador", "Envoy",
  "Messenger", "Herald", "Reporter", "Journalist", "Chronicler", "Scribe", "Librarian",
  "Archivist", "Curator", "Collector", "Founder", "Patriarch", "Matriarch", "Ancestor",
  "Heir", "Successor", "Offspring", "Scion", "Progeny", "Prime", "Alpha", "Beta",
  "Gamma", "Delta", "Epsilon", "Zeta", "Theta", "Sigma", "者", "王", "霸", "圣",
  "魔", "神", "仙", "鬼", "狂", "煞", "尊", "帝", "皇", "侠", "剑客", "刀客"
];

export function generateBotName(seed) {
  const rng = new SeededRandom(Math.floor(seed * 1000000));
  
  // Gender distribution: 55% male, 40% female, 5% non-binary
  const genderRoll = rng.next();
  let prefixPool;
  
  if (genderRoll < 0.55) {
    prefixPool = MALE_PREFIX_POOL;
  } else if (genderRoll < 0.95) {
    prefixPool = FEMALE_PREFIX_POOL;
  } else {
    prefixPool = GENERIC_PREFIX_POOL;
  }
  
  const prefix = rng.pick(prefixPool);
  const core = rng.pick(CORE_POOL);
  const useSuffix = rng.next() < 0.3;
  
  let botName = useSuffix ? `${prefix}${core}${rng.pick(SUFFIX_POOL)}` : `${prefix}${core}`;
  
  // 66% chance to add a number suffix (0-999)
  if (rng.next() < 0.66) {
    const number = rng.nextInt(0, 999);
    botName += number;
  }
  
  if (botName.length > 20) botName = botName.slice(0, 20);
  
  return botName;
}