"use client";
import { Ban, Loader2, X, AlertTriangle, ShieldCheck } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText: string;
  cancelText?: string;
  isLoading?: boolean;
  type?: "danger" | "warning" | "success";
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText = "Cancel",
  isLoading = false,
  type = "danger",
}: Props) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "danger": return <Ban size={40} />;
      case "warning": return <AlertTriangle size={40} />;
      case "success": return <ShieldCheck size={40} />;
      default: return <Ban size={40} />;
    }
  };

  const getColors = () => {
    switch (type) {
      case "danger": return "bg-destructive/10 text-destructive ring-destructive/5";
      case "warning": return "bg-yellow-500/10 text-yellow-500 ring-yellow-500/5";
      case "success": return "bg-green-500/10 text-green-500 ring-green-500/5";
      default: return "bg-destructive/10 text-destructive ring-destructive/5";
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case "danger": return "bg-destructive hover:bg-destructive/80";
      case "warning": return "bg-yellow-600 hover:bg-yellow-700";
      case "success": return "bg-green-600 hover:bg-green-700";
      default: return "bg-destructive hover:bg-destructive/80";
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-card border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl shadow-black/50 space-y-6 animate-scaleIn relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className={`absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full blur-3xl opacity-20 ${type === 'danger' ? 'bg-destructive' : type === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className={`p-4 rounded-full ring-8 ${getColors()}`}>
            {getIcon()}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {title}
            </h3>
            <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full py-4 rounded-2xl text-white font-bold transition-all disabled:opacity-50 active:scale-95 ${getButtonColor()}`}
          >
            {isLoading ? <Loader2 className="animate-spin mx-auto" /> : confirmText}
          </button>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-full py-4 rounded-2xl bg-secondary text-white font-bold hover:bg-secondary/80 transition-all active:scale-95"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
