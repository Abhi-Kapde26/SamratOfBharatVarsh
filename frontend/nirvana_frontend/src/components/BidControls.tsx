import React, { useState } from 'react';

interface BidControlsProps {
  teams: string[];
  onSubmitBid: (team: string, amount: number) => void;
}

const BidControls: React.FC<BidControlsProps> = ({ teams, onSubmitBid }) => {
  const [selectedTeam, setSelectedTeam] = useState('');
  const [bidAmount, setBidAmount] = useState<number | ''>('');

  const handleSubmit = () => {
    if (selectedTeam && bidAmount !== '') {
      onSubmitBid(selectedTeam, Number(bidAmount));
      setBidAmount('');
    }
  };

  return (
    <div className="mt-10 p-6 bg-white/80 border border-yellow-600 rounded-xl shadow-xl max-w-xl mx-auto text-center font-[Marcellus]">
      <h2 className="text-2xl font-bold text-yellow-900 mb-4">Record a Bid</h2>

      <div className="flex flex-col md:flex-row items-center justify-center gap-4">
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select Team</option>
          {teams.map((team) => (
            <option key={team} value={team}>
              {team}
            </option>
          ))}
        </select>

        <input
          type="number"
          value={bidAmount}
          onChange={(e) => setBidAmount(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="Bid Amount (₹)"
          className="px-4 py-2 border border-gray-300 rounded-md"
        />

        <button
          onClick={handleSubmit}
          className="px-6 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition"
        >
          Submit Bid
        </button>
      </div>
    </div>
  );
};

export default BidControls;