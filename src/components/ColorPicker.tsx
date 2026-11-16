"use client";

import { useEffect, useRef, useState } from "react";

type Rgb = { r: number; g: number; b: number };
type Hsv = { h: number; s: number; v: number };

const PRESETS = [
  "#ff3b3b", "#ff8a3b", "#ffd23b", "#7ddf9a", "#3ea6ff",
  "#7a5cff", "#ff5cd0", "#f1f1f1", "#aaaaaa", "#0f0f0f",
];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function hexToRgb(hex: string): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { r: 62, g: 166, b: 255 };
  const int = parseInt(m[1], 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbToHex({ r, g, b }: Rgb): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, "0"))
      .join("")
  );
}

function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const c = v * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = v - c;
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export default function ColorPicker({
  value,
  onChange,
  onClear,
  label,
}: {
  value: string;
  onChange: (hex: string) => void;
  onClear?: () => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState(value || "#3ea6ff");
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef<"area" | "hue" | null>(null);

  const rgb = hexToRgb(value || "#3ea6ff");
  const hsv = rgbToHsv(rgb);

  useEffect(() => {
    const t = setTimeout(() => setHexDraft(value || "#3ea6ff"), 0);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  function emit(h: number, s: number, v: number) {
    onChange(rgbToHex(hsvToRgb({ h, s, v })));
  }

  function fromEvent(e: PointerEvent | React.PointerEvent, kind: "area" | "hue") {
    const el = kind === "area" ? areaRef.current : null;
    const rect = (kind === "area" ? el : wrapRef.current?.querySelector("[data-hue]"))?.getBoundingClientRect();
    if (!rect) return;
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    if (kind === "area") emit(hsv.h, x, 1 - y);
    else emit(x * 360, hsv.s, hsv.v);
  }

  useEffect(() => {
    function move(e: PointerEvent) {
      if (dragging.current) fromEvent(e, dragging.current);
    }
    function up() {
      dragging.current = null;
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hsv.h, hsv.s, hsv.v]);

  return (
    <div className="relative inline-block" ref={wrapRef}>
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="h-9 w-12 rounded-lg border border-[#272727] transition-transform hover:scale-105"
        style={{
          background:
            value
              ? value
              : "repeating-conic-gradient(#3d3d3d 0% 25%, #272727 0% 50%) 50% / 8px 8px",
        }}
      />
      {open && (
        <div className="anim-fade-in absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-[#303030] bg-[#212121] p-3 shadow-2xl">
          <div
            ref={areaRef}
            data-area
            className="relative h-32 w-full cursor-crosshair rounded-lg"
            style={{
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h}, 100%, 50%))`,
            }}
            onPointerDown={(e) => {
              dragging.current = "area";
              fromEvent(e, "area");
            }}
          >
            <span
              className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
            />
          </div>

          <div
            data-hue
            className="relative mt-3 h-3 w-full cursor-pointer rounded-full"
            style={{
              background:
                "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
            }}
            onPointerDown={(e) => {
              dragging.current = "hue";
              fromEvent(e, "hue");
            }}
          >
            <span
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{ left: `${(hsv.h / 360) * 100}%` }}
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span
              className="h-8 w-8 shrink-0 rounded-lg border border-[#303030]"
              style={{ background: value || "#3ea6ff" }}
            />
            <input
              value={hexDraft}
              onChange={(e) => {
                setHexDraft(e.target.value);
                if (/^#[0-9a-f]{6}$/i.test(e.target.value.trim())) onChange(e.target.value.trim());
              }}
              maxLength={7}
              className="input flex-1 !py-1 text-xs uppercase"
              aria-label="Hex color"
            />
          </div>

          <div className="mt-3 grid grid-cols-10 gap-1">
            {PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Preset ${c}`}
                onClick={() => onChange(c)}
                className="h-5 w-full rounded transition-transform hover:scale-110"
                style={{ background: c, border: "1px solid #303030" }}
              />
            ))}
          </div>

          {onClear && (
            <button
              type="button"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              className="mt-3 w-full rounded-lg bg-[#272727] py-1.5 text-xs text-[#aaaaaa] transition-colors hover:bg-[#3f3f3f]"
            >
              None
            </button>
          )}
        </div>
      )}
    </div>
  );
}
