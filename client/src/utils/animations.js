export const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
};

export const fadeInScale = {
  initial: { opacity: 0, scale: 0.94 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
};

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export const springPop = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { type: 'spring', stiffness: 350, damping: 20 },
};

export const hazardCardReveal = {
  initial: { opacity: 0, scale: 0.9, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  transition: { type: 'spring', stiffness: 300, damping: 25 },
};

export const pulsingCritical = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(239, 68, 68, 0.4)',
      '0 0 0 16px rgba(239, 68, 68, 0)',
    ],
    transition: { duration: 1.5, repeat: Infinity },
  },
};

export const tsunamiWave = {
  animate: {
    x: [0, 10, 0, -10, 0],
    transition: { duration: 2, repeat: Infinity },
  },
};
