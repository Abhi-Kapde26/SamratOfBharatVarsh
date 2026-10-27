import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface BidTimerProps {
  timeLeft: number;
  isRunning?: boolean;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onReset?: () => void;
  label?: string;
  showControls?: boolean;
}

const BidTimer: React.FC<BidTimerProps> = ({
  timeLeft,
  isRunning = false,
  onStart,
  onPause,
  onResume,
  onReset,
  label = 'Discussion Countdown',
  showControls = true,
}) => {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Determine urgency color
  const isUrgent = timeLeft <= 5 && timeLeft > 0;
  const isWarning = timeLeft <= 10 && timeLeft > 5;
  const isFinished = timeLeft === 0;

  let timerColorClass = 'bg-emerald-600 border-emerald-400 text-white';
  if (isFinished) {
    timerColorClass = 'bg-stone-700 border-stone-500 text-stone-200';
  } else if (isUrgent) {
    timerColorClass = 'bg-red-600 border-red-400 text-white animate-pulse shadow-[0_0_25px_rgba(239,68,68,0.7)]';
  } else if (isWarning) {
    timerColorClass = 'bg-amber-600 border-amber-400 text-white';
  }

  return (
    <div className="mt-6 flex flex-col items-center gap-2 font-marcellus">
      <div className="text-xs md:text-sm text-stone-800 font-bold uppercase tracking-[0.2em] font-cinzel">
        {label}
      </div>

      {/* Timer Digital Display */}
      <div
        className={`text-4xl md:text-5xl font-mono font-extrabold px-8 py-3 rounded-2xl border-4 shadow-xl transition-all duration-300 ${timerColorClass}`}
      >
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </div>

      {/* Host / Projector Quick Timer Controls */}
      {showControls && (
        <div className="flex items-center gap-2 mt-2">
          {!isRunning && timeLeft > 0 && onStart && (
            <button
              onClick={onStart}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow transition"
              title="Start Timer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start</span>
            </button>
          )}

          {isRunning && onPause && (
            <button
              onClick={onPause}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold shadow transition"
              title="Pause Timer"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause</span>
            </button>
          )}

          {!isRunning && timeLeft > 0 && onResume && (
            <button
              onClick={onResume}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow transition"
              title="Resume Timer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume</span>
            </button>
          )}

          {onReset && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-700 hover:bg-stone-800 text-stone-200 rounded-lg text-xs font-semibold shadow transition"
              title="Reset Timer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BidTimer;
