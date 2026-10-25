import type { Variants } from 'framer-motion';

/**
 * Reusable animation variants for consistent micro-interactions
 */

// Card hover and tap animations
export const cardHoverVariants: Variants = {
  rest: {
    scale: 1,
    y: 0,
  },
  hover: {
    scale: 1.01,
    y: -4,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
};

// Button interactions
export const buttonVariants: Variants = {
  rest: {
    scale: 1,
  },
  hover: {
    scale: 1.02,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 17,
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 17,
    },
  },
};

// Icon animations
export const iconVariants: Variants = {
  rest: {
    x: 0,
    rotate: 0,
  },
  hover: {
    x: 2,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
};

// Fade in animations
export const fadeInVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

// Stagger container for list animations
export const staggerContainer: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// Stagger item for list animations
export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

// Scale in animation
export const scaleInVariants: Variants = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
};

// Slide in from right
export const slideInRightVariants: Variants = {
  hidden: {
    x: 20,
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
};

// Pulse animation for status indicators
export const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.7, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Number count-up animation props
export const countUpTransition = {
  duration: 1.5,
  ease: 'easeOut' as const,
};

// Re-export names used by components that resolve @/utils/animations to this file
export {
  scaleIn,
  cardHover,
  buttonHover,
  buttonTap,
  fadeInUp,
  fadeInLeft,
  fadeInRight,
} from './entrances';
