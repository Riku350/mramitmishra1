import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, RotateCw, ZoomIn, ZoomOut, Check, X, RefreshCw } from 'lucide-react';

type CropPresetId = 'passport' | 'id_card' | 'standard' | 'custom';

const CROP_PRESETS: { id: CropPresetId; label: string; ratio: number }[] = [
  { id: 'passport', label: 'Passport Size', ratio: 35 / 45 },
  { id: 'id_card', label: 'ID Card Size', ratio: 3 / 4 },
  { id: 'standard', label: 'Standard', ratio: 1 },
  { id: 'custom', label: 'Custom', ratio: 4 / 5 },
];

export function PhotoCropModal({
  originalImageUrl,
  onCancel,
  onConfirm,
}: {
  originalImageUrl: string;
  onCancel: () => void;
  onConfirm: (croppedDataUrl: string) => void;
}) {
  const [preset, setPreset] = useState<CropPresetId>('passport');
  const [customWidthRatio, setCustomWidthRatio] = useState<number>(4);
  const [customHeightRatio, setCustomHeightRatio] = useState<number>(5);
  const [zoom, setZoom] = useState<number>(1.15);
  const [rotation, setRotation] = useState<number>(0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const imgRef = useRef<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; origX: number; origY: number }>({
    x: 0,
    y: 0,
    origX: 0,
    origY: 0,
  });

  const aspectRatio =
    preset === 'custom'
      ? Math.max(0.4, Math.min(2.0, customWidthRatio / customHeightRatio))
      : CROP_PRESETS.find((p) => p.id === preset)?.ratio || 35 / 45;

  // Frame dimensions inside 320x320 stage
  const stageSize = 300;
  const cropW = aspectRatio >= 1 ? 236 : Math.round(236 * aspectRatio);
  const cropH = aspectRatio >= 1 ? Math.round(236 / aspectRatio) : 236;

  // Load untouched original image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
    };
    img.src = originalImageUrl;
  }, [originalImageUrl]);

  // Draw live cropped preview onto canvas whenever transform changes
  useEffect(() => {
    if (!imageLoaded || !imgRef.current) return;
    const img = imgRef.current;
    const outW = Math.round(420 * (aspectRatio >= 1 ? 1 : aspectRatio));
    const outH = Math.round(420 * (aspectRatio >= 1 ? 1 / aspectRatio : 1));

    const canvas = previewCanvasRef.current || document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, outW, outH);

    // Base scale so image covers the crop frame at zoom = 1
    const baseScale = Math.max(cropW / img.naturalWidth, cropH / img.naturalHeight);
    const scaleToOutput = outW / cropW;
    const finalScale = baseScale * zoom * scaleToOutput;

    ctx.save();
    ctx.translate(outW / 2 + offset.x * scaleToOutput, outH / 2 + offset.y * scaleToOutput);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(finalScale, finalScale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    setPreviewUrl(canvas.toDataURL('image/jpeg', 0.88));
  }, [imageLoaded, zoom, rotation, offset, aspectRatio, cropW, cropH]);

  const handleReset = () => {
    setZoom(1.15);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      origX: offset.x,
      origY: offset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset({
      x: Math.max(-240, Math.min(240, dragStartRef.current.origX + dx)),
      y: Math.max(-240, Math.min(240, dragStartRef.current.origY + dy)),
    });
  };

  const handlePointerUp = () => {
    setDragging(false);
  };

  const img = imgRef.current;
  const baseScale = img ? Math.max(cropW / img.naturalWidth, cropH / img.naturalHeight) : 1;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Crop Your Photo</h3>
            <p className="text-xs text-slate-500">
              Drag to reposition, zoom or rotate. Your original photo stays untouched.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close crop editor"
            className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {/* Preset Selector */}
          <div className="flex flex-wrap gap-2">
            {CROP_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                  preset === p.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
              <div>
                <label className="text-xs font-medium text-slate-600 flex justify-between">
                  <span>Custom Width</span>
                  <span className="tabular-nums">{customWidthRatio}</span>
                </label>
                <input
                  type="range"
                  min={2}
                  max={8}
                  step={0.5}
                  value={customWidthRatio}
                  onChange={(e) => setCustomWidthRatio(Number(e.target.value))}
                  className="w-full mt-1 accent-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 flex justify-between">
                  <span>Custom Height</span>
                  <span className="tabular-nums">{customHeightRatio}</span>
                </label>
                <input
                  type="range"
                  min={2}
                  max={8}
                  step={0.5}
                  value={customHeightRatio}
                  onChange={(e) => setCustomHeightRatio(Number(e.target.value))}
                  className="w-full mt-1 accent-blue-600"
                />
              </div>
            </div>
          )}

          {/* Stage + Live Preview */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* Interactive Drag Stage */}
            <div className="md:col-span-8 flex flex-col items-center">
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ width: stageSize, height: stageSize }}
                className="relative overflow-hidden rounded-2xl bg-slate-100 border border-slate-200 select-none touch-none cursor-grab active:cursor-grabbing flex items-center justify-center"
              >
                {imageLoaded && img && (
                  <img
                    src={originalImageUrl}
                    alt="Crop source"
                    draggable={false}
                    style={{
                      width: img.naturalWidth,
                      height: img.naturalHeight,
                      maxWidth: 'none',
                      transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${baseScale * zoom})`,
                      transformOrigin: 'center center',
                    }}
                    className="pointer-events-none select-none"
                  />
                )}

                {/* Visual Crop Mask */}
                <div
                  style={{
                    width: cropW,
                    height: cropH,
                    boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.48)',
                  }}
                  className="pointer-events-none relative border-2 border-white rounded-lg"
                >
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-35">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-white" />
                    <div className="border-r border-white" />
                    <div />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Drag photo inside frame to adjust</p>
            </div>

            {/* Live Cropped Output Preview */}
            <div className="md:col-span-4 flex flex-col items-center gap-3">
              <p className="text-xs font-semibold text-slate-600">Live Preview</p>
              <div className="p-2 rounded-2xl border border-slate-200 bg-slate-50/70">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Cropped preview"
                    className="w-32 max-h-40 object-contain rounded-xl bg-white"
                  />
                ) : (
                  <div className="w-32 h-40 rounded-xl bg-slate-100" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 text-center">
                This exact photo will appear on your Registration PDF.
              </p>
              <canvas ref={previewCanvasRef} className="hidden" />
            </div>
          </div>

          {/* Controls: Zoom, Rotate, Reset */}
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.8, Number((z - 0.15).toFixed(2))))}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min={0.8}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-blue-600"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, Number((z + 0.15).toFixed(2))))}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-slate-600 tabular-nums w-12 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Rotate Left</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate Right</span>
                </button>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!previewUrl}
            onClick={() => previewUrl && onConfirm(previewUrl)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>Confirm Crop</span>
          </button>
        </div>
      </div>
    </div>
  );
}
