import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import LoadingScreen from '@/components/loading/LoadingScreen'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ScrollToTop from '@/components/utils/ScrollToTop';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import React, { useEffect, useState } from 'react';
import { initializeFromServer } from '@/lib/playerServerSync';
import { getCurrentPlayer } from '@/lib/playerMemory';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import TutorialPage from './pages/TutorialPage';
import CapitalClashPage from './pages/CapitalClashPage';
import DailyValueSalePage from './pages/DailyValueSalePage';
import AdminLogPage from './pages/AdminLogPage';
import HQPage from './pages/HQPage';
import AlliancePage from './pages/AlliancePage';
import FvFEventPage from './pages/FvFEventPage';
import PlayerHomePage from './pages/PlayerHomePage';
import OpCoverInventoryPage from './pages/OpCoverInventoryPage';
import HolidayAdminPage from './pages/HolidayAdminPage';
// REMOVED: HeatInventoryPage (old heat system deleted)

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Pull latest player data from server on start
  useEffect(() => {
    if (!isLoadingAuth && !isLoadingPublicSettings && !authError) {
      initializeFromServer().then((result) => {
        if (result?.success) {
          const player = getCurrentPlayer();
          if (!player.hasCompletedOnboarding) {
            setShowOnboarding(true);
          }
        }
      }).catch(console.error);
    }
  }, [isLoadingAuth, isLoadingPublicSettings, authError]);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return <LoadingScreen />;
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <>
      <Routes>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        } />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            }
          />
        ))}
        <Route path="/CapitalClashPage" element={<LayoutWrapper currentPageName="CapitalClashPage"><CapitalClashPage /></LayoutWrapper>} />
        <Route path="/DailyValueSalePage" element={<LayoutWrapper currentPageName="DailyValueSalePage"><DailyValueSalePage /></LayoutWrapper>} />
        <Route path="/AdminLogPage" element={<LayoutWrapper currentPageName="AdminLogPage"><AdminLogPage /></LayoutWrapper>} />
        <Route path="/HQPage" element={<LayoutWrapper currentPageName="HQPage"><HQPage /></LayoutWrapper>} />
        <Route path="/AlliancePage" element={<LayoutWrapper currentPageName="AlliancePage"><AlliancePage /></LayoutWrapper>} />
        <Route path="/FvFEventPage" element={<LayoutWrapper currentPageName="FvFEventPage"><FvFEventPage /></LayoutWrapper>} />
        <Route path="/PlayerHomePage" element={<LayoutWrapper currentPageName="PlayerHomePage"><PlayerHomePage /></LayoutWrapper>} />
        <Route path="/OpCoverInventoryPage" element={<LayoutWrapper currentPageName="OpCoverInventoryPage"><OpCoverInventoryPage /></LayoutWrapper>} />
        <Route path="/HolidayAdminPage" element={<LayoutWrapper currentPageName="HolidayAdminPage"><HolidayAdminPage /></LayoutWrapper>} />
        <Route path="/TutorialPage" element={<LayoutWrapper currentPageName="TutorialPage"><TutorialPage /></LayoutWrapper>} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
      {showOnboarding && (
        <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
      )}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App