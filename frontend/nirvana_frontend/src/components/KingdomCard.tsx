import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Ruler, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface KingdomCardProps {
  name: string;
  hint: string;
  king?: string;
  region?: string;
  area?: number;
  modern_city?: string;
  currentRound?: number;
  totalRounds?: number;
  basePrice?: number;
  currentPrice?: number;
  status?: string;
  winningTeamName?: string;
}

const KingdomCard: React.FC<KingdomCardProps> = ({
  name,
  hint,
  king,
  region,
  area,
  modern_city,
  currentRound,
  totalRounds,
  basePrice = 5000000,
  currentPrice,
  status = 'idle',
  winningTeamName,
}) => {
  return (
    <motion.div
      key={name}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="relative bg-[#fefae0]/95 border-4 border-[#b08968] rounded-[2rem] shadow-[0_12px_45px_rgba(0,0,0,0.45)] p-6 md:p-10 w-full max-w-4xl mx-auto font-marcellus backdrop-blur-md"
    >
      {/* Round Tracker & Status */}
      <div className="flex justify-between items-center mb-2">
        <div>
          {status === 'sold' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-600 text-emerald-800 text-xs font-bold uppercase tracking-wider shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              Sold to {winningTeamName || 'Winning Dynasty'}
            </span>
          )}
          {status === 'unsold' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-200 border border-stone-500 text-stone-700 text-xs font-bold uppercase tracking-wider shadow-sm">
              <AlertCircle className="w-3.5 h-3.5 text-stone-600" />
              Passed / Unsold
            </span>
          )}
          {status === 'bidding' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-200 border border-amber-600 text-amber-900 text-xs font-bold uppercase tracking-wider animate-pulse shadow-sm">
              Bidding In Progress
            </span>
          )}
          {status === 'discussion' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 border border-blue-500 text-blue-800 text-xs font-bold uppercase tracking-wider shadow-sm">
              Council Discussion Underway
            </span>
          )}
        </div>

        {currentRound && totalRounds && (
          <div className="text-sm md:text-base text-stone-700 font-bold tracking-wide">
            Round <span className="text-orange-800 font-extrabold">{currentRound}</span> of <span className="text-stone-900">{totalRounds}</span>
          </div>
        )}
      </div>

      {/* Kingdom Name */}
      <h1 className="text-5xl md:text-6xl font-extrabold font-cinzel text-center text-orange-950 drop-shadow-sm mb-2 tracking-wide">
        {name}
      </h1>

      {/* King Name */}
      {king && (
        <h2 className="text-xl md:text-2xl text-center text-stone-700 italic mb-1">
          Ruled by: <strong className="text-stone-900 not-italic font-semibold">{king}</strong>
        </h2>
      )}

      {/* Modern City */}
      {modern_city && (
        <h3 className="text-md md:text-lg text-center text-stone-600 italic mb-4">
          Present-day: <strong className="text-stone-800 not-italic">{modern_city}</strong>
        </h3>
      )}

      {/* Hint / Trait */}
      <p className="text-center text-xl md:text-2xl text-stone-800 italic mb-6 px-4 leading-relaxed font-serif">
        “{hint}”
      </p>

      {/* Meta Info */}
      <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-md text-stone-700 font-medium">
        {region && (
          <span className="flex items-center gap-1.5">
            <MapPin className="w-5 h-5 text-orange-600" />
            <span>Region: <strong className="text-stone-900">{region}</strong></span>
          </span>
        )}
        {area && (
          <span className="flex items-center gap-1.5">
            <Ruler className="w-5 h-5 text-orange-600" />
            <span>Area: <strong className="text-stone-900">{area.toLocaleString()} km²</strong></span>
          </span>
        )}
      </div>

      {/* Price Badges Section */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
        {/* Base Price Display */}
        <span className="inline-block bg-yellow-200/90 border-2 border-yellow-600 text-yellow-900 px-6 py-2 rounded-full font-semibold text-base md:text-lg shadow-md font-cinzel">
          Base Price: {formatCurrency(basePrice, true)}
        </span>

        {/* Current Auction Bid Price if higher than base or active bidding */}
        {currentPrice && currentPrice > basePrice && (
          <span className="inline-block bg-orange-500 border-2 border-orange-700 text-white px-6 py-2 rounded-full font-bold text-base md:text-lg shadow-md font-cinzel animate-pulse">
            Current Bid: {formatCurrency(currentPrice, true)}
          </span>
        )}
      </div>

      {/* Animated Divider */}
      <motion.div
        className="mt-8 w-full h-1.5 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-400 overflow-hidden shadow-inner"
        initial={{ width: 0 }}
        animate={{ width: '100%' }}
        transition={{ duration: 1.2, delay: 0.3 }}
      />

      {/* Scroll-style Ornate Edge Decoration */}
      <div className="absolute top-0 left-0 w-full h-full border-[12px] border-double border-[#d4a373] rounded-[2rem] pointer-events-none" />
    </motion.div>
  );
};

export default KingdomCard;
