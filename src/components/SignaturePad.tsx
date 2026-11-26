import React, { useEffect, useRef, useState } from 'react';
import { Eraser, RotateCcw, CheckCircle2, PenTool } from 'lucide-react';

export function SignaturePad({
  confirmedSignatureUrl,
  onConfirm,
  onClearConfirmed,
}: {
  confirmedSignatureUrl: string | null;
  onConfirm: (signatureDataUrl: string) => void;
  onClearConfirmed: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  useEffect(() => {
    if (!confirmedSignatureUrl) {
      initCanvas();
    }
  }, [confirmedSignatureUrl]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pt = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    setDrawing(true);
    setHasStrokes(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pt = getPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    setDrawing(false);
  };

  const handleClear = () => {
    initCanvas();
    setHasStrokes(false);
    onClearConfirmed();
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokes) return;
    onConfirm(canvas.toDataURL('image/png'));
  };

  if (confirmedSignatureUrl) {
    return (
      <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Signature Confirmed</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setHasStrokes(false);
              onClearConfirmed();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Signature</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-center">
          <img
            src={confirmedSignatureUrl}
            alt="Confirmed student signature"
            className="max-h-28 object-contain"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative bg-white border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden">
        <canvas
          ref={canvasRef}
          width={640}
          height={210}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-44 sm:h-48 touch-none cursor-crosshair block bg-white"
        />
        {!hasStrokes && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-1.5">
            <PenTool className="w-5 h-5" />
            <span className="text-xs font-medium">Draw your signature here using mouse or finger</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Eraser className="w-4 h-4" />
            <span>Clear</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>

        <button
          type="button"
          disabled={!hasStrokes}
          onClick={handleConfirm}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 disabled:opacity-45 transition-colors"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Confirm Signature</span>
        </button>
      </div>
    </div>
  );
}
