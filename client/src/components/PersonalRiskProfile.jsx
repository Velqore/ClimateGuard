import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ChevronDown, ChevronUp, Baby, UserCheck, Heart, Building2, TreePine, Waves, Mountain } from 'lucide-react';

export default function PersonalRiskProfile({ scores, onProfileChange }) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState({
    ageGroup: 'adult',
    healthConditions: 'none',
    livingSituation: 'urban',
  });

  const updateProfile = (key, value) => {
    const newProfile = { ...profile, [key]: value };
    setProfile(newProfile);
    onProfileChange?.(newProfile);
  };

  const ageOptions = [
    { value: 'child', label: 'Child', icon: Baby, desc: 'More vulnerable (x1.2)' },
    { value: 'adult', label: 'Adult', icon: UserCheck, desc: 'Baseline' },
    { value: 'elderly', label: 'Elderly', icon: Heart, desc: 'Most vulnerable (x1.3)' },
  ];

  const healthOptions = [
    { value: 'none', label: 'None', desc: 'No adjustments' },
    { value: 'asthma', label: 'Asthma', desc: 'Air quality x1.5' },
    { value: 'heart', label: 'Heart Condition', desc: 'Heat risk x1.4' },
  ];

  const livingOptions = [
    { value: 'urban', label: 'Urban', icon: Building2, desc: 'AQ x1.2, Heat x1.1' },
    { value: 'rural', label: 'Rural', icon: TreePine, desc: 'Wildfire x1.2' },
    { value: 'coastal', label: 'Coastal', icon: Waves, desc: 'Flood x1.3' },
    { value: 'mountain', label: 'Mountain', icon: Mountain, desc: 'Earthquake x1.2' },
  ];

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-slate-300">Personal Risk Profile</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden relative z-20 pointer-events-auto"
          >
            <div className="px-4 pb-4 space-y-4 relative z-20 pointer-events-auto">
              <div className="relative z-20 pointer-events-auto">
                <p className="text-xs text-slate-500 mb-2">Age Group</p>
                <div className="flex gap-2">
                  {ageOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateProfile('ageGroup', opt.value)}
                      className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 relative z-20 pointer-events-auto cursor-pointer ${
                        profile.ageGroup === opt.value
                          ? 'bg-gradient-to-r from-blue-500/50 to-blue-600/40 text-blue-50 border border-blue-400/60 shadow-lg shadow-blue-500/20 scale-105'
                          : 'bg-slate-700/40 text-slate-300 border border-slate-700/60 hover:bg-slate-700/60 hover:text-slate-100 hover:shadow-md hover:shadow-slate-700/30'
                      }`}
                    >
                      <opt.icon className="w-4 h-4 mx-auto mb-1" />
                      <div className="font-bold">{opt.label}</div>
                      <div className="text-[10px] opacity-75 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative z-20 pointer-events-auto">
                <p className="text-xs text-slate-500 mb-2">Health Conditions</p>
                <div className="flex gap-2">
                  {healthOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateProfile('healthConditions', opt.value)}
                      className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 relative z-20 pointer-events-auto cursor-pointer ${
                        profile.healthConditions === opt.value
                          ? 'bg-gradient-to-r from-blue-500/50 to-blue-600/40 text-blue-50 border border-blue-400/60 shadow-lg shadow-blue-500/20 scale-105'
                          : 'bg-slate-700/40 text-slate-300 border border-slate-700/60 hover:bg-slate-700/60 hover:text-slate-100 hover:shadow-md hover:shadow-slate-700/30'
                      }`}
                    >
                      <div className="font-bold">{opt.label}</div>
                      <div className="text-[10px] opacity-75 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative z-20 pointer-events-auto">
                <p className="text-xs text-slate-500 mb-2">Living Situation</p>
                <div className="grid grid-cols-2 gap-2">
                  {livingOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateProfile('livingSituation', opt.value)}
                      className={`px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 relative z-20 pointer-events-auto cursor-pointer ${
                        profile.livingSituation === opt.value
                          ? 'bg-gradient-to-r from-blue-500/50 to-blue-600/40 text-blue-50 border border-blue-400/60 shadow-lg shadow-blue-500/20 scale-105'
                          : 'bg-slate-700/40 text-slate-300 border border-slate-700/60 hover:bg-slate-700/60 hover:text-slate-100 hover:shadow-md hover:shadow-slate-700/30'
                      }`}
                    >
                      <opt.icon className="w-4 h-4 mx-auto mb-1" />
                      <div className="font-bold">{opt.label}</div>
                      <div className="text-[10px] opacity-75 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
