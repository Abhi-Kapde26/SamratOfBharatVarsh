import React, { useState } from 'react';
import KingdomCard from '../components/KingdomCard';
import kingdoms from '../data/kingdoms.json';
import BidTimer from '../components/BidTimer';
import bgImage from '../assets/bg-ancient-scroll.jpg';

const GameDisplay: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTimer, setShowTimer] = useState(false);
  const [timerKey, setTimerKey] = useState(0);

  const currentKingdom = kingdoms[currentIndex];

  const nextKingdom = () => {
    if (currentIndex < kingdoms.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowTimer(false); // reset timer visibility
    }
  };

  const startTimer = () => {
    setShowTimer(true);
    setTimerKey((prev) => prev + 1); // force re-render timer
  };

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen p-6 bg-cover bg-center font-[Marcellus]"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="absolute inset-0 z-0"></div>

      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
        <KingdomCard
          name={currentKingdom.name}
          hint={currentKingdom.hint}
          region={currentKingdom.region}
          area={currentKingdom.area ?? undefined}
          king={currentKingdom.ruler}
          modern_city={currentKingdom.modern_city}
          currentRound={currentIndex + 1}
          totalRounds={kingdoms.length}
        />

        {showTimer && (
          <BidTimer
            key={timerKey}
            timeLeft={30}
            label="Discussion Time"
            onReset={() => setTimerKey((prev) => prev + 1)}
          />
        )}

        <div className="mt-8 flex gap-4">
          <button
            className="px-6 py-3 text-lg font-semibold bg-orange-600 text-white rounded-xl shadow hover:bg-orange-700 transition duration-300"
            onClick={nextKingdom}
            disabled={currentIndex >= kingdoms.length - 1}
          >
            Reveal Next Kingdom
          </button>

          <button
            className="px-6 py-3 text-lg font-semibold bg-green-600 text-white rounded-xl shadow hover:bg-green-700 transition duration-300"
            onClick={startTimer}
          >
            Start Discussion
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameDisplay;