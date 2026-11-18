'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { X, Ruler, Info } from 'lucide-react';
import * as DialogPrimitive from "@radix-ui/react-dialog";

// Extract the first image URL from product description HTML — it's the garment size chart
function extractGarmentImageUrl(descriptionHtml) {
  if (!descriptionHtml || typeof window === 'undefined') return null;
  try {
    const doc = new DOMParser().parseFromString(descriptionHtml, 'text/html');
    const img = doc.querySelector('img');
    return img ? (img.src || img.getAttribute('src') || null) : null;
  } catch {
    return null;
  }
}

// --- Static body measurements (all values in inches) ---
const BODY_MEASUREMENTS_IN = [
  { size: 'XS',  bust: 32, waist: 26, hip: 35 },
  { size: 'S',   bust: 34, waist: 28, hip: 37 },
  { size: 'M',   bust: 36, waist: 30, hip: 39 },
  { size: 'L',   bust: 38, waist: 32, hip: 41 },
  { size: 'XL',  bust: 40, waist: 34, hip: 43 },
  { size: 'XXL', bust: 42, waist: 36, hip: 45 },
  { size: '3XL', bust: 44, waist: 38, hip: 47 },
];

const toCm = (inches) => Math.round(inches * 2.54 * 10) / 10;

// --- Table primitives ---
const Table = ({ children }) => (
  <div className="w-full overflow-x-auto no-scrollbar rounded-lg border border-[#ede5ea]">
    <table className="min-w-full w-max text-left border-collapse">{children}</table>
  </div>
);

const TableHeader = ({ children }) => (
  <thead className="bg-[#faf5f7] border-b border-[#ede5ea]">{children}</thead>
);

const TableBody = ({ children }) => (
  <tbody className="divide-y divide-[#f5edf1]">{children}</tbody>
);

const TableRow = ({ children, className = "" }) => (
  <tr className={`transition-colors hover:bg-[#fdf8fa] ${className}`}>{children}</tr>
);

const TableHead = ({ children, className = "", ...props }) => (
  <th
    className={`h-10 px-3 sm:px-5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#9e7a8a] align-middle whitespace-nowrap montserrat-600 ${className}`}
    {...props}
  >
    {children}
  </th>
);

const TableCell = ({ children, className = "" }) => (
  <td className={`px-3 sm:px-5 py-3 align-middle text-[#3d2030] whitespace-nowrap text-[11px] tracking-[0.04em] montserrat-500 ${className}`}>
    {children}
  </td>
);

// --- Main Component ---
const SizeChartSlider = ({ isOpen, onClose, descriptionHtml }) => {
  const [activeTab, setActiveTab] = useState('body');
  const [unit, setUnit] = useState('in');

  const garmentImageUrl = useMemo(
    () => extractGarmentImageUrl(descriptionHtml),
    [descriptionHtml]
  );

  // Reset state whenever the panel opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('body');
      setUnit('in');
    }
  }, [isOpen]);

  const convert = (val) => unit === 'cm' ? toCm(val) : val;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <style>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
          .size-chart-panel { animation: slideInRight 0.38s cubic-bezier(0.16, 1, 0.3, 1); }
        `}</style>

        <DialogPrimitive.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[110]" />

        <DialogPrimitive.Content
          className="fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl size-chart-panel z-[111] outline-none flex flex-col"
        >
          <DialogPrimitive.Title className="sr-only">Sizing Guide</DialogPrimitive.Title>

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#ede5ea] bg-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#fdf0f4' }}>
                <Ruler size={17} className="text-[#642c44]" />
              </div>
              <div>
                <p className="montserrat-700 text-[13px] tracking-[0.08em] uppercase text-[#2d1520]">
                  Sizing Guide
                </p>
                <p className="montserrat-500 text-[10px] tracking-[0.06em] text-[#b08898] mt-0.5">
                  Body measurements guide
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: '#f4f0f2', color: '#642c44' }}
              onMouseEnter={e => e.currentTarget.style.background = '#ede4e8'}
              onMouseLeave={e => e.currentTarget.style.background = '#f4f0f2'}
              aria-label="Close size chart"
            >
              <X size={15} strokeWidth={2.2} />
            </button>
          </div>

          {/* ── Tabs — only shown when product description contains an image (garment chart) ── */}
          {garmentImageUrl && (
            <div className="flex flex-shrink-0 border-b border-[#ede5ea]">
              {[
                { key: 'body',    label: 'Body Size Chart' },
                { key: 'garment', label: 'Garment Size Chart' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 py-3.5 text-[10px] montserrat-600 uppercase tracking-[0.16em] transition-colors relative ${
                    activeTab === key
                      ? 'text-[#642c44]'
                      : 'text-[#9e7a8a] hover:text-[#642c44]'
                  }`}
                >
                  {label}
                  {activeTab === key && (
                    <span className="absolute bottom-0 inset-x-0 h-[2px] bg-[#642c44] rounded-t-full" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ── Content ── */}
          <div className="flex-1 overflow-y-auto no-scrollbar">

            {activeTab === 'garment' && garmentImageUrl ? (
              /* ── Garment Size Chart ── */
              <>
                <div className="px-6 pt-8 pb-6 border-b border-[#f5edf1] text-center">
                  <h3 className="cormorant-garamond-700 text-[#642c44] text-[32px] sm:text-[38px] leading-tight tracking-[0.04em] uppercase mb-3">
                    Garment Measurement
                  </h3>
                  <p className="montserrat-500 text-[11px] tracking-[0.06em] text-[#9e7a8a] max-w-sm mx-auto leading-relaxed">
                    Actual size of the garment — compare with a piece you already own.
                  </p>
                </div>

                <div className="mx-6 mt-6 rounded-lg px-4 py-3 flex items-start gap-3" style={{ background: '#fdf8fa', border: '1px solid #f0e4ea' }}>
                  <Ruler size={14} className="text-[#642c44] flex-shrink-0 mt-0.5" />
                  <p className="montserrat-500 text-[10px] tracking-[0.04em] text-[#9e7a8a] leading-relaxed">
                    These are actual garment measurements. Lay the item flat and measure to compare.
                  </p>
                </div>

                <div className="px-6 pt-6 pb-10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={garmentImageUrl}
                    alt="Garment Size Chart"
                    className="w-full h-auto rounded-lg border border-[#ede5ea]"
                    loading="lazy"
                    decoding="async"
                  />
                  <p className="mt-4 px-0.5 text-[10px] text-[#b08898] montserrat-500 leading-relaxed tracking-[0.03em]">
                    * These are actual garment measurements, not body measurements. For the best fit, compare with a garment you already own.
                  </p>
                </div>
              </>
            ) : (
              /* ── Body Size Chart ── */
              <>
                <div className="px-6 pt-8 pb-6 border-b border-[#f5edf1] text-center">
                  <h3 className="cormorant-garamond-700 text-[#642c44] text-[32px] sm:text-[38px] leading-tight tracking-[0.04em] uppercase mb-3">
                    Find Your Perfect Fit
                  </h3>
                  <p className="montserrat-500 text-[11px] tracking-[0.06em] text-[#9e7a8a] max-w-sm mx-auto leading-relaxed">
                    Measure your body for the most accurate size selection.
                  </p>
                </div>

                <div className="mx-6 mt-6 rounded-lg px-4 py-3 flex items-start gap-3" style={{ background: '#fdf8fa', border: '1px solid #f0e4ea' }}>
                  <Info size={14} className="text-[#642c44] flex-shrink-0 mt-0.5" />
                  <p className="montserrat-500 text-[10px] tracking-[0.04em] text-[#9e7a8a] leading-relaxed">
                    Measure your body, not over clothing. Use a soft tape measure and keep it parallel to the floor for bust and hip.
                  </p>
                </div>

                <div className="px-6 pt-6 pb-10 space-y-4">

                  {/* Section label + IN / CM toggle on same row */}
                  <div className="flex items-center justify-between px-0.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: '#fdf0f4' }}>
                        <Info size={12} className="text-[#642c44]" />
                      </div>
                      <span className="montserrat-600 text-[9px] uppercase tracking-[0.22em] text-[#9e7a8a]">
                        Body Measurement
                      </span>
                    </div>

                    {/* IN / CM pill toggle */}
                    <div className="flex items-center rounded-full border border-[#ede5ea] overflow-hidden">
                      {(['in', 'cm']).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setUnit(u)}
                          className={`px-3.5 py-1.5 text-[9px] montserrat-600 uppercase tracking-[0.1em] transition-colors ${
                            unit === u
                              ? 'bg-[#642c44] text-white'
                              : 'text-[#9e7a8a] hover:text-[#642c44]'
                          }`}
                        >
                          {u === 'in' ? 'IN' : 'CM'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Body table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[#642c44] font-black border-r border-[#ede5ea] w-16 text-center">
                          SIZE
                        </TableHead>
                        {['BUST', 'WAIST', 'HIP'].map((col) => (
                          <TableHead key={col} className="text-center">
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {BODY_MEASUREMENTS_IN.map((row) => (
                        <TableRow key={row.size}>
                          <TableCell className="font-bold text-[#642c44] bg-[#fdf8fa] border-r border-[#ede5ea] text-center tracking-[0.1em]">
                            {row.size}
                          </TableCell>
                          <TableCell className="text-center">{convert(row.bust)}</TableCell>
                          <TableCell className="text-center">{convert(row.waist)}</TableCell>
                          <TableCell className="text-center">{convert(row.hip)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <p className="px-0.5 text-[10px] text-[#b08898] montserrat-500 leading-relaxed tracking-[0.03em]">
                    * All measurements are in {unit === 'in' ? 'inches' : 'centimeters'}. These are body measurements, not garment dimensions.
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default SizeChartSlider;
