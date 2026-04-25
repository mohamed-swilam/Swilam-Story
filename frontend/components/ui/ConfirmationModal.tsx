"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  isDestructive = true,
  isLoading = false,
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-white/10 pointer-events-auto"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className={`p-3 rounded-2xl ${isDestructive ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"}`}>
                  <AlertCircle size={32} />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {message}
                  </p>
                </div>
                
                <div className="flex gap-3 w-full mt-2">
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="flex-1 px-4 py-3 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all disabled:opacity-50"
                  >
                    {cancelText}
                  </button>
                  <button
                    onClick={onConfirm}
                    disabled={isLoading}
                    className={`flex-1 px-4 py-3 rounded-2xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                      isDestructive 
                        ? "bg-red-500 text-white hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.3)]" 
                        : "bg-primary text-white hover:bg-primary/80 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
                    }`}
                  >
                    {isLoading ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      confirmText
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
