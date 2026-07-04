"use client";

import { useEffect, useRef, useState } from "react";

interface ARViewerProps {
  imageUrl: string;
  productName: string;
  onClose: () => void;
}

export function ARViewer({ imageUrl, productName, onClose }: ARViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rotX = useRef(20);
  const rotY = useRef(-15);
  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number }>({ active: false, lastX: 0, lastY: 0 });

  const [mode, setMode] = useState<"3d" | "ar">("3d");
  const [arReady, setArReady] = useState(false);
  const [arError, setArError] = useState("");
  const [arPos, setArPos] = useState({ x: 50, y: 40, scale: 0.5 });
  const [draggingAr, setDraggingAr] = useState(false);
  const arDragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });

  // ── 3D canvas renderer ──────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "3d") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    imgRef.current = img;

    let loaded = false;
    img.onload = () => { loaded = true; };
    img.onerror = () => { loaded = true; }; // proceed even if image fails

    const W = canvas.width = canvas.offsetWidth * devicePixelRatio;
    const H = canvas.height = canvas.offsetHeight * devicePixelRatio;
    const cx = W / 2, cy = H / 2;

    function project(x: number, y: number, z: number): [number, number, number] {
      const fov = 600 * devicePixelRatio;
      const zOff = 400 * devicePixelRatio;
      const scale = fov / (fov + z + zOff);
      return [cx + x * scale, cy + y * scale, scale];
    }

    function drawFace(
      pts: [number, number, number][],
      brightness: number,
      drawImg: boolean,
    ) {
      const proj = pts.map(([x, y, z]) => project(x, y, z));
      ctx.beginPath();
      ctx.moveTo(proj[0][0], proj[0][1]);
      proj.slice(1).forEach(([px, py]) => ctx.lineTo(px, py));
      ctx.closePath();

      if (drawImg && loaded && imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
        // use clip + drawImage for the front face texture
        ctx.save();
        ctx.clip();
        const [x0, y0] = [proj[0][0], proj[0][1]];
        const [x1, y1] = [proj[1][0], proj[1][1]];
        const [x3, y3] = [proj[3][0], proj[3][1]];
        const w = Math.hypot(x1 - x0, y1 - y0);
        const h = Math.hypot(x3 - x0, y3 - y0);
        const angle = Math.atan2(y1 - y0, x1 - x0);
        ctx.translate(x0, y0);
        ctx.rotate(angle);
        ctx.drawImage(imgRef.current, 0, 0, w, h);
        ctx.restore();
      } else {
        const r = Math.round(brightness * 42);
        const g = Math.round(brightness * 138);
        const b = Math.round(brightness * 80);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fill();
      }

      ctx.strokeStyle = `rgba(255,255,255,${0.15 * brightness})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    function render() {
      ctx.clearRect(0, 0, W, H);

      // Soft ambient gradient background
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7);
      grad.addColorStop(0, "#1a3a2a");
      grad.addColorStop(1, "#0a1a10");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      const rx = (rotX.current * Math.PI) / 180;
      const ry = (rotY.current * Math.PI) / 180;
      const s = 220 * devicePixelRatio;
      const hw = s * 0.75; // half-width
      const hh = s * 0.56; // half-height (aspect ~4:3)
      const hd = s * 0.04; // depth (thin card)

      // 8 vertices of the box
      const verts: [number, number, number][] = [
        [-hw, -hh, -hd], [hw, -hh, -hd], [hw, hh, -hd], [-hw, hh, -hd],
        [-hw, -hh,  hd], [hw, -hh,  hd], [hw, hh,  hd], [-hw, hh,  hd],
      ];

      function rotVert([x, y, z]: [number, number, number]): [number, number, number] {
        // rotate Y
        const x1 = x * Math.cos(ry) + z * Math.sin(ry);
        const z1 = -x * Math.sin(ry) + z * Math.cos(ry);
        // rotate X
        const y2 = y * Math.cos(rx) - z1 * Math.sin(rx);
        const z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
        return [x1, y2, z2];
      }

      const rv = verts.map(rotVert);

      // 6 faces: [indices, brightness, isFont]
      const faces: [number[], number, boolean][] = [
        [[0,1,2,3], 0.7, false], // back
        [[4,5,6,7], 1.0, true],  // front
        [[0,4,7,3], 0.5, false], // left
        [[1,5,6,2], 0.55, false], // right
        [[0,1,5,4], 0.4, false], // top
        [[3,2,6,7], 0.35, false], // bottom
      ];

      // Sort by avg Z for painter's algorithm
      const sorted = faces
        .map(([idxs, bri, isF]) => {
          const avgZ = idxs.reduce((sum, i) => sum + rv[i][2], 0) / idxs.length;
          return { idxs, bri, isF, avgZ };
        })
        .sort((a, b) => a.avgZ - b.avgZ);

      sorted.forEach(({ idxs, bri, isF }) => {
        drawFace(idxs.map(i => rv[i]) as [number,number,number][], bri, isF);
      });

      // Subtle shadow under box
      const [bx, by] = project(0, hh + 12 * devicePixelRatio, 0);
      const shadowGrad = ctx.createRadialGradient(bx, by, 0, bx, by, hw * 1.2);
      shadowGrad.addColorStop(0, "rgba(0,0,0,0.35)");
      shadowGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = shadowGrad;
      ctx.fillRect(bx - hw * 1.2, by - 20 * devicePixelRatio, hw * 2.4, 40 * devicePixelRatio);

      rotY.current += 0.35;
      animRef.current = requestAnimationFrame(render);
    }

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [mode, imageUrl]);

  // ── Mouse drag for 3D ───────────────────────────────────────────────
  function onMouseDown(e: React.MouseEvent) {
    if (mode !== "3d") return;
    cancelAnimationFrame(animRef.current);
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragRef.current.active) return;
    rotY.current += (e.clientX - dragRef.current.lastX) * 0.6;
    rotX.current += (e.clientY - dragRef.current.lastY) * 0.4;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    // re-trigger render loop when dragging
    if (!animRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx || !canvas) return;
    }
  }
  function onMouseUp() {
    dragRef.current.active = false;
  }

  // ── AR camera mode ──────────────────────────────────────────────────
  async function startAR() {
    setArError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setMode("ar");
      setArReady(true);
    } catch {
      setArError("Camera access denied. Allow camera permissions and try again.");
    }
  }

  function stopAR() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setArReady(false);
    setMode("3d");
  }

  // AR product drag
  function onArDragStart(e: React.MouseEvent | React.TouchEvent) {
    setDraggingAr(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    arDragRef.current = { startX: clientX, startY: clientY, startPosX: arPos.x, startPosY: arPos.y };
  }
  function onArDragMove(e: MouseEvent | TouchEvent) {
    if (!draggingAr) return;
    const clientX = "touches" in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = "touches" in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
    const dx = ((clientX - arDragRef.current.startX) / window.innerWidth) * 100;
    const dy = ((clientY - arDragRef.current.startY) / window.innerHeight) * 100;
    setArPos((p) => ({
      ...p,
      x: Math.max(5, Math.min(95, arDragRef.current.startPosX + dx)),
      y: Math.max(5, Math.min(95, arDragRef.current.startPosY + dy)),
    }));
  }
  useEffect(() => {
    if (draggingAr) {
      window.addEventListener("mousemove", onArDragMove);
      window.addEventListener("mouseup", () => setDraggingAr(false));
      window.addEventListener("touchmove", onArDragMove);
      window.addEventListener("touchend", () => setDraggingAr(false));
    }
    return () => {
      window.removeEventListener("mousemove", onArDragMove);
      window.removeEventListener("mouseup", () => setDraggingAr(false));
      window.removeEventListener("touchmove", onArDragMove);
      window.removeEventListener("touchend", () => setDraggingAr(false));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingAr]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95" style={{ touchAction: "none" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div>
          <p className="text-white font-semibold text-sm">{productName}</p>
          <p className="text-emerald-400 text-xs">{mode === "ar" ? "📍 Place in your room" : "🌀 3D View — drag to rotate"}</p>
        </div>
        <div className="flex items-center gap-2">
          {mode === "3d" ? (
            <button
              onClick={startAR}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-full transition-colors"
            >
              📷 View in Room (AR)
            </button>
          ) : (
            <button
              onClick={stopAR}
              className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full transition-colors"
            >
              ↩ Back to 3D
            </button>
          )}
          <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none px-2">✕</button>
        </div>
      </div>

      {/* Viewport */}
      <div className="flex-1 relative overflow-hidden">
        {/* 3D Canvas mode */}
        {mode === "3d" && (
          <>
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-grab active:cursor-grabbing"
              style={{ display: "block" }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 text-xs text-center pointer-events-none">
              Drag to rotate · Click "View in Room" for AR
            </div>
          </>
        )}

        {/* AR camera mode */}
        {mode === "ar" && (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
            {arReady && (
              <>
                {/* Draggable product overlay */}
                <div
                  className="absolute"
                  style={{
                    left: `${arPos.x}%`,
                    top: `${arPos.y}%`,
                    transform: `translate(-50%, -50%) scale(${arPos.scale})`,
                    cursor: draggingAr ? "grabbing" : "grab",
                    userSelect: "none",
                    filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.6))",
                  }}
                  onMouseDown={onArDragStart}
                  onTouchStart={onArDragStart}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={productName}
                    draggable={false}
                    style={{ width: 260, height: 195, objectFit: "cover", borderRadius: 12, border: "2px solid rgba(255,255,255,0.3)" }}
                  />
                  <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap backdrop-blur-sm">
                    {productName}
                  </div>
                </div>
                {/* Scale controls */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-md rounded-full px-4 py-2">
                  <button onClick={() => setArPos(p => ({ ...p, scale: Math.max(0.2, p.scale - 0.1) }))} className="text-white text-lg w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full">−</button>
                  <span className="text-white/60 text-xs">Size</span>
                  <button onClick={() => setArPos(p => ({ ...p, scale: Math.min(1.5, p.scale + 0.1) }))} className="text-white text-lg w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full">+</button>
                </div>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/50 text-xs bg-black/40 rounded-full px-3 py-1 backdrop-blur-sm">
                  Drag the product to place it anywhere
                </div>
              </>
            )}
          </>
        )}

        {arError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-red-900/80 text-red-200 text-sm px-5 py-3 rounded-xl max-w-xs text-center backdrop-blur-md">
              {arError}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
