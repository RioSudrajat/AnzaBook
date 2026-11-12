import { useState, useRef, useEffect, useCallback, type MouseEvent, type TouchEvent } from "react";
import { Check, Move, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

type ImageCropModalProps = {
  isOpen: boolean;
  imageSrc: string;
  title: string;
  aspectRatio: number; // e.g. 1 for avatar (1:1), 3 for banner (3:1)
  isCircularMask?: boolean;
  onConfirm: (croppedBase64: string) => void;
  onCancel: () => void;
};

export function ImageCropModal({
  isOpen,
  imageSrc,
  title,
  aspectRatio,
  isCircularMask = false,
  onConfirm,
  onCancel,
}: ImageCropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgNaturalSize, setImgNaturalSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset zoom & pan when imageSrc changes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  const handleImageLoad = () => {
    if (imgRef.current) {
      setImgNaturalSize({
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight,
      });
    }
  };

  // Drag pan handlers (Mouse)
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Drag pan handlers (Touch)
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      });
    }
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      if (!isDragging || e.touches.length !== 1) return;
      setOffset({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    },
    [isDragging, dragStart],
  );

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Perform crop to offscreen canvas and compress
  const handleApplyCrop = () => {
    if (!containerRef.current || !imgRef.current) return;

    const frameRect = containerRef.current.getBoundingClientRect();
    const targetWidth = isCircularMask ? 320 : 800;
    const targetHeight = Math.round(targetWidth / aspectRatio);

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Source image dimensions and render scale
    const img = imgRef.current;
    const imgDisplayWidth = frameRect.width * zoom;
    const imgDisplayHeight = (frameRect.width / (imgNaturalSize.width / imgNaturalSize.height)) * zoom;

    // Scale ratio between canvas target and display frame
    const scaleFactor = targetWidth / frameRect.width;

    ctx.fillStyle = "#18181b";
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Compute center alignment and pan offsets
    const imgCenterX = frameRect.width / 2 + offset.x;
    const imgCenterY = frameRect.height / 2 + offset.y;

    const drawX = (imgCenterX - imgDisplayWidth / 2) * scaleFactor;
    const drawY = (imgCenterY - imgDisplayHeight / 2) * scaleFactor;
    const drawW = imgDisplayWidth * scaleFactor;
    const drawH = imgDisplayHeight * scaleFactor;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Compress to JPEG with 0.80 quality (well under 50kB)
    const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8);
    onConfirm(compressedDataUrl);
  };

  if (!isOpen) return null;

  // Compute container dimensions based on aspect ratio
  // If banner (3:1), max-w-lg with h-40; if avatar (1:1), 260px square
  const frameHeight = isCircularMask ? 260 : 160;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs text-foreground animate-in fade-in"
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div className="space-y-0.5">
            <h3 className="font-serif text-lg font-bold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">
              Geser dan sesuaikan zoom gambar agar pas dengan frame.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Viewport & Crop Frame */}
        <div className="flex flex-col items-center justify-center">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              width: "100%",
              maxWidth: isCircularMask ? "260px" : "100%",
              height: `${frameHeight}px`,
            }}
            className={`relative overflow-hidden bg-black select-none cursor-grab active:cursor-grabbing border border-border shadow-inner ${
              isCircularMask ? "rounded-full" : "rounded-xl"
            }`}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop Source"
              onLoad={handleImageLoad}
              draggable={false}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transformOrigin: "center center",
                transition: isDragging ? "none" : "transform 0.05s ease-out",
              }}
              className="size-full object-contain pointer-events-none"
            />

            {/* Frame Helper Mask Overlay */}
            <div className="absolute inset-0 border border-white/40 pointer-events-none flex items-center justify-center">
              <div className="text-[10px] font-mono text-white/70 bg-black/50 px-2 py-0.5 rounded-full pointer-events-none flex items-center gap-1">
                <Move className="size-3" />
                <span>Geser untuk memposisikan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls: Zoom slider & Reset */}
        <div className="space-y-3 bg-muted/30 p-3.5 rounded-xl border border-border/60">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1">
              <ZoomOut className="size-3.5" />
              <span>Zoom</span>
            </span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-foreground"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              className="h-7 text-xs font-mono gap-1 text-muted-foreground hover:text-foreground"
              title="Reset Posisi & Zoom"
            >
              <RotateCcw className="size-3" />
              <span>Reset</span>
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/80">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="text-xs h-9 px-4 cursor-pointer"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleApplyCrop}
            className="text-xs h-9 px-5 bg-foreground text-background hover:opacity-90 font-semibold gap-1.5 cursor-pointer"
          >
            <Check className="size-3.5" />
            <span>Terapkan &amp; Kompres</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
