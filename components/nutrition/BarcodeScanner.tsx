"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

// BarcodeDetector is a browser built-in — declare the type
declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => {
      detect: (source: HTMLVideoElement | ImageBitmap) => Promise<{ rawValue: string }[]>;
    };
  }
}

export default function BarcodeScanner({
  onScan,
  isOpen = true,
  onClose,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const animRef = useRef<number>(0);
  const detectorRef = useRef<InstanceType<NonNullable<Window["BarcodeDetector"]>> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectorAvailable, setDetectorAvailable] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState("");

  // Stop camera stream
  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Scanning loop using BarcodeDetector
  const startScanLoop = useCallback(() => {
    if (!detectorRef.current || !videoRef.current) return;

    const detector = detectorRef.current;
    const video = videoRef.current;

    const tick = async () => {
      if (!streamRef.current) return;
      try {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          const results = await detector.detect(video);
          if (results.length > 0) {
            const value = results[0].rawValue;
            setDetected(value);
            setScanning(false);
            stopCamera();
            return; // stop loop after first hit
          }
        }
      } catch {
        // Detection frame errors are silently ignored
      }
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
  }, [stopCamera]);

  // Start camera + detection
  useEffect(() => {
    if (!isOpen) return;

    const init = async () => {
      // Check BarcodeDetector support
      const supported = typeof window !== "undefined" && !!window.BarcodeDetector;
      setDetectorAvailable(supported);

      if (supported) {
        try {
          detectorRef.current = new window.BarcodeDetector!({
            formats: [
              "ean_13", "ean_8", "upc_a", "upc_e",
              "code_128", "code_39", "qr_code", "data_matrix",
            ],
          });
        } catch {
          setDetectorAvailable(false);
        }
      }

      // Request camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setScanning(true);
            if (supported) startScanLoop();
          };
        }
      } catch {
        setCameraError("Camera access denied. Use manual entry below.");
      }
    };

    init();

    return () => stopCamera();
  }, [isOpen, startScanLoop, stopCamera]);

  // When a barcode is detected, pass it up
  useEffect(() => {
    if (detected) {
      const timer = setTimeout(() => onScan(detected), 400); // brief pause so user sees the value
      return () => clearTimeout(timer);
    }
  }, [detected, onScan]);

  const handleManualSubmit = () => {
    const val = manualBarcode.trim();
    if (val) {
      onScan(val);
      setManualBarcode("");
      onClose?.();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-success px-4 py-4 flex items-center justify-between text-white">
          <div>
            <h2 className="font-semibold">Scan Barcode</h2>
            <p className="text-xs text-white/70 mt-0.5">
              {scanning && detectorAvailable
                ? "Point camera at barcode..."
                : cameraError
                ? "Enter barcode manually"
                : "Camera starting..."}
            </p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-xl font-bold">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Camera view */}
          {!cameraError && (
            <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Scanning overlay */}
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-56 h-36">
                    {/* Corner guides */}
                    {(["tl", "tr", "bl", "br"] as const).map((corner) => (
                      <div
                        key={corner}
                        className={`absolute w-8 h-8 border-success border-2 ${
                          corner === "tl" ? "top-0 left-0 border-r-0 border-b-0 rounded-tl-lg" :
                          corner === "tr" ? "top-0 right-0 border-l-0 border-b-0 rounded-tr-lg" :
                          corner === "bl" ? "bottom-0 left-0 border-r-0 border-t-0 rounded-bl-lg" :
                                           "bottom-0 right-0 border-l-0 border-t-0 rounded-br-lg"
                        }`}
                      />
                    ))}
                    {/* Scan line animation */}
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-success/70 animate-[scan_2s_ease-in-out_infinite]" />
                  </div>
                </div>
              )}

              {/* Detected flash */}
              {detected && (
                <div className="absolute inset-0 bg-success/20 flex items-center justify-center">
                  <div className="bg-success text-white px-4 py-2 rounded-full font-semibold text-sm shadow-lg">
                    Found: {detected}
                  </div>
                </div>
              )}

              {!detectorAvailable && !cameraError && (
                <div className="absolute bottom-2 inset-x-2 bg-black/60 text-white text-xs rounded px-3 py-1.5 text-center">
                  Auto-detection not supported in this browser. Use manual entry.
                </div>
              )}
            </div>
          )}

          {/* Camera error */}
          {cameraError && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
              {cameraError}
            </div>
          )}

          {/* Manual entry */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted-foreground">
              Enter barcode manually
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                placeholder="e.g. 5901234123457"
                inputMode="numeric"
                className="flex-1 px-3 py-2 border border-input bg-background text-foreground placeholder:text-muted-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
              <button
                onClick={handleManualSubmit}
                disabled={!manualBarcode.trim()}
                className="px-4 py-2 bg-success hover:bg-success/90 disabled:opacity-50 text-white font-medium rounded-lg transition-colors text-sm"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scan line animation */}
      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: calc(100% - 2px); }
          100% { top: 0; }
        }
      `}</style>
    </div>
  );
}
