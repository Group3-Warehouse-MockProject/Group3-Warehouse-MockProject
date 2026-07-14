import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, ScanLine, X } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  className?: string;
}

export function BarcodeScanner({ onScan, className = "" }: BarcodeScannerProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = useRef(`qr-reader-${Math.random().toString(36).substring(7)}`).current;
  
  // Hardware Scanner Integration
  // Hardware scanners act like a fast keyboard terminating with Enter
  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field (except if it's the scanner input, but we're listening globally here)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const currentTime = Date.now();
      // If time between keystrokes is too long (> 50ms), it's probably human typing, reset buffer
      if (currentTime - lastKeyTime > 50) {
        barcodeBuffer = "";
      }
      lastKeyTime = currentTime;

      if (e.key === "Enter" && barcodeBuffer.length > 2) {
        e.preventDefault();
        onScan(barcodeBuffer);
        barcodeBuffer = "";
      } else if (e.key.length === 1) {
        // Alphanumeric keys
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onScan]);

  // Software Scanner (Camera) Integration
  useEffect(() => {
    if (!isCameraActive) return;

    const scanner = new Html5Qrcode(containerId);
    let isComponentMounted = true;

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      (decodedText) => {
        if (isComponentMounted) {
          onScan(decodedText);
          setIsCameraActive(false); 
        }
      },
      (err) => {
        // Ignore constant stream of failure errors
      }
    ).catch((err) => {
      console.error("Camera access error:", err);
      if (isComponentMounted) {
        setError("Cannot access camera. Please check permissions.");
        setIsCameraActive(false);
      }
    });

    return () => {
      isComponentMounted = false;
      try {
        scanner.stop().then(() => {
          scanner.clear();
        }).catch(() => {
          // Ignore stop errors (happens if it wasn't fully started)
        });
      } catch (e) {
        console.error("Error stopping scanner:", e);
      }
    };
  }, [isCameraActive, containerId, onScan]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Hardware Scanner Hint & Trigger UI */}
      <div className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-md bg-primary/10 grid place-items-center text-primary">
            <ScanLine className="size-4" />
          </div>
          <div>
            <div className="text-sm font-medium text-primary">Ready to scan</div>
            <div className="text-xs text-muted-foreground">Use a handheld scanner or camera</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsCameraActive(!isCameraActive)}
          className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-md bg-background border border-border shadow-sm hover:bg-secondary transition-colors"
        >
          {isCameraActive ? <X className="size-3.5" /> : <Camera className="size-3.5" />}
          {isCameraActive ? "Close Camera" : "Open Camera"}
        </button>
      </div>

      {error && <div className="text-xs text-destructive bg-destructive/10 p-2 rounded-md">{error}</div>}

      {/* Camera Video Container */}
      <div className={`${isCameraActive ? "block" : "hidden"} overflow-hidden rounded-lg border border-border shadow-sm`}>
        <div id={containerId} className="w-full"></div>
      </div>
    </div>
  );
}
