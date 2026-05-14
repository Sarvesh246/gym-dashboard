"use client";

import { useEffect, useRef, useState } from "react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function BarcodeScanner({
  onScan,
  isOpen = true,
  onClose,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState("");
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    if (!isOpen || !isScanning) return;

    const startScanning = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Start detection loop (we'll use a simple barcode detection library)
        // For now, we'll just show the camera and allow manual entry
        setError(null);
      } catch (err) {
        setError("Camera access denied. Use manual entry below.");
        setIsScanning(false);
      }
    };

    startScanning();

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, [isOpen, isScanning]);

  const handleManualSubmit = () => {
    if (manualBarcode.trim()) {
      onScan(manualBarcode);
      setManualBarcode("");
      onClose?.();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-4 flex items-center justify-between text-white">
          <h2 className="font-semibold">Scan Barcode</h2>
          <button onClick={onClose} className="text-lg font-bold">
            ✕
          </button>
        </div>

        {/* Camera view or error */}
        <div className="space-y-4 p-4">
          {isScanning && !error && (
            <div className="bg-black rounded-lg overflow-hidden aspect-video relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 border-4 border-emerald-400 rounded-lg pointer-events-none" />
              <div className="absolute top-4 right-4 bg-emerald-600 text-white px-3 py-1 rounded text-xs font-medium">
                Point camera at barcode
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Manual entry */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">
              {isScanning ? "Or enter manually:" : "Enter barcode:"}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleManualSubmit()}
                placeholder="Scan or type barcode..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                autoFocus
              />
              <button
                onClick={handleManualSubmit}
                disabled={!manualBarcode.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
              >
                Search
              </button>
            </div>
          </div>

          {isScanning && (
            <button
              onClick={() => setIsScanning(false)}
              className="w-full py-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm"
            >
              Close Camera
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
