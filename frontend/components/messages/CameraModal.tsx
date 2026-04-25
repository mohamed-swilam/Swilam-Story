"use client";

import { useRef, useState, useEffect } from "react";
import { X, Camera, RotateCw, Check, AlertCircle } from "lucide-react";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (blob: Blob) => void;
}

export default function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const startCamera = async () => {
    try {
      setError(null);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Unable to access camera. Please check permissions.");
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
    }
    return () => stopCamera();
  }, [isOpen, facingMode]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedImage && canvasRef.current) {
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          onCapture(blob);
          onClose();
        }
      }, "image/jpeg", 0.9);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg aspect-[3/4] bg-card rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/50 to-transparent">
          <button 
            onClick={onClose}
            className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all backdrop-blur-md"
          >
            <X size={20} />
          </button>
          {!capturedImage && !error && (
            <button 
              onClick={toggleCamera}
              className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all backdrop-blur-md"
            >
              <RotateCw size={20} />
            </button>
          )}
        </div>

        {/* Preview / Captured Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center">
          {error ? (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <AlertCircle size={48} className="text-red-500" />
              <p className="text-white font-medium">{error}</p>
              <button 
                onClick={startCamera}
                className="mt-2 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:scale-105 active:scale-95 transition-all"
              >
                Try Again
              </button>
            </div>
          ) : capturedImage ? (
            <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover scale-x-[-1]" 
            />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Footer Controls */}
        <div className="p-8 bg-card border-t border-border flex items-center justify-center gap-8">
          {capturedImage ? (
            <>
              <button 
                onClick={handleRetake}
                className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-all"
              >
                <div className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center">
                  <RotateCw size={20} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Retake</span>
              </button>
              <button 
                onClick={handleConfirm}
                className="flex flex-col items-center gap-2 text-primary hover:scale-110 transition-all"
              >
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30">
                  <Check size={32} strokeWidth={3} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Send Photo</span>
              </button>
            </>
          ) : (
            <button 
              onClick={capturePhoto}
              disabled={!!error || !stream}
              className="group relative flex items-center justify-center disabled:opacity-50"
            >
              <div className="w-20 h-20 rounded-full border-4 border-primary/20 flex items-center justify-center transition-all group-hover:scale-110">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30 active:scale-90 transition-all">
                  <Camera size={32} />
                </div>
              </div>
              <div className="absolute -bottom-6 text-[10px] font-bold text-muted-foreground uppercase tracking-widest group-hover:text-primary transition-colors">Capture</div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
