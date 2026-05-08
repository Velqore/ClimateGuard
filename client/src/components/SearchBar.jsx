import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Loader2 } from 'lucide-react';

const placeholders = [
  'Search any city in the world...',
  'Try: Tokyo, Japan',
  'Try: Los Angeles, USA',
  'Try: Dhaka, Bangladesh',
  'Try: Sydney, Australia',
  'Try: Delhi, India',
  'Try: Manila, Philippines',
];

export default function SearchBar({ onSearch, large = false, className = '' }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const text = placeholders[placeholderIdx];
    let charIdx = 0;
    const type = setInterval(() => {
      if (charIdx <= text.length) {
        setDisplayedText(text.slice(0, charIdx));
        charIdx++;
      } else {
        clearInterval(type);
        setTimeout(() => {
          setPlaceholderIdx(i => (i + 1) % placeholders.length);
        }, 2000);
      }
    }, 60);
    return () => clearInterval(type);
  }, [placeholderIdx]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      if (onSearch) {
        await onSearch(query.trim());
      } else {
        navigate(`/dashboard?location=${encodeURIComponent(query.trim())}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSearch = (city) => {
    setQuery(city);
    if (onSearch) {
      onSearch(city);
    } else {
      navigate(`/dashboard?location=${encodeURIComponent(city)}`);
    }
  };

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="relative">
        <motion.div
          whileFocus={{ scale: 1.01 }}
          className={`flex items-center bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden transition-all focus-within:border-blue-500/50 focus-within:shadow-lg focus-within:shadow-blue-500/10 ${
            large ? 'py-4 px-6' : 'py-3 px-4'
          }`}
        >
          <MapPin className={`text-slate-500 shrink-0 ${large ? 'w-6 h-6 mr-4' : 'w-4 h-4 mr-3'}`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => inputRef.current?.select()}
            placeholder={displayedText}
            className={`flex-1 bg-transparent text-slate-100 placeholder-slate-600 outline-none ${
              large ? 'text-lg' : 'text-sm'
            }`}
          />
          <button
            type="submit"
            disabled={loading}
            className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50 ${
              large ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'
            }`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {large && <span>Analyze</span>}
          </button>
        </motion.div>
      </form>

      {large && (
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {[
            { city: 'Los Angeles, USA', flag: 'US' },
            { city: 'Tokyo, Japan', flag: 'JP' },
            { city: 'Dhaka, Bangladesh', flag: 'BD' },
            { city: 'Sydney, Australia', flag: 'AU' },
            { city: 'Delhi, India', flag: 'IN' },
            { city: 'Manila, Philippines', flag: 'PH' },
          ].map(({ city, flag }) => (
            <button
              key={city}
              onClick={() => handleQuickSearch(city)}
              className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-full text-xs text-slate-300 hover:text-white transition-colors"
            >
              {flag} {city.split(',')[0]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
