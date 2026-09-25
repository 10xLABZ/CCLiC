/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import CityJobsPage from './pages/CityJobsPage';
import CityPage from './pages/CityPage';
import DefenceLogPage from './pages/DefenceLogPage';
import DevelopmentPage from './pages/DevelopmentPage';
import EnergyInventoryPage from './pages/EnergyInventoryPage';
import EventsPage from './pages/EventsPage';
import FundPage from './pages/FundPage';
import GameDashboard from './pages/GameDashboard';
import InventoryPage from './pages/InventoryPage';
import MapsPage from './pages/MapsPage';
import OpsPage from './pages/OpsPage';
import ProfilePage from './pages/ProfilePage';
import ResearchPage from './pages/ResearchPage';
import SettingsPage from './pages/SettingsPage';
import ShopPage from './pages/ShopPage';
import StaminaInventoryPage from './pages/StaminaInventoryPage';
import StatePage from './pages/StatePage';
import TradeDeskPage from './pages/TradeDeskPage';
import TradePageComingSoon from './pages/TradePageComingSoon';
import TradingPage from './pages/TradingPage';
import TravelPage from './pages/TravelPage';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CityJobsPage": CityJobsPage,
    "CityPage": CityPage,
    "DefenceLogPage": DefenceLogPage,
    "DevelopmentPage": DevelopmentPage,
    "EnergyInventoryPage": EnergyInventoryPage,
    "EventsPage": EventsPage,
    "FundPage": FundPage,
    "GameDashboard": GameDashboard,
    "InventoryPage": InventoryPage,
    "MapsPage": MapsPage,
    "OpsPage": OpsPage,
    "ProfilePage": ProfilePage,
    "ResearchPage": ResearchPage,
    "SettingsPage": SettingsPage,
    "ShopPage": ShopPage,
    "StaminaInventoryPage": StaminaInventoryPage,
    "StatePage": StatePage,
    "TradeDeskPage": TradeDeskPage,
    "TradePageComingSoon": TradePageComingSoon,
    "TradingPage": TradingPage,
    "TravelPage": TravelPage,
}

export const pagesConfig = {
    mainPage: "MapsPage",
    Pages: PAGES,
    Layout: __Layout,
};