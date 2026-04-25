import { useState, useRef, useCallback, useEffect } from "react";

export type RecordingState = "idle" | "recording" | "stopped";

export function useVoiceRecorder() {
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(40).fill(0));

  const stateRef = useRef<RecordingState>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const samplesRef = useRef<number[]>([]);

  const startRecording = useCallback(async () => {
    if (stateRef.current !== "idle") return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const options = { mimeType: "audio/webm;codecs=opus" };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = "audio/ogg;codecs=opus";
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: options.mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      
      stateRef.current = "recording";
      setState("recording");
      
      setDuration(0);
      setWaveformData(new Array(40).fill(0));
      samplesRef.current = [];
      startTimeRef.current = Date.now();

      // Duration timer
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        if (stateRef.current === "recording") {
          const currentDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setDuration(currentDuration);

          // Auto-stop at 10 minutes (600 seconds)
          if (currentDuration >= 600) {
            stopRecording();
          }
        } else {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }
      }, 100);

      // Waveform analysis
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateWaveform = () => {
        if (stateRef.current !== "recording") return;
        
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const average = sum / bufferLength / 255;
        
        samplesRef.current.push(average);
        const displayData = samplesRef.current.slice(-40);
        const padding = 40 - displayData.length;
        const paddedData = [...new Array(padding).fill(0), ...displayData];
        setWaveformData(paddedData);

        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      
      updateWaveform();

    } catch (err) {
      console.error("Failed to start recording", err);
      alert("Please allow microphone access to record voice messages.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && stateRef.current === "recording") {
      stateRef.current = "stopped";
      setState("stopped");
      mediaRecorderRef.current.stop();
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }

      const allSamples = samplesRef.current;
      const bucketSize = Math.max(1, Math.floor(allSamples.length / 40));
      const finalWaveform: number[] = [];
      for (let i = 0; i < 40; i++) {
        const start = i * bucketSize;
        const end = Math.min(start + bucketSize, allSamples.length);
        const bucket = allSamples.slice(start, end);
        finalWaveform.push(bucket.length > 0 ? bucket.reduce((a, b) => a + b, 0) / bucket.length : 0);
      }
      setWaveformData(finalWaveform);
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.ondataavailable = null;
    }
    stateRef.current = "idle";
    setState("idle");
    setAudioBlob(null);
    setDuration(0);
    setWaveformData(new Array(40).fill(0));
    samplesRef.current = [];
    
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }
  }, []);

  return {
    state,
    duration,
    audioBlob,
    waveformData,
    startRecording,
    stopRecording,
    cancelRecording,
    reset: useCallback(() => {
      stateRef.current = "idle";
      setState("idle");
      setAudioBlob(null);
      setDuration(0);
      setWaveformData(new Array(40).fill(0));
      samplesRef.current = [];
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }, [])
  };
}
