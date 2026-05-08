import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import DangerLeaderboard from '../components/DangerLeaderboard';
import ScrollToTopButton from '../components/ScrollToTopButton';

export default function Leaderboard() {
  return (
    <div className="min-h-screen bg-[#030712] pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-slate-100 mb-2 flex items-center gap-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <Trophy className="w-6 h-6 text-amber-400" />
            Global Danger Leaderboard
          </h1>
          <p className="text-sm text-slate-500 mb-6">Live ranking of the most dangerous and safest cities — updates every 30 minutes</p>
        </motion.div>

        <DangerLeaderboard />
      </div>
      <ScrollToTopButton />
    </div>
  );
}
