import React, { useState, useEffect } from 'react';
import BuildingModal from './BuildingModal';
import { hasMoHistoryNew } from './TerritoryLeaderboardPanel';

// USA cities list for determining Mayor image variant
const USA_CITIES = [
  'Boston', 'New York', 'Los Angeles', 'Chicago', 'Miami', 'Houston', 'Phoenix',
  'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin',
  'Jacksonville', 'San Francisco', 'Columbus', 'Indianapolis', 'Fort Worth',
  'Charlotte', 'Seattle', 'Denver', 'Washington', 'Nashville', 'Las Vegas',
  'Detroit', 'Memphis', 'Portland', 'Baltimore', 'Atlanta', 'Minneapolis'
];

const BUILDING_IMAGES = {
  mayors_office_usa: 'https://media.base44.com/images/public/699169456a354d6cb7082777/657118277_MayorsOfficeUSA.png',
  mayors_office_global: 'https://media.base44.com/images/public/699169456a354d6cb7082777/81ab163d0_MayorsOfficeGlobal.png',
  town_hall: 'https://media.base44.com/images/public/699169456a354d6cb7082777/caf59f8a0_TownHall.png',
  city_bank: 'https://media.base44.com/images/public/699169456a354d6cb7082777/a5a6676e1_CityBank.png',
  stock_exchange: 'https://media.base44.com/images/public/699169456a354d6cb7082777/2d037af6e_StockExchange.png',
  crypto_mining: 'https://media.base44.com/images/public/699169456a354d6cb7082777/01145d175_CryptoMining.png',
  statue_of_liberty: 'https://media.base44.com/images/public/699169456a354d6cb7082777/815b5dda6_ladyliberty.png',
  white_house: 'https://media.base44.com/images/public/699169456a354d6cb7082777/18dfb7f1d_whitehouse.png',
  the_pentagon: 'https://media.base44.com/images/public/699169456a354d6cb7082777/278a477d2_pentagondc.png',
};

// Only Mayor's Office is active
const BUILDING_POSITIONS = [
  { id: 'mayors_office', name: "Mayor's Office", x: 50, y: 44 },
];

// City-specific bonus buildings (same mechanics as Mayor's Office, just masked name + image)
const CITY_BUILDING_OVERRIDES = {
  'New York City': [
    { id: 'statue_of_liberty', name: 'Statue of Liberty', x: 39, y: 70 },
  ],
  'District of Columbia (D.C.)': [
    { id: 'white_house', name: 'The White House', x: 50, y: 73 },
    { id: 'the_pentagon', name: 'The Pentagon', x: 42, y: 90 },
  ],
};

export default function TerritoryBuildingMarkers({ city, state, playerData }) {
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [hasDot, setHasDot] = useState(false);

  useEffect(() => {
    // Poll every 10s for new activity dot
    const check = () => setHasDot(hasMoHistoryNew());
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  const isUSA = USA_CITIES.includes(city);

  const buildingPositions = [
    ...BUILDING_POSITIONS,
    ...(CITY_BUILDING_OVERRIDES[city] || []),
  ];

  const getBuildingImage = (id) => {
    if (id === 'mayors_office') return isUSA ? BUILDING_IMAGES.mayors_office_usa : BUILDING_IMAGES.mayors_office_global;
    return BUILDING_IMAGES[id];
  };

  return (
    <>
      {buildingPositions.map((building) => (
        <button
          key={building.id}
          onClick={() => setSelectedBuilding(building)}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform z-20 group"
          style={{ left: `${building.x}%`, top: `${building.y}%`, pointerEvents: 'auto' }}
          title={building.name}
        >
          <div className="relative">
            <img
              src={getBuildingImage(building.id)}
              alt={building.name}
              className="w-28 h-28 object-contain drop-shadow-lg"
              style={{ filter: 'drop-shadow(0 0 2px #6b21a8) drop-shadow(0 0 6px #a855f7) drop-shadow(0 0 12px rgba(168,85,247,0.5))' }}
            />
            {(building.id === 'mayors_office' || building.id === 'statue_of_liberty' || building.id === 'white_house' || building.id === 'the_pentagon') && hasDot && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 rounded-full animate-pulse border-2 border-red-300 shadow-lg shadow-red-500/60 z-20" />
            )}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 text-yellow-300 text-[8px] font-bold px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {building.name}
            </div>
          </div>
        </button>
      ))}

      {selectedBuilding && (
        <BuildingModal
          building={selectedBuilding}
          buildingImage={getBuildingImage(selectedBuilding.id)}
          city={city}
          state={state}
          isUSA={isUSA}
          open={!!selectedBuilding}
          onClose={() => setSelectedBuilding(null)}
          playerData={playerData}
        />
      )}
    </>
  );
}