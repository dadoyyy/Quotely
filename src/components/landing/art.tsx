import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* Original illustrations, drawn in SVG so they stay crisp at any size and cost no image requests. */

const Defs = ({ id }: { id: string }) => (
  <defs>
    <linearGradient id={`${id}-lime`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#cdee80" /><stop offset="1" stopColor="#84b92a" /></linearGradient>
    <linearGradient id={`${id}-dark`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#264a36" /><stop offset="1" stopColor="#0b1a12" /></linearGradient>
    <linearGradient id={`${id}-pale`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e4f4c9" /><stop offset="1" stopColor="#f6fbee" /></linearGradient>
    <filter id={`${id}-sh`} x="-25%" y="-20%" width="150%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="12" floodColor="#0e1c15" floodOpacity="0.2" /></filter>
    <filter id={`${id}-sm`} x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#0e1c15" floodOpacity="0.18" /></filter>
  </defs>
);

const ORBIT = [
  { label: "Build", x: 82, y: 8, tone: "dark", d: "M4 6h16M4 12h16M4 18h10" },
  { label: "Send", x: 93, y: 33, tone: "lime", d: "M4 12 20 4l-4 16-4-6z" },
  { label: "Approve", x: 93, y: 61, tone: "dark", d: "m5 12.5 4.5 4.5L19 7.5" },
  { label: "Paid", x: 79, y: 85, tone: "lime", d: "M12 4v16M16 8H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H8" },
] as const;

/** The hero: a glossy quotation with an approval stamp, a peso coin, and the workflow orbiting it. */
export function HeroArt({ className }: { className?: string }) {
  return (
    <div className={cn("relative mx-auto aspect-[520/470] w-full max-w-[520px]", className)} aria-hidden>
      <svg viewBox="0 0 520 470" className="absolute inset-0 size-full" fill="none">
        <Defs id="h" />
        <path d="M62 250c-22-92 52-176 154-196 112-22 216 22 240 114 24 92-34 194-146 224-112 30-230 0-248-142z" fill="url(#h-pale)" />
        <ellipse cx="255" cy="238" rx="218" ry="188" stroke="#b6e266" strokeOpacity=".75" strokeWidth="2" transform="rotate(-18 255 238)" />
        <path d="M426 40C520 120 524 296 416 388" stroke="#9ad43f" strokeOpacity=".7" strokeWidth="2" strokeDasharray="3 8" strokeLinecap="round" />

        <g transform="rotate(-7 230 240)" filter="url(#h-sh)">
          <rect x="112" y="64" width="228" height="304" rx="26" fill="#fff" stroke="#dde8d4" />
          <path d="M112 90a26 26 0 0 1 26-26h176a26 26 0 0 1 26 26v44H112z" fill="url(#h-dark)" />
          <circle cx="146" cy="100" r="13" fill="url(#h-lime)" />
          <path d="m140 100 4 4 8-9" stroke="#0e1c15" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="168" y="89" width="84" height="8" rx="4" fill="#fff" fillOpacity=".92" />
          <rect x="168" y="104" width="52" height="6" rx="3" fill="#fff" fillOpacity=".45" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x="134" y={154 + i * 46} width="184" height="36" rx="11" fill="#f6faf2" />
              <circle cx="150" cy={172 + i * 46} r="5" fill="#a2d44a" />
              <rect x="162" y={168.5 + i * 46} width={[78, 92, 64][i]} height="7" rx="3.5" fill="#c3d2b7" />
              <rect x="270" y={168.5 + i * 46} width="36" height="7" rx="3.5" fill="#0e1c15" fillOpacity=".78" />
            </g>
          ))}
          <rect x="134" y="298" width="184" height="52" rx="15" fill="url(#h-lime)" />
          <rect x="150" y="314" width="52" height="7" rx="3.5" fill="#0e1c15" fillOpacity=".5" />
          <rect x="150" y="327" width="34" height="6" rx="3" fill="#0e1c15" fillOpacity=".3" />
          <rect x="244" y="313" width="60" height="16" rx="8" fill="#0e1c15" />
        </g>

        <g filter="url(#h-sm)">
          <circle cx="352" cy="108" r="46" fill="url(#h-lime)" />
          <circle cx="352" cy="108" r="36" stroke="#fff" strokeOpacity=".55" strokeWidth="2" />
          <path d="m334 108 13 13 24-28" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <ellipse cx="338" cy="86" rx="24" ry="10" fill="#fff" fillOpacity=".32" transform="rotate(-24 338 86)" />
        </g>
        <g filter="url(#h-sm)">
          <circle cx="112" cy="378" r="36" fill="url(#h-dark)" />
          <circle cx="112" cy="378" r="28" stroke="#a2d44a" strokeWidth="2.5" />
          <text x="112" y="390" textAnchor="middle" fontSize="34" fontWeight="700" fill="#a2d44a" fontFamily="system-ui, sans-serif">₱</text>
        </g>
        <circle cx="46" cy="170" r="6" fill="#a2d44a" /><circle cx="470" cy="418" r="5" fill="#cdee80" /><circle cx="236" cy="22" r="4" fill="#a2d44a" />
      </svg>

      {ORBIT.map((o) => (
        <div key={o.label} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1" style={{ left: `${o.x}%`, top: `${o.y}%` }}>
          <span className={cn("grid size-11 place-items-center rounded-full shadow-lift sm:size-12", o.tone === "dark" ? "bg-neutral-900 text-brand-400" : "bg-brand-400 text-neutral-900")}>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={o.d} /></svg>
          </span>
          <span className="text-[11px] font-semibold text-neutral-800 sm:text-xs">{o.label}</span>
        </div>
      ))}
    </div>
  );
}

function Frame({ id, children }: { id: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 160 112" className="h-24 w-auto" fill="none" aria-hidden>
      <Defs id={id} />
      {children}
    </svg>
  );
}

export function PriceListArt() {
  return (
    <Frame id="p">
      <rect x="26" y="12" width="104" height="86" rx="14" fill="#fff" stroke="#dde8d4" filter="url(#p-sm)" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx="44" cy={34 + i * 20} r="5" fill="#a2d44a" />
          <rect x="56" y={31 + i * 20} width={[46, 38, 52][i]} height="6" rx="3" fill="#c3d2b7" />
          <rect x="108" y={31 + i * 20} width="14" height="6" rx="3" fill="#0e1c15" fillOpacity=".75" />
        </g>
      ))}
      <circle cx="128" cy="84" r="20" fill="url(#p-lime)" filter="url(#p-sm)" />
      <text x="128" y="92" textAnchor="middle" fontSize="22" fontWeight="700" fill="#0e1c15" fontFamily="system-ui, sans-serif">₱</text>
    </Frame>
  );
}

export function AiArt() {
  return (
    <Frame id="a">
      <path d="M36 14h58a14 14 0 0 1 14 14v22a14 14 0 0 1-14 14H64l-14 12V64h-14A14 14 0 0 1 22 50V28a14 14 0 0 1 14-14z" fill="url(#a-dark)" filter="url(#a-sm)" />
      {[48, 64, 80].map((x) => <circle key={x} cx={x} cy="39" r="5" fill="#a2d44a" />)}
      <path d="M116 12l3.4 8.6L128 24l-8.6 3.4L116 36l-3.4-8.6L104 24l8.6-3.4z" fill="url(#a-lime)" />
      <rect x="78" y="66" width="62" height="32" rx="13" fill="url(#a-lime)" filter="url(#a-sm)" />
      <path d="m96 82 6 6 12-13" stroke="#0e1c15" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

export function ApproveArt() {
  return (
    <Frame id="b">
      <rect x="14" y="12" width="118" height="86" rx="12" fill="#fff" stroke="#dde8d4" filter="url(#b-sm)" />
      <path d="M14 24a12 12 0 0 1 12-12h94a12 12 0 0 1 12 12v8H14z" fill="url(#b-dark)" />
      {[26, 36, 46].map((x) => <circle key={x} cx={x} cy="22" r="2.6" fill="#a2d44a" />)}
      <rect x="28" y="42" width="64" height="7" rx="3.5" fill="#c3d2b7" />
      <rect x="28" y="55" width="44" height="6" rx="3" fill="#dde8d4" />
      <rect x="28" y="72" width="46" height="18" rx="9" fill="url(#b-lime)" />
      <path d="m42 81 4 4 8-9" stroke="#0e1c15" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M100 62v26l7-7 6 14 7-3-6-14h10z" fill="url(#b-lime)" stroke="#0e1c15" strokeWidth="2" strokeLinejoin="round" />
    </Frame>
  );
}

export function InvoiceArt() {
  return (
    <Frame id="i">
      <path d="M34 10h72v86l-9-7-9 7-9-7-9 7-9-7-9 7-9-7z" fill="#fff" stroke="#dde8d4" filter="url(#i-sm)" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="44" y={24 + i * 14} width={[38, 30, 42][i]} height="6" rx="3" fill="#c3d2b7" />
          <rect x="88" y={24 + i * 14} width="10" height="6" rx="3" fill="#0e1c15" fillOpacity=".75" />
        </g>
      ))}
      <rect x="44" y="68" width="54" height="8" rx="4" fill="url(#i-lime)" />
      <g transform="rotate(-14 122 34)" filter="url(#i-sm)">
        <circle cx="122" cy="34" r="22" fill="url(#i-dark)" />
        <circle cx="122" cy="34" r="17" stroke="#a2d44a" strokeWidth="1.6" strokeDasharray="3 3" />
        <text x="122" y="38" textAnchor="middle" fontSize="11" fontWeight="800" fill="#a2d44a" fontFamily="system-ui, sans-serif" letterSpacing="0.5">PAID</text>
      </g>
    </Frame>
  );
}

/** For the dark call-to-action band: a lime paper plane over glowing rings and a faint floor grid. */
export function BandArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 380 260" className={cn("h-auto w-full", className)} fill="none" aria-hidden>
      <defs>
        <radialGradient id="bg-glow" cx="50%" cy="46%" r="50%"><stop offset="0" stopColor="#a2d44a" stopOpacity=".5" /><stop offset="1" stopColor="#a2d44a" stopOpacity="0" /></radialGradient>
        <linearGradient id="bg-lime" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e2f6a6" /><stop offset="1" stopColor="#8cc22f" /></linearGradient>
        <linearGradient id="bg-fold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#b6e266" /><stop offset="1" stopColor="#5f8f1a" /></linearGradient>
      </defs>
      <ellipse cx="190" cy="118" rx="170" ry="120" fill="url(#bg-glow)" />
      <g stroke="#a2d44a" strokeOpacity=".28">
        {[0, 1, 2, 3, 4, 5].map((i) => <line key={`h${i}`} x1={20 + i * 6} y1={188 + i * 13} x2={360 - i * 6} y2={188 + i * 13} />)}
        {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => <line key={`v${i}`} x1={190 + i * 14} y1="186" x2={190 + i * 38} y2="256" />)}
      </g>
      <circle cx="190" cy="112" r="82" stroke="#a2d44a" strokeOpacity=".45" strokeWidth="1.5" />
      <circle cx="190" cy="112" r="108" stroke="#a2d44a" strokeOpacity=".22" strokeWidth="1.5" strokeDasharray="4 8" />
      <path d="M54 190C96 150 118 168 150 138" stroke="#cdee80" strokeOpacity=".8" strokeWidth="2" strokeDasharray="3 7" strokeLinecap="round" />
      <path d="M142 118 258 66l-34 96-32-34z" fill="url(#bg-lime)" />
      <path d="m192 128 66-62-22 58z" fill="url(#bg-fold)" />
      <path d="m192 128 6 38 20-26" fill="#6f9e22" fillOpacity=".7" />
      <circle cx="300" cy="196" r="22" stroke="#0e1c15" strokeOpacity=".85" strokeWidth="9" strokeDasharray="7 6" fill="#12281c" />
      <circle cx="300" cy="196" r="9" fill="#a2d44a" />
      <circle cx="86" cy="64" r="4" fill="#a2d44a" /><circle cx="330" cy="86" r="3" fill="#cdee80" /><circle cx="64" cy="132" r="3" fill="#cdee80" />
    </svg>
  );
}
