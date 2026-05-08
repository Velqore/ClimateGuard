import { motion } from 'framer-motion';
import { Plane } from 'lucide-react';
import TravelSafetyChecker from '../components/TravelSafetyChecker';
import ScrollToTopButton from '../components/ScrollToTopButton';

export default function Travel() {
  return (
    <div className="min-h-screen bg-[#030712] pt-20 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-slate-100 mb-2 flex items-center gap-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <Plane className="w-6 h-6 text-blue-400" />
            Travel Safety Checker
          </h1>
          <p className="text-sm text-slate-500 mb-6">Check climate risk for your destination and get personalized travel safety advice</p>
        </motion.div>

        <TravelSafetyChecker />
      </div>
      <ScrollToTopButton />
    </div>
  );
}
