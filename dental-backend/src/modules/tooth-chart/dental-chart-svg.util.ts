import sharp from 'sharp';

/**
 * Server-side renderer for the patient dental chart.
 *
 * This is a faithful port of the on-screen 2D chart
 * (dental-frontend/src/components/dental-chart) so the printed/PDF chart is
 * visually identical to what the clinician sees in the app. The geometry
 * (tooth paths, dimensions, layout constants) and condition colours are kept
 * byte-for-byte in sync with the frontend `tooth-data.ts` / `tooth-svg.tsx`.
 *
 * We build an SVG string and rasterise it with `sharp` (resvg under the hood)
 * so it can be embedded into the prescription PDF or a standalone chart PDF —
 * including from server-only flows (WhatsApp/email auto-send) where no browser
 * is available to capture the live SVG.
 */

type ToothType = 'incisor' | 'canine' | 'premolar' | 'molar';

interface ToothInfo {
  fdi: number;
  type: ToothType;
}

export interface ChartCondition {
  /** FDI tooth number (e.g. 11, 26, 48). */
  fdi: number;
  condition: string;
  /** Surface name (Mesial/Distal/Buccal/Lingual/Occlusal) when surface-specific. */
  surface?: string | null;
}

// ── FDI layout (mirrors tooth-data.ts) ──────────────────────────────────────
const upperRight: ToothInfo[] = [
  { fdi: 18, type: 'molar' }, { fdi: 17, type: 'molar' }, { fdi: 16, type: 'molar' },
  { fdi: 15, type: 'premolar' }, { fdi: 14, type: 'premolar' }, { fdi: 13, type: 'canine' },
  { fdi: 12, type: 'incisor' }, { fdi: 11, type: 'incisor' },
];
const upperLeft: ToothInfo[] = [
  { fdi: 21, type: 'incisor' }, { fdi: 22, type: 'incisor' }, { fdi: 23, type: 'canine' },
  { fdi: 24, type: 'premolar' }, { fdi: 25, type: 'premolar' }, { fdi: 26, type: 'molar' },
  { fdi: 27, type: 'molar' }, { fdi: 28, type: 'molar' },
];
const lowerRight: ToothInfo[] = [
  { fdi: 48, type: 'molar' }, { fdi: 47, type: 'molar' }, { fdi: 46, type: 'molar' },
  { fdi: 45, type: 'premolar' }, { fdi: 44, type: 'premolar' }, { fdi: 43, type: 'canine' },
  { fdi: 42, type: 'incisor' }, { fdi: 41, type: 'incisor' },
];
const lowerLeft: ToothInfo[] = [
  { fdi: 31, type: 'incisor' }, { fdi: 32, type: 'incisor' }, { fdi: 33, type: 'canine' },
  { fdi: 34, type: 'premolar' }, { fdi: 35, type: 'premolar' }, { fdi: 36, type: 'molar' },
  { fdi: 37, type: 'molar' }, { fdi: 38, type: 'molar' },
];

const upperTeeth: ToothInfo[] = [...upperRight, ...upperLeft];
const lowerTeeth: ToothInfo[] = [...lowerRight, ...lowerLeft];

function getToothWidth(type: ToothType): number {
  switch (type) {
    case 'molar': return 38;
    case 'premolar': return 30;
    case 'canine': return 28;
    case 'incisor': return 26;
  }
}

function getToothHeight(type: ToothType): number {
  switch (type) {
    case 'molar': return 44;
    case 'premolar': return 40;
    case 'canine': return 42;
    case 'incisor': return 36;
  }
}

// Condition colours (mirrors conditionColors in tooth-data.ts)
export const CONDITION_COLORS: Record<string, { fill: string; label: string }> = {
  Cavity: { fill: '#ef4444', label: 'Cavity' },
  Filled: { fill: '#3b82f6', label: 'Filled' },
  Crown: { fill: '#eab308', label: 'Crown' },
  Missing: { fill: '#9ca3af', label: 'Missing' },
  RCT: { fill: '#a855f7', label: 'RCT' },
  Implant: { fill: '#14b8a6', label: 'Implant' },
  Fracture: { fill: '#f97316', label: 'Fracture' },
  Decay: { fill: '#dc2626', label: 'Decay' },
  Veneer: { fill: '#06b6d4', label: 'Veneer' },
  Scaling: { fill: '#84cc16', label: 'Scaling' },
  Sealant: { fill: '#8b5cf6', label: 'Sealant' },
  Denture: { fill: '#f59e0b', label: 'Denture' },
  Orthodontics: { fill: '#ec4899', label: 'Orthodontics' },
};

const surfacePositions: Record<string, { x: number; y: number; w: number; h: number }> = {
  Mesial:   { x: 0,    y: 0.25, w: 0.25, h: 0.50 },
  Distal:   { x: 0.75, y: 0.25, w: 0.25, h: 0.50 },
  Buccal:   { x: 0.25, y: 0,    w: 0.50, h: 0.25 },
  Lingual:  { x: 0.25, y: 0.75, w: 0.50, h: 0.25 },
  Occlusal: { x: 0.25, y: 0.25, w: 0.50, h: 0.50 },
};

// Layout constants (mirror dental-chart.tsx)
const PADDING = 30;
const GAP = 3;
const JAW_GAP = 50;
const LABEL_SPACE = 30;

// Tooth shape path (mirrors getToothPath in tooth-svg.tsx)
function getToothPath(type: ToothType, w: number, h: number, isUpper: boolean): string {
  const r = 4;
  switch (type) {
    case 'molar':
      if (isUpper) {
        return `M${r},0 L${w - r},0 Q${w},0 ${w},${r} L${w},${h * 0.7} Q${w},${h} ${w * 0.75},${h} L${w * 0.6},${h - 2} L${w * 0.5},${h} L${w * 0.4},${h - 2} L${w * 0.25},${h} Q0,${h} 0,${h * 0.7} L0,${r} Q0,0 ${r},0 Z`;
      }
      return `M${w * 0.25},0 Q0,0 0,${h * 0.3} L0,${h - r} Q0,${h} ${r},${h} L${w - r},${h} Q${w},${h} ${w},${h - r} L${w},${h * 0.3} Q${w},0 ${w * 0.75},0 L${w * 0.6},2 L${w * 0.5},0 L${w * 0.4},2 L${w * 0.25},0 Z`;
    case 'premolar':
      if (isUpper) {
        return `M${r},0 L${w - r},0 Q${w},0 ${w},${r} L${w},${h * 0.75} Q${w},${h} ${w * 0.7},${h} L${w * 0.55},${h - 3} L${w * 0.45},${h - 3} L${w * 0.3},${h} Q0,${h} 0,${h * 0.75} L0,${r} Q0,0 ${r},0 Z`;
      }
      return `M${w * 0.3},0 Q0,0 0,${h * 0.25} L0,${h - r} Q0,${h} ${r},${h} L${w - r},${h} Q${w},${h} ${w},${h - r} L${w},${h * 0.25} Q${w},0 ${w * 0.7},0 L${w * 0.55},3 L${w * 0.45},3 L${w * 0.3},0 Z`;
    case 'canine':
      if (isUpper) {
        return `M${r},0 L${w - r},0 Q${w},0 ${w},${r} L${w},${h * 0.6} Q${w},${h * 0.85} ${w * 0.5},${h} Q0,${h * 0.85} 0,${h * 0.6} L0,${r} Q0,0 ${r},0 Z`;
      }
      return `M${w * 0.5},0 Q${w},${h * 0.15} ${w},${h * 0.4} L${w},${h - r} Q${w},${h} ${w - r},${h} L${r},${h} Q0,${h} 0,${h - r} L0,${h * 0.4} Q0,${h * 0.15} ${w * 0.5},0 Z`;
    case 'incisor':
    default:
      if (isUpper) {
        return `M${r},0 L${w - r},0 Q${w},0 ${w},${r} L${w},${h * 0.65} Q${w},${h} ${w * 0.5},${h} Q0,${h} 0,${h * 0.65} L0,${r} Q0,0 ${r},0 Z`;
      }
      return `M${w * 0.5},0 Q${w},0 ${w},${h * 0.35} L${w},${h - r} Q${w},${h} ${w - r},${h} L${r},${h} Q0,${h} 0,${h - r} L0,${h * 0.35} Q0,0 ${w * 0.5},0 Z`;
  }
}

function groupByFdi(conditions: ChartCondition[]): Record<number, ChartCondition[]> {
  const map: Record<number, ChartCondition[]> = {};
  for (const c of conditions) {
    if (!c.fdi) continue;
    (map[c.fdi] ||= []).push(c);
  }
  return map;
}

function renderTooth(
  tooth: ToothInfo,
  x: number,
  y: number,
  isUpper: boolean,
  conditions: ChartCondition[],
): string {
  const w = getToothWidth(tooth.type);
  const h = getToothHeight(tooth.type);
  const isMissing = conditions.some((c) => c.condition === 'Missing');
  const primary = conditions.find((c) => !c.surface);
  const primaryColor = primary ? CONDITION_COLORS[primary.condition]?.fill : undefined;
  const surfaceConditions = conditions.filter((c) => c.surface);
  const path = getToothPath(tooth.type, w, h, isUpper);

  const parts: string[] = [];
  parts.push(`<g transform="translate(${x}, ${y})">`);
  parts.push(
    `<path d="${path}" fill="${isMissing ? '#e5e7eb' : primaryColor || '#f8fafc'}" stroke="#94a3b8" stroke-width="1.2" />`,
  );

  if (isMissing) {
    parts.push(`<line x1="2" y1="2" x2="${w - 2}" y2="${h - 2}" stroke="#9ca3af" stroke-width="1.5" />`);
    parts.push(`<line x1="${w - 2}" y1="2" x2="2" y2="${h - 2}" stroke="#9ca3af" stroke-width="1.5" />`);
  } else {
    for (const sc of surfaceConditions) {
      const sp = surfacePositions[sc.surface || ''];
      if (!sp) continue;
      const color = CONDITION_COLORS[sc.condition]?.fill || '#94a3b8';
      parts.push(
        `<rect x="${sp.x * w}" y="${sp.y * h}" width="${sp.w * w}" height="${sp.h * h}" fill="${color}" opacity="0.6" rx="2" />`,
      );
    }
  }

  parts.push(
    `<text x="${w / 2}" y="${isUpper ? h + 14 : -6}" text-anchor="middle" font-size="10" fill="#64748b" font-family="Helvetica, Arial, sans-serif">${tooth.fdi}</text>`,
  );

  if (conditions.length > 0 && !isMissing) {
    const dotColor = primaryColor || CONDITION_COLORS[surfaceConditions[0]?.condition]?.fill || '#94a3b8';
    parts.push(`<circle cx="${w / 2}" cy="${isUpper ? h + 22 : -14}" r="3" fill="${dotColor}" />`);
  }

  parts.push('</g>');
  return parts.join('');
}

/** Build the dental-chart SVG markup for the given conditions. */
export function buildToothChartSvg(conditions: ChartCondition[]): string {
  const byFdi = groupByFdi(conditions);

  const upperRowWidth = upperTeeth.reduce((sum, t) => sum + getToothWidth(t.type) + GAP, -GAP);
  const lowerRowWidth = lowerTeeth.reduce((sum, t) => sum + getToothWidth(t.type) + GAP, -GAP);
  const totalWidth = Math.max(upperRowWidth, lowerRowWidth) + PADDING * 2;
  const totalHeight = 44 + 44 + JAW_GAP + LABEL_SPACE * 2 + PADDING * 2;

  const els: string[] = [];

  // Upper jaw label
  els.push(
    `<text x="${totalWidth / 2}" y="16" text-anchor="middle" font-size="11" font-weight="600" fill="#64748b" font-family="Helvetica, Arial, sans-serif">Upper Jaw (Maxilla)</text>`,
  );

  // Upper teeth
  {
    let xPos = (totalWidth - upperRowWidth) / 2;
    const yPos = PADDING + LABEL_SPACE;
    for (const tooth of upperTeeth) {
      els.push(renderTooth(tooth, xPos, yPos, true, byFdi[tooth.fdi] || []));
      xPos += getToothWidth(tooth.type) + GAP;
    }
  }

  // Upper midline
  els.push(
    `<line x1="${totalWidth / 2}" y1="${PADDING + LABEL_SPACE - 5}" x2="${totalWidth / 2}" y2="${PADDING + LABEL_SPACE + 44 + 5}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4 3" />`,
  );

  // Lower jaw label
  els.push(
    `<text x="${totalWidth / 2}" y="${PADDING + LABEL_SPACE + 44 + JAW_GAP - 8}" text-anchor="middle" font-size="11" font-weight="600" fill="#64748b" font-family="Helvetica, Arial, sans-serif">Lower Jaw (Mandible)</text>`,
  );

  // Lower teeth
  {
    let xPos = (totalWidth - lowerRowWidth) / 2;
    const yPos = PADDING + LABEL_SPACE + 44 + JAW_GAP + LABEL_SPACE;
    for (const tooth of lowerTeeth) {
      els.push(renderTooth(tooth, xPos, yPos, false, byFdi[tooth.fdi] || []));
      xPos += getToothWidth(tooth.type) + GAP;
    }
  }

  // Lower midline
  els.push(
    `<line x1="${totalWidth / 2}" y1="${PADDING + LABEL_SPACE + 44 + JAW_GAP + LABEL_SPACE - 5}" x2="${totalWidth / 2}" y2="${PADDING + LABEL_SPACE + 44 + JAW_GAP + LABEL_SPACE + 44 + 5}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4 3" />`,
  );

  // R/L labels
  els.push(
    `<text x="8" y="${PADDING + LABEL_SPACE + 22}" font-size="9" fill="#94a3b8" font-weight="500" font-family="Helvetica, Arial, sans-serif">R</text>`,
    `<text x="${totalWidth - 14}" y="${PADDING + LABEL_SPACE + 22}" font-size="9" fill="#94a3b8" font-weight="500" font-family="Helvetica, Arial, sans-serif">L</text>`,
    `<text x="8" y="${PADDING + LABEL_SPACE + 44 + JAW_GAP + LABEL_SPACE + 22}" font-size="9" fill="#94a3b8" font-weight="500" font-family="Helvetica, Arial, sans-serif">R</text>`,
    `<text x="${totalWidth - 14}" y="${PADDING + LABEL_SPACE + 44 + JAW_GAP + LABEL_SPACE + 22}" font-size="9" fill="#94a3b8" font-weight="500" font-family="Helvetica, Arial, sans-serif">L</text>`,
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}"><rect width="${totalWidth}" height="${totalHeight}" fill="#ffffff" />${els.join('')}</svg>`;
}

/**
 * Rasterise the dental chart to a PNG buffer. `scale` increases pixel density
 * for crisp print output (default 3x ≈ 216 DPI when placed at on-screen size).
 */
export async function renderToothChartPng(
  conditions: ChartCondition[],
  scale = 3,
): Promise<Buffer> {
  const svg = buildToothChartSvg(conditions);
  return sharp(Buffer.from(svg), { density: 72 * scale }).png().toBuffer();
}
