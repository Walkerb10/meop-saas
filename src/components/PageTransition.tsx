import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const isMobile = useIsMobile();

  // Mobile: slide up animation similar to Agent page
  const mobileVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  };

  // Desktop: smooth fade and scale animation
  const desktopVariants = {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
  };

  const variants = isMobile ? mobileVariants : desktopVariants;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{
        duration: isMobile ? 0.3 : 0.2,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
