import React from 'react';
import {
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  Navigate,
} from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import AuctionArena from './pages/AuctionArena';
import AdminControl from './pages/AdminControl';
import Results from './pages/Results';
import Team from './pages/Team';

const App: React.FC = () => {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        {/* Route Requirements:
            /          -> Opening page
            /dashboard -> Shared team treasury dashboard
            /auction   -> Public auction display
            /admin     -> Admin management and auction controls
            /results   -> Final results & crowned champion
            /team      -> Team details & house rosters
        */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/auction" element={<AuctionArena />} />
        <Route path="/admin" element={<AdminControl />} />
        <Route path="/host" element={<Navigate to="/admin" replace />} />
        <Route path="/results" element={<Results />} />
        <Route path="/result" element={<Navigate to="/results" replace />} />
        <Route path="/team" element={<Team />} />
        <Route path="/teams" element={<Navigate to="/team" replace />} />
        <Route
          path="*"
          element={
            <div className="min-h-screen flex flex-col items-center justify-center bg-stone-900 text-amber-200 font-cinzel">
              <h1 className="text-4xl font-bold mb-4">404 - Domain Not Found</h1>
              <a href="/" className="px-5 py-2.5 bg-amber-700 text-white rounded-xl hover:bg-amber-800 transition">
                Return to Sovereign Gateway
              </a>
            </div>
          }
        />
      </>
    )
  );

  return (
    <div className="min-h-screen scroll-smooth">
      <RouterProvider router={router} />
    </div>
  );
};

export default App;
