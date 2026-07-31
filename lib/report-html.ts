// Shared DogCareGH "Users & Bookings" report builder.
// Pure: takes raw rows, returns a self-contained HTML string (styles + markup)
// designed for A4 print-to-PDF. Used by the admin report page.

export type RUser = {
  id: string; name: string | null; email: string | null; role: string;
  location: string | null; created_at: string; is_trainer: boolean | null;
  referred_by_provider_id: string | null; referred_by_code: string | null;
};
export type RProvider = {
  id: string; user_id: string; verified: boolean | null; active: boolean | null;
  verification_status: string | null; provider_level: string | null;
};
export type RBooking = {
  id: string; owner_id: string; provider_id: string | null; dog_id: string | null;
  service_type: string | null; status: string; gross_amount: number | null;
  commission_amount: number | null; provider_payout: number | null;
  refund_amount: number | null; penalty_amount: number | null; created_at: string;
};
export type RDog = {
  id: string; owner_id: string; name: string | null; breed: string | null;
  size: string | null; vaccination_status: string | null;
};
export type RReview = { rating: number | null };

export type ReportData = {
  users: RUser[]; providers: RProvider[]; bookings: RBooking[];
  dogs: RDog[]; reviews: RReview[]; generatedAt: string;
};

type Slice = { label: string; value: number; color?: string };

// ---------- helpers ----------
const GHS = (n: number) => "GH₵" + (Math.round((+n || 0) * 100) / 100).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const GHS0 = (n: number) => "GH₵" + Math.round(+n || 0).toLocaleString("en-GH");
const num = (n: number) => (+n || 0).toLocaleString("en-GH");
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
function tally<T>(arr: T[], k: (r: T) => string | null | undefined): Record<string, number> {
  const m: Record<string, number> = {};
  for (const r of arr) { const v = k(r) ?? "(none)"; m[v] = (m[v] || 0) + 1; }
  return m;
}
const sumBy = <T,>(arr: T[], f: (r: T) => number | null) => arr.reduce((a, r) => a + (+(f(r) || 0)), 0);

const SERVICE_NAME: Record<string, string> = { dog_boarding: "Dog Overnight", dog_walking: "Dog Walking", dog_grooming: "Dog Grooming", dog_daycare: "Dog Daycare", dog_sitting: "Dog Sitting" };
const svc = (s: string | null) => (s && SERVICE_NAME[s]) || s || "Other";

const C = { teal: "#0a2e30", teal2: "#14595a", green: "#2f8f6b", accent: "#e8a33d", accent2: "#d97757", ink: "#1a2b2b", mut: "#6b7f7f", line: "#e2ece9", cream: "#f7f5ef", chipbg: "#eef5f2" };
const SERIES = ["#14595a", "#2f8f6b", "#e8a33d", "#d97757", "#5b8def", "#9b7fd4"];
const col = (i: number) => SERIES[i % SERIES.length];

// ---------- charts (inline SVG) ----------
function donut(data: Slice[], center?: string, size = 170, thick = 34) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = (size - thick) / 2, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
  let off = 0;
  const rings = data.map((d, i) => {
    const len = (d.value / total) * circ;
    const el = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${d.color || col(i)}" stroke-width="${thick}" stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${cx} ${cy})"/>`;
    off += len; return el;
  }).join("");
  const mid = center != null ? `<text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="26" font-weight="800" fill="${C.teal}">${center}</text>${center ? `<text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="10" fill="${C.mut}" letter-spacing=".5">TOTAL</text>` : ""}` : "";
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.line}" stroke-width="${thick}"/>${rings}${mid}</svg>`;
}
function legend(data: Slice[]) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  return `<div class="legend">${data.map((d, i) => `<div class="lg"><span class="dot" style="background:${d.color || col(i)}"></span><span class="lgl">${esc(d.label)}</span><span class="lgv">${num(d.value)} <em>${pct(d.value, total)}%</em></span></div>`).join("")}</div>`;
}
function hbars(data: Slice[], fmt: (n: number) => string = num) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return `<div class="hbars">${data.map((d, i) => `<div class="hb"><span class="hbl">${esc(d.label)}</span><span class="hbtrack"><span class="hbfill" style="width:${Math.max(2, (d.value / max) * 100)}%;background:${d.color || col(i)}"></span></span><span class="hbv">${fmt(d.value)}</span></div>`).join("")}</div>`;
}
function columns(data: Slice[], line = false, fmtV: (n: number) => string = num, h = 150) {
  const w = 560, padL = 6, padB = 22, padT = 10;
  const bw = (w - padL) / Math.max(1, data.length);
  const maxBar = Math.max(1, ...data.map((d) => d.value));
  const bars = data.map((d, i) => {
    const bh = (d.value / maxBar) * (h - padB - padT);
    const x = padL + i * bw + bw * 0.18, y = h - padB - bh, ww = bw * 0.64;
    return `<rect x="${x}" y="${y}" width="${ww}" height="${Math.max(0, bh)}" rx="3" fill="${C.teal2}"/>` +
      `<text x="${x + ww / 2}" y="${h - padB + 13}" text-anchor="middle" font-size="8.5" fill="${C.mut}">${esc(d.label)}</text>` +
      (d.value ? `<text x="${x + ww / 2}" y="${y - 3}" text-anchor="middle" font-size="8.5" font-weight="700" fill="${C.teal}">${fmtV(d.value)}</text>` : "");
  }).join("");
  let lineEl = "";
  if (line) {
    const cum: number[] = []; let run = 0; data.forEach((d) => { run += d.value; cum.push(run); });
    const maxC = Math.max(1, ...cum);
    const pts = cum.map((v, i) => [padL + i * bw + bw / 2, h - padB - (v / maxC) * (h - padB - padT)]);
    const dstr = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    lineEl = `<path d="${dstr}" fill="none" stroke="${C.accent}" stroke-width="2"/>` + pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="2.4" fill="${C.accent}"/>`).join("");
  }
  return `<svg width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="max-width:100%"><line x1="${padL}" y1="${h - padB}" x2="${w}" y2="${h - padB}" stroke="${C.line}"/>${bars}${lineEl}</svg>`;
}

// weekly bucketing
function weekKey(iso: string) { const d = new Date(iso); const day = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - day); return d.toISOString().slice(0, 10); }
function buildWeeks<T>(rows: T[], f: (r: T) => string) {
  const dates = rows.map(f).filter(Boolean).sort();
  if (!dates.length) return [] as string[];
  let cur = new Date(weekKey(dates[0])); const end = new Date(weekKey(dates[dates.length - 1]));
  const keys: string[] = [];
  while (cur <= end) { keys.push(cur.toISOString().slice(0, 10)); cur = new Date(cur.getTime() + 7 * 864e5); }
  return keys;
}
const weekLabel = (k: string) => new Date(k).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

// ---------- main builder ----------
export function buildReportHtml(data: ReportData, logoSrc = "/icon.png"): string {
  const { users, providers, bookings, dogs, reviews } = data;

  const userById = new Map(users.map((u) => [u.id, u]));
  const provNameById = new Map(providers.map((p) => [p.id, userById.get(p.user_id)?.name || "Provider"]));
  const dogById = new Map(dogs.map((d) => [d.id, d]));

  const owners = users.filter((u) => u.role === "owner");
  const provUsers = users.filter((u) => u.role === "provider");
  const admins = users.filter((u) => u.role === "admin");
  const trainers = users.filter((u) => u.is_trainer);
  const referred = users.filter((u) => u.referred_by_provider_id || u.referred_by_code);
  const withLoc = users.filter((u) => u.location);

  const userWeeks = buildWeeks(users, (u) => u.created_at);
  const signupsByWeek: Slice[] = userWeeks.map((k) => ({ label: weekLabel(k), value: users.filter((u) => weekKey(u.created_at) === k).length }));
  const topLoc: Slice[] = Object.entries(tally(withLoc, (u) => u.location)).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value], i) => ({ label, value, color: col(i) }));

  const verifTally = tally(providers, (p) => p.verification_status || (p.verified ? "verified" : "unverified"));
  const levelTally = tally(providers, (p) => p.provider_level || "—");
  const activeProv = providers.filter((p) => p.active).length;
  const verifiedProv = providers.filter((p) => p.verified).length;

  const sizeTally = tally(dogs, (d) => d.size);
  const vaxTally = tally(dogs, (d) => d.vaccination_status);
  const breedTally = Object.entries(tally(dogs, (d) => (d.breed || "Unknown").trim())).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const STATUS_GROUP: Record<string, string> = { closed: "Completed", in_progress: "In progress", confirmed: "Confirmed", paid: "Paid", cancelled: "Cancelled", pending: "Pending", completed_pending: "Awaiting confirm" };
  const STATUS_COLOR: Record<string, string> = { Completed: C.green, "In progress": C.teal2, Confirmed: "#5b8def", Paid: C.accent, Cancelled: C.accent2, Pending: "#9b7fd4", "Awaiting confirm": "#0284c7" };
  const grp = (b: RBooking) => STATUS_GROUP[b.status] || b.status;
  const statusData: Slice[] = Object.entries(tally(bookings, grp)).map(([label, value]) => ({ label, value, color: STATUS_COLOR[label] || C.mut }));

  // Earnings model: cancelled bookings are EXCLUDED from all earnings figures.
  // Three honest groups — Completed (realized), In-progress (pipeline), Cancelled (excluded).
  const completed = bookings.filter((b) => b.status === "closed");
  const cancelled = bookings.filter((b) => b.status === "cancelled");
  const active = bookings.filter((b) => b.status !== "closed" && b.status !== "cancelled");
  const booked = bookings.filter((b) => b.status !== "cancelled"); // everything that still counts

  const g = (rows: RBooking[]) => sumBy(rows, (b) => b.gross_amount);
  const cm = (rows: RBooking[]) => sumBy(rows, (b) => b.commission_amount);
  const py = (rows: RBooking[]) => sumBy(rows, (b) => b.provider_payout);

  const cGross = g(completed), cComm = cm(completed), cPayout = py(completed); // realized
  const aGross = g(active), aComm = cm(active), aPayout = py(active);          // pipeline
  const xGross = g(cancelled);                                                // excluded
  const bookedGross = g(booked), bookedComm = cm(booked), bookedPayout = py(booked);

  const refunds = sumBy(bookings, (b) => b.refund_amount);
  const penalties = sumBy(bookings, (b) => b.penalty_amount);

  // Service demand counts include everything (a cancelled booking was still demand);
  // service REVENUE excludes cancelled.
  const svcData: Slice[] = Object.entries(tally(bookings, (b) => svc(b.service_type))).sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({ label, value, color: col(i) }));
  const svcRevenue: Record<string, number> = {};
  booked.forEach((b) => { const s = svc(b.service_type); svcRevenue[s] = (svcRevenue[s] || 0) + (+(b.gross_amount || 0)); });
  const svcRevData: Slice[] = Object.entries(svcRevenue).sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({ label, value, color: col(i) }));

  const bWeeks = buildWeeks(bookings, (b) => b.created_at);
  const bookingsByWeek: Slice[] = bWeeks.map((k) => ({ label: weekLabel(k), value: bookings.filter((b) => weekKey(b.created_at) === k).length }));
  const gmvByWeek: Slice[] = bWeeks.map((k) => ({ label: weekLabel(k), value: Math.round(sumBy(booked.filter((b) => weekKey(b.created_at) === k), (b) => b.gross_amount)) }));

  // Provider / owner rankings exclude cancelled bookings.
  const provAgg: Record<string, { count: number; gmv: number; payout: number }> = {};
  booked.forEach((b) => { const id = b.provider_id; if (!id) return; (provAgg[id] = provAgg[id] || { count: 0, gmv: 0, payout: 0 }); provAgg[id].count++; provAgg[id].gmv += (+(b.gross_amount || 0)); provAgg[id].payout += (+(b.provider_payout || 0)); });
  const topProviders = Object.entries(provAgg).map(([id, v]) => ({ name: provNameById.get(id) || "Provider", ...v })).sort((a, b) => b.gmv - a.gmv).slice(0, 8);

  const ownerAgg: Record<string, { count: number; gmv: number }> = {};
  booked.forEach((b) => { const id = b.owner_id; if (!id) return; (ownerAgg[id] = ownerAgg[id] || { count: 0, gmv: 0 }); ownerAgg[id].count++; ownerAgg[id].gmv += (+(b.gross_amount || 0)); });
  const topOwners = Object.entries(ownerAgg).map(([id, v]) => ({ name: userById.get(id)?.name || "Owner", ...v })).sort((a, b) => b.count - a.count || b.gmv - a.gmv).slice(0, 6);

  const avgRating = reviews.length ? sumBy(reviews, (r) => r.rating) / reviews.length : 0;

  const bookingRows = [...bookings].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).map((b) => ({
    date: fmtDate(b.created_at), service: svc(b.service_type), status: grp(b),
    owner: userById.get(b.owner_id)?.name || "—", provider: provNameById.get(b.provider_id || "") || "—",
    dog: dogById.get(b.dog_id || "")?.name || "—", gross: +(b.gross_amount || 0), commission: +(b.commission_amount || 0), payout: +(b.provider_payout || 0),
  }));
  const recentUsers = [...users].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 12);

  const genOn = new Date(data.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const dataFrom = fmtDate(users.map((u) => u.created_at).filter(Boolean).sort()[0] || null);

  const kpi = (label: string, value: string, sub: string, tone = "") => `<div class="kpi ${tone}"><div class="kpiv">${value}</div><div class="kpil">${label}</div>${sub ? `<div class="kpis">${sub}</div>` : ""}</div>`;
  const stat = (label: string, value: string, sub: string) => `<div class="stat"><div class="statl">${label}</div><div class="statv">${value}</div>${sub ? `<div class="stats">${sub}</div>` : ""}</div>`;
  const comm = [{ label: "Pet Owners", value: owners.length, color: SERIES[0] }, { label: "Providers", value: provUsers.length, color: SERIES[1] }, { label: "Admin", value: admins.length, color: SERIES[2] }];
  const split = [{ label: "Provider payouts", value: Math.round(cPayout), color: SERIES[1] }, { label: "Platform revenue", value: Math.round(cComm), color: C.accent }];
  const money = (tag: string, big: string, rev: string, pay: string, meta: string, accent: string, excluded = false) =>
    `<div class="card fin"><div class="fintag" style="color:${accent}"><span class="findot" style="background:${accent}"></span>${tag}</div>` +
    `<div class="finbig">${big}</div>` +
    `<div class="finrow"><span>Platform revenue</span><b${excluded ? ' class="ex"' : ""}>${rev}</b></div>` +
    `<div class="finrow"><span>Provider payouts</span><b${excluded ? ' class="ex"' : ""}>${pay}</b></div>` +
    `<div class="finmeta">${meta}</div></div>`;

  return `<style>
  @page { size: A4; margin: 14mm 12mm 16mm; }
  .rpt * { box-sizing: border-box; }
  .rpt { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: ${C.ink}; font-size: 11px; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .rpt h1,.rpt h2,.rpt h3 { margin: 0; font-weight: 800; letter-spacing: -0.01em; }
  .rpt .page { page-break-after: always; padding: 2mm 0; }
  .rpt .page:last-child { page-break-after: auto; }
  .rpt .cover { background: ${C.teal}; color: #fff; height: 267mm; padding: 34mm 20mm 18mm; display: flex; flex-direction: column; page-break-after: always; overflow: hidden; }
  .rpt .cover .logo { width: 96px; height: 96px; border-radius: 22px; box-shadow: 0 10px 30px rgba(0,0,0,.35); }
  .rpt .cover h1 { font-size: 40px; margin-top: 26px; line-height: 1.05; }
  .rpt .cover .sub { font-size: 15px; color: rgba(255,255,255,.72); margin-top: 12px; max-width: 460px; }
  .rpt .cover .meta { margin-top: 8px; font-size: 12px; color: rgba(255,255,255,.55); }
  .rpt .cover .hero { margin-top: auto; display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
  .rpt .cover .hcard { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.14); border-radius: 14px; padding: 16px; }
  .rpt .cover .hv { font-size: 30px; font-weight: 800; }
  .rpt .cover .hl { font-size: 11px; color: rgba(255,255,255,.62); margin-top: 3px; text-transform: uppercase; letter-spacing: .6px; }
  .rpt .cover .hs { font-size: 11px; color: ${C.accent}; margin-top: 6px; font-weight: 600; }
  .rpt .cover .cfoot { margin-top: 20px; font-size: 10.5px; color: rgba(255,255,255,.4); border-top: 1px solid rgba(255,255,255,.12); padding-top: 12px; }
  .rpt .sechd { display: flex; align-items: baseline; gap: 10px; border-bottom: 2px solid ${C.teal}; padding-bottom: 7px; margin-bottom: 14px; }
  .rpt .sechd .n { font-size: 11px; font-weight: 800; color: #fff; background: ${C.teal}; border-radius: 6px; padding: 2px 8px; }
  .rpt .sechd h2 { font-size: 19px; color: ${C.teal}; }
  .rpt .sechd .sub { margin-left: auto; font-size: 10.5px; color: ${C.mut}; }
  .rpt .grid { display: grid; gap: 12px; }
  .rpt .g3 { grid-template-columns: repeat(3,1fr); }
  .rpt .g4 { grid-template-columns: repeat(4,1fr); }
  .rpt .g2 { grid-template-columns: 1fr 1fr; }
  .rpt .card { border: 1px solid ${C.line}; border-radius: 12px; padding: 14px; background: #fff; break-inside: avoid; }
  .rpt .card h3 { font-size: 12.5px; color: ${C.teal}; margin-bottom: 10px; }
  .rpt .kpi { border: 1px solid ${C.line}; border-radius: 12px; padding: 13px 14px; background: #fff; }
  .rpt .kpi.dark { background: ${C.teal}; border-color: ${C.teal}; color: #fff; }
  .rpt .kpi.dark .kpil, .rpt .kpi.dark .kpis { color: rgba(255,255,255,.7); }
  .rpt .kpi.gold { background: ${C.accent}; border-color: ${C.accent}; color: #3a2a06; }
  .rpt .kpi.gold .kpil, .rpt .kpi.gold .kpis { color: #6b4e10; }
  .rpt .fin { padding: 14px; }
  .rpt .fintag { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; display: flex; align-items: center; gap: 6px; }
  .rpt .findot { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
  .rpt .finbig { font-size: 24px; font-weight: 800; color: ${C.teal}; letter-spacing: -.02em; margin: 8px 0 10px; }
  .rpt .finrow { display: flex; justify-content: space-between; font-size: 10.5px; color: ${C.mut}; padding: 4px 0; border-top: 1px dashed ${C.line}; }
  .rpt .finrow b { color: ${C.teal}; font-variant-numeric: tabular-nums; }
  .rpt .finrow b.ex { color: ${C.mut}; font-weight: 600; }
  .rpt .finmeta { font-size: 9.5px; color: ${C.mut}; margin-top: 9px; line-height: 1.35; }
  .rpt .kpiv { font-size: 25px; font-weight: 800; letter-spacing: -.02em; }
  .rpt .kpil { font-size: 10.5px; text-transform: uppercase; letter-spacing: .5px; color: ${C.mut}; margin-top: 2px; }
  .rpt .kpis { font-size: 10.5px; color: ${C.mut}; margin-top: 4px; }
  .rpt .stat { padding: 9px 0; border-bottom: 1px dashed ${C.line}; }
  .rpt .stat:last-child { border-bottom: 0; }
  .rpt .statl { font-size: 10.5px; color: ${C.mut}; }
  .rpt .statv { font-size: 16px; font-weight: 800; color: ${C.teal}; }
  .rpt .stats { font-size: 10px; color: ${C.mut}; }
  .rpt .statrow { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 18px; }
  .rpt .donutwrap { display: flex; align-items: center; gap: 14px; }
  .rpt .legend { flex: 1; display: flex; flex-direction: column; gap: 7px; }
  .rpt .lg { display: flex; align-items: center; gap: 8px; font-size: 11px; }
  .rpt .dot { width: 10px; height: 10px; border-radius: 3px; flex: none; }
  .rpt .lgl { flex: 1; }
  .rpt .lgv { font-weight: 700; color: ${C.teal}; }
  .rpt .lgv em { font-style: normal; color: ${C.mut}; font-weight: 500; font-size: 10px; }
  .rpt .hbars { display: flex; flex-direction: column; gap: 9px; }
  .rpt .hb { display: grid; grid-template-columns: 96px 1fr auto; align-items: center; gap: 9px; font-size: 10.5px; }
  .rpt .hbtrack { background: ${C.chipbg}; border-radius: 6px; height: 12px; overflow: hidden; }
  .rpt .hbfill { display: block; height: 100%; border-radius: 6px; }
  .rpt .hbv { font-weight: 700; color: ${C.teal}; white-space: nowrap; }
  .rpt table { width: 100%; border-collapse: collapse; font-size: 10px; }
  .rpt thead th { background: ${C.teal}; color: #fff; text-align: left; padding: 7px 8px; font-weight: 700; font-size: 9.5px; text-transform: uppercase; letter-spacing: .4px; }
  .rpt thead th.r { text-align: right; }
  .rpt tbody td { padding: 6px 8px; border-bottom: 1px solid ${C.line}; }
  .rpt tbody tr:nth-child(even) { background: ${C.cream}; }
  .rpt td.r { text-align: right; font-variant-numeric: tabular-nums; }
  .rpt .pill { display: inline-block; padding: 1.5px 8px; border-radius: 999px; font-size: 9px; font-weight: 700; }
  .rpt .rank { display:inline-flex; width:16px; height:16px; border-radius:5px; background:${C.teal}; color:#fff; font-size:9px; font-weight:800; align-items:center; justify-content:center; margin-right:6px; }
  .rpt .note { font-size: 9.5px; color: ${C.mut}; margin-top: 8px; }
  .rpt .foot2 { margin-top: 14px; font-size: 9.5px; color: ${C.mut}; text-align: center; border-top: 1px solid ${C.line}; padding-top: 8px; }
</style>
<div class="rpt">

<section class="cover">
  <img class="logo" src="${logoSrc}" alt="DogCareGH"/>
  <h1>Platform Report<br/>Users &amp; Bookings</h1>
  <div class="sub">A detailed analytical overview of the DogCareGH marketplace — community growth, booking activity, service demand, and marketplace revenue.</div>
  <div class="meta">Generated ${genOn} &nbsp;•&nbsp; Data from ${dataFrom} to present &nbsp;•&nbsp; Live production data</div>
  <div class="hero">
    <div class="hcard"><div class="hv">${num(users.length)}</div><div class="hl">Total Users</div><div class="hs">${num(owners.length)} owners · ${num(providers.length)} providers</div></div>
    <div class="hcard"><div class="hv">${num(bookings.length)}</div><div class="hl">Total Bookings</div><div class="hs">${num(completed.length)} completed · ${pct(completed.length, bookings.length)}%</div></div>
    <div class="hcard"><div class="hv">${GHS0(cComm)}</div><div class="hl">Revenue Earned</div><div class="hs">${GHS0(cGross)} completed value · excl. cancelled</div></div>
  </div>
  <div class="cfoot">DogCareGH — Trusted Pet Care in Ghana &nbsp;•&nbsp; Confidential internal report</div>
</section>

<section class="page">
  <div class="sechd"><span class="n">01</span><h2>Executive Summary</h2><span class="sub">Key performance indicators</span></div>
  <div class="grid g4" style="margin-bottom:12px">
    ${kpi("Total Users", num(users.length), `+${signupsByWeek.slice(-1)[0]?.value || 0} this week`, "dark")}
    ${kpi("Providers", num(providers.length), `${verifiedProv} verified · ${activeProv} active`)}
    ${kpi("Registered Dogs", num(dogs.length), `${(dogs.length / Math.max(1, owners.length)).toFixed(2)} per owner`)}
    ${kpi("Total Bookings", num(bookings.length), `${completed.length} completed`)}
    ${kpi("Revenue Earned", GHS0(cComm), "completed bookings only", "gold")}
    ${kpi("Completed Value", GHS0(cGross), `${completed.length} completed · realized`)}
    ${kpi("In-progress Pipeline", GHS0(aGross), `${active.length} bookings · not yet earned`)}
    ${kpi("Cancelled (excluded)", GHS0(xGross), `${cancelled.length} bookings · not in earnings`)}
  </div>
  <div class="grid g2">
    <div class="card"><h3>Booking Status Breakdown</h3><div class="donutwrap">${donut(statusData, String(bookings.length))}${legend(statusData)}</div></div>
    <div class="card"><h3>Community Composition</h3><div class="donutwrap">${donut(comm, String(users.length))}${legend(comm)}</div>
      <div class="note">${trainers.length} users are also flagged as trainers (DogTrainerGH). ${referred.length} users joined via a provider referral.</div>
    </div>
  </div>
  <div class="card" style="margin-top:12px"><h3>Highlights <span style="font-weight:500;color:${C.mut};font-size:10px">— cancelled bookings excluded from all earnings</span></h3><div class="statrow">
    ${stat("Revenue earned (completed)", GHS(cComm), "platform commission realized")}
    ${stat("Completed booking value", GHS(cGross), `${completed.length} completed bookings`)}
    ${stat("In-progress pipeline value", GHS(aGross), `${active.length} bookings, not yet earned`)}
    ${stat("Take rate", pct(cComm, cGross) + "%", "commission share of completed value")}
    ${stat("Booking completion rate", pct(completed.length, bookings.length) + "%", `${completed.length} of ${bookings.length}`)}
    ${stat("Cancellation rate", pct(cancelled.length, bookings.length) + "%", `${cancelled.length} cancelled · ${GHS0(xGross)} excluded`)}
    ${stat("Avg rating", (avgRating ? avgRating.toFixed(2) : "—") + " ★", `${reviews.length} reviews`)}
  </div></div>
</section>

<section class="page">
  <div class="sechd"><span class="n">02</span><h2>Users &amp; Community</h2><span class="sub">${num(users.length)} total accounts</span></div>
  <div class="grid g2" style="margin-bottom:12px">
    <div class="card"><h3>Signups Over Time (weekly)</h3>${columns(signupsByWeek, true)}<div class="note"><span style="color:${C.teal2}">■</span> new signups / week &nbsp; <span style="color:${C.accent}">—</span> cumulative total</div></div>
    <div class="card"><h3>Top Locations</h3>${hbars(topLoc)}<div class="note">${withLoc.length} of ${users.length} users set a location; ${users.length - withLoc.length} unspecified.</div></div>
  </div>
  <div class="grid g3">
    <div class="card"><h3>Roles</h3><div class="statrow" style="grid-template-columns:1fr">
      ${stat("Pet Owners", num(owners.length), pct(owners.length, users.length) + "% of users")}
      ${stat("Providers", num(provUsers.length), pct(provUsers.length, users.length) + "% of users")}
      ${stat("Trainers (flag)", num(trainers.length), "cross-listed on DogTrainerGH")}
      ${stat("Admins", num(admins.length), "")}
    </div></div>
    <div class="card"><h3>Provider Verification</h3>${hbars(Object.entries(verifTally).map(([label, value], i) => ({ label, value, color: col(i) })))}<div class="note">${verifiedProv} verified · ${activeProv} active · ${providers.length - activeProv} inactive</div></div>
    <div class="card"><h3>Provider Tiers</h3>${hbars(Object.entries(levelTally).map(([label, value], i) => ({ label, value, color: col(i) })))}<div class="note">Referral program: ${referred.length} referred signups.</div></div>
  </div>
  <div class="card" style="margin-top:12px"><h3>Most Recent Signups</h3>
    <table><thead><tr><th>Name</th><th>Role</th><th>Location</th><th>Joined</th></tr></thead><tbody>
      ${recentUsers.map((u) => `<tr><td>${esc(u.name || "—")}</td><td><span class="pill" style="background:${C.chipbg};color:${C.teal}">${esc(u.role)}</span></td><td>${esc(u.location || "—")}</td><td>${fmtDate(u.created_at)}</td></tr>`).join("")}
    </tbody></table>
  </div>
</section>

<section class="page">
  <div class="sechd"><span class="n">03</span><h2>Registered Dogs</h2><span class="sub">${num(dogs.length)} dog profiles</span></div>
  <div class="grid g3">
    <div class="card"><h3>By Size</h3><div class="donutwrap" style="justify-content:center">${donut(Object.entries(sizeTally).map(([label, value], i) => ({ label, value, color: col(i) })), String(dogs.length))}</div>${legend(Object.entries(sizeTally).map(([label, value], i) => ({ label, value, color: col(i) })))}</div>
    <div class="card"><h3>Vaccination Status</h3>${hbars(Object.entries(vaxTally).map(([label, value], i) => ({ label, value, color: col(i) })))}</div>
    <div class="card"><h3>Top Breeds</h3>${hbars(breedTally.map(([label, value], i) => ({ label, value, color: col(i) })))}</div>
  </div>
  <div class="note">On average each pet owner has registered ${(dogs.length / Math.max(1, owners.length)).toFixed(2)} dogs.</div>
</section>

<section class="page">
  <div class="sechd"><span class="n">04</span><h2>Bookings &amp; Demand</h2><span class="sub">${num(bookings.length)} bookings</span></div>
  <div class="grid g2" style="margin-bottom:12px">
    <div class="card"><h3>Bookings Over Time (weekly)</h3>${columns(bookingsByWeek, true)}<div class="note"><span style="color:${C.teal2}">■</span> bookings / week &nbsp; <span style="color:${C.accent}">—</span> cumulative</div></div>
    <div class="card"><h3>Booked Value Over Time (weekly)</h3>${columns(gmvByWeek, false, (v) => (v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(v)))}<div class="note">Booked value created each week (GH₵) — cancelled bookings excluded.</div></div>
  </div>
  <div class="grid g2">
    <div class="card"><h3>Bookings by Service</h3><div class="donutwrap">${donut(svcData, String(bookings.length))}${legend(svcData)}</div><div class="note">Counts reflect demand (includes cancelled).</div></div>
    <div class="card"><h3>Revenue by Service</h3>${hbars(svcRevData, GHS0)}<div class="note">Booked value by service, excluding cancelled. Overnight boarding leads.</div></div>
  </div>
</section>

<section class="page">
  <div class="sechd"><span class="n">05</span><h2>Marketplace Financials</h2><span class="sub">GH₵ — cancelled bookings excluded from earnings</span></div>
  <div class="grid g3" style="margin-bottom:12px">
    ${money("Completed · Realized", GHS0(cGross), GHS(cComm), GHS(cPayout), `${completed.length} completed bookings — money actually earned`, C.green)}
    ${money("In-progress · Pipeline", GHS0(aGross), GHS(aComm), GHS(aPayout), `${active.length} paid/confirmed bookings — committed, not yet earned`, C.teal2)}
    ${money("Cancelled · Excluded", GHS0(xGross), "—", "—", `${cancelled.length} cancelled bookings — not counted toward earnings`, C.accent2, true)}
  </div>
  <div class="grid g2">
    <div class="card"><h3>Realized Revenue Split <span style="font-weight:500;color:${C.mut};font-size:10px">— completed only</span></h3><div class="donutwrap">${donut(split, "")}${legend(split)}</div><div class="note">Of the ${GHS(cGross)} completed, the platform earned ${GHS(cComm)} (${pct(cComm, cGross)}%) and paid providers ${GHS(cPayout)}. Refunds: ${GHS(refunds)} · Penalties: ${GHS(penalties)}.</div></div>
    <div class="card"><h3>Booked Value by Status</h3>${hbars(statusData.map((s) => ({ label: s.label, value: Math.round(sumBy(bookings.filter((b) => grp(b) === s.label), (b) => b.gross_amount)), color: s.color })), GHS0)}<div class="note">Cancelled shown for transparency but excluded from all earnings totals.</div></div>
  </div>
  <div class="card" style="margin-top:12px"><h3>Top Providers by Booked Value <span style="font-weight:500;color:${C.mut};font-size:10px">— excl. cancelled</span></h3>
    <table><thead><tr><th>#</th><th>Provider</th><th class="r">Bookings</th><th class="r">GMV</th><th class="r">Payout earned</th></tr></thead><tbody>
      ${topProviders.map((p, i) => `<tr><td><span class="rank">${i + 1}</span></td><td>${esc(p.name)}</td><td class="r">${p.count}</td><td class="r">${GHS0(p.gmv)}</td><td class="r">${GHS0(p.payout)}</td></tr>`).join("")}
    </tbody></table>
  </div>
</section>

<section class="page">
  <div class="sechd"><span class="n">06</span><h2>Booking Ledger</h2><span class="sub">all ${num(bookings.length)} bookings</span></div>
  <table><thead><tr><th>Date</th><th>Service</th><th>Owner</th><th>Provider</th><th>Dog</th><th>Status</th><th class="r">Gross</th><th class="r">Comm.</th><th class="r">Payout</th></tr></thead><tbody>
    ${bookingRows.map((r) => `<tr${r.status === "Cancelled" ? ' style="color:' + C.mut + '"' : ""}><td>${esc(r.date)}</td><td>${esc(r.service)}</td><td>${esc(r.owner)}</td><td>${esc(r.provider)}</td><td>${esc(r.dog)}</td><td><span class="pill" style="background:${(STATUS_COLOR[r.status] || C.mut)}22;color:${STATUS_COLOR[r.status] || C.mut}">${esc(r.status)}</span></td><td class="r">${GHS(r.gross)}</td><td class="r">${GHS(r.commission)}</td><td class="r">${GHS(r.payout)}</td></tr>`).join("")}
    <tr style="color:${C.mut};font-style:italic"><td colspan="6" style="padding:7px 8px">Cancelled subtotal (excluded, ${cancelled.length})</td><td class="r">${GHS(xGross)}</td><td class="r">${GHS(cm(cancelled))}</td><td class="r">${GHS(py(cancelled))}</td></tr>
    <tr style="font-weight:800;background:${C.teal};color:#fff"><td colspan="6" style="padding:8px">NET TOTAL — excl. cancelled (${booked.length})</td><td class="r">${GHS(bookedGross)}</td><td class="r">${GHS(bookedComm)}</td><td class="r">${GHS(bookedPayout)}</td></tr>
  </tbody></table>
  <div class="note">Net total covers ${completed.length} completed + ${active.length} in-progress bookings. ${cancelled.length} cancelled bookings (${GHS(xGross)}) are listed above for transparency but excluded from earnings.</div>
  <div class="card" style="margin-top:14px"><h3>Most Active Pet Owners</h3>
    <table><thead><tr><th>#</th><th>Owner</th><th class="r">Bookings</th><th class="r">Total spent</th></tr></thead><tbody>
      ${topOwners.map((o, i) => `<tr><td><span class="rank">${i + 1}</span></td><td>${esc(o.name)}</td><td class="r">${o.count}</td><td class="r">${GHS0(o.gmv)}</td></tr>`).join("")}
    </tbody></table>
  </div>
  <div class="foot2">DogCareGH — Users &amp; Bookings Report · Generated ${genOn} · Confidential</div>
</section>

</div>`;
}
