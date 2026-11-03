import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Upload,
  Check,
  X,
  AlertCircle,
  Move,
  Trash2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { AvatarCropState } from '../types';

export interface ImageCropResult {
  croppedUrl: string;
  originalUrl?: string;
  cropState?: AvatarCropState;
}

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhotoUrl?: string | null;
  onSave: (result: ImageCropResult | string | null) => Promise<void> | void;
}

export default function ImageCropModal({
  isOpen,
  onClose,
  currentPhotoUrl,
  onSave,
}: ImageCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Image intrinsic and viewport dimensions
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [baseWidth, setBaseWidth] = useState(0);
  const [baseHeight, setBaseHeight] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Physical dimensions for circular avatar frame
  const FRAME_SIZE = 280;
  const TARGET_SIZE = 512;

  // Initialize with current photo if open
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      if (currentPhotoUrl) {
        setImageSrc(currentPhotoUrl);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } else {
        setImageSrc(null);
      }
    }
  }, [isOpen, currentPhotoUrl]);

  // Handle client-side file selection with validation
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPG, PNG, HEIC, or WebP).');
      return;
    }

    // 15MB maximum client limit
    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('Image size is too large (maximum 15MB). Please choose a smaller photo.');
      return;
    }

    setErrorMessage('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageSrc(reader.result);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };
    reader.readAsDataURL(file);

    // Reset input value so re-selecting same file triggers change
    e.target.value = '';
  };

  // Image load: compute scale to fit cover container
  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth || 400;
    const nh = img.naturalHeight || 400;
    setNaturalSize({ width: nw, height: nh });

    // Calculate base dimensions fitting the square viewport
    let bw = FRAME_SIZE;
    let bh = FRAME_SIZE;

    if (nw > nh) {
      // Landscape: match height to frame, scale width proportionally
      bh = FRAME_SIZE;
      bw = (nw / nh) * FRAME_SIZE;
    } else {
      // Portrait or square: match width to frame, scale height proportionally
      bw = FRAME_SIZE;
      bh = (nh / nw) * FRAME_SIZE;
    }

    setBaseWidth(bw);
    setBaseHeight(bh);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Pan constraint helper: prevents dragging completely off canvas
  const clampPan = useCallback(
    (newX: number, newY: number, currentZoom: number) => {
      const currentWidth = baseWidth * currentZoom;
      const currentHeight = baseHeight * currentZoom;

      const maxPanX = Math.max(0, (currentWidth - FRAME_SIZE) / 2) + FRAME_SIZE * 0.4;
      const maxPanY = Math.max(0, (currentHeight - FRAME_SIZE) / 2) + FRAME_SIZE * 0.4;

      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, newX)),
        y: Math.max(-maxPanY, Math.min(maxPanY, newY)),
      };
    },
    [baseWidth, baseHeight]
  );

  // Mouse & Touch Dragging Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setPan(clampPan(newX, newY, zoom));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const newX = e.touches[0].clientX - dragStart.x;
    const newY = e.touches[0].clientY - dragStart.y;
    setPan(clampPan(newX, newY, zoom));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Quick Preset Actions
  const handleFitPhoto = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleFillCircle = () => {
    // Zoom in enough to cover the circle fully
    const ratio = Math.max(FRAME_SIZE / baseWidth, FRAME_SIZE / baseHeight) * 1.25;
    setZoom(Math.min(4, Math.max(1, ratio)));
    setPan({ x: 0, y: 0 });
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Execute Canvas Crop & Save
  const handleCropAndSave = async () => {
    if (!imageSrc || !imgRef.current) return;
    setIsSaving(true);
    setErrorMessage('');

    try {
      const img = imgRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = TARGET_SIZE;
      canvas.height = TARGET_SIZE;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas 2D context is not available');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Background fill matching white card surface
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);

      // Coordinate mapping from screen preview frame (FRAME_SIZE) to canvas (TARGET_SIZE)
      const ratio = TARGET_SIZE / FRAME_SIZE;
      const drawWidth = baseWidth * zoom * ratio;
      const drawHeight = baseHeight * zoom * ratio;
      const drawX = TARGET_SIZE / 2 - drawWidth / 2 + pan.x * ratio;
      const drawY = TARGET_SIZE / 2 - drawHeight / 2 + pan.y * ratio;

      // Draw the exact composition seen inside the preview window
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

      // Export high-quality square JPEG (0.92 quality, ~45KB)
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);

      const cropState: AvatarCropState = {
        zoom: Number(zoom.toFixed(2)),
        panX: Math.round(pan.x),
        panY: Math.round(pan.y),
      };

      await onSave({
        croppedUrl: croppedDataUrl,
        originalUrl: imageSrc,
        cropState,
      });

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Couldn’t save your changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePhoto = async () => {
    setIsSaving(true);
    try {
      await onSave(null);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Couldn’t save your changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18181B]/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white border border-[#E4E4E7] text-[#18181B] rounded-3xl p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E4E4E7]">
          <div>
            <h3 className="text-lg font-black tracking-tight text-[#18181B] flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#7C3AED]" />
              <span>Profile Picture</span>
            </h3>
            <p className="text-xs text-[#71717A] mt-0.5">
              Adjust your photo. What you see inside the circle is your avatar.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#71717A] hover:text-[#18181B] hover:bg-[#F5F3FF] transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Crop / Preview Viewport */}
        <div className="my-5 flex flex-col items-center">
          {imageSrc ? (
            <div className="flex flex-col items-center select-none">
              {/* Crop Frame with Touch / Mouse drag */}
              <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                  width: `${FRAME_SIZE}px`,
                  height: `${FRAME_SIZE}px`,
                  touchAction: 'none',
                }}
                className="relative rounded-2xl overflow-hidden bg-stone-100 border border-[#E4E4E7] shadow-inner cursor-grab active:cursor-grabbing flex items-center justify-center"
              >
                {/* The Image Element */}
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop preview"
                  onLoad={handleImageLoaded}
                  draggable={false}
                  style={{
                    width: `${baseWidth}px`,
                    height: `${baseHeight}px`,
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                  }}
                  className="max-w-none pointer-events-none select-none object-contain"
                />

                {/* Circular Boundary Ring */}
                <div
                  className="absolute inset-0 pointer-events-none rounded-full border-2 border-[#7C3AED] shadow-md"
                  style={{
                    boxShadow: '0 0 0 9999px rgba(255, 255, 255, 0.75)',
                  }}
                />

                {/* Subtle rule-of-thirds grid inside circular guide */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-evenly opacity-15">
                  <div className="border-b border-[#7C3AED] w-full" />
                  <div className="border-b border-[#7C3AED] w-full" />
                </div>
                <div className="absolute inset-0 pointer-events-none flex justify-evenly opacity-15">
                  <div className="border-r border-[#7C3AED] h-full" />
                  <div className="border-r border-[#7C3AED] h-full" />
                </div>
              </div>

              {/* Gesture Hint */}
              <div className="text-center mt-2.5 text-[11px] text-[#71717A] font-medium">
                Drag to position • Pinch or slide to zoom
              </div>
            </div>
          ) : (
            <div
              style={{ width: `${FRAME_SIZE}px`, height: `${FRAME_SIZE}px` }}
              className="rounded-full border-2 border-dashed border-[#7C3AED]/30 bg-[#F5F3FF]/40 flex flex-col items-center justify-center p-6 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center mb-3 border border-[#EDE9FE]">
                <Camera className="w-8 h-8" />
              </div>
              <p className="text-xs font-semibold text-[#18181B]">
                Choose a photo from your device
              </p>
              <p className="text-[11px] text-[#71717A] mt-1">
                Portraits, selfies, and photos supported.
              </p>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Zoom & Alignment Controls */}
          {imageSrc && (
            <div className="w-full mt-4 space-y-3">
              {/* Slider and Step Buttons */}
              <div className="flex items-center gap-3 bg-[#F5F3FF]/50 p-3 rounded-2xl border border-[#E4E4E7]">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(1, Number((z - 0.1).toFixed(2))))}
                  className="p-1.5 rounded-lg bg-white border border-[#E4E4E7] text-[#71717A] hover:text-[#18181B] transition cursor-pointer"
                  title="Zoom Out"
                  aria-label="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <input
                  type="range"
                  min="1"
                  max="4"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-[#7C3AED] h-1.5 bg-[#E4E4E7] rounded-lg cursor-pointer"
                  aria-label="Zoom Level"
                />

                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(4, Number((z + 0.1).toFixed(2))))}
                  className="p-1.5 rounded-lg bg-white border border-[#E4E4E7] text-[#71717A] hover:text-[#18181B] transition cursor-pointer"
                  title="Zoom In"
                  aria-label="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <span className="text-xs font-mono font-bold text-[#7C3AED] w-12 text-right">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              {/* Preset Buttons */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleFitPhoto}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E4E4E7] hover:bg-[#F5F3FF] text-[11px] font-semibold text-[#18181B] transition flex items-center gap-1 cursor-pointer"
                    title="Fit entire photo inside crop area"
                  >
                    <Minimize2 className="w-3 h-3 text-[#7C3AED]" />
                    <span>Fit Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFillCircle}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E4E4E7] hover:bg-[#F5F3FF] text-[11px] font-semibold text-[#18181B] transition flex items-center gap-1 cursor-pointer"
                    title="Zoom to cover the circle"
                  >
                    <Maximize2 className="w-3 h-3 text-[#7C3AED]" />
                    <span>Fill Circle</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="p-1.5 rounded-xl bg-white border border-[#E4E4E7] hover:bg-[#F5F3FF] text-[#71717A] hover:text-[#18181B] transition cursor-pointer"
                    title="Reset position and zoom"
                    aria-label="Reset position"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E4E4E7] hover:bg-[#F5F3FF] text-[11px] font-semibold text-[#7C3AED] transition flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  <span>Choose Another</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="pt-4 border-t border-[#E4E4E7] flex items-center justify-between gap-3">
          {imageSrc ? (
            <button
              type="button"
              onClick={handleRemovePhoto}
              disabled={isSaving}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Photo</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-[#7C3AED] text-white text-xs font-black hover:bg-[#5B21B6] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Choose Photo</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#71717A] hover:text-[#18181B] hover:bg-[#F5F3FF] transition cursor-pointer"
            >
              Cancel
            </button>

            {imageSrc && (
              <button
                type="button"
                onClick={handleCropAndSave}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#5B21B6] text-white font-black text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Photo</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
