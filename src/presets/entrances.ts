
import type { Variants } from "framer-motion";

// Animation timing constants
export const ANIMATION_DURATION = {
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  slower: 0.8,
} as const;

// Easing curves
export const EASING = {
  easeOut: [0.0, 0.0, 0.2, 1],
  easeIn: [0.4, 0.0, 1, 1],
  easeInOut: [0.4, 0.0, 0.2, 1],
  bounce: [0.68, -0.55, 0.265, 1.55],
} as const;

// Standard animation variants
export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    transition: { duration: ANIMATION_DURATION.normal }
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: EASING.easeOut
    }
  }
};

export const fadeInDown: Variants = {
  hidden: {
    opacity: 0,
    y: -20,
    transition: { duration: ANIMATION_DURATION.normal }
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: EASING.easeOut
    }
  }
};

export const fadeInLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
    transition: { duration: ANIMATION_DURATION.normal }
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: EASING.easeOut
    }
  }
};

export const fadeInRight: Variants = {
  hidden: {
    opacity: 0,
    x: 20,
    transition: { duration: ANIMATION_DURATION.normal }
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: EASING.easeOut
    }
  }
};

export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: ANIMATION_DURATION.fast }
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: ANIMATION_DURATION.fast,
      ease: EASING.easeOut
    }
  }
};

export const slideInUp: Variants = {
  hidden: {
    y: "100%",
    transition: { duration: ANIMATION_DURATION.normal }
  },
  visible: {
    y: 0,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: EASING.easeOut
    }
  }
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    transition: { duration: ANIMATION_DURATION.fast }
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ANIMATION_DURATION.fast,
      ease: EASING.easeOut
    }
  }
};

// Button animation variants
export const buttonHover = {
  scale: 1.05,
  transition: { duration: ANIMATION_DURATION.fast, ease: EASING.easeOut }
};

export const buttonTap = {
  scale: 0.95,
  transition: { duration: ANIMATION_DURATION.fast }
};

// Card animation variants
export const cardHover = {
  y: -8,
  scale: 1.02,
  transition: { duration: ANIMATION_DURATION.normal, ease: EASING.easeOut }
};

// Text animation variants
export const textReveal: Variants = {
  hidden: {
    opacity: 0,
    y: 50,
    transition: { duration: ANIMATION_DURATION.normal }
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: EASING.easeOut
    }
  }
};

// Page transition variants
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ANIMATION_DURATION.slow,
      ease: EASING.easeOut
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: EASING.easeIn
    }
  }
};

// Navigation animation variants
export const navItemHover = {
  scale: 1.1,
  transition: { duration: ANIMATION_DURATION.fast, ease: EASING.easeOut }
};

export const mobileMenuSlide: Variants = {
  closed: {
    x: "100%",
    transition: { duration: ANIMATION_DURATION.normal, ease: EASING.easeIn }
  },
  open: {
    x: 0,
    transition: { duration: ANIMATION_DURATION.normal, ease: EASING.easeOut }
  }
};
