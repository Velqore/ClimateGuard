import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import Compare from './pages/Compare';
import Leaderboard from './pages/Leaderboard';
import Travel from './pages/Travel';
import Alerts from './pages/Alerts';
import Assistant from './pages/Assistant';
import About from './pages/About';
import GlobePage from './pages/GlobePage';
import Community from './pages/Community';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div aria-hidden="true" className="h-24 md:h-28" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/globe" element={<GlobePage />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/travel" element={<Travel />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/community" element={<Community />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}
