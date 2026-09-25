import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import WelcomeStep from "./WelcomeStep";
import OnboardingCustomizeStep from "./OnboardingCustomizeStep";

/**
 * OnboardingFlow — manages the Welcome → Customize steps for new players.
 * Rendered as a full-screen overlay that cannot be dismissed.
 * Calls onComplete when the player either plays now or goes to tutorial.
 */
export default function OnboardingFlow({ onComplete }) {
  const [step, setStep] = useState('welcome');
  const [welcomeData, setWelcomeData] = useState(null);
  const navigate = useNavigate();

  const handleWelcomeContinue = (data) => {
    setWelcomeData(data);
    setStep('customize');
  };

  const handlePlayNow = () => {
    onComplete();
    navigate(createPageUrl('MapsPage'));
  };

  const handleGoToTutorial = () => {
    onComplete();
    navigate(createPageUrl('TutorialPage'));
  };

  if (step === 'welcome') {
    return <WelcomeStep onContinue={handleWelcomeContinue} />;
  }

  if (step === 'customize') {
    return (
      <OnboardingCustomizeStep
        initialUsername={welcomeData?.username}
        initialProfileImage={welcomeData?.profileImage}
        onPlayNow={handlePlayNow}
        onGoToTutorial={handleGoToTutorial}
      />
    );
  }

  return null;
}