import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import parchmentBg from '../assets/parchment.jpg';
import Navbar from '../components/Navbar';
import { fetchTeams } from '../api/auctionApi';
import type { Team as TeamType } from '../types/auction';
import { formatCurrency } from '../utils/formatters';
import { useLiveAuctionEvents } from '../hooks/useLiveAuctionEvents';

export default function Team() {
  const [teams, setTeams] = useState<TeamType[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTeams = async () => {
    try {
      const data = await fetchTeams();
      setTeams(data || []);
    } catch (err) {
      console.error('Error fetching teams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  useLiveAuctionEvents({
    onTeamsUpdated: () => loadTeams(),
    onAuctionReset: () => loadTeams(),
  });

  return (
    <div className="min-h-screen flex flex-col font-serif bg-stone-900 text-[#fefae0]">
      <Navbar />

      <div
        className="relative flex-1 min-h-[calc(100vh-80px)] bg-center bg-cover p-6 md:p-12"
        style={{ backgroundImage: `url(${parchmentBg})` }}
      >
        <div className="absolute inset-0 bg-stone-900/30 mix-blend-multiply pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-6xl font-extrabold font-cinzel text-amber-950 drop-shadow-lg tracking-wide">
              👑 SAMRAT OF BHARATAVARSHA 👑
            </h1>
            <p className="text-stone-800 text-lg md:text-xl italic mt-2 font-marcellus">
              Imperial Competing Houses & Royal Council Rosters
            </p>
          </motion.div>

          {loading ? (
            <div className="p-16 text-center bg-[#fdf6e2]/80 border-2 border-[#b08968] rounded-2xl max-w-lg mx-auto">
              <RefreshCw className="w-10 h-10 animate-spin text-amber-800 mx-auto mb-3" />
              <p className="text-xl text-stone-800 font-cinzel">Summoning Imperial Dynasty Records...</p>
            </div>
          ) : teams.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#fdf6e2]/95 border-4 border-dashed border-[#b08968] rounded-[2rem] p-12 text-center text-stone-900 shadow-xl max-w-xl mx-auto"
            >
              <Users className="w-16 h-16 mx-auto mb-4 text-amber-800/70" />
              <h2 className="text-3xl font-cinzel font-bold text-amber-950 mb-2">No Dynasties Registered</h2>
              <p className="text-stone-700 text-sm md:text-base max-w-md mx-auto mb-6 font-marcellus">
                The royal registries are currently cleared. The Chief Auctioneer can create new dynasties or restore the default royal houses in the Imperial Control Centre.
              </p>
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-900 hover:to-amber-950 text-amber-100 font-cinzel font-bold rounded-xl text-sm shadow-lg transition hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                <span>Go to Imperial Control Centre</span>
              </Link>
            </motion.div>
          ) : (
            /* Cards Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {teams.map((team, index) => {
                const memberList = team.members?.map((m: any) => typeof m === 'string' ? m : `${m.name}${m.academic_year ? ` (${m.academic_year})` : ''}`) || [];

                return (
                  <motion.div
                    key={team.id || team.name || index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.03 }}
                    className="rounded-3xl shadow-2xl border-4 border-yellow-800 bg-gradient-to-br from-[#fefae0] to-amber-100/90 overflow-hidden flex flex-col justify-between"
                  >
                    {/* Royal Header */}
                    <div>
                      <div className="bg-gradient-to-r from-red-950 via-amber-800 to-red-950 text-white text-center py-4 px-3 shadow-inner border-b-2 border-yellow-600/50">
                        <div className="text-[11px] uppercase tracking-widest text-amber-300 font-semibold mb-0.5 font-marcellus">
                          {team.house_name || 'Imperial House'}
                        </div>
                        <h2 className="text-2xl md:text-3xl font-extrabold tracking-widest uppercase font-cinzel text-amber-100 drop-shadow">
                          ⚔️ {team.name} ⚔️
                        </h2>
                      </div>

                      {/* Member Rosters */}
                      <div className="p-6">
                        <div className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-3 font-marcellus flex justify-between items-center">
                          <span>Royal Council Roster</span>
                          {team.initial_treasury && (
                            <span className="text-[11px] text-stone-700 font-cinzel font-semibold">
                              Treasury: {formatCurrency(team.initial_treasury, true)}
                            </span>
                          )}
                        </div>

                        {memberList.length === 0 ? (
                          <p className="text-xs text-stone-500 italic">No council members registered yet</p>
                        ) : (
                          <ul className="space-y-2">
                            {memberList.map((member: string, i: number) => (
                              <li
                                key={i}
                                className="text-stone-800 font-medium text-sm md:text-base hover:text-red-800 transition-colors duration-200 flex items-center gap-2"
                              >
                                <span className="text-amber-700 font-bold">•</span>
                                <span>{member}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Decorative Bottom Border */}
                    <div className="h-2.5 bg-gradient-to-r from-yellow-700 via-red-900 to-yellow-700" />
                  </motion.div>
                );
              })}
            </div>
          )}

          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center mt-14 text-stone-800 text-sm italic font-marcellus"
          >
            May the greatest strategist ascend the throne of Bharatavarsha • Nirvana Club
          </motion.footer>
        </div>
      </div>
    </div>
  );
}
