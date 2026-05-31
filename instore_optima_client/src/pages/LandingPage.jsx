import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import ZoomControl from "../components/ZoomControl";
import ContactSupportModal from "../components/ContactSupportModal";

function useVisible(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function useCounter(target, duration = 2000, start = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let st = null;
    const step = (ts) => {
      if (!st) st = ts;
      const p = Math.min((ts - st) / duration, 1);
      setVal(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return val;
}

function StatBox({ id, target, label, duration = 1800, started }) {
  const val = useCounter(target, duration, started);
  return (
    <div className="lp-stat">
      <div className="lp-stat-v" id={id}>
        {val}{target === 100 ? <span className="lp-stat-pct">%</span> : ""}
      </div>
      <div className="lp-stat-l">{label}</div>
    </div>
  );
}

function FeatureCard({ num, title, desc, delay }) {
  const [ref, visible] = useVisible();
  return (
    <div ref={ref} className={`lp-feat ${visible ? "lp-feat-vis" : ""}`} style={{ transitionDelay: delay }}>
      <div className="lp-feat-num">{num}</div>
      <div className="lp-feat-title">{title}</div>
      <div className="lp-feat-desc">{desc}</div>
    </div>
  );
}

function buildTerminalLines(d) {
  const fmt = n => `₹${Number(n).toLocaleString('en-IN')}`;
  const low = d.lowStockItems || [];
  const orders = d.todayOrders || [];

  const lowLines = low.length > 0
    ? low.map(x => ({ cls: "warn", label: "[LOW]", msg: ` ${x.name} · ${x.currentStock} units (min ${x.minStock})` }))
    : [{ cls: "ok", label: "[OK]", msg: " All stock levels within threshold" }];

  const orderLines = orders.length > 0
    ? orders.map(o => ({ cls: o.status === "Completed" ? "ok" : "info", label: `[${o.status.toUpperCase().slice(0,4)}]`, msg: ` Order #${o.orderId} · ${fmt(o.amount)}` }))
    : [{ cls: "dim", label: "[NONE]", msg: " No orders placed today yet" }];

  const repLine = d.lastApproved
    ? { cls: "ok", label: "[DONE]", msg: ` ${d.lastApproved.id} approved · ${d.lastApproved.name}` }
    : { cls: "dim", label: "[NONE]", msg: " No approvals today" };

  return [
    { type: "cmd", text: "instore status" },
    { type: "out", items: [
      { cls: "ok",   label: "[LIVE]", msg: ` ${d.totalProducts} products · ${d.activeUsers} users online` },
      { cls: "ok",   label: "[DB]",   msg: " SQL Server connected · live data" },
      { cls: "ok",   label: "[AUTH]", msg: ` JWT active · ${d.timestamp}` },
    ]},
    { type: "cmd", text: "inventory.lowStock()" },
    { type: "out", items: [
      ...lowLines,
      { cls: "info", label: "[AUTO]", msg: ` ${d.pendingReplenishment} replenishment order${d.pendingReplenishment !== 1 ? "s" : ""} queued` },
    ]},
    { type: "cmd", text: "replenishment.latest()" },
    { type: "out", items: [
      repLine,
      { cls: "info", label: "[ETA]",  msg: " Delivery expected in 2 business days" },
    ]},
    { type: "cmd", text: "orders.today()" },
    { type: "out", items: [
      ...orderLines,
      { cls: "info", label: "[REV]",  msg: ` Today's revenue · ${fmt(d.todayRevenue)}` },
    ]},
  ];
}

// Build the scrolling ticker items from the live snapshot. Returns [icon, text][].
// Returns null ONLY when the snapshot is unreachable (so we fall back to the
// static sample). When the backend responds, we always show live data — padding
// with honest "all clear" lines so the marquee always has enough to scroll.
function buildTickerItems(d) {
  if (!d) return null;
  const fmt = n => `₹${Number(n).toLocaleString('en-IN')}`;
  const items = [];

  items.push(["●", `${d.totalProducts ?? 0} products tracked · ${d.activeUsers ?? 0} users online`]);

  const low = d.lowStockItems || [];
  if (low.length > 0) low.forEach(x =>
    items.push(["!", `${x.name} — low stock (${x.currentStock}/${x.minStock})`]));
  else items.push(["✓", "All stock levels within threshold"]);

  items.push(["↑", d.pendingReplenishment > 0
    ? `${d.pendingReplenishment} replenishment order${d.pendingReplenishment !== 1 ? 's' : ''} queued`
    : "Replenishment up to date"]);

  if (d.lastApproved)
    items.push(["✓", `${d.lastApproved.id} approved — ${d.lastApproved.name}`]);

  (d.todayOrders || []).forEach(o =>
    items.push([o.status === 'Completed' ? "✓" : "→", `Order #${o.orderId} — ${fmt(o.amount)} · ${o.status}`]));

  items.push(["✓", d.todayOrderCount > 0
    ? `${d.todayOrderCount} order${d.todayOrderCount !== 1 ? 's' : ''} today · ${fmt(d.todayRevenue)} revenue`
    : "No orders placed today yet"]);

  return items;
}

function Terminal() {
  const tbodyRef = useRef(null);
  const [termRef, termVisible] = useVisible(0.2);
  const startedRef = useRef(false);
  const [liveData, setLiveData] = useState(null);
  const [fetchDone, setFetchDone] = useState(false);

  useEffect(() => {
    fetch("/api/live/snapshot")
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then(data => { setLiveData(data); setFetchDone(true); });
  }, []);

  useEffect(() => {
    if (!termVisible || !fetchDone || startedRef.current) return;
    startedRef.current = true;
    const tbody = tbodyRef.current;
    if (!tbody) return;

    const LINES = liveData ? buildTerminalLines(liveData) : [
      { type: "cmd", text: "instore status" },
      { type: "out", items: [
        { cls: "ok",   label: "[LIVE]",  msg: " 14 modules active · 3 users online" },
        { cls: "ok",   label: "[DB]",    msg: " SQL Server connected · 0ms latency" },
        { cls: "ok",   label: "[AUTH]",  msg: " JWT valid · session expires 23:59" },
      ]},
      { type: "cmd", text: "inventory.lowStock()" },
      { type: "out", items: [
        { cls: "warn", label: "[LOW]",   msg: " Tata Salt 1kg · 12 units  (min 50)" },
        { cls: "warn", label: "[LOW]",   msg: " Amul Butter 500g · 8 units (min 25)" },
        { cls: "info", label: "[AUTO]",  msg: " 2 replenishment orders queued" },
      ]},
      { type: "cmd", text: "orders.today()" },
      { type: "out", items: [
        { cls: "ok",   label: "[NEW]",   msg: " Order #554 · ₹3,200 · Pending" },
        { cls: "ok",   label: "[PAID]",  msg: " Order #552 · ₹5,400 · Completed" },
        { cls: "info", label: "[REV]",   msg: " Today's revenue · ₹8,600" },
      ]},
    ];

    let li = 0, delay = 700;
    function typeLines() {
      if (li >= LINES.length) {
        const cur = document.createElement("span");
        cur.className = "lp-t-cursor";
        tbody.lastElementChild?.appendChild(cur);
        return;
      }
      const line = LINES[li++];
      if (line.type === "cmd") {
        setTimeout(() => {
          const d = document.createElement("div");
          d.className = "lp-t-line";
          d.innerHTML = `<span class="lp-t-prompt">$</span><span class="lp-t-cmd"> ${line.text}</span>`;
          tbody.appendChild(d);
          delay = 260; typeLines();
        }, delay);
      } else {
        line.items.forEach((item, i) => {
          setTimeout(() => {
            const d = document.createElement("div");
            d.className = "lp-t-out";
            d.innerHTML = `<span class="lp-t-${item.cls}">${item.label}</span>${item.msg}`;
            tbody.appendChild(d);
            if (i === line.items.length - 1) { delay = 350; typeLines(); }
          }, delay + i * 155);
        });
        delay += line.items.length * 155 + 100;
      }
    }
    typeLines();
  }, [termVisible, fetchDone, liveData]);

  return (
    <div ref={termRef} className={`lp-terminal ${termVisible ? "lp-in" : ""}`}>
      <div className="lp-t-bar">
        <div className="lp-t-dot" style={{ background: "#ef4444", opacity: .6 }} />
        <div className="lp-t-dot" style={{ background: "#f59e0b", opacity: .6 }} />
        <div className="lp-t-dot" style={{ background: "#22c55e", opacity: .6 }} />
        <span className="lp-t-title">instore-optima — live monitor</span>
        <span className="lp-t-live"><span className="lp-t-live-dot" />LIVE</span>
      </div>
      <div className="lp-t-body" ref={tbodyRef} />
    </div>
  );
}

const TICKER_ITEMS = [
  ["↑", "Tata Salt 1kg — replenished 200 units"],
  ["✓", "Order #551 completed"],
  ["✓", "Payment ₹5,400 received"],
  ["↑", "PO #8821 delivered — stock updated"],
  ["!", "Amul Butter — low stock alert triggered"],
  ["✓", "Replenishment #REP-204 approved"],
  ["↑", "Receipt #REC-889 generated"],
  ["✓", "Supplier FreshFoods — PO sent"],
];

const FEATURES = [
  { num: "01 / REPLENISHMENT", title: "Smart replenishment",   desc: "Stock drops below threshold? Auto-generates a replenishment order instantly. Zero manual monitoring required." },
  { num: "02 / INVENTORY",     title: "Real-time tracking",    desc: "Every IN, OUT, and ADJUSTMENT tracked live. Full movement history always available to your team." },
  { num: "03 / ORDERS",        title: "Order pipeline",        desc: "Customer order to payment to receipt — a complete financial pipeline in one unified flow." },
  { num: "04 / ACCESS",        title: "Role-based access",     desc: "Admin, Manager, and Staff each see and do exactly what their role requires. Nothing more, nothing less." },
  { num: "05 / PROCUREMENT",   title: "Procurement control",   desc: "Supplier management, purchase orders, delivery tracking — the full procurement cycle under one roof." },
  { num: "06 / COMPLIANCE",    title: "Audit trail",           desc: "Every action logged with who, what, and when. Immutable. Always available for compliance review." },
];

export default function LandingPage({ zoom = 100, setZoom = () => {} }) {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [heroIn, setHeroIn] = useState(false);
  const [statsRef, statsVisible] = useVisible(0.3);
  const { dark, toggle: toggleTheme } = useTheme();
  const themeRef = useRef(dark);
  const [supportOpen, setSupportOpen] = useState(false);
  const [tickerItems, setTickerItems] = useState(null);

  // Live ticker feed — pulled from the public snapshot endpoint
  useEffect(() => {
    let cancelled = false;
    const fetchTicker = () => {
      fetch("/api/live/snapshot")
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
        .then(data => { if (!cancelled) setTickerItems(buildTickerItems(data)); });
    };
    fetchTicker();
    const id = setInterval(fetchTicker, 30000); // refresh every 30s
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    themeRef.current = dark;
  }, [dark]);
  useEffect(() => { setTimeout(() => setHeroIn(true), 80); }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId, W, H, pts;
    const COLS = 18, ROWS = 9;
    function init() {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
      pts = [];
      for (let c = 0; c < COLS; c++)
        for (let r = 0; r < ROWS; r++)
          pts.push({ ox: (c / (COLS - 1)) * W, oy: (r / (ROWS - 1)) * H, x: 0, y: 0,
            ph: Math.random() * Math.PI * 2, sp: .25 + Math.random() * .45, am: 5 + Math.random() * 15 });
    }
    let t = 0;
    function draw() {
      ctx.clearRect(0, 0, W, H); t += .004;
      const light = !themeRef.current;
      pts.forEach(p => { p.x = p.ox + Math.sin(t * p.sp + p.ph) * p.am; p.y = p.oy + Math.cos(t * p.sp * .7 + p.ph) * p.am * .6; });
      const thr = (W / COLS) * 1.8;
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < thr) { ctx.strokeStyle = light ? `rgba(249,115,22,${(1-d/thr)*.13})` : `rgba(8,145,178,${(1 - d / thr) * .18})`; ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke(); }
        }
      pts.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2); ctx.fillStyle = light ? "rgba(249,115,22,0.45)" : "rgba(8,145,178,0.55)"; ctx.fill(); });
      animId = requestAnimationFrame(draw);
    }
    init(); draw();
    const ro = new ResizeObserver(init); ro.observe(canvas);
    return () => { cancelAnimationFrame(animId); ro.disconnect(); };
  }, []);

  // Use live data when available; fall back to the static sample otherwise
  const baseItems = tickerItems || TICKER_ITEMS;
  const allItems = [...baseItems, ...baseItems];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&family=Outfit:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .lp-root{background:#03060d;color:#94a3b8;font-family:'Syne',sans-serif;min-height:100vh;overflow-x:hidden}
        .lp-root ::-webkit-scrollbar{width:3px}
        .lp-root ::-webkit-scrollbar-thumb{background:#0891b2;border-radius:99px}

        .lp-nav{display:flex;align-items:center;justify-content:space-between;padding:16px 44px;border-bottom:1px solid rgba(255,255,255,0.05);position:sticky;top:0;z-index:100;background:rgba(3,6,13,0.92);backdrop-filter:blur(10px)}
        .lp-logo{display:flex;align-items:center;gap:10px;font-family:'Syne',sans-serif;font-weight:800;font-size:15px;color:#f1f5f9;letter-spacing:-.02em}
        .lp-logo-text{font-family:'Outfit',sans-serif!important;font-weight:700;font-size:20px;letter-spacing:.01em}
        .lp-logo-box{display:flex;align-items:center;justify-content:center}
        .lp-nav-r{display:flex;gap:10px}
        .lp-btn-ghost{background:none;border:1px solid rgba(255,255,255,0.09);color:#475569;padding:7px 18px;border-radius:5px;font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:.15s;letter-spacing:.01em}
        .lp-btn-ghost:hover{border-color:rgba(8,145,178,0.35);color:#94a3b8}
        .lp-btn-solid{background:#0891b2;border:none;color:#fff;padding:7px 18px;border-radius:5px;font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:.2s;box-shadow:0 0 18px rgba(8,145,178,0.3);letter-spacing:.01em}
        .lp-btn-solid:hover{background:#0e7490;box-shadow:0 0 28px rgba(8,145,178,0.5);transform:translateY(-1px)}

        .lp-hero{display:grid;grid-template-columns:1fr 1fr;min-height:calc(100vh - 53px);position:relative;overflow:hidden;align-items:center}
        .lp-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
        .lp-grid-ov{position:absolute;inset:0;background-image:linear-gradient(rgba(8,145,178,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(8,145,178,0.04) 1px,transparent 1px);background-size:44px 44px;pointer-events:none;z-index:0}
        .lp-scan{position:absolute;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(8,145,178,0.55),transparent);animation:lp-scn 7s linear infinite;pointer-events:none;z-index:1}
        @keyframes lp-scn{0%{top:-2px;opacity:0}5%{opacity:1}95%{opacity:1}100%{top:100%;opacity:0}}
        .lp-glow{position:absolute;top:40%;left:30%;transform:translate(-50%,-50%);width:700px;height:600px;background:radial-gradient(ellipse,rgba(8,145,178,0.1) 0%,transparent 60%);pointer-events:none;z-index:0}

        .lp-hero-l{position:relative;z-index:2;padding:60px 56px 60px 60px;display:flex;flex-direction:column;justify-content:center;border-right:1px solid rgba(8,145,178,0.1);height:100%;align-self:stretch}
        .lp-eyebrow{display:flex;align-items:center;gap:10px;margin-bottom:24px;opacity:0;transform:translateY(12px);transition:.55s ease}
        .lp-eyebrow.lp-in{opacity:1;transform:translateY(0)}
        .lp-ey-line{height:1px;width:28px;background:#0891b2}
        .lp-ey-txt{font-family:'DM Mono',monospace;font-size:10px;color:#0891b2;letter-spacing:.16em;text-transform:uppercase}
        .lp-ey-dot{width:5px;height:5px;border-radius:50%;background:#22d3ee;animation:lp-bl 2s ease-in-out infinite;margin-left:4px}
        @keyframes lp-bl{0%,100%{opacity:1}50%{opacity:.15}}

        .lp-big-1{font-family:'Bebas Neue',sans-serif;font-size:clamp(56px,8vw,96px);color:#f8fafc;line-height:.94;letter-spacing:.01em;opacity:0;transform:translateY(24px);transition:.75s .08s ease}
        .lp-big-1.lp-in{opacity:1;transform:translateY(0)}
        .lp-big-2{font-family:'Bebas Neue',sans-serif;font-size:clamp(56px,8vw,96px);color:#0891b2;line-height:.94;letter-spacing:.01em;display:block;opacity:0;transform:translateY(24px);transition:.75s .18s ease}
        .lp-big-2.lp-in{opacity:1;transform:translateY(0)}
        .lp-big-3{font-family:'Bebas Neue',sans-serif;font-size:clamp(56px,8vw,96px);color:rgba(255,255,255,0.18);line-height:.94;letter-spacing:.01em;display:block;opacity:0;transform:translateY(24px);transition:.75s .28s ease}
        .lp-big-3.lp-in{opacity:1;transform:translateY(0)}

        .lp-sub{font-size:14px;line-height:1.8;color:#64748b;max-width:400px;margin:24px 0 32px;font-family:'DM Mono',monospace;font-weight:300;opacity:0;transform:translateY(12px);transition:.55s .38s ease}
        .lp-sub.lp-in{opacity:1;transform:translateY(0)}
        .lp-ctas{display:flex;gap:12px;flex-wrap:wrap;opacity:0;transition:.5s .5s ease}
        .lp-ctas.lp-in{opacity:1}
        .lp-cta-main{display:inline-flex;align-items:center;gap:10px;padding:12px 24px;background:linear-gradient(135deg,#0891b2,#0e7490);color:#fff;border:none;border-radius:8px;font-family:'Syne',sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:.2s;box-shadow:0 0 28px rgba(8,145,178,0.35),inset 0 1px 0 rgba(255,255,255,0.12);letter-spacing:-.01em}
        .lp-cta-main:hover{background:linear-gradient(135deg,#0e7490,#0891b2);box-shadow:0 0 48px rgba(8,145,178,0.55);transform:translateY(-2px)}
        .lp-cta-outline{display:inline-flex;align-items:center;gap:10px;padding:12px 24px;background:rgba(8,145,178,0.06);color:#22d3ee;border:1px solid rgba(8,145,178,0.3);border-radius:8px;font-family:'Syne',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:.2s;letter-spacing:-.01em}
        .lp-cta-outline:hover{background:rgba(8,145,178,0.12);border-color:rgba(8,145,178,0.55);transform:translateY(-2px)}
        .lp-term-badge{display:inline-flex;align-items:center;gap:9px;font-family:'DM Mono',monospace;font-size:11px;color:#475569;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);padding:7px 14px;border-radius:4px;margin-top:20px;opacity:0;transition:.5s .9s ease}
        .lp-term-badge.lp-in{opacity:1}
        .lp-tb-dot{width:6px;height:6px;border-radius:50%;background:#22d3ee;animation:lp-bl 1.5s infinite;display:inline-block}
        .lp-tb-t span{color:#22d3ee}

        .lp-hero-r{position:relative;z-index:2;padding:28px 52px 48px 44px;display:flex;flex-direction:column;justify-content:center;background:rgba(3,6,13,0.3);height:100%;align-self:stretch}
        .lp-terminal{background:#030810;border:1px solid rgba(8,145,178,0.18);border-radius:10px;overflow:hidden;opacity:0;transform:translateX(22px) translateY(18px);transition:.75s .15s ease;margin-top:-40px}
        .lp-terminal.lp-in{opacity:1;transform:translateX(0) translateY(0)}
        .lp-t-bar{display:flex;align-items:center;gap:7px;padding:11px 16px;background:rgba(8,145,178,0.05);border-bottom:1px solid rgba(8,145,178,0.1)}
        .lp-t-dot{width:10px;height:10px;border-radius:50%}
        .lp-t-title{font-family:'DM Mono',monospace;font-size:10px;color:#475569;margin-left:8px;letter-spacing:.06em}
        .lp-t-live{margin-left:auto;display:flex;align-items:center;gap:5px;font-family:'DM Mono',monospace;font-size:9px;color:#0891b2}
        .lp-t-live-dot{width:5px;height:5px;border-radius:50%;background:#22d3ee;animation:lp-bl 1.2s infinite;display:inline-block}
        .lp-t-body{padding:20px;min-height:320px;max-height:360px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#0891b2 transparent}
        .lp-t-line{font-family:'DM Mono',monospace;font-size:11.5px;line-height:1.9;display:flex;align-items:baseline;gap:10px}
        .lp-t-prompt{color:#0891b2;flex-shrink:0}
        .lp-t-cmd{color:#94a3b8}
        .lp-t-out{padding-left:22px;font-size:11px;line-height:1.85;font-family:'DM Mono',monospace}
        .lp-t-ok{color:#22d3ee}.lp-t-warn{color:#f59e0b}.lp-t-info{color:#38bdf8}.lp-t-dim{color:#475569}
        .lp-t-cursor{display:inline-block;width:7px;height:13px;background:#0891b2;animation:lp-cur .85s step-end infinite;vertical-align:middle;margin-left:2px;border-radius:1px}
        @keyframes lp-cur{0%,100%{opacity:1}50%{opacity:0}}

        .lp-ticker-wrap{overflow:hidden;border-top:1px solid rgba(255,255,255,0.04);border-bottom:1px solid rgba(255,255,255,0.04);height:34px;display:flex;align-items:center;background:rgba(3,6,13,0.6)}
        .lp-ticker{display:flex;align-items:center;white-space:nowrap;animation:lp-tick 22s linear infinite}
        @keyframes lp-tick{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        .lp-ti{font-family:'DM Mono',monospace;font-size:10px;color:#475569;padding:0 32px;display:flex;align-items:center;gap:8px}
        .lp-ti span{color:#0891b2}

        .lp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.05)}
        .lp-stat{background:#03060d;padding:28px 20px;text-align:center;transition:.2s}
        .lp-stat:hover{background:rgba(8,145,178,0.04)}
        .lp-stat-v{font-family:'Bebas Neue',sans-serif;font-size:48px;color:#22d3ee;letter-spacing:.02em;line-height:1;margin-bottom:6px}
        .lp-stat-pct{font-size:28px}
        .lp-stat-l{font-family:'DM Mono',monospace;font-size:10px;color:#475569;text-transform:uppercase;letter-spacing:.14em}

        .lp-feats{padding:72px 44px 80px;max-width:1100px;margin:0 auto}
        .lp-sec-tag{font-family:'DM Mono',monospace;font-size:10px;color:#0891b2;letter-spacing:.16em;text-transform:uppercase;margin-bottom:10px}
        .lp-sec-head{font-family:'Bebas Neue',sans-serif;font-size:clamp(40px,6vw,68px);color:#f8fafc;letter-spacing:.02em;line-height:.98;margin-bottom:12px}
        .lp-sec-sub{font-size:13px;color:#475569;max-width:420px;line-height:1.8;margin-bottom:48px;font-family:'DM Mono',monospace}
        .lp-feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.05);border-radius:10px;overflow:hidden}
        .lp-feat{background:#03060d;padding:32px 28px;position:relative;overflow:hidden;opacity:0;transform:translateY(18px);transition:opacity .5s ease,transform .5s ease,background .2s}
        .lp-feat-vis{opacity:1;transform:translateY(0)}
        .lp-feat::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(8,145,178,0.5),transparent);opacity:0;transition:.2s}
        .lp-feat:hover{background:rgba(8,145,178,0.05)}
        .lp-feat:hover::before{opacity:1}
        .lp-feat-num{font-family:'DM Mono',monospace;font-size:10px;color:#0891b2;margin-bottom:14px;letter-spacing:.08em}
        .lp-feat-title{font-size:15px;font-weight:700;color:#f1f5f9;letter-spacing:-.02em;margin-bottom:8px}
        .lp-feat-desc{font-size:12px;color:#64748b;line-height:1.8;font-family:'DM Mono',monospace}

        .lp-cta-sec{text-align:center;padding:80px 44px;position:relative;overflow:hidden;border-top:1px solid rgba(255,255,255,0.04)}
        .lp-cta-bg{position:absolute;font-family:'Bebas Neue',sans-serif;font-size:180px;color:rgba(255,255,255,0.02);top:50%;left:50%;transform:translate(-50%,-50%);white-space:nowrap;pointer-events:none;letter-spacing:.05em}
        .lp-cta-glow{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:300px;background:radial-gradient(ellipse,rgba(8,145,178,0.09) 0%,transparent 65%);pointer-events:none}
        .lp-cta-head{font-family:'Bebas Neue',sans-serif;font-size:clamp(40px,7vw,72px);color:#f8fafc;letter-spacing:.02em;margin-bottom:10px;position:relative;line-height:1}
        .lp-cta-sub{font-size:12px;color:#475569;margin-bottom:32px;position:relative;font-family:'DM Mono',monospace;letter-spacing:.06em}
        .lp-cta-big{display:inline-flex;align-items:center;gap:10px;padding:15px 38px;background:#0891b2;color:#fff;border:none;border-radius:6px;font-family:'Syne',sans-serif;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 0 50px rgba(8,145,178,0.4);transition:.2s;position:relative;letter-spacing:-.01em}
        .lp-cta-big:hover{background:#0e7490;box-shadow:0 0 72px rgba(8,145,178,0.6);transform:translateY(-2px)}

        .lp-foot{border-top:1px solid rgba(255,255,255,0.04);padding:18px 44px;display:flex;align-items:center;justify-content:space-between}
        .lp-foot-l{font-family:'DM Mono',monospace;font-size:10px;color:#e2e8f0}
        .lp-foot-links{display:flex;gap:20px}
        .lp-foot-a{font-family:'DM Mono',monospace;font-size:10px;color:#e2e8f0;background:none;border:none;cursor:pointer;transition:.15s;padding:0}
        .lp-foot-a:hover{color:#22d3ee}

        .lp-theme-toggle{background:none;border:1px solid rgba(255,255,255,0.09);color:#64748b;width:34px;height:34px;border-radius:6px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:.2s;flex-shrink:0;line-height:1}
        .lp-theme-toggle:hover{border-color:rgba(8,145,178,0.4);color:#94a3b8}

        /* ── LIGHT THEME ─────────────────────────────────────────────── */
        .lp-light{background:#f1f5f9;color:#64748b}
        .lp-light .lp-nav{background:rgba(241,245,249,0.97);border-bottom-color:rgba(0,0,0,0.07)}
        .lp-light .lp-logo{color:#0f172a}
        .lp-light .lp-btn-ghost{border-color:rgba(0,0,0,0.12);color:#64748b}
        .lp-light .lp-btn-ghost:hover{border-color:rgba(8,145,178,0.45);color:#0891b2}
        .lp-light .lp-btn-solid{background:#f97316;box-shadow:0 0 18px rgba(249,115,22,0.3)}
        .lp-light .lp-btn-solid:hover{background:#ea580c;box-shadow:0 0 28px rgba(249,115,22,0.5)}
        .lp-light .lp-theme-toggle{border-color:rgba(0,0,0,0.1)}
        .lp-light .lp-theme-toggle:hover{border-color:rgba(8,145,178,0.4);color:#0891b2}

        .lp-light .lp-grid-ov{background-image:linear-gradient(rgba(8,145,178,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(8,145,178,0.06) 1px,transparent 1px)}
        .lp-light .lp-scan{background:linear-gradient(90deg,transparent,rgba(8,145,178,0.4),transparent)}
        .lp-light .lp-glow{background:radial-gradient(ellipse,rgba(8,145,178,0.07) 0%,transparent 60%)}
        .lp-light .lp-hero-l{border-right-color:rgba(8,145,178,0.15)}
        .lp-light .lp-hero-r{background:rgba(241,245,249,0.5)}

        .lp-light .lp-ey-line{background:#f97316}
        .lp-light .lp-ey-txt{color:#f97316}
        .lp-light .lp-ey-dot{background:#22d3ee}
        .lp-light .lp-big-1{color:#0f172a}
        .lp-light .lp-big-2{color:#f97316}
        .lp-light .lp-big-3{color:rgba(8,145,178,0.35)}
        .lp-light .lp-sub{color:#475569}
        .lp-light .lp-cta-main{background:linear-gradient(135deg,#f97316,#ea580c);box-shadow:0 0 28px rgba(249,115,22,0.35),inset 0 1px 0 rgba(255,255,255,0.18)}
        .lp-light .lp-cta-main:hover{background:linear-gradient(135deg,#ea580c,#f97316);box-shadow:0 0 48px rgba(249,115,22,0.55)}
        .lp-light .lp-cta-outline{color:#0891b2;border-color:rgba(8,145,178,0.35);background:rgba(8,145,178,0.06)}
        .lp-light .lp-cta-outline:hover{background:rgba(8,145,178,0.12);border-color:rgba(8,145,178,0.55)}
        .lp-light .lp-term-badge{border-color:rgba(0,0,0,0.09);background:rgba(0,0,0,0.03);color:#64748b}
        .lp-light .lp-tb-dot{background:#0891b2}
        .lp-light .lp-tb-t span{color:#0891b2}

        .lp-light .lp-terminal{background:#ffffff;border-color:rgba(8,145,178,0.25)}
        .lp-light .lp-t-bar{background:rgba(8,145,178,0.05);border-bottom-color:rgba(8,145,178,0.12)}
        .lp-light .lp-t-title{color:#94a3b8}
        .lp-light .lp-t-live{color:#0891b2}
        .lp-light .lp-t-live-dot{background:#22d3ee}
        .lp-light .lp-t-body{scrollbar-color:#f97316 transparent}
        .lp-light .lp-t-prompt{color:#f97316}
        .lp-light .lp-t-cmd{color:#334155}
        .lp-light .lp-t-ok{color:#0891b2}
        .lp-light .lp-t-warn{color:#d97706}
        .lp-light .lp-t-info{color:#0369a1}
        .lp-light .lp-t-dim{color:#94a3b8}
        .lp-light .lp-t-cursor{background:#f97316}

        .lp-light .lp-ticker-wrap{background:#e2e8f0;border-top-color:rgba(0,0,0,0.06);border-bottom-color:rgba(0,0,0,0.06)}
        .lp-light .lp-ti{color:#64748b}
        .lp-light .lp-ti span{color:#0891b2}

        .lp-light .lp-stats{background:rgba(0,0,0,0.07)}
        .lp-light .lp-stat{background:#f8fafc}
        .lp-light .lp-stat:hover{background:rgba(8,145,178,0.05)}
        .lp-light .lp-stat-v{color:#f97316}
        .lp-light .lp-stat-l{color:#64748b}

        .lp-light .lp-feats{background:#f1f5f9}
        .lp-light .lp-sec-tag{color:#f97316}
        .lp-light .lp-sec-head{color:#0f172a}
        .lp-light .lp-sec-head span{color:rgba(0,0,0,0.07)}
        .lp-light .lp-sec-sub{color:#64748b}
        .lp-light .lp-feat-grid{background:rgba(0,0,0,0.07);border-color:rgba(0,0,0,0.07)}
        .lp-light .lp-feat{background:#ffffff}
        .lp-light .lp-feat::before{background:linear-gradient(90deg,transparent,rgba(8,145,178,0.5),transparent)}
        .lp-light .lp-feat:hover{background:rgba(8,145,178,0.04)}
        .lp-light .lp-feat-num{color:#f97316}
        .lp-light .lp-feat-title{color:#0f172a}
        .lp-light .lp-feat-desc{color:#64748b}

        .lp-light .lp-cta-sec{border-top-color:rgba(0,0,0,0.06);background:#fff}
        .lp-light .lp-cta-bg{color:rgba(0,0,0,0.025)}
        .lp-light .lp-cta-glow{background:radial-gradient(ellipse,rgba(8,145,178,0.07) 0%,transparent 65%)}
        .lp-light .lp-cta-head{color:#0f172a}
        .lp-light .lp-cta-sub{color:#64748b}
        .lp-light .lp-cta-big{background:#f97316;box-shadow:0 0 50px rgba(249,115,22,0.35)}
        .lp-light .lp-cta-big:hover{background:#ea580c;box-shadow:0 0 72px rgba(249,115,22,0.55)}

        .lp-light .lp-foot{border-top-color:rgba(0,0,0,0.06);background:#e2e8f0}
        .lp-light .lp-foot-l{color:#1e293b}
        .lp-light .lp-foot-a{color:#1e293b}
        .lp-light .lp-foot-a:hover{color:#0891b2}

        @media(max-width:860px){.lp-hero{grid-template-columns:1fr}.lp-hero-r{display:none}.lp-stats{grid-template-columns:repeat(2,1fr)}.lp-feat-grid{grid-template-columns:1fr 1fr}}
        @media(max-width:560px){.lp-feat-grid{grid-template-columns:1fr}.lp-stats{grid-template-columns:repeat(2,1fr)}.lp-nav{padding:14px 20px}.lp-hero-l{padding:50px 20px}.lp-feats{padding:50px 20px 60px}}
      `}</style>

      <div className={`lp-root${!dark ? ' lp-light' : ''}`}>
        <nav className="lp-nav">
          <div className="lp-logo">
            <div className="lp-logo-box"><img src="/logo-1.png" alt="InStore Optima" style={{height:32,objectFit:'contain'}} /></div>
            <span className="lp-logo-text">InStore Optima</span>
          </div>
          <div className="lp-nav-r">
            <ZoomControl zoom={zoom} setZoom={setZoom} />
            <button type="button" className="lp-theme-toggle" onClick={toggleTheme} title="Toggle theme">
              {dark ? '☀️' : '🌙'}
            </button>
            <button className="lp-btn-ghost" onClick={() => setSupportOpen(true)}>Support</button>
            <button className="lp-btn-ghost" onClick={() => navigate("/login")}>Sign in</button>
            <button className="lp-btn-solid" onClick={() => navigate("/register")}>Get started</button>
          </div>
        </nav>

        <section className="lp-hero">
          <canvas ref={canvasRef} className="lp-canvas" />
          <div className="lp-grid-ov" />
          <div className="lp-glow" />
          <div className="lp-scan" />

          <div className="lp-hero-l">
            <div className={`lp-eyebrow ${heroIn ? "lp-in" : ""}`}>
              <div className="lp-ey-line" />
              <span className="lp-ey-txt">Intelligent Inventory System</span>
              <span className="lp-ey-dot" />
            </div>
            <div className={`lp-big-1 ${heroIn ? "lp-in" : ""}`}>SHELF</div>
            <span className={`lp-big-2 ${heroIn ? "lp-in" : ""}`}>PERFECT.</span>
            <span className={`lp-big-3 ${heroIn ? "lp-in" : ""}`}>ALWAYS.</span>
            <p className={`lp-sub ${heroIn ? "lp-in" : ""}`}>
              Automated replenishment. Real-time tracking. Complete financial pipeline. Built for retail teams that can't afford stockouts.
            </p>
            <div className={`lp-ctas ${heroIn ? "lp-in" : ""}`}>
              <button className="lp-cta-main" onClick={() => navigate("/login")}>
                Sign In
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button className="lp-cta-outline" onClick={() => navigate("/register")}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Create account
              </button>
            </div>
            <div className={`lp-term-badge ${heroIn ? "lp-in" : ""}`}>
              <span className="lp-tb-dot" />
              <span className="lp-tb-t">system.status → <span>OPERATIONAL</span></span>
            </div>
          </div>

          <div className="lp-hero-r">
            <Terminal />
          </div>
        </section>

        <div className="lp-ticker-wrap">
          <div className="lp-ticker">
            {allItems.map(([icon, text], i) => (
              <div className="lp-ti" key={i}>
                <span>{icon}</span>{text}
              </div>
            ))}
          </div>
        </div>

        <div className="lp-stats" ref={statsRef}>
          <StatBox target={14}  label="Modules"           duration={1700} started={statsVisible} />
          <StatBox target={3}   label="Role levels"       duration={1100} started={statsVisible} />
          <StatBox target={100} label="Auto replenishment" duration={2100} started={statsVisible} />
          <div className="lp-stat"><div className="lp-stat-v">0</div><div className="lp-stat-l">Stockouts</div></div>
        </div>

        <section className="lp-feats">
          <div className="lp-sec-tag">// core capabilities</div>
          <div className="lp-sec-head">SIX MODULES.<br /><span style={{ color: "#0f172a" }}>ONE SYSTEM.</span></div>
          <p className="lp-sec-sub">From the first product in the catalog to the last receipt printed — every step of your store's operation, covered.</p>
          <div className="lp-feat-grid">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={`${i * 70}ms`} />
            ))}
          </div>
        </section>

        <section className="lp-cta-sec">
          <div className="lp-cta-bg">IO</div>
          <div className="lp-cta-glow" />
          <div className="lp-cta-head">READY TO TAKE<br />CONTROL?</div>
          <div className="lp-cta-sub">sign_in() if you have an account — or register() to get started.</div>
          <button className="lp-cta-big" onClick={() => navigate("/login")}>
            Enter InStore Optima
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </section>

        <footer className="lp-foot">
          <div className="lp-foot-l">© 2026 InStore Optima · Intelligent Inventory Management</div>
          <div className="lp-foot-links">
            <button className="lp-foot-a" onClick={() => navigate("/login")}>sign_in()</button>
            <button className="lp-foot-a" onClick={() => navigate("/register")}>register()</button>
            <button className="lp-foot-a" onClick={() => setSupportOpen(true)}>contact_support()</button>
          </div>
        </footer>
      </div>

      <ContactSupportModal show={supportOpen} onHide={() => setSupportOpen(false)} />
    </>
  );
}