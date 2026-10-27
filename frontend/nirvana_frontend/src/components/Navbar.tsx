import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import clubLogo from '../assets/club_logo.png';
import { Crown, LayoutDashboard, Hammer, ShieldAlert, Trophy, Users, LogOut, Menu, X } from 'lucide-react';
import { getAdminToken, clearAdminToken, verifyAdmin } from '../api/auctionApi';

interface NavbarProps {
  hideInProjectorMode?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ hideInProjectorMode = false }) => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkAdmin();
  }, [location.pathname]);

  const checkAdmin = async () => {
    const token = getAdminToken();
    if (!token) {
      setIsAdminLoggedIn(false);
      return;
    }
    const valid = await verifyAdmin();
    setIsAdminLoggedIn(valid);
  };

  const handleLogout = () => {
    clearAdminToken();
    setIsAdminLoggedIn(false);
    navigate('/');
  };

  if (hideInProjectorMode) {
    return null;
  }

  const navLinks = [
    { to: '/', label: 'Home', icon: Crown },
    { to: '/dashboard', label: 'Treasury Dashboard', icon: LayoutDashboard },
    { to: '/auction', label: 'Auction Arena', icon: Hammer },
    { to: '/team', label: 'Houses & Teams', icon: Users },
    { to: '/results', label: 'Results', icon: Trophy },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#26180b]/95 border-b-2 border-[#d4a373]/80 backdrop-blur-md shadow-lg text-[#fefae0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Title */}
          <NavLink to="/" className="flex items-center gap-3 group">
            <img
              src={clubLogo}
              alt="Nirvana Club Logo"
              className="h-12 w-auto object-contain drop-shadow-[0_2px_8px_rgba(212,163,115,0.5)] group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="font-cinzel text-xl md:text-2xl font-bold tracking-wider text-amber-300 drop-shadow-sm flex items-center gap-2">
                Samrat of Bharatavarsha
              </span>
              <span className="text-xs uppercase tracking-widest text-[#d4a373] font-marcellus">
                सम्राट ऑफ़ भारतवर्ष • Live Event Arena
              </span>
            </div>
          </NavLink>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center space-x-1 font-marcellus">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50 shadow-inner'
                        : 'text-amber-100/80 hover:text-amber-200 hover:bg-amber-900/30'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 text-amber-400" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}

            {/* Admin Nav Button */}
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `ml-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-500 text-stone-950 shadow-md ring-2 ring-amber-300'
                    : 'bg-amber-900/50 hover:bg-amber-800/60 text-amber-300 border border-amber-600/50'
                }`
              }
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Admin Control</span>
              {isAdminLoggedIn && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" title="Authenticated" />
              )}
            </NavLink>

            {/* Logout button if authenticated */}
            {isAdminLoggedIn && (
              <button
                onClick={handleLogout}
                className="ml-2 p-2 rounded-lg text-amber-300/70 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                title="Logout Admin"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </nav>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-amber-300 hover:bg-amber-900/40"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#26180b] border-t border-amber-900/60 px-4 pt-2 pb-4 space-y-1 font-marcellus">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-base font-medium ${
                    isActive
                      ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                      : 'text-amber-100/80 hover:bg-amber-900/40'
                  }`
                }
              >
                <Icon className="w-5 h-5 text-amber-400" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}

          <NavLink
            to="/admin"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-base font-semibold ${
                isActive ? 'bg-amber-500 text-stone-950' : 'bg-amber-900/40 text-amber-300'
              }`
            }
          >
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <span>Admin Control {isAdminLoggedIn ? '(Logged In)' : ''}</span>
          </NavLink>

          {isAdminLoggedIn && (
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-rose-400 hover:bg-rose-950/40 rounded-md"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout Admin</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
