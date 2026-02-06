import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

function ModalContainer({ open, onClose, children }) {
  const reduceMotion = useReducedMotion();
  const overlayMotion = reduceMotion ? {} : { opacity: 0 };
  const modalMotion = reduceMotion ? {} : { opacity: 0, scale: 0.97 };

  useEffect(() => {
    if (!open) return undefined;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          initial={overlayMotion}
          animate={{ opacity: 1 }}
          exit={overlayMotion}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(event) => {
            if (event.target === event.currentTarget && onClose) onClose();
          }}
        >
          <motion.div
            className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
            initial={modalMotion}
            animate={{ opacity: 1, scale: 1 }}
            exit={modalMotion}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ModalContainer;
