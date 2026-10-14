'use client';
import { useParams } from 'next/navigation';
import React, { useState, useEffect, useCallback } from 'react';
import { X, Ruler, Info } from 'lucide-react';
import { shopify } from '@/lib/shopify';
import * as DialogPrimitive from "@radix-ui/react-dialog";

// --- Shopify Constants ---
const SIZE_CHART_METAFIELD_NAMESPACE = "custom";
const SIZE_CHART_METAFIELD_KEY = "size_chart";
const DEFAULT_BODY_SIZE_CHART_TYPE = "default_body_size_chart";
const DEFAULT_BODY_SIZE_CHART_HANDLE = "standard-measurements";
const PRODUCT_SIZE_CHART_TYPE = "product_size_chart";

// --- GraphQL Query ---
const GET_SIZE_CHARTS = `
  query GetSizeCharts($productHandle: String!) {
    defaultChart: metaobject(handle: { type: "${DEFAULT_BODY_SIZE_CHART_TYPE}", handle: "${DEFAULT_BODY_SIZE_CHART_HANDLE}" }) {
      id
      handle
      type
      title: field(key: "title") { value }
      subtitle: field(key: "subtitle") { value }
      tableData: field(key: "table_data") { value }
      unitLabel: field(key: "unit_label") { value }
    }
    product(handle: $productHandle) {
      sizeChartMetafield: metafield(namespace: "${SIZE_CHART_METAFIELD_NAMESPACE}", key: "${SIZE_CHART_METAFIELD_KEY}") {
        reference {
          ... on Metaobject {
            id
            handle
            type
            title: field(key: "title") { value }
            tableData: field(key: "table_data") { value }
            note: field(key: "note") { value }
          }
        }
      }
    }
  }
`;

// --- Helpers ---
const safeJsonParse = (jsonString, fallback = null) => {
  if (!jsonString) return fallback;
  try { return JSON.parse(jsonString); }
  catch (e) { console.error("SizeChart: JSON parse error", e); return fallback; }
};

const normalizeChartData = (metaobject) => {
  if (!metaobject) return null;
  const tableData = safeJsonParse(metaobject.tableData?.value || metaobject.tableData);
  if (!tableData) return null;

  let parsedRows = tableData.rows || [];
  const sizeColKey = (tableData.columns || []).find(c => c.toLowerCase() === 'size');
  if (sizeColKey) {
    const excludedSizes = ['4XL', '5XL', '6XL', '7XL', '8XL', 'XXXXL', 'XXXXXL'];
    parsedRows = parsedRows.filter(row => {
      const sizeVal = String(row[sizeColKey] || '').toUpperCase().trim();
      return !excludedSizes.some(ex => sizeVal.includes(ex));
    });
  }

  let noteText = metaobject.note?.value || metaobject.note || "";
  const extraChargesNote = "Sizes beyond 3XL and customizations beyond our standard size chart will incur additional charges due to additional fabric and printing requirements.";
  if (noteText) {
    if (!noteText.includes("customizations beyond our standard size chart")) {
      noteText = noteText + " " + extraChargesNote;
    }
  } else {
    noteText = extraChargesNote;
  }

  return {
    id: metaobject.id,
    type: tableData.type || 'body',
    title: metaobject.title?.value || metaobject.title || "Size Guide",
    subtitle: metaobject.subtitle?.value || metaobject.subtitle || "",
    note: noteText,
    unitLabel: metaobject.unitLabel?.value || metaobject.unitLabel || "",
    columns: tableData.columns || [],
    rows: parsedRows,
  };
};

const getBodyColumnGroups = (columns) => {
  if (!columns) return { sizeCol: null, inchColumns: [], cmColumns: [] };
  return {
    sizeCol: columns.find(c => c.toLowerCase() === 'size'),
    inchColumns: columns.filter(c => c.endsWith('_in')),
    cmColumns: columns.filter(c => c.endsWith('_cm')),
  };
};

const formatColumnLabel = (key) => {
  if (!key) return "";
  return key
    .replace(/(_in|_cm)$/, "")
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

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

// --- SizeChartTable ---
const SizeChartTable = ({ chart }) => {
  const isBody = chart.type === 'body';
  const { sizeCol, inchColumns, cmColumns } = isBody ? getBodyColumnGroups(chart.columns) : {};

  return (
    <Table>
      <TableHeader>
        {isBody ? (
          <>
            <TableRow className="border-b-0">
              {sizeCol && (
                <TableHead
                  rowSpan={2}
                  className="text-[#642c44] font-black border-r border-[#ede5ea] w-16 text-center"
                >
                  Size
                </TableHead>
              )}
              {inchColumns.length > 0 && (
                <TableHead
                  colSpan={inchColumns.length}
                  className="text-center border-r border-[#ede5ea] text-[#9e7a8a]"
                >
                  Inches
                </TableHead>
              )}
              {cmColumns.length > 0 && (
                <TableHead colSpan={cmColumns.length} className="text-center text-[#9e7a8a]">
                  Centimeters
                </TableHead>
              )}
            </TableRow>
            <TableRow>
              {inchColumns.map((col, idx) => (
                <TableHead
                  key={col}
                  className={`text-center ${idx === inchColumns.length - 1 ? 'border-r border-[#ede5ea]' : ''}`}
                >
                  {formatColumnLabel(col)}
                </TableHead>
              ))}
              {cmColumns.map((col) => (
                <TableHead key={col} className="text-center">
                  {formatColumnLabel(col)}
                </TableHead>
              ))}
            </TableRow>
          </>
        ) : (
          <TableRow>
            {chart.columns.map((col, idx) => (
              <TableHead
                key={col}
                className={`${
                  idx === 0
                    ? 'text-[#642c44] font-black border-r border-[#ede5ea]'
                    : 'text-center border-r last:border-r-0 border-[#ede5ea]'
                }`}
              >
                {col === 'measurement' ? 'Measurement' : col}
              </TableHead>
            ))}
          </TableRow>
        )}
      </TableHeader>

      <TableBody>
        {chart.rows.map((row, rowIdx) => (
          <TableRow key={rowIdx}>
            {isBody ? (
              <>
                {sizeCol && (
                  <TableCell className="font-bold text-[#642c44] bg-[#fdf8fa] border-r border-[#ede5ea] text-center tracking-[0.1em]">
                    {row[sizeCol]}
                  </TableCell>
                )}
                {inchColumns.map((col, idx) => (
                  <TableCell
                    key={col}
                    className={`text-center ${idx === inchColumns.length - 1 ? 'border-r border-[#ede5ea]' : ''}`}
                  >
                    {row[col] || "—"}
                  </TableCell>
                ))}
                {cmColumns.map((col) => (
                  <TableCell key={col} className="text-center">
                    {row[col] || "—"}
                  </TableCell>
                ))}
              </>
            ) : (
              chart.columns.map((col, colIdx) => (
                <TableCell
                  key={colIdx}
                  className={`${
                    colIdx === 0
                      ? 'font-bold text-[#642c44] bg-[#fdf8fa] border-r border-[#ede5ea]'
                      : 'text-center border-r last:border-r-0 border-[#ede5ea]'
                  }`}
                >
                  {row[col] || "—"}
                </TableCell>
              ))
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

// --- Section ---
const SizeChartSection = ({ chart }) => {
  if (!chart || !chart.rows.length) return null;
  const isGarment = chart.type === 'garment';

  return (
    <div className="space-y-4">
      {/* Section label */}
      <div className="flex items-center gap-2.5 px-0.5">
        <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: '#fdf0f4' }}>
          {isGarment
            ? <Ruler size={12} className="text-[#642c44]" />
            : <Info size={12} className="text-[#642c44]" />
          }
        </div>
        <span className="montserrat-600 text-[9px] uppercase tracking-[0.22em] text-[#9e7a8a]">
          {chart.title}
        </span>
        <div className="flex-1 h-px bg-[#ede5ea]" />
      </div>

      <SizeChartTable chart={chart} />

      {chart.note && (
        <p className="px-0.5 text-[10px] text-[#b08898] montserrat-500 leading-relaxed tracking-[0.03em]">
          * {chart.note}
        </p>
      )}
    </div>
  );
};

// --- Main Component ---
const SizeChartSlider = ({ isOpen, onClose, productHandle }) => {
  const { handle: routeHandle } = useParams();
  const handle = productHandle || routeHandle;
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const [heroData, setHeroData] = useState({
    title: "Find Your Perfect Fit",
    subtitle: "Measure yourself carefully to ensure the best fit.",
  });

  const fetchData = useCallback(async () => {
    if (!handle) return;
    setLoading(true);
    try {
      const data = await shopify(GET_SIZE_CHARTS, { productHandle: handle });
      const newSections = [];

      const productChart = normalizeChartData(data?.product?.sizeChartMetafield?.reference);
      if (productChart) {
        newSections.push(productChart);
      } else {
        const defaultChart = normalizeChartData(data?.defaultChart);
        if (defaultChart) {
          newSections.push(defaultChart);
          if (defaultChart.title || defaultChart.subtitle) {
            setHeroData(prev => ({
              title: "Find Your Perfect Fit",
              subtitle: defaultChart.subtitle || prev.subtitle,
            }));
          }
        }
      }

      setSections(newSections);
    } catch (error) {
      console.error("SizeChart: fetch error", error);
    } finally {
      setLoading(false);
    }
  }, [handle]);

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen, fetchData]);

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
                  All measurements in inches &amp; cms
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

          {/* ── Content ── */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {loading && sections.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="w-7 h-7 border-[3px] border-[#642c44] border-t-transparent rounded-full animate-spin" />
                <p className="montserrat-500 text-[11px] tracking-[0.12em] uppercase text-[#b08898] animate-pulse">
                  Loading chart…
                </p>
              </div>
            ) : (
              <>
                {/* Hero */}
                <div className="px-6 pt-8 pb-6 border-b border-[#f5edf1] text-center">
                  <h3 className="cormorant-garamond-700 text-[#642c44] text-[32px] sm:text-[38px] leading-tight tracking-[0.04em] uppercase mb-3">
                    {heroData.title}
                  </h3>
                  <p className="montserrat-500 text-[11px] tracking-[0.06em] text-[#9e7a8a] max-w-sm mx-auto leading-relaxed">
                    {heroData.subtitle}
                  </p>
                </div>

                {/* How to measure tip */}
                <div className="mx-6 mt-6 rounded-lg px-4 py-3 flex items-start gap-3" style={{ background: '#fdf8fa', border: '1px solid #f0e4ea' }}>
                  <Info size={14} className="text-[#642c44] flex-shrink-0 mt-0.5" />
                  <p className="montserrat-500 text-[10px] tracking-[0.04em] text-[#9e7a8a] leading-relaxed">
                    Measure your body — not over clothing. Use a soft tape measure and keep it parallel to the floor for chest and waist.
                  </p>
                </div>

                {/* Chart sections */}
                <div className="px-6 pt-6 pb-10 space-y-8">
                  {sections.map((section) => (
                    <SizeChartSection key={section.id} chart={section} />
                  ))}

                  {!loading && sections.length === 0 && (
                    <div className="text-center py-12">
                      <p className="montserrat-500 text-[11px] tracking-[0.08em] uppercase text-[#b08898]">
                        Size chart unavailable for this product.
                      </p>
                    </div>
                  )}
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