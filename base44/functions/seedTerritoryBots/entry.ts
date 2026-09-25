import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BUILDING_IDS = ['mayors_office'];
// City-specific bonus buildings (same mechanics as Mayor's Office, just masked name + image)
const CITY_BUILDING_OVERRIDES = {
  'New York City': ['statue_of_liberty'],
  'District of Columbia (D.C.)': ['white_house', 'the_pentagon'],
};
const getBuildingIds = (city) => {
  const overrides = CITY_BUILDING_OVERRIDES[city] || [];
  return [...BUILDING_IDS, ...overrides];
};
const CITIES = [
  { city: 'Montgomery', state: 'Alabama' }, { city: 'Birmingham', state: 'Alabama' }, { city: 'Juneau', state: 'Alaska' }, { city: 'Anchorage', state: 'Alaska' }, { city: 'Phoenix', state: 'Arizona' }, { city: 'Tucson', state: 'Arizona' }, { city: 'Little Rock', state: 'Arkansas' }, { city: 'Fayetteville', state: 'Arkansas' }, { city: 'Sacramento', state: 'California' }, { city: 'Los Angeles', state: 'California' }, { city: 'San Diego', state: 'California' }, { city: 'San Francisco', state: 'California' }, { city: 'Oakland', state: 'California' }, { city: 'Denver', state: 'Colorado' }, { city: 'Colorado Springs', state: 'Colorado' }, { city: 'Hartford', state: 'Connecticut' }, { city: 'New Haven', state: 'Connecticut' }, { city: 'Dover', state: 'Delaware' }, { city: 'Wilmington', state: 'Delaware' }, { city: 'Tallahassee', state: 'Florida' }, { city: 'Miami', state: 'Florida' }, { city: 'Orlando', state: 'Florida' }, { city: 'Tampa Bay', state: 'Florida' }, { city: 'Jacksonville', state: 'Florida' }, { city: 'Atlanta', state: 'Georgia' }, { city: 'Savannah', state: 'Georgia' }, { city: 'Honolulu', state: 'Hawaii' }, { city: 'Hilo', state: 'Hawaii' }, { city: 'Boise', state: 'Idaho' }, { city: 'Idaho Falls', state: 'Idaho' }, { city: 'Springfield', state: 'Illinois' }, { city: 'Chicago', state: 'Illinois' }, { city: 'Indianapolis', state: 'Indiana' }, { city: 'Fort Wayne', state: 'Indiana' }, { city: 'Des Moines', state: 'Iowa' }, { city: 'Cedar Rapids', state: 'Iowa' }, { city: 'Kansas City', state: 'Kansas' }, { city: 'Topeka', state: 'Kansas' }, { city: 'Wichita', state: 'Kansas' }, { city: 'Frankfort', state: 'Kentucky' }, { city: 'Lexington', state: 'Kentucky' }, { city: 'Louisville', state: 'Kentucky' }, { city: 'Baton Rouge', state: 'Louisiana' }, { city: 'New Orleans', state: 'Louisiana' }, { city: 'Augusta', state: 'Maine' }, { city: 'Portland', state: 'Maine' }, { city: 'Annapolis', state: 'Maryland' }, { city: 'Baltimore', state: 'Maryland' }, { city: 'Boston', state: 'Massachusetts' }, { city: 'Worcester', state: 'Massachusetts' }, { city: 'Lansing', state: 'Michigan' }, { city: 'Detroit', state: 'Michigan' }, { city: 'Saint Paul', state: 'Minnesota' }, { city: 'Minneapolis', state: 'Minnesota' }, { city: 'Jackson', state: 'Mississippi' }, { city: 'Gulfport', state: 'Mississippi' }, { city: 'Jefferson City', state: 'Missouri' }, { city: 'Kansas City', state: 'Missouri' }, { city: 'St. Louis', state: 'Missouri' }, { city: 'Helena', state: 'Montana' }, { city: 'Billings', state: 'Montana' }, { city: 'Lincoln', state: 'Nebraska' }, { city: 'Omaha', state: 'Nebraska' }, { city: 'Carson City', state: 'Nevada' }, { city: 'Las Vegas', state: 'Nevada' }, { city: 'Concord', state: 'New Hampshire' }, { city: 'Manchester', state: 'New Hampshire' }, { city: 'Trenton', state: 'New Jersey' }, { city: 'Newark', state: 'New Jersey' }, { city: 'Santa Fe', state: 'New Mexico' }, { city: 'Albuquerque', state: 'New Mexico' }, { city: 'Albany', state: 'New York' }, { city: 'New York City', state: 'New York' }, { city: 'Bronx', state: 'New York' }, { city: 'Raleigh', state: 'North Carolina' }, { city: 'Charlotte', state: 'North Carolina' }, { city: 'Bismarck', state: 'North Dakota' }, { city: 'Fargo', state: 'North Dakota' }, { city: 'Columbus', state: 'Ohio' }, { city: 'Cleveland', state: 'Ohio' }, { city: 'Oklahoma City', state: 'Oklahoma' }, { city: 'Tulsa', state: 'Oklahoma' }, { city: 'Salem', state: 'Oregon' }, { city: 'Portland', state: 'Oregon' }, { city: 'Harrisburg', state: 'Pennsylvania' }, { city: 'Philadelphia', state: 'Pennsylvania' }, { city: 'Pittsburgh', state: 'Pennsylvania' }, { city: 'Providence', state: 'Rhode Island' }, { city: 'Newport', state: 'Rhode Island' }, { city: 'Columbia', state: 'South Carolina' }, { city: 'Charleston', state: 'South Carolina' }, { city: 'Pierre', state: 'South Dakota' }, { city: 'Sioux Falls', state: 'South Dakota' }, { city: 'Nashville', state: 'Tennessee' }, { city: 'Memphis', state: 'Tennessee' }, { city: 'Austin', state: 'Texas' }, { city: 'Houston', state: 'Texas' }, { city: 'Dallas', state: 'Texas' }, { city: 'San Antonio', state: 'Texas' }, { city: 'Salt Lake City', state: 'Utah' }, { city: 'Provo', state: 'Utah' }, { city: 'Montpelier', state: 'Vermont' }, { city: 'Burlington', state: 'Vermont' }, { city: 'Richmond', state: 'Virginia' }, { city: 'Virginia Beach', state: 'Virginia' }, { city: 'Olympia', state: 'Washington' }, { city: 'Seattle', state: 'Washington' }, { city: 'Bellevue', state: 'Washington' }, { city: 'District of Columbia (D.C.)', state: 'Washington D.C.' }, { city: 'Charleston', state: 'West Virginia' }, { city: 'Morgantown', state: 'West Virginia' }, { city: 'Madison', state: 'Wisconsin' }, { city: 'Milwaukee', state: 'Wisconsin' }, { city: 'Cheyenne', state: 'Wyoming' }, { city: 'Casper', state: 'Wyoming' }, { city: 'Toronto', state: 'Canada' }, { city: 'Mexico City', state: 'Mexico' }, { city: 'São Paulo', state: 'Brazil' }, { city: 'Buenos Aires', state: 'Argentina' }, { city: 'Santiago', state: 'Chile' }, { city: 'Bogotá', state: 'Colombia' }, { city: 'Lima', state: 'Peru' }, { city: 'London', state: 'United Kingdom' }, { city: 'Paris', state: 'France' }, { city: 'Berlin', state: 'Germany' }, { city: 'Rome', state: 'Italy' }, { city: 'Madrid', state: 'Spain' }, { city: 'Amsterdam', state: 'Netherlands' }, { city: 'Zurich', state: 'Switzerland' }, { city: 'Brussels', state: 'Belgium' }, { city: 'Vienna', state: 'Austria' }, { city: 'Lisbon', state: 'Portugal' }, { city: 'Warsaw', state: 'Poland' }, { city: 'Prague', state: 'Czech Republic' }, { city: 'Budapest', state: 'Hungary' }, { city: 'Athens', state: 'Greece' }, { city: 'Dubai', state: 'United Arab Emirates' }, { city: 'Riyadh', state: 'Saudi Arabia' }, { city: 'Tel Aviv', state: 'Israel' }, { city: 'Doha', state: 'Qatar' }, { city: 'Istanbul', state: 'Turkey' }, { city: 'Tokyo', state: 'Japan' }, { city: 'Shanghai', state: 'China' }, { city: 'Seoul', state: 'South Korea' }, { city: 'Singapore', state: 'Singapore' }, { city: 'Hong Kong', state: 'Hong Kong' }, { city: 'Mumbai', state: 'India' }, { city: 'Bangkok', state: 'Thailand' }, { city: 'Ho Chi Minh City', state: 'Vietnam' }, { city: 'Manila', state: 'Philippines' }, { city: 'Jakarta', state: 'Indonesia' }, { city: 'Kuala Lumpur', state: 'Malaysia' }, { city: 'Johannesburg', state: 'South Africa' }, { city: 'Lagos', state: 'Nigeria' }, { city: 'Cairo', state: 'Egypt' }, { city: 'Nairobi', state: 'Kenya' }, { city: 'Casablanca', state: 'Morocco' }, { city: 'Sydney', state: 'Australia' }, { city: 'Auckland', state: 'New Zealand' }
];

// Bot alliance tags to pull members from
const BOT_ALLIANCE_TAGS = ['TCR', 'CKG', 'REM', 'ISY', 'SHC', 'EMT', 'RKR'];

// Jimmy金鱼 (TCR leader) special cities — always included + all TCR members
const JIMMY_CITIES = ['New York City', 'Bronx', 'Albany'];
const JIMMY_CHANCE = 0.65;
// Nemesis bots have been removed from territory seeding entirely.

// ========== SEEDED RNG ==========
const seededRand = (seed) => {
  let s = seed;
  return {
    next: () => { s = (s * 9301 + 49297) % 233280; return s / 233280; },
    nextInt: (min, max) => { s = (s * 9301 + 49297) % 233280; return Math.floor((s / 233280) * (max - min + 1)) + min; },
    pick: (arr) => { s = (s * 9301 + 49297) % 233280; return arr[Math.floor((s / 233280) * arr.length)]; }
  };
};

// ========== ADVANCED NAME POOLS (from botNameGenerator.jsx) ==========
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
  "Ma", "Liang", "Feng", "Jian", "Han", "Tang", "Song", "Ming", "Qing", "Jin"
];

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
  "Qian", "Shan", "Ting", "Xia", "Ying", "Yu", "Zhen"
];

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
  "Mei", "Ling", "Xiu", "Yan", "Fang", "Hui", "Jing"
];

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
  "Venom", "Vertex", "Viper", "Vortex", "Warden", "Wizard", "Zenith", "Zodiac"
];

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
  "Gamma", "Delta", "Epsilon", "Zeta", "Theta", "Sigma"
];

// ========== IMAGE POOLS ==========
const MALE_IMGS = [
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/0ccc570fb_profilepicture-bots-005.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/34c9207e8_profilepicture-bots-006.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/4d844af7e_profilepicture-bots-008.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/fa397b937_profilepicture-bots-009.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/228201e8c_profilepicture-bots-016.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/c8cfe18df_profilepicture-bots-018.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/ba9b16930_profilepicture-bots-022.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/e788cd81d_profilepicture-bots-023.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/9701ed03d_profilepicture-bots-027.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/7defea1e9_profilepicture-bots-035.png"
];
const FEMALE_IMGS = [
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/5eaa7c601_profilepicture-bots-female-003.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/8c8930122_profilepicture-bots-female-005.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/854aa9bfc_profilepicture-bots-female-011.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/2f0bc6cd9_profilepicture-bots-female-016.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/566c77d85_profilepicture-bots-female-017.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/5c6ea4f84_profilepicture-bots-female-018.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/4da43053e_profilepicture-bots-female-020.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/815d131dd_profilepicture-bots-female-021.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/5e71076b9_profilepicture-bots-female-023.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/d5fc792fd_profilepicture-bots-female-025.png"
];
const UNIVERSAL_IMGS = [
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/afe80e37f_profilepicture-bots-048.jpg",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/067c165ff_profilepicture-bots-037.jpg",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/a888307a0_profilepicture-bots-044.jpg"
];

// ========== ADVANCED NAME GENERATOR (from botNameGenerator.jsx) ==========
const generateAdvancedName = (rng) => {
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
  let name = useSuffix ? `${prefix}${core}${rng.pick(SUFFIX_POOL)}` : `${prefix}${core}`;
  if (rng.next() < 0.66) {
    name += rng.nextInt(0, 999);
  }
  if (name.length > 20) name = name.slice(0, 20);
  return name;
};

// ========== COMPUTE BOT STATS FROM LEVEL (for generated bots only) ==========
const computeStats = (rng, level) => {
  const atk = 10 + level * 2.5 + rng.next() * level * 1.2;
  const def = 8 + level * 2.0 + rng.next() * level * 0.8;
  const fundMembers = Math.floor(rng.next() * level * 3);
  const fundPower = fundMembers * (0.20 + level * 0.02);
  const power = Math.round(((atk + def) / 2 + fundPower) * 100) / 100;
  return {
    atk: Math.round(atk * 100) / 100,
    def: Math.round(def * 100) / 100,
    player_power: power,
    bot_wins: Math.floor(rng.next() * level * 6) + level * 2,
    bot_losses: Math.floor(rng.next() * level * 2),
  };
};

// ========== LOAD BOT ALLIANCE MEMBERS ==========
const loadBotAllianceMembers = async (base44) => {
  const alliances = await base44.asServiceRole.entities.Alliance.list('-created_date', 500);
  const botAlliances = alliances.filter(a => BOT_ALLIANCE_TAGS.includes(a.tag));
  const tagByAllianceId = {};
  for (const a of botAlliances) tagByAllianceId[a.id] = a.tag;

  const allianceIds = Object.keys(tagByAllianceId);
  const allMembers = await base44.asServiceRole.entities.AllianceMember.list('-created_date', 2000);

  // Find TCR alliance + leader
  const tcrAlliance = botAlliances.find(a => a.tag === 'TCR');
  const tcrAllianceId = tcrAlliance?.id || null;

  const membersByAllianceId = {};
  let tcrLeader = null;
  for (const m of allMembers) {
    if (!tagByAllianceId[m.alliance_id]) continue;
    if (!membersByAllianceId[m.alliance_id]) membersByAllianceId[m.alliance_id] = [];
    membersByAllianceId[m.alliance_id].push({
      user_id: m.user_id,
      username: m.username,
      profile_image_url: m.profile_image_url || '',
      player_level: m.level || 10,
      alliance_tag: tagByAllianceId[m.alliance_id],
    });
    // Find TCR leader from AllianceMember records
    if (tcrAllianceId && m.alliance_id === tcrAllianceId && m.role === 'leader') {
      tcrLeader = {
        user_id: m.user_id,
        username: m.username || 'Jimmy金鱼',
        profile_image_url: m.profile_image_url || '',
        player_level: m.level || 50,
        alliance_tag: 'TCR',
      };
    }
  }

  // Fallback: use Alliance entity's leader fields
  if (!tcrLeader && tcrAlliance) {
    tcrLeader = {
      user_id: tcrAlliance.leader_user_id,
      username: tcrAlliance.leader_username || 'Jimmy金鱼',
      profile_image_url: '',
      player_level: 50,
      alliance_tag: 'TCR',
    };
  }

  // All TCR members excluding the leader (leader is placed separately)
  const tcrMembers = tcrAllianceId && membersByAllianceId[tcrAllianceId]
    ? membersByAllianceId[tcrAllianceId].filter(m => tcrLeader ? m.user_id !== tcrLeader.user_id : true)
    : [];

  // Fetch actual PlayerProfile records for all alliance members to get real atk/def/level
  const allMemberUserIds = [];
  for (const id of allianceIds) {
    const members = membersByAllianceId[id] || [];
    for (const m of members) allMemberUserIds.push(m.user_id);
  }
  if (tcrLeader) allMemberUserIds.push(tcrLeader.user_id);

  const profileByUserId = {};
  // Batch fetch profiles (filter by user_id, up to 500 at a time via list)
  const allProfiles = await base44.asServiceRole.entities.PlayerProfile.list('-created_date', 2000);
  for (const p of allProfiles) {
    if (allMemberUserIds.includes(p.user_id)) {
      profileByUserId[p.user_id] = p;
    }
  }

  // Merge real profile stats into member records
  const mergeProfile = (member) => {
    const profile = profileByUserId[member.user_id];
    if (!profile) return member;
    const realAtk = profile.attack_value || 0;
    const realDef = profile.defense_value || 0;
    const hasRealStats = realAtk > 10 || realDef > 10;
    const realLevel = profile.level || member.player_level || 10;
    const realPower = hasRealStats ? Math.round((realAtk + realDef) * 100) / 100 : member.player_power;
    return {
      ...member,
      player_level: realLevel,
      atk: hasRealStats ? Math.round(realAtk * 100) / 100 : null,
      def: hasRealStats ? Math.round(realDef * 100) / 100 : null,
      player_power: realPower,
    };
  };

  // Re-apply merged data
  for (const id of allianceIds) {
    if (membersByAllianceId[id]) {
      membersByAllianceId[id] = membersByAllianceId[id].map(mergeProfile);
    }
  }
  if (tcrLeader) tcrLeader = mergeProfile(tcrLeader);
  tcrMembers.forEach((m, i) => { tcrMembers[i] = mergeProfile(m); });

  return { membersByAllianceId, allianceIds, tcrLeader, tcrMembers };
};

// ========== PICK LEADERBOARD ENTRIES (Jimmy金鱼 + alliance members + generated) ==========
const pickLeaderboardEntries = (allianceData, ci, bi, cityName) => {
  const rng = seededRand(ci * 1000 + bi * 100 + 42);
  const { membersByAllianceId, allianceIds, tcrLeader, tcrMembers } = allianceData;

  const isJimmyCity = JIMMY_CITIES.includes(cityName);
  const includeJimmy = isJimmyCity || rng.next() < JIMMY_CHANCE;

  const usedUserIds = new Set();
  const alliancePicks = [];

  // --- Add Jimmy金鱼 (TCR leader) if included ---
  if (includeJimmy && tcrLeader) {
    usedUserIds.add(tcrLeader.user_id);
    const level = tcrLeader.player_level;
    const stats = computeStats(rng, level);
    const hasRealStats = tcrLeader.atk != null && tcrLeader.def != null;
    alliancePicks.push({
      id: tcrLeader.user_id,
      username: tcrLeader.username,
      profile_image_url: tcrLeader.profile_image_url || rng.pick([...MALE_IMGS, ...FEMALE_IMGS, ...UNIVERSAL_IMGS]),
      player_level: level,
      atk: hasRealStats ? tcrLeader.atk : stats.atk,
      def: hasRealStats ? tcrLeader.def : stats.def,
      player_power: hasRealStats ? tcrLeader.player_power : stats.player_power,
      bot_wins: stats.bot_wins,
      bot_losses: stats.bot_losses,
      source: 'tcr_leader:Jimmy金鱼',
    });
  }

  if (isJimmyCity) {
    // --- Add ALL TCR members ---
    for (const member of tcrMembers) {
      if (usedUserIds.has(member.user_id)) continue;
      usedUserIds.add(member.user_id);
      const level = member.player_level;
      const stats = computeStats(rng, level);
      const hasRealStats = member.atk != null && member.def != null;
      alliancePicks.push({
        id: member.user_id,
        username: member.username,
        profile_image_url: member.profile_image_url || rng.pick([...MALE_IMGS, ...FEMALE_IMGS, ...UNIVERSAL_IMGS]),
        player_level: level,
        atk: hasRealStats ? member.atk : stats.atk,
        def: hasRealStats ? member.def : stats.def,
        player_power: hasRealStats ? member.player_power : stats.player_power,
        bot_wins: stats.bot_wins,
        bot_losses: stats.bot_losses,
        source: 'alliance:TCR',
      });
    }
  } else {
    // --- 25 unique alliance members (re-roll alliance + member each time) ---
    const availableAllianceIds = allianceIds.filter(id => membersByAllianceId[id] && membersByAllianceId[id].length > 0);
    const allianceTarget = 25; // Jimmy is separate, always pick 25 alliance members
    let attempts = 0;
    while (alliancePicks.length < (includeJimmy ? 1 + allianceTarget : allianceTarget) && attempts < 1000) {
      attempts++;
      if (availableAllianceIds.length === 0) break;
      const allianceId = availableAllianceIds[Math.floor(rng.next() * availableAllianceIds.length)];
      const members = membersByAllianceId[allianceId];
      if (!members || members.length === 0) continue;
      const member = members[Math.floor(rng.next() * members.length)];
      if (usedUserIds.has(member.user_id)) continue;
      usedUserIds.add(member.user_id);
      const level = member.player_level;
      const stats = computeStats(rng, level);
      const hasRealStats = member.atk != null && member.def != null;
      alliancePicks.push({
        id: member.user_id,
        username: member.username,
        profile_image_url: member.profile_image_url || rng.pick([...MALE_IMGS, ...FEMALE_IMGS, ...UNIVERSAL_IMGS]),
        player_level: level,
        atk: hasRealStats ? member.atk : stats.atk,
        def: hasRealStats ? member.def : stats.def,
        player_power: hasRealStats ? member.player_power : stats.player_power,
        bot_wins: stats.bot_wins,
        bot_losses: stats.bot_losses,
        source: `alliance:${member.alliance_tag}`,
      });
    }
  }

  // --- Generate names to fill remaining slots to 50 ---
  const generatedTarget = 50 - alliancePicks.length;
  const generatedPicks = [];
  const usedNames = new Set();
  while (generatedPicks.length < generatedTarget) {
    const name = generateAdvancedName(rng);
    if (usedNames.has(name)) continue;
    usedNames.add(name);

    const level = Math.round(10 + rng.next() * 55);
    const stats = computeStats(rng, level);
    const genderRoll = rng.next();
    const imgPool = genderRoll < 0.55 ? [...MALE_IMGS, ...UNIVERSAL_IMGS] : [...FEMALE_IMGS, ...UNIVERSAL_IMGS];

    generatedPicks.push({
      id: `gen_${ci}_${bi}_${generatedPicks.length}`,
      username: name,
      profile_image_url: rng.pick(imgPool),
      player_level: level,
      atk: stats.atk,
      def: stats.def,
      player_power: stats.player_power,
      bot_wins: stats.bot_wins,
      bot_losses: stats.bot_losses,
      source: 'generated',
    });
  }

  const merged = [...alliancePicks, ...generatedPicks];
  merged.sort((a, b) => b.player_power - a.player_power);
  return merged;
};

const seededShuffle = (arr, rng) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    let targetCityStates;
    if (body.city_names && Array.isArray(body.city_names)) {
      // Multi-city seeding by name array — ONLY the explicitly named cities, not the range between them
      // Supports "City" or "City, State" format for disambiguation (e.g. "Charleston, West Virginia")
      const indices = body.city_names.map(cn => {
        const parts = cn.split(',').map(s => s.trim());
        if (parts.length === 2) {
          return CITIES.findIndex(c => c.city === parts[0] && c.state === parts[1]);
        }
        return CITIES.findIndex(c => c.city === cn);
      }).filter(i => i !== -1);
      if (indices.length === 0) return Response.json({ error: 'No matching cities found' }, { status: 404 });
      targetCityStates = indices.map(i => ({ city: CITIES[i].city, state: CITIES[i].state, originalIndex: i }));
    } else if (body.city_name) {
      const idx = CITIES.findIndex(c => c.city === body.city_name && (!body.state_name || c.state === body.state_name));
      if (idx === -1) return Response.json({ error: `City '${body.city_name}' not found in CITIES list` }, { status: 404 });
      targetCityStates = [{ city: CITIES[idx].city, state: CITIES[idx].state, originalIndex: idx }];
    } else if (body.city_index !== undefined) {
      const idx = Number(body.city_index);
      targetCityStates = [{ city: CITIES[idx].city, state: CITIES[idx].state, originalIndex: idx }];
    } else if (body.city_start !== undefined) {
      const ciStart = Number(body.city_start);
      const ciEnd = body.city_end !== undefined ? Number(body.city_end) + 1 : ciStart + 1;
      targetCityStates = CITIES.slice(ciStart, ciEnd).map((c, i) => ({ city: c.city, state: c.state, originalIndex: ciStart + i }));
    } else {
      targetCityStates = CITIES.map((c, i) => ({ city: c.city, state: c.state, originalIndex: i }));
    }

    // Load bot alliance members from TCR, CKG, REM, ISY, SHC, EMT, RKR
    const allianceData = await loadBotAllianceMembers(base44);

    // Delete ALL existing slots for target cities — query per city+state directly to avoid
    // the global list() cap (5000 records) that left old nemesis/regular bot duplicates behind.
    const oldSlots = [];
    for (const cs of targetCityStates) {
      const citySlots = await base44.asServiceRole.entities.TerritorySlot.filter({ city: cs.city, state: cs.state });
      oldSlots.push(...citySlots);
    }

    const DEL_BATCH = 5;
    for (let i = 0; i < oldSlots.length; i += DEL_BATCH) { const batch = oldSlots.slice(i, i + DEL_BATCH); await Promise.allSettled(batch.map(s => base44.asServiceRole.entities.TerritorySlot.delete(s.id))); await new Promise(r => setTimeout(r, 1200)); }

    let created = 0;
    let allianceMembersPlaced = 0;
    const sourceBreakdown = {};
    for (const tcs of targetCityStates) {
      const { city, state, originalIndex: ci } = tcs;
      const cityBuildingIds = getBuildingIds(city);
      const slotsToCreate = [];
      for (let bi = 0; bi < cityBuildingIds.length; bi++) {
        const entries = pickLeaderboardEntries(allianceData, ci, bi, city);

        for (let si = 0; si < entries.length; si++) {
          const entry = entries[si];
          slotsToCreate.push({
            building_id: cityBuildingIds[bi], city, state, slot_number: si + 1,
            user_id: entry.id, username: entry.username,
            profile_image_url: entry.profile_image_url,
            player_level: entry.player_level, player_power: entry.player_power,
            atk: entry.atk, def: entry.def,
            last_payout_at: Date.now(),
            bot_wins: entry.bot_wins || 0, bot_losses: entry.bot_losses || 0,
          });
          if (entry.source !== 'generated') allianceMembersPlaced++;
          sourceBreakdown[entry.source] = (sourceBreakdown[entry.source] || 0) + 1;
        }
      }
      for (let i = 0; i < slotsToCreate.length; i += 25) { await base44.asServiceRole.entities.TerritorySlot.bulkCreate(slotsToCreate.slice(i, i + 25)); created += Math.min(25, slotsToCreate.length - i); await new Promise(r => setTimeout(r, 500)); }
    }

    return Response.json({
      message: `Seeded ${created} regular slots for ${targetCityStates.length} cities (nemesis bots disabled)`,
      created,
      nemesis_created: 0,
      alliance_members_placed: allianceMembersPlaced,
      source_breakdown: sourceBreakdown,
      bot_alliance_tags: BOT_ALLIANCE_TAGS,
      cities_done: targetCityStates.map(cs => `${cs.city}, ${cs.state}`),
      total_cities_available: CITIES.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});