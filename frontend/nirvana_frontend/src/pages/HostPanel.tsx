import React, { useState } from 'react';
import BidControls from '../components/BidControls';
import Scoreboard from '../components/Scoreboard';
import kingdoms from '../data/kingdoms.json';
import { useNavigate } from 'react-router-dom';

const teamNames = [
  'Team Ashoka',
  'Team Maurya',
  'Team Gupta',
  'Team Chola',
  'Team Kalinga',
  'Team Pandya',
];

const HostPanel: React.FC = () => {
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    teamNames.forEach((t) => (initial[t] = 0));
    return initial;
  });

  const [teams, setTeams] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    teamNames.forEach((t) => (initial[t] = []));
    return initial;
  });

  const [currentKingdomIndex, setCurrentKingdomIndex] = useState(0);
  const navigate = useNavigate();

  const handleBid = (team: string, amount: number) => {
    const kingdom = kingdoms[currentKingdomIndex];
    if (!kingdom) return;

    // Update scores (spending money logic if needed)
    setScores((prev) => ({
      ...prev,
      [team]: prev[team] + amount,
    }));

    // Assign this kingdom to the team
    setTeams((prev) => ({
      ...prev,
      [team]: [...prev[team], kingdom.name],
    }));

    // Move to next kingdom
    if (currentKingdomIndex < kingdoms.length - 1) {
      setCurrentKingdomIndex((prev) => prev + 1);
    } else {
      // If finished, go to results page
      navigate('/results', { state: { teams } });
    }
  };

  return (
    <div className="min-h-screen p-10 bg-gradient-to-b from-yellow-50 to-orange-100 font-[Marcellus]">
      <h1 className="text-4xl font-bold text-center text-orange-700 mb-10">
        Host Control Panel
      </h1>

      <div className="mb-6 text-center text-xl font-semibold text-gray-800">
        Current Kingdom: <span className="text-orange-600">{kingdoms[currentKingdomIndex]?.name}</span>
      </div>

      <BidControls teams={teamNames} onSubmitBid={handleBid} />
      <Scoreboard scores={scores} />
    </div>
  );
};

export default HostPanel;
