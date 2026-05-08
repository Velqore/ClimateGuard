import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X } from 'lucide-react';
import { apiFetch } from '../utils/helpers';

export default function DisasterPhotoFeed({ location, disaster }) {
  const [photos, setPhotos] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!location) return;
    apiFetch(`/api/photos?location=${encodeURIComponent(location)}&disaster=${disaster || 'disaster'}`)
      .then(setPhotos)
      .catch(() => {});
  }, [location, disaster]);

  if (photos.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md p-4">
      <div className="flex items-center gap-2 mb-3">
        <Camera className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-medium text-slate-300">Disaster Photos</h3>
        <span className="text-xs text-slate-500">Powered by Flickr</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {photos.slice(0, 9).map((photo, i) => (
          <motion.button
            key={photo.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSelected(photo)}
            className="aspect-square rounded-lg overflow-hidden bg-slate-800 hover:opacity-80 transition-opacity"
          >
            <img src={photo.url} alt={photo.title} className="w-full h-full object-cover" loading="lazy" />
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-3xl max-h-[80vh]"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setSelected(null)}
                className="absolute -top-3 -right-3 p-1.5 bg-slate-800 rounded-full text-slate-400 hover:text-white z-10"
              >
                <X className="w-4 h-4" />
              </button>
              {selected.urlLarge && (
                <img src={selected.urlLarge} alt={selected.title} className="max-h-[80vh] rounded-lg" />
              )}
              <div className="mt-2 text-sm text-slate-300">{selected.title}</div>
              <div className="text-xs text-slate-500">by {selected.owner}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
