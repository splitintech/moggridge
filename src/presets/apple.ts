import type { Variants } from 'framer-motion';
import type { ResolvedMotionPolicy } from '../core/motion';
/** Collapse animation targets and keyframes without changing state-specific final values. */
function immediate<T>(value: T): T {
  if (typeof value === 'function') return ((...args: unknown[]) => immediate((value as (...args: unknown[]) => unknown)(...args))) as T;
  if (Array.isArray(value)) return value[value.length - 1] as T;
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) output[key] = key === 'transition' ? { duration: 0, delay: 0, repeat: 0 } : immediate(item);
    return output as T;
  }
  return value;
}
/** Call again when reactive host policy changes. Apple compatibility durations remain seconds. */
export function createApplePresets(policy: Partial<ResolvedMotionPolicy> = {}) {
  const shouldAnimate = policy.enabled !== false && policy.reducedMotion !== true;
// Spring configurations (stiffness, damping, mass)
const APPLE_SPRINGS = {
  // Gentle spring for modals/dialogs (iOS-like)
  gentle: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
    mass: 0.8
  },

  // Responsive spring for sheets/drawers
  responsive: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 35,
    mass: 0.6
  },

  // Snappy spring for quick interactions (popovers, tooltips)
  snappy: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 30,
    mass: 0.5
  },

  // Smooth spring for page transitions
  smooth: {
    type: 'spring' as const,
    stiffness: 280,
    damping: 32,
    mass: 1
  },
} as const;

// Duration presets (fallback for non-spring animations)
const APPLE_DURATIONS = {
  fast: 0.2,      // 200ms - quick feedback
  normal: 0.35,   // 350ms - standard transitions
  slow: 0.5,      // 500ms - deliberate actions
  slower: 0.7,   // 700ms - page transitions
} as const;

// Easing curves (Apple-style cubic bezier)
const APPLE_EASING = {
  easeOut: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],      // iOS ease-out
  easeIn: [0.42, 0, 1, 1] as [number, number, number, number],                // iOS ease-in
  easeInOut: [0.42, 0, 0.58, 1] as [number, number, number, number],          // iOS ease-in-out
  standard: [0.4, 0.0, 0.2, 1.0] as [number, number, number, number],        // Material standard
} as const;

/**
 * Dialog/Modal animation variants (Apple-style)
 * Scale + fade with gentle spring
 */
const appleDialogVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.92,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: shouldAnimate ? APPLE_SPRINGS.gentle : { duration: 0 },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: 20,
    transition: shouldAnimate ? {
      ...APPLE_SPRINGS.gentle,
      duration: APPLE_DURATIONS.fast,
    } : { duration: 0 },
  },
};

/**
 * Dialog overlay backdrop animation
 */
const appleOverlayVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: shouldAnimate ? {
      duration: APPLE_DURATIONS.normal,
      ease: APPLE_EASING.easeOut,
    } : { duration: 0 },
  },
  exit: {
    opacity: 0,
    transition: shouldAnimate ? {
      duration: APPLE_DURATIONS.fast,
      ease: APPLE_EASING.easeIn,
    } : { duration: 0 },
  },
};

/**
 * Sheet/Drawer animation variants (slide from side/bottom)
 */
const appleSheetVariants = (side: 'top' | 'bottom' | 'left' | 'right'): Variants => {
  const directions = {
    top: { y: '-100%' },
    bottom: { y: '100%' },
    left: { x: '-100%' },
    right: { x: '100%' },
  };

  return {
    hidden: {
      ...directions[side],
      opacity: 0,
    },
    visible: {
      x: 0,
      y: 0,
      opacity: 1,
      transition: shouldAnimate ? APPLE_SPRINGS.responsive : { duration: 0 },
    },
    exit: {
      ...directions[side],
      opacity: 0,
      transition: shouldAnimate ? {
        ...APPLE_SPRINGS.responsive,
        duration: APPLE_DURATIONS.normal,
      } : { duration: 0 },
    },
  };
};

/**
 * Popover animation variants (scale + fade from origin)
 */
const applePopoverVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.85,
    y: -8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    y: -8,
    transition: shouldAnimate ? {
      duration: APPLE_DURATIONS.fast,
      ease: APPLE_EASING.easeIn,
    } : { duration: 0 },
  },
};

/**
 * Tab content transition (cross-fade)
 */
const appleTabContentVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: shouldAnimate ? {
      duration: APPLE_DURATIONS.normal,
      ease: APPLE_EASING.easeOut,
    } : { duration: 0 },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: shouldAnimate ? {
      duration: APPLE_DURATIONS.fast,
      ease: APPLE_EASING.easeIn,
    } : { duration: 0 },
  },
};

/**
 * Stagger container for list animations
 */
const appleStaggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: shouldAnimate ? {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    } : { duration: 0 },
  },
};

/**
 * Stagger item for list animations
 */
const appleStaggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: shouldAnimate ? APPLE_SPRINGS.gentle : { duration: 0 },
  },
};

/**
 * Button tap feedback (subtle scale)
 */
const appleButtonTap = {
  scale: 0.96,
  transition: shouldAnimate ? {
    type: 'spring' as const,
    stiffness: 600,
    damping: 20,
  } : { duration: 0 },
};

/**
 * Card hover effect (subtle lift)
 */
const appleCardHover = {
  y: -4,
  scale: 1.01,
  transition: shouldAnimate ? APPLE_SPRINGS.gentle : { duration: 0 },
};

/**
 * Fade in up animation (for content reveal)
 */
const appleFadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: shouldAnimate ? APPLE_SPRINGS.gentle : { duration: 0 },
  },
};

/**
 * Scale in animation (for icons, badges)
 */
const appleScaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
};

/**
 * Enhanced overlay with backdrop blur (iOS-style)
 */
const appleOverlayBlurVariants: Variants = {
  hidden: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
  },
  visible: {
    opacity: 1,
    backdropFilter: 'blur(20px)',
    transition: shouldAnimate ? {
      duration: APPLE_DURATIONS.normal,
      ease: APPLE_EASING.easeOut,
    } : { duration: 0 },
  },
  exit: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
    transition: shouldAnimate ? {
      duration: APPLE_DURATIONS.fast,
      ease: APPLE_EASING.easeIn,
    } : { duration: 0 },
  },
};

/**
 * Content reveal animation (for dialog content)
 */
const appleContentReveal: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: shouldAnimate ? {
      ...APPLE_SPRINGS.gentle,
      delay: 0.1,
    } : { duration: 0 },
  },
};

/**
 * Drawer variants with enhanced spring physics
 */
const appleDrawerVariants = (side: 'top' | 'bottom' | 'left' | 'right'): Variants => {
  const directions = {
    top: { y: '-100%' },
    bottom: { y: '100%' },
    left: { x: '-100%' },
    right: { x: '100%' },
  };

  return {
    hidden: {
      ...directions[side],
      opacity: 0,
    },
    visible: {
      x: 0,
      y: 0,
      opacity: 1,
      transition: shouldAnimate ? APPLE_SPRINGS.responsive : { duration: 0 },
    },
    exit: {
      ...directions[side],
      opacity: 0,
      transition: shouldAnimate ? {
        ...APPLE_SPRINGS.responsive,
        duration: APPLE_DURATIONS.fast,
      } : { duration: 0 },
    },
  };
};

/**
 * Enhanced popover variants with origin-aware positioning
 */
const applePopoverVariantsEnhanced: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.85,
    y: -8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    y: -8,
    transition: shouldAnimate ? {
      duration: APPLE_DURATIONS.fast,
      ease: APPLE_EASING.easeIn,
    } : { duration: 0 },
  },
};

/**
 * Pulse animation (for notifications, badges)
 */
const applePulse: Variants = {
  hidden: {
    scale: 1,
    opacity: 1,
  },
  visible: {
    scale: [1, 1.1, 1],
    opacity: [1, 0.8, 1],
    transition: shouldAnimate ? {
      duration: 0.6,
      ease: APPLE_EASING.easeInOut,
      repeat: Infinity,
      repeatDelay: 1,
    } : { duration: 0 },
  },
};

/**
 * Shake animation (for errors, warnings)
 */
const appleShake: Variants = {
  hidden: {
    x: 0,
  },
  visible: {
    x: [0, -10, 10, -10, 10, 0],
    transition: shouldAnimate ? {
      duration: 0.5,
      ease: APPLE_EASING.easeInOut,
    } : { duration: 0 },
  },
};

/**
 * Slide in from direction
 */
const appleSlideIn = (direction: 'left' | 'right' | 'up' | 'down'): Variants => {
  const directions = {
    left: { x: -20, y: 0 },
    right: { x: 20, y: 0 },
    up: { x: 0, y: -20 },
    down: { x: 0, y: 20 },
  };

  return {
    hidden: {
      ...directions[direction],
      opacity: 0,
    },
    visible: {
      x: 0,
      y: 0,
      opacity: 1,
      transition: shouldAnimate ? APPLE_SPRINGS.gentle : { duration: 0 },
    },
  };
};

/**
 * Checkmark success animation
 */
const appleCheckmark: Variants = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: {
    scale: [0, 1.2, 1],
    opacity: 1,
    transition: shouldAnimate ? {
      duration: 0.4,
      ease: APPLE_EASING.easeOut,
    } : { duration: 0 },
  },
};

/**
 * Loading spinner animation
 */
const appleSpinner = {
  rotate: 360,
  transition: shouldAnimate ? {
    duration: 1,
    repeat: Infinity,
    ease: 'linear',
  } : { duration: 0 },
};

/**
 * Step transition variants (for multi-step forms)
 */
const appleStepTransition: Variants = {
  hidden: {
    opacity: 0,
    x: 20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: shouldAnimate ? APPLE_SPRINGS.gentle : { duration: 0 },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: shouldAnimate ? {
      duration: APPLE_DURATIONS.fast,
      ease: APPLE_EASING.easeIn,
    } : { duration: 0 },
  },
};

/**
 * Step transition reverse (for back navigation)
 */
const appleStepTransitionReverse: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: shouldAnimate ? APPLE_SPRINGS.gentle : { duration: 0 },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: shouldAnimate ? {
      duration: APPLE_DURATIONS.fast,
      ease: APPLE_EASING.easeIn,
    } : { duration: 0 },
  },
};

/**
 * Dropdown menu variants
 */
const appleDropdownVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -8,
    transition: shouldAnimate ? {
      duration: APPLE_DURATIONS.fast,
      ease: APPLE_EASING.easeIn,
    } : { duration: 0 },
  },
};

/**
 * Dropdown menu item variants (for stagger)
 */
const appleDropdownItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -10,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: shouldAnimate ? APPLE_SPRINGS.gentle : { duration: 0 },
  },
};

/**
 * Dropdown container for stagger
 */
const appleDropdownContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: shouldAnimate ? {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    } : { duration: 0 },
  },
};

/**
 * Button interaction variants
 */
const appleButtonHover = {
  scale: 1.02,
  transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
};

/**
 * Progress bar fill animation
 */
const appleProgressFill: Variants = {
  hidden: {
    scaleX: 0,
  },
  visible: {
    scaleX: 1,
    transition: shouldAnimate ? APPLE_SPRINGS.smooth : { duration: 0 },
  },
};

/**
 * Input focus variants
 */
const appleInputFocus = {
  scale: 1.01,
  transition: shouldAnimate ? {
    duration: APPLE_DURATIONS.fast,
    ease: APPLE_EASING.easeOut,
  } : { duration: 0 },
};

/**
 * Switch toggle variants
 */
const appleSwitchThumb: Variants = {
  unchecked: {
    x: 0,
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
  checked: {
    x: 20, // Adjust based on switch width
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
};

/**
 * Accordion content variants
 */
const appleAccordionContent: Variants = {
  hidden: {
    height: 0,
    opacity: 0,
  },
  visible: {
    height: 'auto',
    opacity: 1,
    transition: shouldAnimate ? APPLE_SPRINGS.responsive : { duration: 0 },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: shouldAnimate ? {
      ...APPLE_SPRINGS.responsive,
      duration: APPLE_DURATIONS.fast,
    } : { duration: 0 },
  },
};

/**
 * Accordion chevron rotate
 */
const appleAccordionChevron = {
  rotate: 180,
  transition: shouldAnimate ? {
    duration: APPLE_DURATIONS.normal,
    ease: APPLE_EASING.easeInOut,
  } : { duration: 0 },
};

/**
 * Tab trigger hover
 */
const appleTabTriggerHover = {
  scale: 1.05,
  transition: shouldAnimate ? {
    duration: APPLE_DURATIONS.fast,
    ease: APPLE_EASING.easeOut,
  } : { duration: 0 },
};

/**
 * Tab indicator slide (for active tab indicator)
 */
const appleTabIndicator: Variants = {
  hidden: {
    scaleX: 0,
  },
  visible: {
    scaleX: 1,
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
};

/**
 * Toast variants for entry/exit animations
 */
const appleToastVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: shouldAnimate ? APPLE_SPRINGS.gentle : { duration: 0 },
  },
  exit: {
    opacity: 0,
    x: 300,
    scale: 0.95,
    transition: shouldAnimate ? {
      duration: APPLE_DURATIONS.fast,
      ease: APPLE_EASING.easeIn,
    } : { duration: 0 },
  },
};

/**
 * Tooltip variants
 */
const appleTooltipVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -5,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
};

/**
 * Badge mount animation
 */
const appleBadgeVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
};

/**
 * Badge pulse for notifications
 */
const appleBadgePulse: Variants = {
  pulse: {
    scale: [1, 1.1, 1],
    transition: shouldAnimate ? {
      duration: APPLE_DURATIONS.normal,
      repeat: Infinity,
      repeatDelay: 2,
    } : { duration: 0 },
  },
};

/**
 * Avatar image load animation
 */
const appleAvatarVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: shouldAnimate ? APPLE_SPRINGS.gentle : { duration: 0 },
  },
};

/**
 * Checkbox checkmark animation
 */
const appleCheckboxCheckmark: Variants = {
  unchecked: {
    scale: 0,
    opacity: 0,
  },
  checked: {
    scale: 1,
    opacity: 1,
    transition: shouldAnimate ? {
      ...APPLE_SPRINGS.snappy,
      duration: APPLE_DURATIONS.fast,
    } : { duration: 0 },
  },
};

/**
 * Radio button selection animation
 */
const appleRadioSelection: Variants = {
  unchecked: {
    scale: 0,
    opacity: 0,
  },
  checked: {
    scale: 1,
    opacity: 1,
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
};

/**
 * Slider thumb animation
 */
const appleSliderThumb = {
  scale: 1.1,
  transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
};

/**
 * Textarea focus animation (same as input)
 */
const appleTextareaFocus = appleInputFocus;

/**
 * Hover Card variants
 */
const appleHoverCardVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -5,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: shouldAnimate ? APPLE_SPRINGS.gentle : { duration: 0 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -5,
    transition: shouldAnimate ? {
      duration: APPLE_DURATIONS.fast,
      ease: APPLE_EASING.easeIn,
    } : { duration: 0 },
  },
};

/**
 * Context Menu variants
 */
const appleContextMenuVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -5,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: shouldAnimate ? {
      duration: APPLE_DURATIONS.fast,
      ease: APPLE_EASING.easeIn,
    } : { duration: 0 },
  },
};

/**
 * Menubar content variants
 */
const appleMenubarVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -5,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
};

/**
 * Alert mount animation
 */
const appleAlertVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -10,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: shouldAnimate ? APPLE_SPRINGS.gentle : { duration: 0 },
  },
};

/**
 * Skeleton shimmer animation
 */
const appleSkeletonShimmer: Variants = {
  shimmer: {
    x: ['-100%', '100%'],
    transition: shouldAnimate ? {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    } : { duration: 0 },
  },
};

/**
 * Collapsible content variants
 */
const appleCollapsibleContent: Variants = {
  hidden: {
    height: 0,
    opacity: 0,
  },
  visible: {
    height: 'auto',
    opacity: 1,
    transition: shouldAnimate ? APPLE_SPRINGS.responsive : { duration: 0 },
  },
};

/**
 * Toggle state animation
 */
const appleToggleVariants: Variants = {
  off: {
    scale: 1,
  },
  on: {
    scale: 1.05,
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
};

/**
 * Drawer variants (similar to sheet but for bottom drawer)
 */
const appleDrawerVariantsBottom: Variants = {
  hidden: {
    y: '100%',
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: shouldAnimate ? APPLE_SPRINGS.responsive : { duration: 0 },
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: shouldAnimate ? {
      duration: APPLE_DURATIONS.normal,
      ease: APPLE_EASING.easeIn,
    } : { duration: 0 },
  },
};

/**
 * Breadcrumb item animation
 */
const appleBreadcrumbItem: Variants = {
  hidden: {
    opacity: 0,
    x: -10,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: shouldAnimate ? APPLE_SPRINGS.gentle : { duration: 0 },
  },
};

/**
 * Pagination button hover
 */
const applePaginationHover = {
  scale: 1.1,
  transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
};

/**
 * Carousel slide transition
 */
const appleCarouselSlide: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: shouldAnimate ? APPLE_SPRINGS.responsive : { duration: 0 },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
    transition: shouldAnimate ? {
      duration: APPLE_DURATIONS.normal,
      ease: APPLE_EASING.easeIn,
    } : { duration: 0 },
  }),
};

/**
 * Table row hover animation
 */
const appleTableRowHover = {
  backgroundColor: 'rgba(0, 0, 0, 0.05)',
  transition: shouldAnimate ? APPLE_SPRINGS.gentle : { duration: 0 },
};

/**
 * Calendar day selection animation
 */
const appleCalendarDaySelection: Variants = {
  unselected: {
    scale: 1,
  },
  selected: {
    scale: 1.1,
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
};

/**
 * Command item hover
 */
const appleCommandItemHover = {
  x: 2,
  transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
};

/**
 * Separator fade-in
 */
const appleSeparatorVariants: Variants = {
  hidden: {
    opacity: 0,
    scaleX: 0,
  },
  visible: {
    opacity: 1,
    scaleX: 1,
    transition: shouldAnimate ? APPLE_SPRINGS.gentle : { duration: 0 },
  },
};

/**
 * Label focus animation
 */
const appleLabelFocus = {
  scale: 1.02,
  transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
};

/**
 * OTP Slot animations
 */
const appleOTPSlotVariants: Variants = {
  empty: {
    scale: 1,
    opacity: 1,
  },
  filled: {
    scale: [1, 1.1, 1],
    opacity: 1,
    transition: shouldAnimate ? {
      scale: {
        times: [0, 0.5, 1],
        duration: APPLE_DURATIONS.normal,
        ease: APPLE_EASING.easeOut,
      },
    } : { duration: 0 },
  },
  active: {
    scale: 1.05,
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
};

/**
 * OTP Slot pulse animation for active state
 */
const appleOTPSlotPulse = {
  scale: [1, 1.05, 1],
  transition: shouldAnimate ? {
    duration: 1.5,
    repeat: Infinity,
    ease: "easeInOut",
  } : { duration: 0 },
};

/**
 * OTP Success checkmark animation
 */
const appleOTPSuccessVariants: Variants = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
};

/**
 * Form error message slide-in animation
 */
const appleFormErrorVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -10,
    x: 0,
  },
  visible: {
    opacity: 1,
    y: 0,
    x: 0,
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: shouldAnimate ? {
      duration: 0.5,
      ease: APPLE_EASING.easeOut,
    } : { duration: 0 },
  },
};

/**
 * Form field error shake animation
 */
const appleFormFieldShake = {
  x: [0, -8, 8, -8, 8, 0],
  transition: shouldAnimate ? {
    duration: 0.4,
    ease: APPLE_EASING.easeOut,
  } : { duration: 0 },
};

/**
 * Form success checkmark animation
 */
const appleFormSuccessVariants: Variants = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
};

/**
 * Scroll Area scrollbar animations
 */
const appleScrollbarVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: shouldAnimate ? {
      duration: APPLE_DURATIONS.normal,
      ease: APPLE_EASING.easeOut,
    } : { duration: 0 },
  },
};

/**
 * Scroll Area thumb hover animation
 */
const appleScrollbarThumbHover = {
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
};

/**
 * Resizable handle hover animation
 */
const appleResizableHandleHover = {
  scale: 1.2,
  backgroundColor: 'rgba(0, 0, 0, 0.1)',
  transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
};

/**
 * Resizable handle active animation
 */
const appleResizableHandleActive = {
  scale: 1.3,
  backgroundColor: 'rgba(0, 0, 0, 0.15)',
  transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
};

/**
 * Chart tooltip animation variants
 */
const appleChartTooltipVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
};

/**
 * Chart legend item hover animation
 */
const appleChartLegendHover = {
  scale: 1.05,
  transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
};

/**
 * File attachment dropdown animations
 */
const appleFileDropdownVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -10,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: shouldAnimate ? {
      duration: APPLE_DURATIONS.fast,
      ease: APPLE_EASING.easeIn,
    } : { duration: 0 },
  },
};

/**
 * File item stagger container
 */
const appleFileItemContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: shouldAnimate ? {
      staggerChildren: 0.05,
    } : { duration: 0 },
  },
};

/**
 * File item animation
 */
const appleFileItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -10,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
  exit: {
    opacity: 0,
    x: 10,
    scale: 0.9,
    transition: shouldAnimate ? {
      duration: APPLE_DURATIONS.fast,
    } : { duration: 0 },
  },
};

/**
 * Badge count animation
 */
const appleBadgeCountVariants: Variants = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
};

/**
 * Voice button recording pulse animation
 */
const appleVoiceRecordingPulse = {
  scale: [1, 1.1, 1],
  transition: shouldAnimate ? {
    duration: 1,
    repeat: Infinity,
    ease: "easeInOut",
  } : { duration: 0 },
};

/**
 * Voice button mic icon rotation
 */
const appleVoiceMicRotation = {
  rotate: [0, -10, 10, -10, 10, 0],
  transition: shouldAnimate ? {
    duration: 0.5,
    ease: APPLE_EASING.easeOut,
  } : { duration: 0 },
};

/**
 * Sonner toast animation variants
 */
const appleSonnerToastVariants: Variants = {
  initial: {
    opacity: 0,
    y: -20,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -20,
    transition: shouldAnimate ? {
      duration: APPLE_DURATIONS.fast,
      ease: APPLE_EASING.easeIn,
    } : { duration: 0 },
  },
};

/**
 * Mobile tabs stagger container
 */
const appleMobileTabsContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: shouldAnimate ? {
      staggerChildren: 0.03,
    } : { duration: 0 },
  },
};

/**
 * Mobile tabs item animation
 */
const appleMobileTabsItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: shouldAnimate ? APPLE_SPRINGS.snappy : { duration: 0 },
  },
};

/**
 * Aspect ratio content reveal
 */
const appleAspectRatioVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: shouldAnimate ? APPLE_SPRINGS.gentle : { duration: 0 },
  },
};

const presets = { shouldAnimate, APPLE_SPRINGS, APPLE_DURATIONS, APPLE_EASING, appleDialogVariants, appleOverlayVariants, appleSheetVariants, applePopoverVariants, appleTabContentVariants, appleStaggerContainer, appleStaggerItem, appleButtonTap, appleCardHover, appleFadeInUp, appleScaleIn, appleOverlayBlurVariants, appleContentReveal, appleDrawerVariants, applePopoverVariantsEnhanced, applePulse, appleShake, appleSlideIn, appleCheckmark, appleSpinner, appleStepTransition, appleStepTransitionReverse, appleDropdownVariants, appleDropdownItemVariants, appleDropdownContainer, appleButtonHover, appleProgressFill, appleInputFocus, appleSwitchThumb, appleAccordionContent, appleAccordionChevron, appleTabTriggerHover, appleTabIndicator, appleToastVariants, appleTooltipVariants, appleBadgeVariants, appleBadgePulse, appleAvatarVariants, appleCheckboxCheckmark, appleRadioSelection, appleSliderThumb, appleTextareaFocus, appleHoverCardVariants, appleContextMenuVariants, appleMenubarVariants, appleAlertVariants, appleSkeletonShimmer, appleCollapsibleContent, appleToggleVariants, appleDrawerVariantsBottom, appleBreadcrumbItem, applePaginationHover, appleCarouselSlide, appleTableRowHover, appleCalendarDaySelection, appleCommandItemHover, appleSeparatorVariants, appleLabelFocus, appleOTPSlotVariants, appleOTPSlotPulse, appleOTPSuccessVariants, appleFormErrorVariants, appleFormFieldShake, appleFormSuccessVariants, appleScrollbarVariants, appleScrollbarThumbHover, appleResizableHandleHover, appleResizableHandleActive, appleChartTooltipVariants, appleChartLegendHover, appleFileDropdownVariants, appleFileItemContainer, appleFileItemVariants, appleBadgeCountVariants, appleVoiceRecordingPulse, appleVoiceMicRotation, appleSonnerToastVariants, appleMobileTabsContainer, appleMobileTabsItemVariants, appleAspectRatioVariants };
return shouldAnimate ? presets : { ...immediate(presets), APPLE_SPRINGS, APPLE_DURATIONS, APPLE_EASING };
}
/** Legacy static compatibility values, animation enabled. No browser state is read at import time.
 * New components must use createApplePresets with their current motion policy.
 * shouldAnimate is ONLY exported on this subpath, never the legacy root.
 */
const legacyPresets = createApplePresets();
export const { shouldAnimate, APPLE_SPRINGS, APPLE_DURATIONS, APPLE_EASING, appleDialogVariants, appleOverlayVariants, appleSheetVariants, applePopoverVariants, appleTabContentVariants, appleStaggerContainer, appleStaggerItem, appleButtonTap, appleCardHover, appleFadeInUp, appleScaleIn, appleOverlayBlurVariants, appleContentReveal, appleDrawerVariants, applePopoverVariantsEnhanced, applePulse, appleShake, appleSlideIn, appleCheckmark, appleSpinner, appleStepTransition, appleStepTransitionReverse, appleDropdownVariants, appleDropdownItemVariants, appleDropdownContainer, appleButtonHover, appleProgressFill, appleInputFocus, appleSwitchThumb, appleAccordionContent, appleAccordionChevron, appleTabTriggerHover, appleTabIndicator, appleToastVariants, appleTooltipVariants, appleBadgeVariants, appleBadgePulse, appleAvatarVariants, appleCheckboxCheckmark, appleRadioSelection, appleSliderThumb, appleTextareaFocus, appleHoverCardVariants, appleContextMenuVariants, appleMenubarVariants, appleAlertVariants, appleSkeletonShimmer, appleCollapsibleContent, appleToggleVariants, appleDrawerVariantsBottom, appleBreadcrumbItem, applePaginationHover, appleCarouselSlide, appleTableRowHover, appleCalendarDaySelection, appleCommandItemHover, appleSeparatorVariants, appleLabelFocus, appleOTPSlotVariants, appleOTPSlotPulse, appleOTPSuccessVariants, appleFormErrorVariants, appleFormFieldShake, appleFormSuccessVariants, appleScrollbarVariants, appleScrollbarThumbHover, appleResizableHandleHover, appleResizableHandleActive, appleChartTooltipVariants, appleChartLegendHover, appleFileDropdownVariants, appleFileItemContainer, appleFileItemVariants, appleBadgeCountVariants, appleVoiceRecordingPulse, appleVoiceMicRotation, appleSonnerToastVariants, appleMobileTabsContainer, appleMobileTabsItemVariants, appleAspectRatioVariants } = legacyPresets;
export const appleExportNames = ["shouldAnimate", "APPLE_SPRINGS", "APPLE_DURATIONS", "APPLE_EASING", "appleDialogVariants", "appleOverlayVariants", "appleSheetVariants", "applePopoverVariants", "appleTabContentVariants", "appleStaggerContainer", "appleStaggerItem", "appleButtonTap", "appleCardHover", "appleFadeInUp", "appleScaleIn", "appleOverlayBlurVariants", "appleContentReveal", "appleDrawerVariants", "applePopoverVariantsEnhanced", "applePulse", "appleShake", "appleSlideIn", "appleCheckmark", "appleSpinner", "appleStepTransition", "appleStepTransitionReverse", "appleDropdownVariants", "appleDropdownItemVariants", "appleDropdownContainer", "appleButtonHover", "appleProgressFill", "appleInputFocus", "appleSwitchThumb", "appleAccordionContent", "appleAccordionChevron", "appleTabTriggerHover", "appleTabIndicator", "appleToastVariants", "appleTooltipVariants", "appleBadgeVariants", "appleBadgePulse", "appleAvatarVariants", "appleCheckboxCheckmark", "appleRadioSelection", "appleSliderThumb", "appleTextareaFocus", "appleHoverCardVariants", "appleContextMenuVariants", "appleMenubarVariants", "appleAlertVariants", "appleSkeletonShimmer", "appleCollapsibleContent", "appleToggleVariants", "appleDrawerVariantsBottom", "appleBreadcrumbItem", "applePaginationHover", "appleCarouselSlide", "appleTableRowHover", "appleCalendarDaySelection", "appleCommandItemHover", "appleSeparatorVariants", "appleLabelFocus", "appleOTPSlotVariants", "appleOTPSlotPulse", "appleOTPSuccessVariants", "appleFormErrorVariants", "appleFormFieldShake", "appleFormSuccessVariants", "appleScrollbarVariants", "appleScrollbarThumbHover", "appleResizableHandleHover", "appleResizableHandleActive", "appleChartTooltipVariants", "appleChartLegendHover", "appleFileDropdownVariants", "appleFileItemContainer", "appleFileItemVariants", "appleBadgeCountVariants", "appleVoiceRecordingPulse", "appleVoiceMicRotation", "appleSonnerToastVariants", "appleMobileTabsContainer", "appleMobileTabsItemVariants", "appleAspectRatioVariants"] as const;
