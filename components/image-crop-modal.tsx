"use client";

import { useState, useCallback } from "react";
import Cropper, { type Area } from "react-easy-crop";

interface Props {
  src: string;
  onDone: (blob: Blob) => void;
  onCancel: () => void;
}

async function cropToBlob(imageSrc: string, px: Area): Promise<Blob> {
  const img = new Image();
  img.src = imageSrc;
  await new Promise<void>(res => { img.onload = () => res(); });
  const canvas = document.createElement("canvas");
  canvas.width  = px.width;
  canvas.height = px.height;
  canvas.getContext("2d")!.drawImage(img, px.x, px.y, px.width, px.height, 0, 0, px.width, px.height);
  return new Promise(res => canvas.toBlob(b => res(b!), "image/jpeg", 0.92));
}

export default function ImageCropModal({ src, onDone, onCancel }: Props) {
  const [crop,   setCrop]   = useState({ x: 0, y: 0 });
  const [zoom,   setZoom]   = useState(1);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [busy,   setBusy]   = useState(false);

  const onCropComplete = useCallback((_: Area, cap: Area) => setPixels(cap), []);

  async function confirm() {
    if (!pixels) return;
    setBusy(true);
    const blob = await cropToBlob(src, pixels);
    setBusy(false);
    onDone(blob);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-t-3xl bg-white sm:rounded-2xl">

        <div className="px-5 pt-5 pb-2">
          <p className="text-center text-sm font-bold" style={{ color: "#0a2e30" }}>Crop Photo</p>
          <p className="text-center text-xs text-gray-400">Drag to reposition · Pinch or slide to zoom</p>
        </div>

        {/* Crop canvas */}
        <div className="relative mx-4 overflow-hidden rounded-2xl" style={{ height: 300, backgroundColor: "#111" }}>
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Zoom slider */}
        <div className="px-5 pt-3 pb-1">
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="w-full accent-[#00b096]"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 px-4 pb-6 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={busy}
            className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#00b096" }}
          >
            {busy ? "Processing…" : "Use Photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
