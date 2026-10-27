import React from 'react';

interface RoundTrackerProps {
  current: number;
  total: number;
}

const RoundTracker: React.FC<RoundTrackerProps> = ({ current, total }) => {
  return (
    <div className="fixed top-5 left-5 z-50 bg-yellow-100 border-2 border-yellow-600 text-yellow-900 px-4 py-2 rounded-lg shadow-md font-[Marcellus] text-lg">
      Round <strong>{current}</strong> of <strong>{total}</strong>
    </div>
  );
};

export default RoundTracker;