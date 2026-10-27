import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Crown, Shield, Landmark } from 'lucide-react';
import bgImage from '../assets/bg-ancient-scroll.jpg';
import clubLogo from '../assets/club_logo.png';
import Navbar from '../components/Navbar';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col justify-between font-marcellus selection:bg-amber-800 selection:text-amber-100 relative overflow-hidden">
      <Navbar />

      {/* Main Full-Screen Bharatavarsha Parchment Map Canvas */}
      <div
        className="relative flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        {/* Ancient vignette & parchment texture tint */}
        <div className="absolute inset-0 bg-stone-900/30 mix-blend-multiply pointer-events-none" />
        <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(43,29,12,0.8)] pointer-events-none" />

        {/* Central Royal Parchment Seal / Emblem Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="relative z-10 max-w-4xl w-full text-center flex flex-col items-center bg-[#fdf6e2]/85 border-4 border-[#b08968] rounded-[2.5rem] p-8 md:p-14 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-md"
        >
          {/* Ornate Double Border Overlay */}
          <div className="absolute inset-0 border-[12px] border-double border-[#d4a373] rounded-[2.5rem] pointer-events-none" />

          {/* Nirvana Club Actual Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mb-6 flex flex-col items-center"
          >
            <div className="p-3 bg-stone-900/10 rounded-full border border-amber-600/40 shadow-inner">
              <img
                src={clubLogo}
                alt="Nirvana Club Logo"
                className="h-24 md:h-32 w-auto object-contain filter drop-shadow-[0_4px_12px_rgba(180,83,9,0.4)]"
              />
            </div>
            <span className="mt-3 text-xs md:text-sm font-semibold uppercase tracking-[0.25em] text-amber-900">
              Nirvana Strategy Club Presents
            </span>
          </motion.div>

          {/* Hindi Title & English Imperial Title */}
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="text-2xl md:text-3xl font-bold tracking-widest text-amber-800 font-cinzel mb-2"
          >
            सम्राट ऑफ़ भारतवर्ष
          </motion.h2>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-4xl md:text-6xl lg:text-7xl font-extrabold font-cinzel tracking-tight text-stone-900 drop-shadow-sm mb-4"
          >
            SAMRAT OF BHARATAVARSHA
          </motion.h1>

          {/* Classical Royal Divider */}
          <div className="flex items-center justify-center gap-3 w-48 my-3">
            <div className="h-[2px] bg-gradient-to-r from-transparent to-amber-700 flex-1" />
            <Crown className="w-6 h-6 text-amber-700" />
            <div className="h-[2px] bg-gradient-to-l from-transparent to-amber-700 flex-1" />
          </div>

          {/* Tagline */}
          <p className="text-lg md:text-2xl text-stone-800 italic max-w-2xl mt-2 mb-8 leading-relaxed">
            “The grand strategy auction of the legendary Mahajanapadas, where royal factions forge an undivided empire.”
          </p>

          {/* Core Event Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mb-6">
            <div className="flex items-center justify-center gap-2 p-3 bg-amber-100/70 border border-amber-700/30 rounded-xl text-amber-950 font-semibold text-sm">
              <Landmark className="w-4 h-4 text-amber-700" />
              <span>100 Historic Domains</span>
            </div>
            <div className="flex items-center justify-center gap-2 p-3 bg-amber-100/70 border border-amber-700/30 rounded-xl text-amber-950 font-semibold text-sm">
              <Shield className="w-4 h-4 text-amber-700" />
              <span>6 Strategic Pillars</span>
            </div>
            <div className="flex items-center justify-center gap-2 p-3 bg-amber-100/70 border border-amber-700/30 rounded-xl text-amber-950 font-semibold text-sm">
              <Crown className="w-4 h-4 text-amber-700" />
              <span>Live Imperial Treasury</span>
            </div>
          </div>

          {/* Direct Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-semibold">
            <button
              onClick={() => navigate('/auction')}
              className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-amber-100 rounded-xl shadow transition duration-200 border border-amber-950/40"
            >
              Go to Auction Arena
            </button>
            <button
              onClick={() => navigate('/team')}
              className="px-5 py-2.5 bg-amber-200/90 hover:bg-amber-300 text-amber-950 rounded-xl shadow transition duration-200 border border-amber-700/40"
            >
              View Competing Houses
            </button>
          </div>
        </motion.div>

        {/* Enter Dashboard Button in the Lower-Right Corner */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="fixed bottom-6 right-6 z-40"
        >
          <button
            onClick={() => navigate('/dashboard')}
            className="group flex items-center gap-3 px-7 py-4 bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-700 hover:to-amber-800 text-white font-cinzel font-bold text-lg rounded-2xl shadow-[0_8px_30px_rgba(217,119,6,0.6)] border-2 border-amber-300 transition-all duration-300 hover:scale-105"
          >
            <span>Enter Dashboard</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-200" />
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default LandingPage;
