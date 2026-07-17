import { useState, useEffect, useRef, useCallback } from "react";

// ─── STYLES ───────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;900&family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body,#root{height:100%;overflow-x:hidden;width:100%;}
  body{background:#0F171E;font-family:'Outfit',sans-serif;overflow-x:hidden;}
  ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:#3D5166;border-radius:2px;}
  input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
  @keyframes cardIn{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
  @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
  @keyframes cashoutPulse{0%,100%{transform:scale(1);box-shadow:0 4px 28px rgba(255,77,109,0.5)}50%{transform:scale(1.015);box-shadow:0 6px 40px rgba(255,77,109,0.75)}}
  @keyframes historySlideIn{from{opacity:0;transform:translateY(30px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes historyRowIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
  @keyframes winFlash{0%{background:rgba(6,214,160,0.4)}100%{background:rgba(6,214,160,0.1)}}
  @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
  @keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  .nav-btn:hover{color:#FFF!important;background:rgba(255,255,255,0.07)!important;}
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fluctuate(v) { return Math.max(1.01, Math.round((v + (Math.random() - 0.49) * 0.06) * 100) / 100); }
function fluctuateFancy(v, mn, mx) { return Math.max(mn, Math.min(mx, v + Math.round((Math.random() - 0.5) * 3))); }
const sportIcon = s => ({ cricket: "🏏", football: "⚽", tennis: "🎾", kabaddi: "🤼", aviator: "✈️" }[s] || "🎰");
const now = new Date();
const ft = d => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ toasts, removeToast }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", gap: 8, zIndex: 9999, maxWidth: 340 }}>
      {toasts.map(t => (
        <div key={t.id} onClick={() => removeToast(t.id)}
          style={{ background: t.type === "error" ? "rgba(232,68,90,0.95)" : t.type === "success" ? "rgba(6,214,160,0.95)" : "rgba(26,36,47,0.97)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#fff", fontWeight: 600, cursor: "pointer", backdropFilter: "blur(12px)", boxShadow: "0 4px 20px rgba(0,0,0,0.4)", animation: "slideIn 0.3s ease" }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}


// ─── MINES GAME (Stake-style) ─────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════════════════
// SHARED CASINO SHELL — same dark header + layout used by all games
// ══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// LUXURY CASINO GAMES — HukamBook Premium
// Dark gold aesthetic, velvet textures, real card animations
// ═══════════════════════════════════════════════════════════════════════════════

const CASINO_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&family=DM+Mono:wght@400;500;700&family=Outfit:wght@300;400;600;700;800&display=swap');

  @keyframes gemReveal {
    0%  { transform: scale(0) rotateY(180deg); opacity: 0; }
    60% { transform: scale(1.15) rotateY(-8deg); }
    100%{ transform: scale(1) rotateY(0deg); opacity: 1; }
  }
  @keyframes bombShake {
    0%,100%{ transform: translate(0,0) rotate(0deg); }
    20%    { transform: translate(-6px,0) rotate(-8deg); }
    40%    { transform: translate(6px,0) rotate(8deg); }
    60%    { transform: translate(-4px,0) rotate(-4deg); }
    80%    { transform: translate(4px,0) rotate(4deg); }
  }
  @keyframes cardDeal {
    0%  { transform: translateY(-60px) rotateZ(-8deg) scale(0.85); opacity: 0; }
    70% { transform: translateY(4px) rotateZ(1deg) scale(1.02); }
    100%{ transform: translateY(0) rotateZ(0deg) scale(1); opacity: 1; }
  }
  @keyframes winGlow {
    0%,100%{ box-shadow: 0 0 20px rgba(212,175,55,0.4); }
    50%    { box-shadow: 0 0 50px rgba(212,175,55,0.9), 0 0 80px rgba(212,175,55,0.3); }
  }
  @keyframes spinWheel {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes goldPulse {
    0%,100%{ opacity: 1; }
    50%    { opacity: 0.6; }
  }
  @keyframes resultPop {
    0%  { transform: scale(0.6) translateY(20px); opacity: 0; }
    65% { transform: scale(1.08) translateY(-4px); }
    100%{ transform: scale(1) translateY(0); opacity: 1; }
  }
  @keyframes chipBounce {
    0%  { transform: translateY(0) scale(1); }
    40% { transform: translateY(-12px) scale(1.08); }
    100%{ transform: translateY(0) scale(1); }
  }
  @keyframes tableShimmer {
    0%  { background-position: -200% center; }
    100%{ background-position: 200% center; }
  }
  @keyframes balanceUpdate {
    0%  { transform: scale(1); }
    50% { transform: scale(1.12); color: #06d6a0; }
    100%{ transform: scale(1); }
  }
  @keyframes dealerFlip {
    0%  { transform: rotateY(90deg); }
    100%{ transform: rotateY(0deg); }
  }
  .casino-tile:hover { transform: translateY(-3px) scale(1.04) !important; }
  .casino-tile:active { transform: scale(0.97) !important; }
  .bet-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
  .bet-btn:active { transform: scale(0.97); }
`;

// ── SHARED: Luxury Card Component ──────────────────────────────────────────────
function LuxuryCard({ card, hidden = false, small = false, delay = 0, faceUp = true }) {
  const w = small ? 44 : 68;
  const h = small ? 62 : 96;
  const fs = small ? 18 : 28;
  const rfs = small ? 10 : 14;
  const isRed = card && (card.s === "♥" || card.s === "♦");

  return (
    <div style={{
      width: w, height: h, borderRadius: small ? 7 : 11, flexShrink: 0, position: "relative",
      animation: hidden ? "none" : `cardDeal 0.45s ${delay}s cubic-bezier(0.22,1,0.36,1) both`,
      transformStyle: "preserve-3d",
    }}>
      {hidden ? (
        <div style={{ width: "100%", height: "100%", borderRadius: small ? 7 : 11, background: "linear-gradient(135deg,#1a1060,#0d0840)", border: "1.5px solid rgba(100,80,200,0.4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px rgba(0,0,0,0.6)", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(45deg,rgba(255,255,255,0.03) 0,rgba(255,255,255,0.03) 2px,transparent 2px,transparent 10px)", borderRadius: small ? 6 : 10 }} />
          <div style={{ fontSize: small ? 20 : 30, opacity: 0.4 }}>🂠</div>
        </div>
      ) : (
        <div style={{ width: "100%", height: "100%", borderRadius: small ? 7 : 11, background: "linear-gradient(160deg,#fff 0%,#f8f6f0 100%)", border: `1.5px solid ${isRed ? "rgba(185,28,28,0.2)" : "rgba(30,30,30,0.2)"}`, boxShadow: "0 6px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
          {/* Corner rank top-left */}
          <div style={{ position: "absolute", top: small ? 3 : 5, left: small ? 4 : 6, textAlign: "center", lineHeight: 1 }}>
            <div style={{ fontSize: rfs, fontWeight: 900, color: isRed ? "#b91c1c" : "#1a1a2e", fontFamily: "'Playfair Display',serif" }}>{card.r}</div>
            <div style={{ fontSize: small ? 8 : 11, color: isRed ? "#b91c1c" : "#1a1a2e" }}>{card.s}</div>
          </div>
          {/* Center suit */}
          <div style={{ fontSize: fs, color: isRed ? "#b91c1c" : "#1a1a2e", lineHeight: 1 }}>{card.s}</div>
          {/* Corner rank bottom-right (rotated) */}
          <div style={{ position: "absolute", bottom: small ? 3 : 5, right: small ? 4 : 6, textAlign: "center", lineHeight: 1, transform: "rotate(180deg)" }}>
            <div style={{ fontSize: rfs, fontWeight: 900, color: isRed ? "#b91c1c" : "#1a1a2e", fontFamily: "'Playfair Display',serif" }}>{card.r}</div>
            <div style={{ fontSize: small ? 8 : 11, color: isRed ? "#b91c1c" : "#1a1a2e" }}>{card.s}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SHARED: Casino Layout Shell ────────────────────────────────────────────────
function CasinoShell({ title, subtitle, icon, balance, onClose, children, leftPanel }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", flexDirection: "column", fontFamily: "'Outfit',sans-serif", background: "#080c10", overflow: "hidden" }}>
      <style>{CASINO_CSS}</style>

      {/* Gold top accent line */}
      <div style={{ height: 2, background: "linear-gradient(90deg,transparent,#d4af37,#f5e678,#d4af37,transparent)", flexShrink: 0 }} />

      {/* Header */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", background: "linear-gradient(180deg,#0f1520 0%,#080c10 100%)", borderBottom: "1px solid rgba(212,175,55,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#d4af37,#8b6914)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 0 20px rgba(212,175,55,0.5), inset 0 1px 0 rgba(255,255,255,0.2)" }}>{icon}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f0e6c8", fontFamily: "'Playfair Display',serif", letterSpacing: 1 }}>{title}</div>
            <div style={{ fontSize: 9, color: "rgba(212,175,55,0.6)", letterSpacing: 2, textTransform: "uppercase", marginTop: 1 }}>{subtitle || "Hukam Bet Premium"}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Balance */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "linear-gradient(135deg,rgba(212,175,55,0.1),rgba(212,175,55,0.05))", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 10 }}>
            <span style={{ fontSize: 12, color: "rgba(212,175,55,0.6)" }}>💰</span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: "#d4af37" }}>₹{balance.toLocaleString()}</span>
          </div>
          <button onClick={onClose}
            style={{ width: 36, height: 36, border: "1px solid rgba(212,175,55,0.2)", borderRadius: 9, background: "rgba(255,255,255,0.04)", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(232,68,90,0.15)"; e.currentTarget.style.color = "#E8445A"; e.currentTarget.style.borderColor = "rgba(232,68,90,0.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; e.currentTarget.style.borderColor = "rgba(212,175,55,0.2)"; }}>✕</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {/* Left panel */}
        <div style={{ width: 230, flexShrink: 0, background: "linear-gradient(180deg,#0d1420 0%,#080c14 100%)", borderRight: "1px solid rgba(212,175,55,0.1)", display: "flex", flexDirection: "column", padding: "18px 14px", gap: 14, overflowY: "auto" }}>
          {leftPanel}
        </div>
        {/* Game area */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── SHARED: Gold Bet Input ─────────────────────────────────────────────────────
function GoldInput({ value, onChange, disabled }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: "rgba(212,175,55,0.6)", letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, marginBottom: 7 }}>Bet Amount</div>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#d4af37", fontSize: 14, fontWeight: 700 }}>₹</span>
        <input type="number" value={value} onChange={onChange} disabled={disabled}
          style={{ width: "100%", background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 9, padding: "11px 11px 11px 26px", color: "#f0e6c8", fontFamily: "'DM Mono',monospace", fontSize: 15, outline: "none", opacity: disabled ? 0.45 : 1, transition: "border-color 0.2s" }}
          onFocus={e => e.target.style.borderColor = "rgba(212,175,55,0.6)"}
          onBlur={e => e.target.style.borderColor = "rgba(212,175,55,0.25)"} />
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
        {[100, 500, 1000, 5000].map(v => (
          <button key={v} onClick={() => !disabled && onChange({ target: { value: String(v) } })} disabled={disabled}
            style={{ flex: 1, padding: "7px 2px", background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 6, color: "rgba(212,175,55,0.6)", fontSize: 9, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'DM Mono',monospace", fontWeight: 700, transition: "all 0.12s" }}
            onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = "rgba(212,175,55,0.18)"; e.currentTarget.style.color = "#d4af37"; } }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(212,175,55,0.07)"; e.currentTarget.style.color = "rgba(212,175,55,0.6)"; }}>
            {v >= 1000 ? v / 1000 + "K" : v}
          </button>
        ))}
      </div>
    </div>
  );
}

function GoldBtn({ onClick, disabled, children, variant = "gold", pulse = false }) {
  const bg = variant === "gold" ? "linear-gradient(135deg,#d4af37,#8b6914)" : variant === "green" ? "linear-gradient(135deg,#06d6a0,#00a870)" : variant === "red" ? "linear-gradient(135deg,#E8445A,#a0001a)" : "linear-gradient(135deg,#d4af37,#8b6914)";
  const glow = variant === "gold" ? "rgba(212,175,55,0.4)" : variant === "green" ? "rgba(6,214,160,0.35)" : "rgba(232,68,90,0.35)";
  return (
    <button onClick={onClick} disabled={disabled} className="bet-btn"
      style={{ width: "100%", padding: "13px", background: bg, border: "none", borderRadius: 10, fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 13, color: variant === "gold" ? "#1a0f00" : "#fff", cursor: disabled ? "not-allowed" : "pointer", letterSpacing: 0.8, textTransform: "uppercase", boxShadow: `0 4px 18px ${glow}, inset 0 1px 0 rgba(255,255,255,0.2)`, opacity: disabled ? 0.5 : 1, transition: "all 0.15s", animation: pulse ? "cashoutPulse 0.85s ease-in-out infinite" : "none" }}>
      {children}
    </button>
  );
}

function GoldDivider() {
  return <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(212,175,55,0.2),transparent)" }} />;
}

function ResultBadge({ pnl, stake, extra }) {
  const won = pnl > 0;
  const tie = pnl === 0;
  return (
    <div style={{ textAlign: "center", animation: "resultPop 0.5s cubic-bezier(0.22,1,0.36,1) both" }}>
      <div style={{ display: "inline-block", padding: "10px 28px", background: won ? "linear-gradient(135deg,rgba(6,214,160,0.15),rgba(6,214,160,0.05))" : tie ? "linear-gradient(135deg,rgba(212,175,55,0.15),rgba(212,175,55,0.05))" : "linear-gradient(135deg,rgba(232,68,90,0.15),rgba(232,68,90,0.05))", border: `1px solid ${won ? "rgba(6,214,160,0.4)" : tie ? "rgba(212,175,55,0.4)" : "rgba(232,68,90,0.4)"}`, borderRadius: 100 }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 900, color: won ? "#06d6a0" : tie ? "#d4af37" : "#E8445A", lineHeight: 1 }}>{won ? `+₹${pnl.toLocaleString()}` : tie ? "Tie" : `-₹${stake.toLocaleString()}`}</div>
        {extra && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{extra}</div>}
      </div>
    </div>
  );
}

function StatRow({ label, value, color = "#d4af37" }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 0.5 }}>{label}</span>
      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color, animation: "balanceUpdate 0.3s ease" }}>{value}</span>
    </div>
  );
}

function FairBadge() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", padding: "9px", background: "rgba(212,175,55,0.04)", borderRadius: 8, border: "1px solid rgba(212,175,55,0.1)", marginTop: "auto" }}>
      <span style={{ fontSize: 11 }}>🔒</span>
      <span style={{ fontSize: 9, color: "rgba(212,175,55,0.4)", letterSpacing: 1.5, fontWeight: 600 }}>PROVABLY FAIR</span>
    </div>
  );
}

// card deck helpers
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const newDeck = () => SUITS.flatMap(s => RANKS.map(r => ({ r, s }))).sort(() => Math.random() - 0.5);
const RANK_VAL = { A: 14, K: 13, Q: 12, J: 11, "10": 10, "9": 9, "8": 8, "7": 7, "6": 6, "5": 5, "4": 4, "3": 3, "2": 2 };
const BAC_VAL = r => ["10","J","Q","K"].includes(r) ? 0 : r === "A" ? 1 : parseInt(r) || 0;
const bacHand = cards => cards.reduce((s, c) => s + BAC_VAL(c.r), 0) % 10;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. MINES — Chrome/Platinum Elite design, 3D pressed-metal tiles
// ═══════════════════════════════════════════════════════════════════════════════
const MNS_GRID_SIZE = 25;
const MNS_MINE_OPTIONS = [1, 3, 5, 10, 15];
const MNS_HOUSE_EDGE = 0.97;

function mnsCalcMultiplier(minesCount, tilesRevealed) {
  let mult = 1;
  for (let i = 0; i < tilesRevealed; i++) mult *= (MNS_GRID_SIZE - minesCount - i) / (MNS_GRID_SIZE - i);
  return MNS_HOUSE_EDGE / mult;
}
function mnsFmtMult(m) { return m.toFixed(2) + "x"; }
function mnsFmtMoney(n) { return "₹" + Math.round(n).toLocaleString("en-IN"); }

function MinesGame({ balance, setBalance, addToast, onClose, addBetToHistory }) {
  const [betAmount, setBetAmount] = useState("100");
  const [mineCount, setMineCount] = useState(5);
  const [gameActive, setGameActive] = useState(false);
  const [minePositions, setMinePositions] = useState(new Set());
  const [revealedTiles, setRevealedTiles] = useState(new Map()); // idx -> "gem" | "mine-hit" | "mine-shown"
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [history, setHistory] = useState([]); // { won, mult }
  const [multSub, setMultSub] = useState("Pick a tile to begin");
  const [banner, setBanner] = useState({ show: false, type: "", text: "" });
  const [shakeIdx, setShakeIdx] = useState(null);
  const stakeRef = useRef(0);
  const bannerTimerRef = useRef(null);

  const nextMult = gameActive
    ? (MNS_GRID_SIZE - mineCount - revealedTiles.size > 0 ? mnsCalcMultiplier(mineCount, revealedTiles.size + 1) : currentMultiplier)
    : mnsCalcMultiplier(mineCount, 1);

  const flashBanner = (type, text) => {
    clearTimeout(bannerTimerRef.current);
    setBanner({ show: false, type, text });
    requestAnimationFrame(() => setBanner({ show: true, type, text }));
    bannerTimerRef.current = setTimeout(() => setBanner(b => ({ ...b, show: false })), 1800);
  };

  const startGame = () => {
    const bet = parseInt(betAmount) || 0;
    if (bet <= 0) { flashBanner("lose", "ENTER A VALID BET"); return; }
    if (bet > balance) { flashBanner("lose", "INSUFFICIENT BALANCE"); return; }

    setBalance(b => b - bet);
    stakeRef.current = bet;
    setGameActive(true);
    setRevealedTiles(new Map());
    setCurrentMultiplier(1.0);
    setShakeIdx(null);

    const positions = Array.from({ length: MNS_GRID_SIZE }, (_, i) => i);
    for (let i = positions.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[positions[i], positions[j]] = [positions[j], positions[i]]; }
    const mines = new Set(positions.slice(0, mineCount));
    setMinePositions(mines);
    setMultSub("Pick a tile to reveal");
  };

  const revealAllMines = (mines, hitIdx) => {
    setRevealedTiles(prev => {
      const next = new Map(prev);
      mines.forEach(idx => { if (idx !== hitIdx && !next.has(idx)) next.set(idx, "mine-shown"); });
      return next;
    });
  };

  const endGame = (won, hitIdx, mines, finalMult, stake) => {
    setGameActive(false);
    revealAllMines(mines || minePositions, hitIdx);

    if (won) {
      const payout = stake * finalMult;
      setBalance(b => b + payout);
      flashBanner("win", "WON " + mnsFmtMoney(payout));
      setHistory(h => [{ won: true, mult: finalMult }, ...h.slice(0, 9)]);
      setMultSub("Cashed out at " + mnsFmtMult(finalMult));
      addToast(`💎 Cashed out ${finalMult.toFixed(2)}x! Won ${mnsFmtMoney(payout)}`, "success");
      addBetToHistory({ sport: "mines", match: "Mines", selection: `${revealedTiles.size} gems`, type: "back", odds: +finalMult.toFixed(2), stake, pnl: payout - stake, result: "won" });
    } else {
      flashBanner("lose", "MINE HIT");
      setHistory(h => [{ won: false, mult: 0 }, ...h.slice(0, 9)]);
      setMultSub("Better luck next round");
      setCurrentMultiplier(0);
      addToast("💣 Boom! Mine hit!", "error");
      addBetToHistory({ sport: "mines", match: "Mines", selection: `${revealedTiles.size} gems, hit mine`, type: "back", odds: +finalMult.toFixed(2), stake, pnl: -stake, result: "lost" });
    }
  };

  const onTileClick = (index) => {
    if (!gameActive || revealedTiles.has(index)) return;

    if (minePositions.has(index)) {
      setRevealedTiles(prev => new Map(prev).set(index, "mine-hit"));
      setShakeIdx(index);
      endGame(false, index, minePositions, currentMultiplier, stakeRef.current);
      return;
    }

    const newRevealed = new Map(revealedTiles).set(index, "gem");
    setRevealedTiles(newRevealed);
    const revealedCount = newRevealed.size;
    const mult = mnsCalcMultiplier(mineCount, revealedCount);
    setCurrentMultiplier(mult);
    setMultSub(mnsFmtMoney(stakeRef.current * mult) + " if you cash out");

    const safeTilesLeft = MNS_GRID_SIZE - mineCount - revealedCount;
    if (safeTilesLeft <= 0) {
      // full clear — auto win at max multiplier
      setTimeout(() => endGame(true, null, minePositions, mult, stakeRef.current), 250);
    }
  };

  const cashOut = () => {
    if (!gameActive || revealedTiles.size === 0) return;
    endGame(true, null, minePositions, currentMultiplier, stakeRef.current);
  };

  const halfBet = () => setBetAmount(String(Math.max(10, Math.floor((parseInt(betAmount) || 0) / 2))));
  const doubleBet = () => setBetAmount(String(Math.min(balance, (parseInt(betAmount) || 0) * 2) || 100));

  const canCashOut = gameActive && revealedTiles.size > 0;
  const safeTilesLeft = MNS_GRID_SIZE - mineCount - revealedTiles.size;

  const mnsCss = `
    .mns-tile{ aspect-ratio:1; border-radius:14px; position:relative; cursor:pointer; border:none; padding:0;
      background:linear-gradient(155deg,#3a3c42 0%,#2a2b30 55%,#1a1b1e 100%);
      box-shadow:0 6px 0 rgba(0,0,0,0.45),0 8px 14px rgba(0,0,0,0.4),inset 0 1px 1px rgba(255,255,255,0.18),inset 0 -6px 10px rgba(0,0,0,0.25);
      transition:transform 0.08s ease, box-shadow 0.08s ease; overflow:hidden; }
    .mns-tile::before{ content:''; position:absolute; top:8%; left:12%; right:40%; height:22%;
      background:linear-gradient(180deg, rgba(255,255,255,0.35), transparent); border-radius:50%; filter:blur(3px); pointer-events:none; }
    .mns-tile:active:not(.mns-revealed):not(.mns-disabled){ transform:translateY(4px);
      box-shadow:0 2px 0 rgba(0,0,0,0.45),0 3px 6px rgba(0,0,0,0.4),inset 0 1px 1px rgba(255,255,255,0.1),inset 0 -3px 6px rgba(0,0,0,0.3); }
    .mns-disabled{ cursor:default; }
    .mns-tile-icon{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:20px;
      opacity:0; transform:scale(0.4) rotate(-20deg); transition:opacity 0.2s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1); }
    .mns-tile-icon.mns-show{ opacity:1; transform:scale(1) rotate(0deg); }
    .mns-tile.mns-gem{ background:linear-gradient(155deg,#33363b,#202226 55%,#131416 100%);
      box-shadow:0 2px 0 rgba(0,0,0,0.45),0 3px 10px rgba(232,234,237,0.15),inset 0 1px 1px rgba(255,255,255,0.12),inset 0 0 16px rgba(232,234,237,0.12); }
    .mns-tile.mns-gem .mns-tile-icon{ filter:drop-shadow(0 0 6px rgba(232,234,237,0.6)); }
    .mns-tile.mns-mine-hit{ background:linear-gradient(155deg,#3d2020,#26100f 55%,#150808 100%);
      box-shadow:0 2px 0 rgba(0,0,0,0.45),0 0 24px rgba(255,59,59,0.35),inset 0 1px 1px rgba(255,255,255,0.1),inset 0 0 20px rgba(255,59,59,0.2);
      animation:mnsShake 0.35s ease; }
    .mns-tile.mns-mine-hit .mns-tile-icon{ filter:drop-shadow(0 0 8px rgba(255,59,59,0.7)); }
    .mns-tile.mns-mine-shown{ background:linear-gradient(155deg,#2a2626,#1c1818 55%,#100e0e 100%); opacity:0.55; }
    .mns-tile.mns-mine-shown .mns-tile-icon{ opacity:0.7; transform:scale(1); }
    @keyframes mnsShake{ 0%,100%{transform:translateX(0);} 20%{transform:translateX(-4px) rotate(-1deg);} 40%{transform:translateX(4px) rotate(1deg);} 60%{transform:translateX(-3px);} 80%{transform:translateX(3px);} }
    .mns-tile-crack{ position:absolute; inset:0;
      background:linear-gradient(105deg, transparent 45%, rgba(255,59,59,0.5) 49%, transparent 53%), linear-gradient(20deg, transparent 60%, rgba(255,59,59,0.3) 63%, transparent 66%);
      opacity:0; transition:opacity 0.2s ease 0.1s; }
    .mns-tile.mns-mine-hit .mns-tile-crack{ opacity:1; }
    .mns-step-btn:active{ transform:scale(0.9); }
    .mns-mine-chip{ flex:1; text-align:center; padding:6px 0; border-radius:8px; font-family:'Orbitron',sans-serif; font-size:12px; font-weight:700;
      border:1px solid rgba(255,255,255,0.06); background:#2a2b30; color:#7c7f86; cursor:pointer; transition:all 0.15s; }
    .mns-mine-chip.mns-active{ background:linear-gradient(160deg,#e8eaed,#9a9fa8); color:#1a1b1d; border-color:transparent; box-shadow:0 3px 10px rgba(232,234,237,0.3); }
    .mns-main-action{ width:100%; padding:16px; border-radius:16px; border:none; font-family:'Orbitron',sans-serif; font-weight:700; font-size:15px; letter-spacing:1px; cursor:pointer; position:relative; overflow:hidden; transition:all 0.15s; }
    .mns-main-action.mns-play{ background:linear-gradient(160deg,#e8e9eb,#a5a8ad 60%,#7a7d82); color:#141517; box-shadow:0 6px 0 #4a4c50, 0 10px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.5); }
    .mns-main-action.mns-cashout{ background:linear-gradient(160deg,#f5f6f7,#e8eaed 55%,#9a9fa8); color:#141517; box-shadow:0 6px 0 #6a6d74, 0 10px 24px rgba(232,234,237,0.3), inset 0 1px 0 rgba(255,255,255,0.6); }
    .mns-main-action:active:not(:disabled){ transform:translateY(4px); box-shadow:0 2px 0 rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3); }
    .mns-main-action:disabled{ background:linear-gradient(160deg,#3a3b3f,#26272a); color:#7c7f86; box-shadow:0 6px 0 #1a1a1c; cursor:not-allowed; }
    .mns-cashout-sub{ font-size:11px; font-weight:600; display:block; margin-top:2px; letter-spacing:0.5px; }
    .mns-result-banner{ position:absolute; top:-14px; left:50%; transform:translateX(-50%) translateY(-10px); padding:10px 20px; border-radius:100px;
      font-family:'Orbitron',sans-serif; font-weight:700; font-size:13px; letter-spacing:0.5px; white-space:nowrap; opacity:0;
      transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1); pointer-events:none; z-index:5; }
    .mns-result-banner.mns-show{ opacity:1; transform:translateX(-50%) translateY(0); }
    .mns-result-banner.win{ background:linear-gradient(160deg,#f5f6f7,#e8eaed); color:#141517; box-shadow:0 6px 20px rgba(232,234,237,0.4); }
    .mns-result-banner.lose{ background:linear-gradient(160deg,#ff6b6b,#ff3b3b); color:#1a0808; box-shadow:0 6px 20px rgba(255,59,59,0.4); }
    .mns-hist-chip{ flex-shrink:0; font-family:'Orbitron',sans-serif; font-size:11px; font-weight:700; padding:6px 12px; border-radius:100px; border:1px solid rgba(255,255,255,0.06); }
    .mns-hist-chip.win{ color:#e8eaed; background:rgba(232,234,237,0.08); border-color:rgba(232,234,237,0.2); }
    .mns-hist-chip.lose{ color:#ff3b3b; background:rgba(255,59,59,0.08); border-color:rgba(255,59,59,0.2); }
    .mns-history-strip::-webkit-scrollbar{ display:none; }
  `;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(90,93,100,0.15), transparent), radial-gradient(ellipse 60% 40% at 90% 100%, rgba(232,234,237,0.05), transparent), #0a0a0c", color: "#c9cdd3", fontFamily: "'Rajdhani',sans-serif", overflowY: "auto" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');${mnsCss}`}</style>

      <div style={{ maxWidth: 520, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column", padding: "0 16px 32px" }}>

        {/* Topbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 4px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(145deg,#3a3c42,#2a2b30 60%,#151517)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 16, color: "#e8eaed", boxShadow: "0 4px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" }}>♠</div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 1.5, color: "#c9cdd3" }}>HUKAM<span style={{ color: "#e8eaed" }}>BOOK</span></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "linear-gradient(160deg,#232428,#1c1d21)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 100, padding: "8px 16px", display: "flex", alignItems: "center", gap: 8, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.3)" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#e8eaed", boxShadow: "0 0 8px #e8eaed" }} />
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 13, color: "#c9cdd3" }}>{mnsFmtMoney(balance)}</div>
            </div>
            <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(145deg,#3a3c42,#2a2b30)", border: "1px solid rgba(255,255,255,0.08)", color: "#c9cdd3", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#ff3b3b"; }} onMouseLeave={e => { e.currentTarget.style.color = "#c9cdd3"; }}>✕</button>
          </div>
        </div>

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "6px 4px 18px" }}>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 26, letterSpacing: 2, background: "linear-gradient(180deg,#f0f1f3,#9a9da3)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>MINES</div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#e8eaed", border: "1px solid rgba(232,234,237,0.3)", background: "rgba(232,234,237,0.06)", padding: "4px 9px", borderRadius: 6 }}>ELITE PLAY</div>
        </div>

        {/* Info cards */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, background: "linear-gradient(160deg, rgba(255,255,255,0.045), rgba(255,255,255,0.01))", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "12px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5, color: "#7c7f86", textTransform: "uppercase" }}>4.9 Rating</div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 16, color: "#c9cdd3", marginTop: 2 }}>Trusted</div>
          </div>
          <div style={{ flex: 1, background: "linear-gradient(160deg, rgba(255,255,255,0.045), rgba(255,255,255,0.01))", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "12px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5, color: "#7c7f86", textTransform: "uppercase" }}>Secure Checkout</div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 16, color: "#e8eaed", marginTop: 2 }}>Fast Payout</div>
          </div>
        </div>

        {/* Game panel */}
        <div style={{ background: "linear-gradient(160deg,#232428,#17181b)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 24, padding: 20, boxShadow: "0 20px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.4)", position: "relative" }}>

          {/* Result banner */}
          <div className={`mns-result-banner ${banner.type} ${banner.show ? "mns-show" : ""}`}>{banner.text}</div>

          {/* Multiplier strip */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, padding: "0 2px" }}>
            <div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 34, color: "#e8eaed", textShadow: "0 0 20px rgba(232,234,237,0.35)", lineHeight: 1, transition: "all 0.2s ease" }}>{mnsFmtMult(currentMultiplier)}</div>
              <div style={{ fontSize: 11, color: "#7c7f86", letterSpacing: 0.5, marginTop: 2 }}>{multSub}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#7c7f86", letterSpacing: 0.5, textTransform: "uppercase" }}>Next Tile</div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 16, color: "#c9cdd3" }}>{gameActive && safeTilesLeft <= 0 ? "MAX" : mnsFmtMult(nextMult)}</div>
            </div>
          </div>

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 20 }}>
            {Array.from({ length: MNS_GRID_SIZE }, (_, idx) => {
              const state = revealedTiles.get(idx);
              const isRevealed = !!state;
              const canClick = gameActive && !isRevealed;
              const icon = state === "gem" ? "💎" : state === "mine-hit" ? "💥" : state === "mine-shown" ? "💣" : "";
              return (
                <button key={idx} onClick={() => onTileClick(idx)}
                  className={`mns-tile ${state === "gem" ? "mns-gem" : ""} ${state === "mine-hit" ? "mns-mine-hit" : ""} ${state === "mine-shown" ? "mns-mine-shown" : ""} ${!canClick ? "mns-disabled" : ""}`}
                  disabled={!canClick}>
                  <div className="mns-tile-crack" />
                  <div className={`mns-tile-icon ${isRevealed ? "mns-show" : ""}`}>{icon}</div>
                </button>
              );
            })}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, background: "linear-gradient(160deg,#1c1d21,#151619)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "10px 14px" }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5, color: "#7c7f86", textTransform: "uppercase", marginBottom: 4, display: "block" }}>Bet Amount</span>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <button className="mns-step-btn" onClick={halfBet} disabled={gameActive} style={{ width: 26, height: 26, borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", background: "linear-gradient(160deg,#3a3c42,#2a2b30)", color: "#c9cdd3", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", cursor: gameActive ? "not-allowed" : "pointer", flexShrink: 0, opacity: gameActive ? 0.4 : 1 }}>½</button>
                  <input type="text" inputMode="numeric" value={betAmount} disabled={gameActive}
                    onChange={e => setBetAmount(e.target.value.replace(/[^0-9]/g, ""))}
                    style={{ background: "none", border: "none", outline: "none", color: "#c9cdd3", fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 15, width: "100%", textAlign: "center" }} />
                  <button className="mns-step-btn" onClick={doubleBet} disabled={gameActive} style={{ width: 26, height: 26, borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", background: "linear-gradient(160deg,#3a3c42,#2a2b30)", color: "#c9cdd3", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", cursor: gameActive ? "not-allowed" : "pointer", flexShrink: 0, opacity: gameActive ? 0.4 : 1 }}>2×</button>
                </div>
              </div>
            </div>

            <div style={{ background: "linear-gradient(160deg,#1c1d21,#151619)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "10px 14px" }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5, color: "#7c7f86", textTransform: "uppercase", marginBottom: 4, display: "block" }}>Mines</span>
              <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                {MNS_MINE_OPTIONS.map(count => (
                  <div key={count} className={`mns-mine-chip ${mineCount === count ? "mns-active" : ""}`}
                    onClick={() => !gameActive && setMineCount(count)}
                    style={{ pointerEvents: gameActive ? "none" : "auto" }}>
                    {count}
                  </div>
                ))}
              </div>
            </div>

            <button className={`mns-main-action ${gameActive ? "mns-cashout" : "mns-play"}`}
              onClick={gameActive ? cashOut : startGame}
              disabled={gameActive && !canCashOut}>
              {gameActive ? (
                <>CASH OUT<span className="mns-cashout-sub">{canCashOut ? mnsFmtMoney(stakeRef.current * currentMultiplier) : "Reveal a tile first"}</span></>
              ) : "PLAY"}
            </button>
          </div>

          {/* History strip */}
          <div className="mns-history-strip" style={{ display: "flex", gap: 8, marginTop: 18, overflowX: "auto", paddingBottom: 4 }}>
            {history.map((h, i) => (
              <div key={i} className={`mns-hist-chip ${h.won ? "win" : "lose"}`}>{h.won ? mnsFmtMult(h.mult) : "💥"}</div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", color: "#7c7f86", fontSize: 11, marginTop: 20, letterSpacing: 0.3 }}>18+ • Play responsibly • House edge applies</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. 3 PATTI — Full 3-player table (You + 2 AI), Blind & Seen, real hand rankings
// ═══════════════════════════════════════════════════════════════════════════════
const TP3_SUITS = ["S", "H", "D", "C"];
const TP3_RANKVALS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const TP3_BOOT = 10;
const TP3_MAX_STAKE = TP3_BOOT * 32;
const TP3_MAX_ACTIONS = 80;
const TP3_START_BALANCE = 1000;
const TP3_SEQUENCES = [
  [2, 3, 4], [3, 4, 5], [4, 5, 6], [5, 6, 7], [6, 7, 8], [7, 8, 9], [8, 9, 10], [9, 10, 11], [10, 11, 12], [11, 12, 13],
  [14, 2, 3], [12, 13, 14]
];
const TP3_FIRST_NAMES = ["Priya", "Ananya", "Kavya", "Divya", "Neha", "Riya", "Anjali", "Meera", "Pooja", "Sanya", "Isha", "Tara", "Rohan", "Arjun", "Vikram", "Karan", "Aditya", "Rahul", "Dev", "Kabir", "Ishaan", "Nikhil", "Varun", "Amit"];
const TP3_LAST_NAMES = ["Sharma", "Verma", "Patel", "Nair", "Reddy", "Iyer", "Gupta", "Singh", "Rao", "Menon", "Kapoor", "Malhotra", "Chopra", "Joshi", "Desai", "Kulkarni", "Bose", "Pillai", "Agarwal", "Bhatt", "Trivedi", "Chauhan"];

function tp3MakeDeck() { const d = []; for (const s of TP3_SUITS) for (const r of TP3_RANKVALS) d.push({ rank: r, suit: s }); return d; }
function tp3ShuffleDeck(deck) { const d = deck.slice(); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[d[i], d[j]] = [d[j], d[i]]; } return d; }
function tp3RandomName() { return TP3_FIRST_NAMES[Math.floor(Math.random() * TP3_FIRST_NAMES.length)] + " " + TP3_LAST_NAMES[Math.floor(Math.random() * TP3_LAST_NAMES.length)]; }
function tp3PickTwoNames() { const n1 = tp3RandomName(); let n2 = tp3RandomName(), guard = 0; while (n2 === n1 && guard++ < 20) n2 = tp3RandomName(); return [n1, n2]; }
function tp3Fmt(n) { return "₹" + Math.round(n).toLocaleString("en-IN"); }
function tp3SuitSymbol(s) { return s === "S" ? "♠" : s === "H" ? "♥" : s === "D" ? "♦" : "♣"; }
function tp3SuitIsRed(s) { return s === "H" || s === "D"; }
function tp3RankName(r) { if (r === 14) return "Ace"; if (r === 13) return "King"; if (r === 12) return "Queen"; if (r === 11) return "Jack"; return String(r); }
function tp3RankShort(r) { if (r === 14) return "A"; if (r === 13) return "K"; if (r === 12) return "Q"; if (r === 11) return "J"; return String(r); }
function tp3SequenceOrdinal(ranksAsc) { const key = ranksAsc.join(","); for (let i = 0; i < TP3_SEQUENCES.length; i++) { const s = TP3_SEQUENCES[i].slice().sort((a, b) => a - b); if (s.join(",") === key) return i + 1; } return 0; }
function tp3SeqLabel(ranksAsc, ord) { if (ord === 11) return "A-2-3"; if (ord === 12) return "Q-K-A"; return ranksAsc.map(tp3RankShort).join("-"); }

function tp3EvaluateHand(cards) {
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const sameSuit = suits[0] === suits[1] && suits[1] === suits[2];
  const ranksAsc = ranks.slice().sort((a, b) => a - b);
  const isTrail = ranks[0] === ranks[1] && ranks[1] === ranks[2];
  const seqOrd = isTrail ? 0 : tp3SequenceOrdinal(ranksAsc);
  let category, primary = 0, secondary = 0, tertiary = 0, label;
  if (isTrail) { category = 5; primary = ranks[0]; label = "Trail of " + tp3RankName(ranks[0]) + "s"; }
  else if (seqOrd > 0 && sameSuit) { category = 4; primary = seqOrd; label = "Pure Sequence, " + tp3SeqLabel(ranksAsc, seqOrd); }
  else if (seqOrd > 0) { category = 3; primary = seqOrd; label = "Sequence, " + tp3SeqLabel(ranksAsc, seqOrd); }
  else if (sameSuit) { category = 2; primary = ranks[0]; secondary = ranks[1]; tertiary = ranks[2]; label = "Color, " + tp3RankName(ranks[0]) + " high"; }
  else if (ranks[0] === ranks[1] || ranks[1] === ranks[2]) {
    const pairRank = ranks[0] === ranks[1] ? ranks[0] : ranks[1];
    const kicker = ranks[0] === ranks[1] ? ranks[2] : ranks[0];
    category = 1; primary = pairRank; secondary = kicker; label = "Pair of " + tp3RankName(pairRank) + "s";
  } else { category = 0; primary = ranks[0]; secondary = ranks[1]; tertiary = ranks[2]; label = tp3RankName(ranks[0]) + " High"; }
  const score = category * 1e6 + primary * 1e4 + secondary * 1e2 + tertiary;
  return { category, score, label };
}

// ── Card component: 3D flip, matching burgundy/gold felt theme ──────────────────
function TP3Card({ card, faceUp, big }) {
  const w = big ? 56 : 34, h = big ? 80 : 48;
  const isRed = card && tp3SuitIsRed(card.suit);
  const suitSym = card ? tp3SuitSymbol(card.suit) : "";
  const rankStr = card ? tp3RankShort(card.rank) : "";
  return (
    <div style={{ width: w, height: h, perspective: 500, flexShrink: 0 }}>
      <div style={{ position: "relative", width: "100%", height: "100%", transition: "transform 0.5s cubic-bezier(.3,.6,.3,1)", transformStyle: "preserve-3d", transform: faceUp ? "rotateY(180deg)" : "rotateY(0deg)" }}>
        {/* Back */}
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", borderRadius: 5, boxShadow: "0 2px 5px rgba(0,0,0,.4)", background: "repeating-linear-gradient(45deg, rgba(224,165,46,.35) 0 3px, transparent 3px 7px), linear-gradient(160deg, #5a1830, #3a0e21)", border: "1.5px solid #e0a52e", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#e0a52e", fontSize: big ? 18 : 12, opacity: 0.8 }}>♠</span>
        </div>
        {/* Front */}
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", borderRadius: 5, boxShadow: "0 2px 5px rgba(0,0,0,.4)", background: "#fbf3e3", transform: "rotateY(180deg)", border: "1.5px solid rgba(0,0,0,.15)", padding: 3 }}>
          {card && <>
            <div style={{ position: "absolute", top: 3, left: 3, display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1, fontWeight: 800, fontSize: big ? 13 : 9, color: isRed ? "#c22a46" : "#1c0f09" }}>{rankStr}<span>{suitSym}</span></div>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: big ? 26 : 16, color: isRed ? "#c22a46" : "#1c0f09" }}>{suitSym}</div>
            <div style={{ position: "absolute", bottom: 3, right: 3, display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1, fontWeight: 800, fontSize: big ? 13 : 9, color: isRed ? "#c22a46" : "#1c0f09", transform: "rotate(180deg)" }}>{rankStr}<span>{suitSym}</span></div>
          </>}
        </div>
      </div>
    </div>
  );
}

function TeenPattiGame({ balance, setBalance, addToast, onClose, addBetToHistory }) {
  const [botNames] = useState(() => tp3PickTwoNames());
  const engineRef = useRef({
    players: [
      { id: 0, name: "You", isBot: false, balance: 0, cards: [], folded: false, seen: false, revealed: false, blindTurns: 0, thinking: false },
      { id: 1, name: botNames[0], isBot: true, balance: TP3_START_BALANCE, cards: [], folded: false, seen: false, revealed: false, blindTurns: 0, thinking: false },
      { id: 2, name: botNames[1], isBot: true, balance: TP3_START_BALANCE, cards: [], folded: false, seen: false, revealed: false, blindTurns: 0, thinking: false },
    ],
    pot: 0, stake: TP3_BOOT, turn: 0, actionsThisHand: 0, dealerOffset: 0, handActive: false, handsWon: 0, log: [],
  });
  const humanBalanceAtHandStartRef = useRef(balance);
  const humanSpentRef = useRef(0);
  const pendingTimeoutRef = useRef(null);
  const initedRef = useRef(false);

  const [, setUiVersion] = useState(0);
  const forceRender = () => setUiVersion(v => v + 1);

  const [dealBtnVisible, setDealBtnVisible] = useState(true);
  const [dealBtnText, setDealBtnText] = useState("Deal hand");
  const [actionBarVisible, setActionBarVisible] = useState(false);
  const [actionRowText, setActionRowText] = useState("");
  const [resultBanner, setResultBanner] = useState({ show: false, title: "", sub: "" });
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Seed human balance from shared HukamBook balance once on mount
  useEffect(() => {
    if (!initedRef.current) { engineRef.current.players[0].balance = balance; initedRef.current = true; forceRender(); }
    return () => clearTimeout(pendingTimeoutRef.current);
    // eslint-disable-next-line
  }, []);

  const syncBalance = () => setBalance(engineRef.current.players[0].balance);
  const addLog = (msg) => { engineRef.current.log = [msg, ...engineRef.current.log].slice(0, 40); };
  const activeIdxs = () => { const out = []; engineRef.current.players.forEach((p, i) => { if (!p.folded) out.push(i); }); return out; };

  function applyAction(idx, action) {
    const players = engineRef.current.players;
    const p = players[idx];
    engineRef.current.actionsThisHand++;
    if (action.type === "pack") {
      p.folded = true;
      addLog(p.name + " packs.");
    } else if (action.type === "call") {
      const owed = Math.min(engineRef.current.stake * (p.seen ? 2 : 1), p.balance);
      p.balance -= owed; engineRef.current.pot += owed;
      if (idx === 0) { humanSpentRef.current += owed; syncBalance(); }
      addLog(p.name + (p.seen ? " calls " : " plays blind ") + tp3Fmt(owed) + ".");
    } else if (action.type === "raise") {
      const base = engineRef.current.stake * (p.seen ? 2 : 1);
      const pay = Math.min(base * 2, p.balance);
      p.balance -= pay; engineRef.current.pot += pay; engineRef.current.stake = engineRef.current.stake * 2;
      if (idx === 0) { humanSpentRef.current += pay; syncBalance(); }
      addLog(p.name + " raises — stake now " + tp3Fmt(engineRef.current.stake) + " (paid " + tp3Fmt(pay) + ").");
    } else if (action.type === "show") {
      const owed2 = Math.min(engineRef.current.stake * (p.seen ? 2 : 1), p.balance);
      p.balance -= owed2; engineRef.current.pot += owed2;
      if (idx === 0) { humanSpentRef.current += owed2; syncBalance(); }
      addLog(p.name + " calls for a Show.");
      endHand(null, activeIdxs());
    }
  }

  function applyActionAndAdvance(idx, action) {
    applyAction(idx, action);
    if (!engineRef.current.handActive) { forceRender(); return; }
    const active = activeIdxs();
    if (active.length === 1) { endHand(active[0], null); return; }
    engineRef.current.turn++;
    forceRender();
    runTurns();
  }

  function runTurns() {
    while (engineRef.current.handActive) {
      const active = activeIdxs();
      if (active.length === 1) { endHand(active[0], null); return; }
      if (engineRef.current.actionsThisHand >= TP3_MAX_ACTIONS) { endHand(null, active); return; }
      const idx = engineRef.current.turn % engineRef.current.players.length;
      if (engineRef.current.players[idx].folded) { engineRef.current.turn++; continue; }
      if (engineRef.current.players[idx].isBot) {
        setActionBarVisible(false); setDealBtnVisible(false);
        setActionRowText(engineRef.current.players[idx].name + " is thinking…");
        engineRef.current.players[idx].thinking = true;
        forceRender();
        const capturedIdx = idx;
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = setTimeout(() => {
          if (!engineRef.current.handActive) return;
          engineRef.current.players[capturedIdx].thinking = false;
          const action = botDecide(engineRef.current.players[capturedIdx]);
          forceRender();
          applyActionAndAdvance(capturedIdx, action);
        }, 700 + Math.random() * 700);
        return;
      } else {
        renderActionBarState();
        return;
      }
    }
  }

  function renderActionBarState() {
    setActionBarVisible(true); setDealBtnVisible(false);
    const p = engineRef.current.players[0];
    const owed = engineRef.current.stake * (p.seen ? 2 : 1);
    const canCall = owed <= p.balance;
    setActionRowText(!canCall ? "You can't cover the current bet — Pack to fold this hand." : (p.seen ? "You've seen your cards." : "Playing blind — see your cards any time."));
    setResultBanner(r => ({ ...r, show: false }));
    forceRender();
  }

  function botDecide(p) {
    const stakeVal = engineRef.current.stake;
    let owed = stakeVal * (p.seen ? 2 : 1);
    if (!p.seen) {
      const seeChance = 0.35 + p.blindTurns * 0.15;
      if (Math.random() < seeChance || stakeVal >= p.balance * 0.2) { p.seen = true; owed = stakeVal * 2; }
      else {
        p.blindTurns++;
        if (owed > p.balance) return { type: "pack" };
        const r = Math.random();
        if (r < 0.08) return { type: "pack" };
        if (r < 0.20 && stakeVal * 4 <= TP3_MAX_STAKE) return { type: "raise" };
        return { type: "call" };
      }
    }
    const strength = tp3EvaluateHand(p.cards).score;
    const normalized = strength / 6e6;
    const activeCount = activeIdxs().length;
    if (owed > p.balance) return { type: "pack" };
    if (activeCount === 2 && Math.random() < 0.30) return { type: "show" };
    if (normalized > 0.75) { return (Math.random() < 0.7 && stakeVal * 4 <= TP3_MAX_STAKE) ? { type: "raise" } : { type: "call" }; }
    else if (normalized > 0.4) {
      const foldChance = Math.min(0.5, stakeVal / (p.balance + 1));
      const r2 = Math.random();
      if (r2 < foldChance) return { type: "pack" };
      if (r2 < foldChance + 0.2 && stakeVal * 4 <= TP3_MAX_STAKE) return { type: "raise" };
      return { type: "call" };
    } else {
      const foldChance2 = Math.min(0.85, 0.3 + stakeVal / (p.balance + 1));
      if (Math.random() < foldChance2) return { type: "pack" };
      return Math.random() < 0.85 ? { type: "call" } : { type: "raise" };
    }
  }

  function startHand() {
    const players = engineRef.current.players;
    players.forEach(p => { if (p.isBot && p.balance < TP3_BOOT * 3) p.balance = TP3_START_BALANCE; });
    if (players[0].balance < TP3_BOOT) { forceRender(); return; }

    humanBalanceAtHandStartRef.current = players[0].balance;
    humanSpentRef.current = 0;

    const deck = tp3ShuffleDeck(tp3MakeDeck());
    players.forEach(p => { p.folded = false; p.seen = false; p.revealed = false; p.blindTurns = 0; p.thinking = false; p.cards = [deck.pop(), deck.pop(), deck.pop()]; });
    engineRef.current.pot = 0; engineRef.current.stake = TP3_BOOT; engineRef.current.actionsThisHand = 0;
    players.forEach(p => { const b = Math.min(TP3_BOOT, p.balance); p.balance -= b; engineRef.current.pot += b; if (p.id === 0) humanSpentRef.current += b; });
    syncBalance();
    engineRef.current.turn = engineRef.current.dealerOffset % players.length;
    engineRef.current.dealerOffset++;
    engineRef.current.handActive = true;
    engineRef.current.log = [];
    addLog("New hand — boot " + tp3Fmt(TP3_BOOT) + " collected from everyone.");
    setResultBanner(r => ({ ...r, show: false }));
    forceRender();
    runTurns();
  }

  function humanAct(type) {
    if (!engineRef.current.handActive || engineRef.current.turn % engineRef.current.players.length !== 0) return;
    applyActionAndAdvance(0, { type });
  }
  function seeCards() {
    if (!engineRef.current.handActive || engineRef.current.turn % engineRef.current.players.length !== 0) return;
    const p = engineRef.current.players[0];
    if (p.seen) return;
    p.seen = true;
    addLog("You look at your cards.");
    renderActionBarState();
  }

  function endHand(winnerIdx, showdownIdxs) {
    engineRef.current.handActive = false;
    const players = engineRef.current.players;
    let winner; const wonAmount = engineRef.current.pot;
    if (winnerIdx !== null && winnerIdx !== undefined) {
      winner = winnerIdx;
      if (!players[winner].seen) {
        players[winner].revealed = true;
        const evBlind = tp3EvaluateHand(players[winner].cards);
        addLog(players[winner].name + " wins the pot — everyone else packed. Playing blind, so the cards are shown: " + evBlind.label + ".");
      } else { addLog(players[winner].name + " wins the pot — everyone else packed."); }
    } else {
      let best = -1, bestScore = -1;
      showdownIdxs.forEach(i => { players[i].revealed = true; const ev = tp3EvaluateHand(players[i].cards); addLog(players[i].name + ": " + ev.label); if (ev.score > bestScore) { bestScore = ev.score; best = i; } });
      winner = best;
      addLog(players[winner].name + " wins the showdown!");
    }
    players[winner].balance += engineRef.current.pot;
    engineRef.current.pot = 0;
    if (winner === 0) { engineRef.current.handsWon++; syncBalance(); }

    const netPnl = players[0].balance - humanBalanceAtHandStartRef.current;
    addBetToHistory({ sport: "teenpatti", match: "3 Patti", selection: winner === 0 ? "You won the hand" : botNames[winner - 1] + " won", type: "back", odds: humanSpentRef.current > 0 ? +((netPnl + humanSpentRef.current) / humanSpentRef.current).toFixed(2) : 0, stake: humanSpentRef.current, pnl: netPnl, result: netPnl >= 0 ? "won" : "lost" });
    if (winner === 0) addToast("🃏 You win " + tp3Fmt(wonAmount) + "!", "success"); else addToast(players[winner].name + " wins " + tp3Fmt(wonAmount), "error");

    forceRender();
    setResultBanner({ show: true, title: winner === 0 ? ("You win " + tp3Fmt(wonAmount) + "!") : (players[winner].name + " wins " + tp3Fmt(wonAmount)), sub: tp3EvaluateHand(players[winner].cards).label });
    setActionBarVisible(false); setActionRowText(""); setDealBtnVisible(true); setDealBtnText("Deal next hand");
  }

  // ── Derived render values ────────────────────────────────────────────────────
  const players = engineRef.current.players;
  const handActive = engineRef.current.handActive;
  const pot = engineRef.current.pot;
  const stakeVal = engineRef.current.stake;
  const p0 = players[0];
  const owed = stakeVal * (p0.seen ? 2 : 1);
  const raiseCost = owed * 2;
  const canCall = owed <= p0.balance;
  const canRaise = raiseCost <= p0.balance && stakeVal < TP3_MAX_STAKE;
  const canShow = p0.seen && activeIdxs().length === 2;
  const broke = balance < TP3_BOOT && !handActive;

  const seatBadge = (idx) => {
    const p = players[idx];
    if (!handActive) return null;
    if (p.folded) return { text: "Packed", bg: "rgba(0,0,0,.35)", border: "rgba(251,243,227,.25)", opacity: 0.55 };
    if (p.thinking) return { text: "Thinking…", bg: "rgba(224,165,46,.25)", border: "#e0a52e", opacity: 1 };
    if (p.seen) return { text: "Seen", bg: "rgba(14,110,82,.35)", border: "#0e6e52", opacity: 1 };
    return { text: "Blind", bg: "rgba(0,0,0,.35)", border: "rgba(251,243,227,.25)", opacity: 1 };
  };
  const seatCards = (idx) => {
    const p = players[idx];
    const faceUp = handActive || p.revealed ? (idx === 0 ? (p.seen || p.revealed) : p.revealed) : false;
    if (p.cards && p.cards.length === 3) return p.cards.map((c, i) => <TP3Card key={i} card={c} faceUp={faceUp} big={idx === 0} />);
    return [0, 1, 2].map(i => <TP3Card key={i} card={null} faceUp={false} big={idx === 0} />);
  };

  const tp3Css = `
    .tp3-btn{ font-family:'Outfit',sans-serif; font-weight:700; font-size:13px; border-radius:10px; padding:12px 16px; border:1px solid transparent; cursor:pointer; transition:transform .15s ease, filter .15s ease, opacity .15s ease; }
    .tp3-btn:active:not(:disabled){ transform:scale(.96); }
    .tp3-btn:disabled{ opacity:.35; cursor:not-allowed; }
    .tp3-btn-primary{ background:linear-gradient(180deg,#f6d488,#e0a52e 75%); color:#1c0f09; box-shadow:0 6px 14px rgba(0,0,0,.35); min-width:130px; }
    .tp3-btn-primary:not(:disabled):hover{ filter:brightness(1.06); }
    .tp3-btn-ghost{ background:rgba(255,255,255,.06); color:#fbf3e3; border-color:rgba(251,243,227,.3); }
    .tp3-btn-ghost:not(:disabled):hover{ border-color:#e0a52e; color:#f6d488; }
    .tp3-btn-danger{ background:rgba(178,32,63,.25); color:#fbf3e3; border-color:#c22a46; }
    .tp3-btn-emerald{ background:rgba(14,110,82,.3); color:#fbf3e3; border-color:#0e6e52; }
    .tp3-log::-webkit-scrollbar{ width:4px; }
    .tp3-log::-webkit-scrollbar-thumb{ background:rgba(224,165,46,.3); border-radius:2px; }
  `;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, overflowY: "auto", background: "radial-gradient(ellipse 900px 500px at 50% -5%, rgba(255,255,255,.06), transparent 60%), radial-gradient(ellipse 1000px 800px at 50% 110%, #280614, #0d0206 85%), #5c1030", color: "#fbf3e3", fontFamily: "'Outfit',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Yeseva+One&family=Outfit:wght@400;500;600;700;800&display=swap');${tp3Css}`}</style>

      {/* Close button */}
      <button onClick={onClose} style={{ position: "fixed", top: 14, right: 14, zIndex: 20, width: 34, height: 34, borderRadius: "50%", border: "1px solid rgba(251,243,227,.3)", background: "rgba(28,15,9,.7)", color: "#fbf3e3", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#e0a52e"; e.currentTarget.style.color = "#f6d488"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(251,243,227,.3)"; e.currentTarget.style.color = "#fbf3e3"; }}>✕</button>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 460, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "22px 14px 46px" }}>

        {/* Header */}
        <header style={{ textAlign: "center", position: "relative", width: "100%" }}>
          <p style={{ fontSize: 11, letterSpacing: ".24em", textTransform: "uppercase", color: "#e0a52e", opacity: 0.85, margin: "0 0 4px" }}>Table No. 4 · Boot {tp3Fmt(TP3_BOOT)}</p>
          <h1 style={{ fontFamily: "'Yeseva One',Georgia,serif", fontSize: "clamp(32px,8vw,44px)", margin: 0, color: "#f6d488", textShadow: "0 2px 10px rgba(0,0,0,.4)" }}>3 Patti</h1>
          <p style={{ fontSize: 12, color: "rgba(251,243,227,.6)", margin: "5px 0 0" }}>Blind &amp; Seen · Play vs. {botNames[0]} &amp; {botNames[1]}</p>
          <button onClick={() => setShowInfoModal(true)} aria-label="Hand rankings" style={{ position: "absolute", right: 36, top: 2, width: 30, height: 30, borderRadius: "50%", border: "1px solid rgba(251,243,227,.3)", background: "transparent", color: "#fbf3e3", cursor: "pointer", fontFamily: "'Yeseva One',serif", fontSize: 14 }}>i</button>
        </header>

        {/* Bankroll */}
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", color: "rgba(251,243,227,.55)" }}>Your chips</span>
            <b style={{ fontSize: 18, color: "#f6d488", fontWeight: 700 }}>{tp3Fmt(balance)}</b>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", color: "rgba(251,243,227,.55)" }}>Hands won</span>
            <b style={{ fontSize: 18, color: "#f6d488", fontWeight: 700 }}>{engineRef.current.handsWon}</b>
          </div>
        </div>

        {/* Broke banner */}
        {broke && (
          <div style={{ width: "100%", textAlign: "center", background: "rgba(178,32,63,.2)", border: "1px solid #c22a46", borderRadius: 12, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: 0, fontSize: 13 }}>You're out of chips at this table.</p>
            <button className="tp3-btn tp3-btn-primary" onClick={onClose}>Return to Lobby</button>
          </div>
        )}

        {/* Table */}
        <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <div style={{ position: "relative", width: "min(92vw,380px)", aspectRatio: "1/1.04", background: "radial-gradient(ellipse at 50% 38%, #5c1030 0%, #280614 115%)", borderRadius: "50%", border: "5px solid #e0a52e", boxShadow: "inset 0 0 46px rgba(0,0,0,.55), 0 16px 30px rgba(0,0,0,.5)" }}>

            {/* Seat left (bot 1) */}
            <div style={{ position: "absolute", top: "6%", left: "1%", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 124, opacity: players[1].folded ? 0.4 : 1, filter: players[1].folded ? "grayscale(.6)" : "none" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(160deg,#f6d488,#e0a52e 70%)", color: "#1c0f09", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, border: "2px solid rgba(0,0,0,.3)", flexShrink: 0 }}>{botNames[0].charAt(0)}</div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fbf3e3", maxWidth: "100%", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{botNames[0]}</span>
              <span style={{ fontSize: 10.5, color: "#f6d488" }}>{tp3Fmt(players[1].balance)}</span>
              <div style={{ display: "flex", gap: 3 }}>{seatCards(1)}</div>
              {seatBadge(1) && <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".08em", padding: "2px 7px", borderRadius: 999, background: seatBadge(1).bg, border: `1px solid ${seatBadge(1).border}`, color: "#fbf3e3", whiteSpace: "nowrap", opacity: seatBadge(1).opacity }}>{seatBadge(1).text}</span>}
            </div>

            {/* Seat right (bot 2) */}
            <div style={{ position: "absolute", top: "6%", right: "1%", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 124, opacity: players[2].folded ? 0.4 : 1, filter: players[2].folded ? "grayscale(.6)" : "none" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(160deg,#f6d488,#e0a52e 70%)", color: "#1c0f09", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, border: "2px solid rgba(0,0,0,.3)", flexShrink: 0 }}>{botNames[1].charAt(0)}</div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fbf3e3", maxWidth: "100%", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{botNames[1]}</span>
              <span style={{ fontSize: 10.5, color: "#f6d488" }}>{tp3Fmt(players[2].balance)}</span>
              <div style={{ display: "flex", gap: 3 }}>{seatCards(2)}</div>
              {seatBadge(2) && <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".08em", padding: "2px 7px", borderRadius: 999, background: seatBadge(2).bg, border: `1px solid ${seatBadge(2).border}`, color: "#fbf3e3", whiteSpace: "nowrap", opacity: seatBadge(2).opacity }}>{seatBadge(2).text}</span>}
            </div>

            {/* Pot */}
            <div style={{ position: "absolute", top: "46%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
              <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".16em", color: "rgba(251,243,227,.6)", display: "block" }}>Pot</span>
              <span style={{ fontFamily: "'Yeseva One',serif", fontSize: 26, color: "#f6d488", textShadow: "0 2px 8px rgba(0,0,0,.5)" }}>{tp3Fmt(pot)}</span>
              <div style={{ fontSize: 11, color: "rgba(251,243,227,.65)", marginTop: 2 }}>{handActive ? `Blind ${tp3Fmt(stakeVal)} · Seen ${tp3Fmt(stakeVal * 2)}` : "Tap Deal to start"}</div>
            </div>

            {/* Seat human */}
            <div style={{ position: "absolute", bottom: "3%", left: "50%", transform: "translateX(-50%)", width: 200, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ display: "flex", gap: 3 }}>{seatCards(0)}</div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fbf3e3" }}>You</span>
              {seatBadge(0) && <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".08em", padding: "2px 7px", borderRadius: 999, background: seatBadge(0).bg, border: `1px solid ${seatBadge(0).border}`, color: "#fbf3e3", whiteSpace: "nowrap", opacity: seatBadge(0).opacity }}>{seatBadge(0).text}</span>}
            </div>
          </div>
        </div>

        {/* Result banner */}
        {resultBanner.show && (
          <div style={{ width: "100%", background: "rgba(28,15,9,.85)", border: "1px solid #e0a52e", borderRadius: 14, padding: "12px 16px", textAlign: "center", display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontFamily: "'Yeseva One',serif", color: "#f6d488", fontSize: 19 }}>{resultBanner.title}</span>
            <span style={{ fontSize: 12, color: "rgba(251,243,227,.75)" }}>{resultBanner.sub}</span>
          </div>
        )}

        {/* Action row */}
        <div style={{ width: "100%", textAlign: "center", fontSize: 12, color: "rgba(251,243,227,.65)", minHeight: 16 }}>{actionRowText}</div>

        {/* Deal button */}
        {dealBtnVisible && <button className="tp3-btn tp3-btn-primary" onClick={startHand} disabled={balance < TP3_BOOT}>{dealBtnText}</button>}

        {/* Action bar */}
        {actionBarVisible && (
          <div style={{ width: "100%", display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            <button className="tp3-btn tp3-btn-danger" onClick={() => humanAct("pack")}>Pack</button>
            {!p0.seen && <button className="tp3-btn tp3-btn-ghost" onClick={seeCards}>See cards</button>}
            <button className="tp3-btn tp3-btn-primary" onClick={() => humanAct("call")} disabled={!canCall}>Call {tp3Fmt(Math.min(owed, p0.balance))}</button>
            <button className="tp3-btn tp3-btn-ghost" onClick={() => humanAct("raise")} disabled={!canRaise}>Raise {tp3Fmt(Math.min(raiseCost, p0.balance))}</button>
            {canShow && <button className="tp3-btn tp3-btn-emerald" onClick={() => humanAct("show")}>Show</button>}
          </div>
        )}

        {/* Log panel */}
        <div className="tp3-log" style={{ width: "100%", maxHeight: 118, overflowY: "auto", background: "rgba(0,0,0,.25)", border: "1px solid rgba(251,243,227,.15)", borderRadius: 10, padding: "8px 12px", fontSize: 11.5, color: "rgba(251,243,227,.75)", display: "flex", flexDirection: "column", gap: 4 }}>
          {engineRef.current.log.map((msg, i) => <div key={i} style={{ color: i === 0 ? "#f6d488" : "rgba(251,243,227,.75)" }}>{msg}</div>)}
        </div>
      </div>

      {/* Info modal */}
      {showInfoModal && (
        <div onClick={() => setShowInfoModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#280614", border: "1px solid #e0a52e", borderRadius: 14, padding: 20, maxWidth: 360, width: "100%", maxHeight: "80vh", overflowY: "auto" }}>
            <h2 style={{ fontFamily: "'Yeseva One',serif", color: "#f6d488", margin: "0 0 10px", fontSize: 20 }}>Hand rankings</h2>
            <ol style={{ margin: "0 0 12px", paddingLeft: 20, fontSize: 13, lineHeight: 1.6 }}>
              <li><b>Trail</b> — three of a kind (AAA highest, 222 lowest)</li>
              <li><b>Pure Sequence</b> — 3 consecutive cards, same suit</li>
              <li><b>Sequence</b> — 3 consecutive cards, mixed suits</li>
              <li><b>Color</b> — 3 cards, same suit, not consecutive</li>
              <li><b>Pair</b> — two cards of matching rank</li>
              <li><b>High Card</b> — none of the above</li>
            </ol>
            <p style={{ fontSize: 12, color: "rgba(251,243,227,.7)", lineHeight: 1.5 }}>Sequence order: A-K-Q is highest, then A-2-3, then K-Q-J down to 2-3-4. Blind bets match the table stake; once you look at your cards ("seen"), calls and raises cost double.</p>
            <button className="tp3-btn tp3-btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => setShowInfoModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. DRAGON TIGER — silver dragon vs dark tiger card duel
// ═══════════════════════════════════════════════════════════════════════════════
const DT_SUITS = ["♠", "♥", "♦", "♣"];
const DT_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const dtRankValue = (r) => DT_RANKS.indexOf(r) + 1;
const dtFreshDeck = () => {
  const d = [];
  for (const s of DT_SUITS) for (const r of DT_RANKS) d.push({ r, s });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[d[i], d[j]] = [d[j], d[i]]; }
  return d;
};
const DT_CHIPS = [10, 25, 100, 500];

function DragonTigerGame({ balance, setBalance, addToast, onClose, addBetToHistory }) {
  const [chip, setChip] = useState(25);
  const [bets, setBets] = useState({ dragon: 0, tie: 0, tiger: 0 });
  const [phase, setPhase] = useState("bet");
  const [cards, setCards] = useState({ dragon: null, tiger: null });
  const [flipped, setFlipped] = useState({ dragon: false, tiger: false });
  const [winner, setWinner] = useState(null);
  const [payout, setPayout] = useState(0);
  const [history, setHistory] = useState([]);
  const deckRef = useRef(dtFreshDeck());
  const timers = useRef([]);
  const stakeRef = useRef(0);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  const totalBet = bets.dragon + bets.tie + bets.tiger;

  const placeBet = (spot) => {
    if (phase !== "bet" || chip > balance) { if (chip > balance) addToast("Insufficient balance", "error"); return; }
    setBets((b) => ({ ...b, [spot]: b[spot] + chip }));
    setBalance((b) => b - chip);
  };
  const clearBets = () => {
    if (phase !== "bet") return;
    setBalance((b) => b + totalBet);
    setBets({ dragon: 0, tie: 0, tiger: 0 });
  };

  const deal = () => {
    if (phase !== "bet" || totalBet === 0) return;
    if (deckRef.current.length < 10) deckRef.current = dtFreshDeck();
    const d = deckRef.current.pop(); const t = deckRef.current.pop();
    stakeRef.current = totalBet;
    setCards({ dragon: d, tiger: t }); setFlipped({ dragon: false, tiger: false });
    setWinner(null); setPayout(0); setPhase("dealing");

    later(() => setFlipped((f) => ({ ...f, dragon: true })), 500);
    later(() => setFlipped((f) => ({ ...f, tiger: true })), 1150);
    later(() => {
      const dv = dtRankValue(d.r), tv = dtRankValue(t.r);
      const w = dv > tv ? "dragon" : tv > dv ? "tiger" : "tie";
      setWinner(w);
      let pay = 0;
      if (w === "tie") { pay += bets.tie * 9; pay += Math.floor((bets.dragon + bets.tiger) / 2); }
      else { pay += bets[w] * 2; }
      setPayout(pay);
      setBalance((b) => b + pay);
      setHistory((h) => [w, ...h].slice(0, 12));
      setPhase("result");
      const net = pay - stakeRef.current;
      addBetToHistory({ sport: "dragontiger", match: "Dragon Tiger", selection: w, type: "back", odds: stakeRef.current > 0 ? +(pay / stakeRef.current).toFixed(2) : 0, stake: stakeRef.current, pnl: net, result: net >= 0 ? "won" : "lost" });
      if (pay > stakeRef.current) addToast(`🐉 ${w.toUpperCase()} wins! +₹${(pay - stakeRef.current).toLocaleString()}`, "success");
      else if (pay > 0) addToast(`${w.toUpperCase()} — partial return ₹${pay.toLocaleString()}`, "info");
      else addToast(`${w.toUpperCase()} wins — you lost this round`, "error");
    }, 1900);
  };

  const nextRound = () => {
    setBets({ dragon: 0, tie: 0, tiger: 0 }); setCards({ dragon: null, tiger: null });
    setFlipped({ dragon: false, tiger: false }); setWinner(null); setPayout(0); setPhase("bet");
  };
  const net = payout - stakeRef.current;

  return (
    <div style={DT_S.root}>
      <style>{DT_CSS}</style>
      <button onClick={onClose} style={DT_S.closeBtn} onMouseEnter={e => e.currentTarget.style.color = "#ff4757"} onMouseLeave={e => e.currentTarget.style.color = "#c9c9d4"}>✕</button>

      <div style={DT_S.topbar}>
        <div style={DT_S.logo}>DRAGON <span style={DT_S.logoVs}>▼</span> TIGER</div>
        <div style={DT_S.balanceBox}>
          <span style={DT_S.balanceLabel}>BALANCE</span>
          <span style={DT_S.balanceValue}>₹{balance.toLocaleString()}</span>
        </div>
      </div>

      <div style={DT_S.history}>
        {history.length === 0 && <span style={DT_S.historyEmpty}>— round history —</span>}
        {history.map((h, i) => (
          <span key={i} className="bead" style={{ ...DT_S.bead, background: h === "dragon" ? "linear-gradient(145deg,#e8e8ee,#9a9aa6)" : h === "tiger" ? "linear-gradient(145deg,#55555f,#1c1c22)" : "linear-gradient(145deg,#c8a24a,#8a6a1e)", color: h === "dragon" ? "#111" : "#eee" }}>
            {h === "dragon" ? "D" : h === "tiger" ? "T" : "="}
          </span>
        ))}
      </div>

      <div style={DT_S.table}>
        <DTCardSlot side="dragon" card={cards.dragon} flipped={flipped.dragon} isWinner={winner === "dragon" || winner === "tie"} dim={winner === "tiger"} />
        <div style={DT_S.vsCol}>
          <div style={DT_S.vsRing} className={phase === "dealing" ? "pulse" : ""}>VS</div>
          {phase === "result" && <div style={DT_S.resultTag} className="pop">{winner === "tie" ? "TIE" : winner.toUpperCase() + " WINS"}</div>}
        </div>
        <DTCardSlot side="tiger" card={cards.tiger} flipped={flipped.tiger} isWinner={winner === "tiger" || winner === "tie"} dim={winner === "dragon"} />
      </div>

      <div style={DT_S.spots}>
        <DTBetSpot label="DRAGON" odds="1 : 1" amount={bets.dragon} active={phase === "bet"} won={phase === "result" && winner === "dragon"} onClick={() => placeBet("dragon")} variant="silver" />
        <DTBetSpot label="TIE" odds="8 : 1" amount={bets.tie} active={phase === "bet"} won={phase === "result" && winner === "tie"} onClick={() => placeBet("tie")} variant="gold" />
        <DTBetSpot label="TIGER" odds="1 : 1" amount={bets.tiger} active={phase === "bet"} won={phase === "result" && winner === "tiger"} onClick={() => placeBet("tiger")} variant="dark" />
      </div>

      <div style={DT_S.rack}>
        <div style={DT_S.chipRow}>
          {DT_CHIPS.map((c) => (
            <button key={c} className="chip" onClick={() => setChip(c)} disabled={phase !== "bet"} style={{ ...DT_S.chip, ...(chip === c ? DT_S.chipActive : {}), opacity: phase !== "bet" ? 0.4 : 1 }}>
              <span style={DT_S.chipInner}>{c}</span>
            </button>
          ))}
        </div>
        <div style={DT_S.actionRow}>
          {phase === "bet" && (<>
            <button className="btn ghost" style={DT_S.btnGhost} onClick={clearBets} disabled={totalBet === 0}>CLEAR</button>
            <button className="btn main" style={{ ...DT_S.btnMain, opacity: totalBet === 0 ? 0.4 : 1 }} onClick={deal} disabled={totalBet === 0}>DEAL — ₹{totalBet}</button>
          </>)}
          {phase === "dealing" && <div style={DT_S.dealingText} className="shimmer-text">dealing…</div>}
          {phase === "result" && (<>
            <div style={{ ...DT_S.netText, color: net > 0 ? "#d8f7c9" : net === 0 ? "#cfcfd8" : "#f7b2b2" }} className="pop">{net > 0 ? `+ ₹${net.toLocaleString()}` : net === 0 ? "PUSH" : `− ₹${Math.abs(net).toLocaleString()}`}</div>
            <button className="btn main" style={DT_S.btnMain} onClick={nextRound}>NEXT ROUND</button>
          </>)}
        </div>
      </div>
    </div>
  );
}

function DTCardSlot({ side, card, flipped, isWinner, dim }) {
  const red = card && (card.s === "♥" || card.s === "♦");
  return (
    <div style={{ ...DT_S.slotCol, opacity: dim ? 0.45 : 1, transition: "opacity .4s" }}>
      <div style={{ ...DT_S.sideLabel, background: side === "dragon" ? "linear-gradient(180deg,#f2f2f7,#b9b9c4)" : "linear-gradient(180deg,#3a3a44,#17171c)", color: side === "dragon" ? "#101014" : "#e9e9ef", border: side === "dragon" ? "1px solid #fff" : "1px solid #4c4c58" }}>
        {side === "dragon" ? "🐉 DRAGON" : "🐅 TIGER"}
      </div>
      <div style={DT_S.cardPerspective}>
        <div className={isWinner && card ? "cardInner glowWin" : "cardInner"} style={{ ...DT_S.cardInner, transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
          <div style={{ ...DT_S.cardFace, ...DT_S.cardBack }}><div style={DT_S.cardBackPattern}>◈</div></div>
          <div style={{ ...DT_S.cardFace, ...DT_S.cardFront }}>
            {card && (<>
              <div style={{ ...DT_S.cardCorner, color: red ? "#c0392b" : "#17171c" }}>{card.r}<span style={{ fontSize: 16 }}>{card.s}</span></div>
              <div style={{ ...DT_S.cardPip, color: red ? "#c0392b" : "#17171c" }}>{card.s}</div>
              <div style={{ ...DT_S.cardCorner, ...DT_S.cardCornerBottom, color: red ? "#c0392b" : "#17171c" }}>{card.r}<span style={{ fontSize: 16 }}>{card.s}</span></div>
            </>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function DTBetSpot({ label, odds, amount, active, won, onClick, variant }) {
  const bg = variant === "silver" ? "linear-gradient(160deg,rgba(235,235,242,.14),rgba(235,235,242,.05))" : variant === "gold" ? "linear-gradient(160deg,rgba(200,162,74,.22),rgba(200,162,74,.06))" : "linear-gradient(160deg,rgba(90,90,104,.25),rgba(30,30,38,.2))";
  return (
    <button className={won ? "spot winFlash" : "spot"} onClick={onClick} disabled={!active} style={{ ...DT_S.spot, background: bg, cursor: active ? "pointer" : "default", borderColor: won ? "#e9e2c8" : "rgba(200,200,214,.28)" }}>
      <div style={DT_S.spotLabel}>{label}</div>
      <div style={DT_S.spotOdds}>{odds}</div>
      <div style={{ ...DT_S.spotAmount, opacity: amount > 0 ? 1 : 0.35 }}>{amount > 0 ? `₹${amount}` : "tap to bet"}</div>
    </button>
  );
}

const DT_S = {
  root: { position: "fixed", inset: 0, zIndex: 600, overflowY: "auto", background: "radial-gradient(1200px 700px at 50% -10%, #2c2c34 0%, #17171c 45%, #0b0b0e 100%)", color: "#e8e8ee", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 12px 28px", boxSizing: "border-box", userSelect: "none" },
  closeBtn: { position: "fixed", top: 14, right: 14, zIndex: 20, width: 34, height: 34, borderRadius: "50%", border: "1px solid rgba(220,220,232,.25)", background: "rgba(20,20,24,.8)", color: "#c9c9d4", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" },
  topbar: { width: "100%", maxWidth: 560, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, marginTop: 30 },
  logo: { fontSize: 18, fontWeight: 800, letterSpacing: 3, background: "linear-gradient(180deg,#ffffff,#8f8f9c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  logoVs: { WebkitTextFillColor: "#c8a24a", fontSize: 12 },
  balanceBox: { display: "flex", flexDirection: "column", alignItems: "flex-end", padding: "6px 14px", borderRadius: 12, border: "1px solid rgba(220,220,232,.25)", background: "linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02))" },
  balanceLabel: { fontSize: 9, letterSpacing: 2, color: "#9a9aa6" },
  balanceValue: { fontSize: 18, fontWeight: 700, color: "#f4f4f8" },
  history: { width: "100%", maxWidth: 560, minHeight: 30, display: "flex", gap: 6, alignItems: "center", marginBottom: 12, overflowX: "auto" },
  historyEmpty: { fontSize: 11, color: "#5c5c68", letterSpacing: 2 },
  bead: { width: 24, height: 24, minWidth: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, boxShadow: "0 2px 5px rgba(0,0,0,.5)" },
  table: { width: "100%", maxWidth: 560, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "18px 10px", borderRadius: 22, border: "1px solid rgba(210,210,224,.18)", background: "linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.01)), repeating-linear-gradient(90deg, rgba(255,255,255,.015) 0 2px, transparent 2px 4px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.08), 0 18px 40px rgba(0,0,0,.5)", marginBottom: 14 },
  slotCol: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flex: 1 },
  sideLabel: { fontSize: 11, fontWeight: 800, letterSpacing: 1.5, padding: "5px 12px", borderRadius: 999, whiteSpace: "nowrap" },
  cardPerspective: { perspective: 900, width: 96, height: 136 },
  cardInner: { width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d", transition: "transform .65s cubic-bezier(.2,.7,.25,1)", borderRadius: 12 },
  cardFace: { position: "absolute", inset: 0, borderRadius: 12, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", display: "flex", alignItems: "center", justifyContent: "center" },
  cardBack: { background: "linear-gradient(145deg,#33333d,#15151a), repeating-linear-gradient(45deg, rgba(255,255,255,.05) 0 6px, transparent 6px 12px)", border: "1px solid #4a4a56", boxShadow: "0 8px 20px rgba(0,0,0,.55)" },
  cardBackPattern: { fontSize: 34, color: "rgba(220,220,232,.5)", textShadow: "0 0 12px rgba(220,220,232,.35)" },
  cardFront: { background: "linear-gradient(160deg,#fdfdff,#d9d9e2)", border: "1px solid #fff", transform: "rotateY(180deg)", boxShadow: "0 8px 20px rgba(0,0,0,.55)" },
  cardCorner: { position: "absolute", top: 7, left: 9, fontSize: 18, fontWeight: 800, lineHeight: 1, display: "flex", flexDirection: "column", alignItems: "center" },
  cardCornerBottom: { top: "auto", left: "auto", bottom: 7, right: 9, transform: "rotate(180deg)" },
  cardPip: { fontSize: 46 },
  vsCol: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 70 },
  vsRing: { width: 46, height: 46, borderRadius: "50%", border: "2px solid rgba(220,220,232,.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, letterSpacing: 1, color: "#d5d5e0", background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,.12), transparent 60%)" },
  resultTag: { fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: "#0f0f13", background: "linear-gradient(180deg,#f4f4f8,#b6b6c2)", padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap" },
  spots: { width: "100%", maxWidth: 560, display: "grid", gridTemplateColumns: "1fr .8fr 1fr", gap: 10, marginBottom: 16 },
  spot: { borderRadius: 16, border: "1px solid rgba(200,200,214,.28)", padding: "14px 8px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: "#e8e8ee", transition: "transform .12s, border-color .3s, box-shadow .3s" },
  spotLabel: { fontSize: 14, fontWeight: 800, letterSpacing: 2 },
  spotOdds: { fontSize: 10, color: "#9a9aa6", letterSpacing: 1 },
  spotAmount: { fontSize: 15, fontWeight: 700, marginTop: 4, color: "#f0eccf" },
  rack: { width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 14 },
  chipRow: { display: "flex", justifyContent: "center", gap: 14 },
  chip: { width: 56, height: 56, borderRadius: "50%", border: "4px dashed rgba(20,20,26,.85)", background: "linear-gradient(145deg,#dfdfe8,#9696a2)", boxShadow: "0 5px 12px rgba(0,0,0,.55), inset 0 2px 3px rgba(255,255,255,.6)", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform .12s, box-shadow .2s", padding: 0 },
  chipActive: { transform: "translateY(-6px) scale(1.06)", boxShadow: "0 10px 18px rgba(0,0,0,.6), 0 0 0 3px rgba(232,232,238,.85), inset 0 2px 3px rgba(255,255,255,.6)" },
  chipInner: { width: 38, height: 38, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #2e2e37, #101015)", color: "#e8e8ee", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" },
  actionRow: { display: "flex", justifyContent: "center", alignItems: "center", gap: 12, minHeight: 52 },
  btnMain: { padding: "13px 30px", borderRadius: 999, border: "1px solid #fff", background: "linear-gradient(180deg,#f7f7fb,#a9a9b6)", color: "#0f0f13", fontSize: 14, fontWeight: 800, letterSpacing: 2, boxShadow: "0 8px 18px rgba(0,0,0,.5)", transition: "transform .12s, box-shadow .2s" },
  btnGhost: { padding: "12px 20px", borderRadius: 999, border: "1px solid rgba(220,220,232,.35)", background: "transparent", color: "#c9c9d4", fontSize: 12, fontWeight: 700, letterSpacing: 2, transition: "transform .12s, border-color .2s" },
  dealingText: { fontSize: 14, letterSpacing: 4, fontWeight: 600 },
  netText: { fontSize: 20, fontWeight: 800, letterSpacing: 1 },
};

const DT_CSS = `
  button { cursor: pointer; font-family: inherit; }
  button:disabled { cursor: default; }
  .btn:not(:disabled):hover { transform: translateY(-2px); }
  .btn:not(:disabled):active { transform: translateY(1px); }
  .spot:not(:disabled):hover { transform: translateY(-3px); box-shadow: 0 10px 22px rgba(0,0,0,.45); }
  .spot:not(:disabled):active { transform: scale(.97); }
  .chip:not(:disabled):hover { transform: translateY(-4px); }
  .glowWin { box-shadow: 0 0 0 2px rgba(244,244,248,.9), 0 0 26px rgba(232,232,240,.55); border-radius: 12px; }
  .pulse { animation: dtPulse 1s ease-in-out infinite; }
  @keyframes dtPulse { 0%,100%{ box-shadow: 0 0 0 0 rgba(220,220,232,.35);} 50%{ box-shadow: 0 0 0 10px rgba(220,220,232,0);} }
  .pop { animation: dtPop .35s cubic-bezier(.2,1.4,.4,1) both; }
  @keyframes dtPop { from { transform: scale(.6); opacity: 0;} to { transform: scale(1); opacity: 1;} }
  .winFlash { animation: dtWinFlash 1.1s ease-in-out infinite; }
  @keyframes dtWinFlash { 0%,100%{ box-shadow: 0 0 0 1px rgba(233,226,200,.8);} 50%{ box-shadow: 0 0 22px 4px rgba(233,226,200,.45);} }
  .shimmer-text { background: linear-gradient(90deg,#6a6a76,#f4f4f8,#6a6a76); background-size: 200% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: dtShimmer 1.2s linear infinite; }
  @keyframes dtShimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
  .bead { animation: dtPop .3s ease both; }
  button:focus-visible { outline: 2px solid #e8e8ee; outline-offset: 2px; }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// NEW · 7 UP DOWN — chrome & black dice game
// ═══════════════════════════════════════════════════════════════════════════════
const SUD_CHIPS = [10, 50, 100, 250];
const SUD_PIP_MAP = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const SUD_BETS = [
  { id: "down", label: "7 DOWN", sub: "2 – 6", pays: "2×", mult: 2 },
  { id: "seven", label: "LUCKY 7", sub: "exactly 7", pays: "5×", mult: 5 },
  { id: "up", label: "7 UP", sub: "8 – 12", pays: "2×", mult: 2 },
];

function SUDDie({ value, rolling, delay }) {
  return (
    <div className={`sud-die ${rolling ? "sud-rolling" : "sud-settled"}`} style={{ animationDelay: delay }}>
      <div className="sud-die-face">
        {Array.from({ length: 9 }).map((_, i) => <span key={i} className={`sud-pip ${SUD_PIP_MAP[value].includes(i) ? "sud-on" : ""}`} />)}
      </div>
    </div>
  );
}

function SevenUpDownGame({ balance, setBalance, addToast, onClose, addBetToHistory }) {
  const [chip, setChip] = useState(50);
  const [bet, setBet] = useState(null);
  const [dice, setDice] = useState([3, 4]);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [streak, setStreak] = useState(0);
  const [flash, setFlash] = useState(null);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const canRoll = bet !== null && !rolling && balance >= chip;

  const roll = useCallback(() => {
    if (!canRoll) return;
    setRolling(true); setResult(null);
    setBalance((b) => b - chip);

    let ticks = 0;
    const shuffle = setInterval(() => {
      setDice([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]);
      ticks++; if (ticks > 10) clearInterval(shuffle);
    }, 90);

    const d1 = 1 + Math.floor(Math.random() * 6), d2 = 1 + Math.floor(Math.random() * 6);
    const total = d1 + d2;

    const t = setTimeout(() => {
      clearInterval(shuffle);
      setDice([d1, d2]); setRolling(false);
      const zone = total < 7 ? "down" : total > 7 ? "up" : "seven";
      const won = zone === bet;
      const mult = SUD_BETS.find((b) => b.id === bet).mult;
      const payoutAmt = won ? chip * mult : 0;
      if (won) setBalance((b) => b + payoutAmt);
      setResult({ win: won, amount: won ? payoutAmt - chip : chip, total });
      setStreak((s) => (won ? s + 1 : 0));
      setHistory((h) => [{ total, won, zone }, ...h].slice(0, 12));
      setFlash(won ? "win" : "lose");
      timers.current.push(setTimeout(() => setFlash(null), 900));
      addBetToHistory({ sport: "sevenupdown", match: "7 Up Down", selection: SUD_BETS.find(b => b.id === bet).label, type: "back", odds: mult, stake: chip, pnl: won ? payoutAmt - chip : -chip, result: won ? "won" : "lost" });
      if (won) addToast(`🎲 ${total}! Won ₹${(payoutAmt - chip).toLocaleString()}`, "success");
      else addToast(`🎲 ${total} — lost ₹${chip.toLocaleString()}`, "error");
    }, 1150);
    timers.current.push(t);
  }, [canRoll, bet, chip]);

  const broke = balance < Math.min(...SUD_CHIPS) && !rolling;

  return (
    <div className={`sud-stage ${flash ? "sud-flash-" + flash : ""}`}>
      <style>{SUD_CSS}</style>
      <button onClick={onClose} className="sud-close">✕</button>

      <header className="sud-top">
        <h1 className="sud-logo"><span className="sud-lg-7">7</span><span className="sud-lg-ud">UP&nbsp;DOWN</span></h1>
        <div className="sud-bank"><span className="sud-bank-label">BALANCE</span><span className="sud-bank-val">₹ {balance.toLocaleString()}</span></div>
      </header>

      <section className="sud-bezel" aria-live="polite">
        <div className="sud-table">
          <span className="sud-rivet sud-r-tl" /><span className="sud-rivet sud-r-tr" />
          <span className="sud-rivet sud-r-bl" /><span className="sud-rivet sud-r-br" />
          <div className="sud-spotlight" />
          <div className="sud-watermark">7</div>
          <div className="sud-rail" />
          <div className="sud-dice-row">
            <SUDDie value={dice[0]} rolling={rolling} delay="0s" />
            <div className={`sud-total ${result ? (result.win ? "sud-t-win" : "sud-t-lose") : ""}`}>{rolling ? <span className="sud-q">?</span> : dice[0] + dice[1]}</div>
            <SUDDie value={dice[1]} rolling={rolling} delay="0.07s" />
          </div>
          <div className={`sud-verdict ${result ? "sud-show" : ""}`}>
            {result && (result.win ? (
              <span className="sud-v-win">+ ₹{result.amount.toLocaleString()} &nbsp;WIN{streak > 1 ? ` ·  ${streak} STREAK` : ""}</span>
            ) : (<span className="sud-v-lose">− ₹{result.amount.toLocaleString()}</span>))}
          </div>
        </div>
      </section>

      <section className="sud-zones">
        {SUD_BETS.map((b) => (
          <button key={b.id} className={`sud-zone ${bet === b.id ? "sud-picked" : ""}`} onClick={() => !rolling && setBet(b.id)} disabled={rolling}>
            <span className="sud-z-label">{b.label}</span>
            <span className="sud-z-sub">{b.sub}</span>
            <span className="sud-z-pays">{b.pays}</span>
            {bet === b.id && <span className="sud-z-chip">₹{chip}</span>}
          </button>
        ))}
      </section>

      <section className="sud-chips">
        {SUD_CHIPS.map((c) => (
          <button key={c} className={`sud-chip ${chip === c ? "sud-sel" : ""}`} onClick={() => !rolling && setChip(c)} disabled={rolling || balance < c}>{c}</button>
        ))}
      </section>

      <button className="sud-roll" onClick={roll} disabled={!canRoll}>{rolling ? "ROLLING…" : bet ? `ROLL  ·  ₹${chip}` : "PICK A BET"}</button>

      {broke && <div className="sud-restake">Add funds from the main lobby to keep playing</div>}

      <footer className="sud-hist">
        {history.length === 0 ? <span className="sud-hist-empty">Roll history appears here</span> : history.map((h, i) => (
          <span key={i} className={`sud-h-dot ${h.won ? "sud-hw" : "sud-hl"} ${h.zone === "seven" ? "sud-h7" : ""}`}>{h.total}</span>
        ))}
      </footer>
    </div>
  );
}

const SUD_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Michroma&display=swap');
.sud-stage{ position:fixed; inset:0; z-index:600; overflow-y:auto; background: radial-gradient(1200px 500px at 50% -10%, #26262c 0%, #0b0b0d 55%, #060607 100%); color: #e8e8ee; font-family: 'Chakra Petch', system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; padding: 18px 16px 28px; gap: 18px; transition: box-shadow .4s; }
.sud-flash-win  { box-shadow: inset 0 0 140px rgba(190,255,210,.10); }
.sud-flash-lose { box-shadow: inset 0 0 140px rgba(255,120,120,.08); }
.sud-close{ position:fixed; top:14px; right:14px; z-index:20; width:34px; height:34px; border-radius:50%; border:1px solid rgba(232,232,238,.25); background:rgba(20,20,24,.8); color:#c9c9d4; cursor:pointer; font-size:15px; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(6px); }
.sud-top { width: 100%; max-width: 460px; display: flex; justify-content: space-between; align-items: center; margin-top: 26px; }
.sud-logo { display: flex; align-items: baseline; gap: 8px; }
.sud-lg-7 { font-family: 'Michroma', sans-serif; font-size: 40px; line-height: 1; background: linear-gradient(178deg, #ffffff 8%, #c7c7d2 30%, #6f6f7c 52%, #e9e9f2 60%, #8b8b98 100%); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 1px 0 rgba(255,255,255,.25)) drop-shadow(0 3px 6px rgba(0,0,0,.7)); }
.sud-lg-ud { font-family: 'Michroma', sans-serif; font-size: 13px; letter-spacing: .32em; color: #9a9aa6; }
.sud-bank { text-align: right; }
.sud-bank-label { display:block; font-size: 9px; letter-spacing:.3em; color:#6d6d78; }
.sud-bank-val { font-size: 20px; font-weight: 700; background: linear-gradient(180deg,#fff 20%, #b9b9c6 70%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.sud-bezel { width: 100%; max-width: 460px; padding: 7px; border-radius: 26px; background: linear-gradient(160deg, #f6f6fa 0%, #b9b9c6 12%, #5c5c68 30%, #d8d8e2 48%, #74747f 62%, #ececf3 80%, #8e8e9a 100%); box-shadow: 0 22px 50px rgba(0,0,0,.7), 0 2px 6px rgba(0,0,0,.5), inset 0 1px 1px rgba(255,255,255,.85); }
.sud-table { position: relative; overflow: hidden; background: radial-gradient(140% 100% at 50% 0%, #1d1d23 0%, #121216 45%, #0a0a0d 100%); border-radius: 20px; padding: 34px 20px 24px; text-align: center; box-shadow: inset 0 2px 10px rgba(0,0,0,.85), inset 0 -1px 0 rgba(255,255,255,.05); }
.sud-table::before { content:''; position:absolute; inset:0; pointer-events:none; background: repeating-linear-gradient(115deg, rgba(255,255,255,.012) 0 2px, transparent 2px 6px); }
.sud-spotlight { position:absolute; inset:-20% -10% auto; height: 75%; background: radial-gradient(60% 90% at 50% 0%, rgba(255,255,255,.09), transparent 70%); pointer-events:none; }
.sud-watermark { position:absolute; right: 6px; bottom: -26px; font-family:'Michroma',sans-serif; font-size: 130px; line-height: 1; color: transparent; pointer-events:none; background: linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.008)); -webkit-background-clip: text; background-clip: text; }
.sud-rail { position:absolute; inset: 10px; border-radius: 14px; pointer-events:none; border: 1px dashed rgba(214,214,226,.14); box-shadow: 0 0 0 3px rgba(0,0,0,.45), 0 0 0 4px rgba(255,255,255,.05); }
.sud-rivet { position:absolute; width: 9px; height: 9px; border-radius:50%; z-index:2; background: radial-gradient(circle at 32% 28%, #ffffff, #9d9daa 55%, #4c4c56 100%); box-shadow: 0 1px 3px rgba(0,0,0,.8), inset 0 -1px 1px rgba(0,0,0,.5); }
.sud-r-tl { top: 16px; left: 16px; } .sud-r-tr { top: 16px; right: 16px; }
.sud-r-bl { bottom: 16px; left: 16px; } .sud-r-br { bottom: 16px; right: 16px; }
.sud-dice-row { display:flex; justify-content:center; align-items:center; gap: 26px; }
.sud-die { width: 78px; height: 78px; border-radius: 16px; perspective: 300px; background: linear-gradient(145deg, #fafafd 0%, #d3d3dc 40%, #9d9daa 78%, #e6e6ef 100%); box-shadow: inset 0 2px 3px rgba(255,255,255,.9), inset 0 -3px 6px rgba(0,0,0,.35), 0 14px 24px rgba(0,0,0,.75), 0 3px 6px rgba(0,0,0,.6); display:flex; align-items:center; justify-content:center; }
.sud-die.sud-rolling { animation: sudTumble .35s linear infinite; }
.sud-die.sud-settled { animation: sudLand .35s cubic-bezier(.2,1.6,.4,1); }
@keyframes sudTumble { 0%   { transform: rotate(-7deg) translateY(0)   scale(1.02); } 50%  { transform: rotate(7deg)  translateY(-9px) scale(.98); } 100% { transform: rotate(-7deg) translateY(0)   scale(1.02); } }
@keyframes sudLand { 0% { transform: scale(1.18) rotate(4deg); } 100% { transform: scale(1) rotate(0); } }
.sud-die-face { width: 58px; height: 58px; display:grid; grid-template-columns: repeat(3,1fr); grid-template-rows: repeat(3,1fr); place-items:center; }
.sud-pip { width: 11px; height: 11px; border-radius: 50%; opacity: 0; }
.sud-pip.sud-on { opacity: 1; background: radial-gradient(circle at 35% 30%, #3a3a42, #0a0a0c 70%); box-shadow: inset 0 1px 2px rgba(0,0,0,.8), 0 1px 0 rgba(255,255,255,.5); }
.sud-total { min-width: 74px; font-family:'Michroma',sans-serif; font-size: 44px; background: linear-gradient(180deg,#fff 10%, #a8a8b4 75%); -webkit-background-clip: text; background-clip: text; color: transparent; transition: transform .25s; }
.sud-total .sud-q { color:#4c4c56; -webkit-text-fill-color:#4c4c56; }
.sud-t-win  { transform: scale(1.12); }
.sud-t-lose { opacity:.75; }
.sud-verdict { height: 26px; margin-top: 14px; font-size: 15px; letter-spacing:.12em; opacity: 0; transform: translateY(4px); transition: all .3s; }
.sud-verdict.sud-show { opacity: 1; transform: none; }
.sud-v-win  { color: #b8f5c6; text-shadow: 0 0 18px rgba(140,255,170,.35); }
.sud-v-lose { color: #f0a2a2; }
.sud-zones { width:100%; max-width:460px; display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; }
.sud-zone { position: relative; background: linear-gradient(180deg,#1a1a1f,#101013); border: 1px solid #2c2c34; border-radius: 14px; padding: 14px 6px 12px; cursor:pointer; color:#e8e8ee; font-family:inherit; display:flex; flex-direction:column; gap:3px; align-items:center; transition: transform .12s, border-color .2s, box-shadow .2s; }
.sud-zone:hover:not(:disabled) { transform: translateY(-2px); border-color:#4a4a56; }
.sud-zone.sud-picked { border-color: #d9d9e4; background: linear-gradient(180deg,#26262d,#141418); box-shadow: 0 0 0 1px #d9d9e4, 0 6px 20px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.12); }
.sud-z-label { font-weight: 700; font-size: 14px; letter-spacing:.08em; }
.sud-z-sub { font-size: 10px; color:#8a8a96; }
.sud-z-pays { font-family:'Michroma',sans-serif; font-size: 15px; margin-top: 2px; background: linear-gradient(180deg,#fff,#9d9daa); -webkit-background-clip:text; background-clip:text; color:transparent; }
.sud-z-chip { position:absolute; top:-9px; right:-6px; background: linear-gradient(180deg,#f2f2f7,#b9b9c6); color:#0b0b0d; font-size: 10px; font-weight:700; border-radius: 999px; padding: 3px 8px; box-shadow: 0 3px 8px rgba(0,0,0,.5); }
.sud-chips { display:flex; gap: 12px; }
.sud-chip { width: 52px; height: 52px; border-radius: 50%; border: 4px dashed #3a3a44; cursor:pointer; background: radial-gradient(circle at 32% 28%, #24242a, #101013 70%); color:#d3d3dc; font-weight:700; font-size:14px; font-family:inherit; transition: transform .12s, border-color .2s, box-shadow .2s; }
.sud-chip:hover:not(:disabled) { transform: translateY(-3px); }
.sud-chip:disabled { opacity:.3; cursor:default; }
.sud-chip.sud-sel { border-color: #e6e6ef; background: radial-gradient(circle at 32% 28%, #f5f5fa, #a5a5b2 75%); color:#0b0b0d; box-shadow: 0 6px 16px rgba(0,0,0,.55), 0 0 0 2px rgba(255,255,255,.15); transform: translateY(-3px); }
.sud-roll { width: 100%; max-width: 460px; padding: 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,.25); font-family:'Michroma',sans-serif; font-size: 15px; letter-spacing:.18em; color:#0a0a0c; cursor:pointer; background: linear-gradient(178deg, #ffffff 0%, #d9d9e2 35%, #8f8f9c 55%, #e2e2ea 72%, #b4b4c1 100%); box-shadow: inset 0 2px 2px rgba(255,255,255,.9), inset 0 -4px 8px rgba(0,0,0,.3), 0 10px 26px rgba(0,0,0,.55); transition: transform .12s, filter .2s; }
.sud-roll:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.06); }
.sud-roll:active:not(:disabled) { transform: translateY(1px); }
.sud-roll:disabled { filter: grayscale(.4) brightness(.55); cursor: default; color:#2a2a30; }
.sud-restake { background:none; border:1px solid #3c3c46; color:#c9c9d4; border-radius: 10px; padding: 10px 18px; font-family:inherit; font-size:13px; text-align:center; }
.sud-hist { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; max-width:460px; min-height:30px; }
.sud-hist-empty { font-size:11px; color:#55555f; letter-spacing:.15em; }
.sud-h-dot { width: 30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size: 12px; font-weight:700; border:1px solid #33333c; color:#8f8f9b; background:#121215; }
.sud-h-dot.sud-hw { border-color:#7dd694; color:#b8f5c6; }
.sud-h-dot.sud-hl { opacity:.8; }
.sud-h-dot.sud-h7 { border-style: double; border-width:3px; }
@media (max-width: 380px) { .sud-die { width: 64px; height: 64px; } .sud-total { font-size: 34px; min-width: 58px; } }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 4. ANDAR BAHAR — silver/platinum joker-matching game
// ═══════════════════════════════════════════════════════════════════════════════
const AB_RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const AB_SUITS = [{s:'♠',c:'blk'},{s:'♥',c:'red'},{s:'♦',c:'red'},{s:'♣',c:'blk'}];
const AB_CHIPS = [10, 25, 50, 100, 250];

function abBuildDeck() {
  const deck = [];
  for (const su of AB_SUITS) for (const r of AB_RANKS) deck.push({ r, s: su.s, c: su.c });
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[deck[i], deck[j]] = [deck[j], deck[i]]; }
  return deck;
}

function ABCardEl({ card, extra, small }) {
  return (
    <div className={`ab-card ${card.c} ${extra || ""} ${small ? "ab-small" : ""}`}>
      <div className="ab-face">
        <div className="ab-corner">{card.r}<small>{card.s}</small></div>
        <div className="ab-pip">{card.s}</div>
        <div className="ab-corner ab-bot">{card.r}<small>{card.s}</small></div>
      </div>
    </div>
  );
}

function AndarBaharGame({ balance, setBalance, addToast, onClose, addBetToHistory }) {
  const [chipVal, setChipVal] = useState(25);
  const [betSide, setBetSide] = useState(null);
  const [betAmt, setBetAmt] = useState(0);
  const [dealing, setDealing] = useState(false);
  const [roundOver, setRoundOver] = useState(true);
  const [joker, setJoker] = useState(null);
  const [jokerFlipped, setJokerFlipped] = useState(false);
  const [stripA, setStripA] = useState([]);
  const [stripB, setStripB] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [winnerSide, setWinnerSide] = useState(null);
  const [status, setStatus] = useState({ text: "Place your bet", cls: "" });
  const [hint, setHint] = useState("Tap Andar or Bahar to place your chip");
  const [history, setHistory] = useState([]);
  const [banner, setBanner] = useState({ show: false, title: "", amt: "" });
  const deckRef = useRef([]);
  const stripARef = useRef(null), stripBRef = useRef(null);
  const stakeRef = useRef(0);

  const pick = (side) => {
    if (dealing || !roundOver) return;
    if (chipVal > balance) { addToast("Not enough balance for that chip", "error"); return; }
    setWinnerSide(null);
    if (betSide && betSide !== side) setHint("Bet moved to " + (side === "A" ? "Andar" : "Bahar"));
    setBetSide(side);
    setBalance(b => b - chipVal);
    setBetAmt(a => {
      const na = a + chipVal;
      setHint(`Bet ₹${na} on ${side === "A" ? "Andar" : "Bahar"} — tap again to add, or Deal`);
      return na;
    });
  };

  const clearBet = () => {
    if (dealing) return;
    setBalance(b => b + betAmt);
    setBetAmt(0); setBetSide(null); setWinnerSide(null);
    setHint("Tap Andar or Bahar to place your chip");
  };

  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  async function deal() {
    if (dealing || betAmt <= 0) return;
    setDealing(true); setRoundOver(false);
    setWinnerSide(null); setStripA([]); setStripB([]); setShowAll(false); setJokerFlipped(false);
    stakeRef.current = betAmt;

    const deck = abBuildDeck();
    const j = deck.pop();
    deckRef.current = deck;

    await wait(250);
    setJoker(j);
    setJokerFlipped(true);
    setStatus({ text: `Joker: ${j.r}${j.s} — dealing…`, cls: "" });
    await wait(650);

    let side = j.c === "blk" ? "A" : "B";
    let winSide = null, count = 0, matchCard = null;
    const a = [], b = [];

    while (deck.length) {
      const card = deck.pop(); count++;
      const isMatch = card.r === j.r;
      if (side === "A") a.push({ ...card, match: isMatch }); else b.push({ ...card, match: isMatch });
      setStripA([...a]); setStripB([...b]);
      if (isMatch) { winSide = side; matchCard = card; break; }
      side = side === "A" ? "B" : "A";
      await wait(count < 6 ? 300 : count < 14 ? 210 : 140);
    }

    await wait(400);
    setStatus({ text: matchCard ? `${matchCard.r}${matchCard.s} matches Joker ${j.r}${j.s}!` : "Revealing all cards…", cls: "" });
    setShowAll(true);
    await wait(900);
    finish(winSide, matchCard, count, j);
  }

  function finish(winSide, matchCard, count, j) {
    const won = winSide === betSide;
    const lostAmt = stakeRef.current;
    setWinnerSide(winSide);

    let payout = 0;
    if (won) { payout = Math.floor(lostAmt * (winSide === "A" ? 1.9 : 2)); setBalance(b => b + payout); }

    const name = winSide === "A" ? "ANDAR" : "BAHAR";
    setStatus({ text: `${name} wins — ${matchCard ? matchCard.r + matchCard.s + " matched Joker " + j.r + j.s : count + " cards"}`, cls: won ? "win" : "lose" });
    setHistory(h => [winSide, ...h].slice(0, 14));

    setBanner({ show: true, title: won ? "YOU WIN" : "YOU LOSE", amt: won ? `+ ₹${payout.toLocaleString()}` : `− ₹${lostAmt.toLocaleString()}` });
    setTimeout(() => setBanner(b => ({ ...b, show: false })), 1600);

    const net = won ? payout - lostAmt : -lostAmt;
    addBetToHistory({ sport: "andarbahar", match: "Andar Bahar", selection: winSide === "A" ? "Andar" : "Bahar", type: "back", odds: winSide === "A" ? 1.9 : 2, stake: lostAmt, pnl: net, result: won ? "won" : "lost" });
    if (won) addToast(`🎴 ${name} wins! +₹${payout.toLocaleString()}`, "success"); else addToast(`${name} wins — you lost ₹${lostAmt.toLocaleString()}`, "error");

    setBetAmt(0); setBetSide(null);
    setTimeout(() => {
      setDealing(false); setRoundOver(true);
      setHint("Place your next bet — last round stays on the table");
    }, 1500);
  }

  useEffect(() => {
    if (stripARef.current) stripARef.current.scrollTo({ left: stripARef.current.scrollWidth, behavior: "smooth" });
  }, [stripA]);
  useEffect(() => {
    if (stripBRef.current) stripBRef.current.scrollTo({ left: stripBRef.current.scrollWidth, behavior: "smooth" });
  }, [stripB]);

  return (
    <div className="ab-body">
      <style>{AB_CSS}</style>
      <button onClick={onClose} className="ab-close">✕</button>

      <header className="ab-header">
        <div className="ab-brand">ANDAR BAHAR</div>
        <div className="ab-balance"><span className="ab-coin"></span><span>₹{balance.toLocaleString()}</span></div>
      </header>

      <div className="ab-table">
        <div className="ab-history">
          {history.map((h, i) => <div key={i} className={`ab-dot ${h}`} />)}
        </div>

        <div className="ab-joker-zone">
          <div className="ab-zone-label">Joker · first card of same rank wins</div>
          <div className={`ab-card ab-joker-card ${joker ? joker.c : ""} ${jokerFlipped ? "ab-flipped" : ""} ${!jokerFlipped ? "ab-glow" : ""}`}>
            <div className="ab-back"></div>
            <div className="ab-face">
              <div className="ab-corner">{joker ? joker.r : "?"}{joker && <small>{joker.s}</small>}</div>
              <div className="ab-pip">{joker ? joker.s : "✦"}</div>
              <div className="ab-corner ab-bot">{joker ? joker.r : "?"}{joker && <small>{joker.s}</small>}</div>
            </div>
          </div>
          <div className={`ab-status ${status.cls}`}>{status.text}</div>
        </div>

        <div className="ab-lanes">
          <div className={`ab-lane ${betSide === "A" && betAmt > 0 ? "ab-selected" : ""} ${winnerSide === "A" ? "ab-winner" : ""} ${dealing ? "ab-locked" : ""}`} onClick={() => pick("A")}>
            <div className="ab-lane-head">
              <div><span className="ab-lane-name">ANDAR</span> <span className="ab-lane-sub">pays 1.9×</span></div>
              <div className="ab-lane-bet">{betSide === "A" && betAmt ? "₹ " + betAmt : ""}</div>
            </div>
            <div className={`ab-strip ${showAll ? "ab-showall" : ""}`} ref={stripARef}>
              {stripA.map((c, i) => <ABCardEl key={i} card={c} extra={c.match ? "ab-match" : ""} />)}
            </div>
          </div>
          <div className={`ab-lane ${betSide === "B" && betAmt > 0 ? "ab-selected" : ""} ${winnerSide === "B" ? "ab-winner" : ""} ${dealing ? "ab-locked" : ""}`} onClick={() => pick("B")}>
            <div className="ab-lane-head">
              <div><span className="ab-lane-name">BAHAR</span> <span className="ab-lane-sub">pays 2×</span></div>
              <div className="ab-lane-bet">{betSide === "B" && betAmt ? "₹ " + betAmt : ""}</div>
            </div>
            <div className={`ab-strip ${showAll ? "ab-showall" : ""}`} ref={stripBRef}>
              {stripB.map((c, i) => <ABCardEl key={i} card={c} extra={c.match ? "ab-match" : ""} />)}
            </div>
          </div>
        </div>
      </div>

      <div className="ab-controls">
        <div className="ab-chips">
          {AB_CHIPS.map(v => (
            <button key={v} className={`ab-chip ${chipVal === v ? "ab-active" : ""}`} onClick={() => setChipVal(v)}>{v}</button>
          ))}
        </div>
        <div className="ab-actions">
          <button className="ab-btn ab-btn-clear" onClick={clearBet} disabled={dealing}>CLEAR</button>
          <button className="ab-btn ab-btn-deal" onClick={deal} disabled={!(betAmt > 0) || dealing}>DEAL</button>
        </div>
        <div className="ab-hint">{hint}</div>
      </div>

      <div className={`ab-banner ${banner.show ? "ab-show" : ""}`}>
        <div className="ab-banner-inner">
          <div className={`ab-banner-title ${banner.title === "YOU WIN" ? "ab-w" : "ab-l"}`}>{banner.title}</div>
          <div className="ab-banner-amt">{banner.amt}</div>
        </div>
      </div>
    </div>
  );
}

const AB_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Inter:wght@400;500;600;700&display=swap');
.ab-body{ position:fixed; inset:0; z-index:600; overflow-y:auto;
  background: radial-gradient(900px 500px at 50% 8%, rgba(201,204,212,.07), transparent 60%), radial-gradient(1200px 700px at 50% -10%, #26262f 0%, #0a0a0c 60%), #060608;
  color:#eceef2; font-family:'Inter',system-ui,sans-serif; display:flex; flex-direction:column; user-select:none; }
.ab-close{ position:fixed; top:14px; right:14px; z-index:20; width:34px; height:34px; border-radius:50%; border:1px solid rgba(201,204,212,.3); background:rgba(10,10,12,.8); color:#eceef2; cursor:pointer; font-size:15px; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(6px); }
.ab-header{ display:flex; align-items:center; justify-content:space-between; padding:14px 18px 10px; margin-top:26px; }
.ab-brand{ font-family:'Cinzel',serif; font-weight:900; font-size:20px; letter-spacing:.16em; background:linear-gradient(100deg,#8e929d 0%,#f7f8fb 25%,#b9bdc8 50%,#ffffff 62%,#8e929d 100%); background-size:250% 100%; -webkit-background-clip:text; background-clip:text; color:transparent; animation:abShimmer 5s linear infinite; }
@keyframes abShimmer{from{background-position:200% 0}to{background-position:-50% 0}}
.ab-balance{ display:flex; align-items:center; gap:8px; background:linear-gradient(180deg,#23232b,#101014); border-radius:999px; padding:7px 15px; font-weight:600; font-size:14px; box-shadow:0 4px 12px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.07); }
.ab-coin{ width:16px; height:16px; border-radius:50%; background:radial-gradient(circle at 35% 30%,#f2f3f6,#9a9ea9 70%,#5f636d); box-shadow:0 0 6px rgba(200,204,212,.5); }
.ab-table{ flex:1; display:flex; flex-direction:column; align-items:center; padding:4px 12px 8px; max-width:520px; width:100%; margin:0 auto; }
.ab-joker-zone{ display:flex; flex-direction:column; align-items:center; gap:6px; margin:6px 0 14px; position:relative; }
.ab-zone-label{ font-size:10px; letter-spacing:.28em; color:#7d818c; text-transform:uppercase; font-weight:600; display:flex; align-items:center; gap:10px; }
.ab-zone-label::before,.ab-zone-label::after{ content:""; width:34px; height:1px; background:linear-gradient(90deg,transparent,rgba(201,204,212,.5)); }
.ab-zone-label::after{ transform:scaleX(-1); }
.ab-status{ min-height:22px; font-family:'Cinzel',serif; font-size:15px; letter-spacing:.08em; color:#c9ccd4; text-align:center; font-weight:700; transition:color .3s; }
.ab-status.win{ color:#8fd6a4; } .ab-status.lose{ color:#e08a8a; }
.ab-card{ width:58px; height:82px; border-radius:8px; position:relative; transform-style:preserve-3d; transition:transform .45s cubic-bezier(.2,.7,.3,1); flex:0 0 auto; }
.ab-card .ab-face,.ab-card .ab-back{ position:absolute; inset:0; border-radius:8px; backface-visibility:hidden; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 14px rgba(0,0,0,.55); }
.ab-card .ab-face{ background:linear-gradient(160deg,#ffffff 0%,#eef0f4 45%,#dfe2e9 100%); border:1px solid #b3b7c2; padding:5px 6px; transform:rotateY(180deg); }
.ab-card .ab-back{ background:repeating-linear-gradient(45deg,rgba(201,204,212,.12) 0 3px,transparent 3px 9px), linear-gradient(160deg,#26262e,#101014); border:1px solid #2b2b33; }
.ab-card.ab-flipped{ transform:rotateY(180deg); }
.ab-card .ab-corner{ font-weight:700; font-size:15px; line-height:1; }
.ab-card .ab-corner small{ display:block; font-size:12px; line-height:.9; }
.ab-card .ab-pip{ font-size:24px; text-align:center; line-height:1; }
.ab-card .ab-corner.ab-bot{ transform:rotate(180deg); align-self:flex-end; }
.ab-card.red .ab-face{ color:#c0392b; } .ab-card.blk .ab-face{ color:#17171c; }
.ab-joker-card{ width:72px; height:102px; }
.ab-joker-card .ab-face{ background:linear-gradient(160deg,#fdfdfe 0%,#dfe2e9 55%,#f2f3f6 100%); border:2px solid #a7abb6; }
.ab-joker-card .ab-pip{ font-size:30px; }
.ab-joker-card.ab-glow{ animation:abjGlow 2.4s ease-in-out infinite; }
@keyframes abjGlow{ 0%,100%{filter:drop-shadow(0 0 4px rgba(201,204,212,.25))} 50%{filter:drop-shadow(0 0 14px rgba(201,204,212,.55))} }
.ab-lanes{ width:100%; display:flex; flex-direction:column; gap:10px; margin-bottom:12px; }
.ab-lane{ border-radius:16px; padding:12px 12px 14px; background:linear-gradient(180deg,rgba(32,32,40,.92),rgba(14,14,18,.95)); border:1px solid rgba(201,204,212,.14); position:relative; transition:box-shadow .3s; cursor:pointer; box-shadow:0 10px 30px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.05); }
.ab-lane.ab-selected{ box-shadow:0 0 0 1.5px #c9ccd4, 0 0 26px rgba(201,204,212,.22), 0 10px 30px rgba(0,0,0,.45); }
.ab-lane.ab-winner{ box-shadow:0 0 0 1.5px #8fd6a4, 0 0 30px rgba(143,214,164,.28), 0 10px 30px rgba(0,0,0,.45); }
.ab-lane.ab-locked{ cursor:default; }
.ab-lane-head{ display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px; padding:0 4px 8px; border-bottom:1px solid rgba(201,204,212,.12); }
.ab-lane-name{ font-family:'Cinzel',serif; font-weight:700; font-size:16px; letter-spacing:.2em; }
.ab-lane-sub{ font-size:10px; color:#7d818c; letter-spacing:.12em; text-transform:uppercase; }
.ab-lane-bet{ font-size:12px; font-weight:600; color:#c9ccd4; min-height:15px; }
.ab-strip{ display:flex; gap:6px; overflow-x:auto; min-height:86px; align-items:center; scrollbar-width:none; padding:4px 14px 4px 4px; }
.ab-strip::-webkit-scrollbar{ display:none; }
.ab-strip.ab-showall{ flex-wrap:wrap; overflow:visible; justify-content:flex-start; row-gap:8px; padding:4px; }
.ab-strip.ab-showall .ab-card{ width:36px; height:52px; border-radius:5px; }
.ab-strip.ab-showall .ab-card .ab-corner{ font-size:9px; } .ab-strip.ab-showall .ab-card .ab-corner small{ font-size:8px; }
.ab-strip.ab-showall .ab-card .ab-pip{ font-size:13px; }
.ab-strip.ab-showall .ab-card.ab-match{ transform:scale(1.25); z-index:2; }
.ab-strip .ab-card{ transform-style:flat; animation:abSlideIn .35s cubic-bezier(.2,.8,.3,1) both; }
.ab-strip .ab-card .ab-back{ display:none; } .ab-strip .ab-card .ab-face{ transform:none; }
@keyframes abSlideIn{from{opacity:0;transform:translateX(28px) scale(.85)}to{opacity:1;transform:none}}
.ab-strip .ab-card.ab-match .ab-face{ border-color:#8fd6a4; box-shadow:0 0 16px rgba(143,214,164,.6); }
.ab-controls{ width:100%; max-width:520px; margin:0 auto; padding:10px 14px calc(14px + env(safe-area-inset-bottom)); background:linear-gradient(180deg,transparent,rgba(10,10,12,.9) 30%); }
.ab-chips{ display:flex; justify-content:center; gap:10px; margin-bottom:12px; }
.ab-chip{ width:54px; height:54px; border-radius:50%; border:none; cursor:pointer; font-family:'Inter',sans-serif; font-weight:700; font-size:13px; color:#eceef2; background:radial-gradient(circle at 32% 26%, rgba(255,255,255,.28), transparent 42%), radial-gradient(circle at 50% 50%, #2a2a33 0 57%, transparent 57%), repeating-conic-gradient(#d7dae0 0 12deg, #101014 12deg 30deg); box-shadow:0 5px 12px rgba(0,0,0,.65), 0 0 0 1px #43434e, inset 0 2px 3px rgba(255,255,255,.12); transition:transform .15s; }
.ab-chip.ab-active{ transform:translateY(-7px) scale(1.1); box-shadow:0 10px 18px rgba(0,0,0,.7), 0 0 0 2px #c9ccd4, 0 0 20px rgba(201,204,212,.45); }
.ab-actions{ display:flex; gap:10px; }
.ab-btn{ flex:1; border:none; border-radius:12px; padding:15px 0; font-family:'Cinzel',serif; font-weight:700; font-size:15px; letter-spacing:.14em; cursor:pointer; transition:transform .12s, opacity .2s; }
.ab-btn:disabled{ opacity:.35; cursor:default; }
.ab-btn-deal{ color:#0d0d10; background:linear-gradient(180deg,#f7f8fb 0%,#b9bdc8 50%,#dfe2e8 100%); box-shadow:0 6px 18px rgba(201,204,212,.28); }
.ab-btn-clear{ color:#c9ccd4; background:linear-gradient(180deg,#1f1f26,#121217); border:1px solid #2b2b33; flex:0 0 96px; }
.ab-hint{ margin-top:8px; text-align:center; font-size:11px; color:#7d818c; letter-spacing:.06em; min-height:14px; }
.ab-banner{ position:fixed; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; opacity:0; transition:opacity .3s; z-index:50; }
.ab-banner.ab-show{ opacity:1; }
.ab-banner-inner{ background:linear-gradient(180deg,rgba(32,32,40,.98),rgba(12,12,16,.98)); border:1px solid rgba(236,238,242,.3); border-radius:20px; padding:28px 48px; text-align:center; box-shadow:0 24px 70px rgba(0,0,0,.75); transform:scale(.9); transition:transform .3s; }
.ab-banner.ab-show .ab-banner-inner{ transform:scale(1); }
.ab-banner-title{ font-family:'Cinzel',serif; font-size:27px; font-weight:900; letter-spacing:.12em; margin-bottom:6px; }
.ab-banner-title.ab-w{ color:#8fd6a4; text-shadow:0 0 18px rgba(143,214,164,.5); } .ab-banner-title.ab-l{ color:#e08a8a; }
.ab-banner-amt{ font-size:15px; color:#c9ccd4; font-weight:600; }
.ab-history{ display:flex; gap:6px; justify-content:center; margin:2px 0 8px; min-height:12px; }
.ab-dot{ width:10px; height:10px; border-radius:50%; border:1px solid #2b2b33; }
.ab-dot.A{ background:linear-gradient(180deg,#f4f5f8,#9a9ea9); } .ab-dot.B{ background:#17171c; border-color:#5f636d; }
@media (min-width:480px){ .ab-card{ width:64px; height:90px; } .ab-joker-card{ width:78px; height:110px; } }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 5. LIVE ROULETTE — Physics wheel, brass rail table, real chip betting grid
// ═══════════════════════════════════════════════════════════════════════════════
const RLT_WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const RLT_REDS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const RLT_N = RLT_WHEEL_ORDER.length;
const RLT_SLICE = 360 / RLT_N;
const RLT_CX = 300, RLT_CY = 300;
const RLT_R = { pocketOuter: 250, pocketInner: 150, hubOuter: 150, hubInner: 72, textR: 222, deflector: 261, ballFast: 262, ballLanded: 196 };

function rltToRad(d) { return d * Math.PI / 180; }
function rltPt(r, deg) { const a = rltToRad(deg); return { x: RLT_CX + r * Math.sin(a), y: RLT_CY - r * Math.cos(a) }; }
function rltWedgePath(rOut, rIn, half) {
  const p1 = rltPt(rIn, -half), p2 = rltPt(rOut, -half), p3 = rltPt(rOut, half), p4 = rltPt(rIn, half);
  return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} A ${rOut} ${rOut} 0 0 1 ${p3.x.toFixed(2)} ${p3.y.toFixed(2)} L ${p4.x.toFixed(2)} ${p4.y.toFixed(2)} A ${rIn} ${rIn} 0 0 0 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Z`;
}
// Precompute static pocket/deflector/spoke geometry once (never changes)
const RLT_POCKETS = RLT_WHEEL_ORDER.map((num, i) => {
  const half = RLT_SLICE / 2;
  const color = num === 0 ? "#0f7a45" : (RLT_REDS.has(num) ? "#9e1b32" : "#141314");
  const d = rltWedgePath(RLT_R.pocketOuter, RLT_R.pocketInner, half);
  const rot = i * RLT_SLICE;
  const tp = rltPt(RLT_R.textR, 0);
  return { num, color, d, rot, tx: tp.x.toFixed(2), ty: tp.y.toFixed(2) };
});
const RLT_DEFLECTORS = Array.from({ length: 8 }, (_, i) => { const a = i * 45, p = rltPt(RLT_R.deflector, a); return { x: p.x, y: p.y, a }; });
const RLT_SPOKES = Array.from({ length: 6 }, (_, j) => { const a = j * 60; return { p1: rltPt(RLT_R.hubInner, a), p2: rltPt(RLT_R.hubOuter, a) }; });
// Number grid: col 0-11, each with bottom/mid/top numbers
const RLT_NUMBER_CELLS = [];
for (let col = 0; col < 12; col++) {
  const bottom = col * 3 + 1, mid = col * 3 + 2, top = col * 3 + 3;
  [[top, 1], [mid, 2], [bottom, 3]].forEach(([num, row]) => {
    RLT_NUMBER_CELLS.push({ num, row, col: col + 2, red: RLT_REDS.has(num) });
  });
}

function rltWinsOn(key, n) {
  if (key.startsWith("straight_")) return Number(key.slice(9)) === n;
  if (n === 0) return false;
  switch (key) {
    case "red": return RLT_REDS.has(n);
    case "black": return !RLT_REDS.has(n);
    case "odd": return n % 2 === 1;
    case "even": return n % 2 === 0;
    case "low": return n >= 1 && n <= 18;
    case "high": return n >= 19 && n <= 36;
    case "dozen1": return n >= 1 && n <= 12;
    case "dozen2": return n >= 13 && n <= 24;
    case "dozen3": return n >= 25 && n <= 36;
    case "col1": return n % 3 === 1;
    case "col2": return n % 3 === 2;
    case "col3": return n % 3 === 0;
    default: return false;
  }
}
function rltOddsFor(key) {
  if (key.startsWith("straight_")) return 35;
  if (["dozen1", "dozen2", "dozen3", "col1", "col2", "col3"].includes(key)) return 2;
  return 1;
}
function rltEaseOutQuint(t) { return 1 - Math.pow(1 - t, 5); }
function rltEaseInQuad(t) { return t * t; }
function rltFmtChip(amt) { return amt >= 1000 ? (Math.round(amt / 100) / 10) + "k" : String(amt); }

function RouletteGame({ balance, setBalance, addToast, onClose, addBetToHistory }) {
  const [bets, setBets] = useState({});               // key -> chip amount staged this round
  const [selectedChip, setSelectedChip] = useState(5);
  const [spinning, setSpinning] = useState(false);
  const [history, setHistory] = useState([]);           // recent winning numbers
  const [lastRoundBets, setLastRoundBets] = useState(null);
  const [soundOn, setSoundOn] = useState(true);
  const [resultChip, setResultChip] = useState({ bg: "rgba(255,255,255,.12)", label: "–" });
  const [resultText, setResultText] = useState("Place your bets to begin");
  const [winningPocket, setWinningPocket] = useState(null);
  const [flashKeys, setFlashKeys] = useState([]);

  const wheelGroupRef = useRef(null);
  const ballRef = useRef(null);
  const wheelRotationRef = useRef(0);
  const ballAngleRef = useRef(0);
  const audioCtxRef = useRef(null);
  const rafRef = useRef(null);

  const CHIP_STYLES = {
    1:   { c1: "#e9e4d6", c2: "#b8b2a0", text: "#2a2a2a" },
    5:   { c1: "#9c2138", c2: "#5c1120", text: "#fff" },
    10:  { c1: "#1c5c8a", c2: "#123c5a", text: "#fff" },
    25:  { c1: "#0f7a45", c2: "#0a4f2d", text: "#fff" },
    100: { c1: "#201f24", c2: "#050506", text: "#fff" },
    500: { c1: "#6b3396", c2: "#3d1c57", text: "#fff" },
  };

  const totalBet = Object.values(bets).reduce((s, v) => s + v, 0);

  // ── Sound ────────────────────────────────────────────────────────────────
  const ensureAudio = () => { if (!audioCtxRef.current) { try { audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } };
  const beep = (freq, dur, type = "sine", vol = 0.14, delay = 0) => {
    if (!soundOn) return;
    ensureAudio();
    const ctx = audioCtxRef.current; if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  };
  const sfx = {
    chip: () => beep(760, 0.07, "triangle", 0.12),
    clear: () => beep(280, 0.12, "sine", 0.1),
    spin: () => beep(140, 0.4, "sawtooth", 0.05),
    tick: () => beep(1000, 0.02, "square", 0.025),
    drop: () => beep(210, 0.18, "sine", 0.09),
    win: () => [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.28, "triangle", 0.13, i * 0.09)),
    lose: () => beep(150, 0.3, "sine", 0.07),
  };

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // ── Betting ──────────────────────────────────────────────────────────────
  const placeBet = (key) => {
    if (spinning) return;
    if (selectedChip > balance) { addToast("Not enough balance for that chip", "error"); return; }
    ensureAudio();
    setBalance(b => b - selectedChip);
    setBets(b => ({ ...b, [key]: (b[key] || 0) + selectedChip }));
    sfx.chip();
  };
  const clearBets = () => {
    if (spinning || totalBet === 0) return;
    setBalance(b => b + totalBet);
    setBets({});
    sfx.clear();
  };
  const rebet = () => {
    if (spinning || !lastRoundBets) return;
    const need = Object.values(lastRoundBets).reduce((s, v) => s + v, 0);
    if (need > balance) { addToast("Not enough balance to repeat that bet", "error"); return; }
    setBalance(b => b - need);
    setBets({ ...lastRoundBets });
    sfx.chip();
  };

  // ── Spin ─────────────────────────────────────────────────────────────────
  const spin = () => {
    if (spinning) return;
    if (totalBet === 0) { addToast("Place a bet to spin", "error"); return; }
    setSpinning(true);
    setLastRoundBets({ ...bets });
    setFlashKeys([]);
    setWinningPocket(null);
    sfx.spin();
    setResultChip({ bg: "rgba(255,255,255,.12)", label: "●" });
    setResultText("Spinning…");

    const winIndex = Math.floor(Math.random() * RLT_N);
    const winNumber = RLT_WHEEL_ORDER[winIndex];
    const pocketBase = winIndex * RLT_SLICE;
    const ballFinal = Math.random() * 360;

    let delta = (ballFinal - wheelRotationRef.current - pocketBase) % 360;
    delta = ((delta % 360) + 360) % 360;
    const wheelSpins = 6 + Math.floor(Math.random() * 3);
    const wheelDelta = delta + wheelSpins * 360;
    const wheelStart = wheelRotationRef.current;
    const wheelEnd = wheelRotationRef.current + wheelDelta;

    let ballDiff = (ballAngleRef.current - ballFinal) % 360;
    ballDiff = ((ballDiff % 360) + 360) % 360;
    const ballSpins = 5 + Math.floor(Math.random() * 3);
    const ballDecrease = ballDiff + ballSpins * 360;
    const ballStart = ballAngleRef.current;

    const duration = 5200;
    const t0 = performance.now();
    let lastTickAngle = ballStart;
    let lastTickTime = 0;
    let dropSoundPlayed = false;

    const frame = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      const e = rltEaseOutQuint(t);

      const wheelNow = wheelStart + wheelDelta * e;
      if (wheelGroupRef.current) wheelGroupRef.current.style.transform = `rotate(${wheelNow}deg)`;

      const angleNow = ballStart - ballDecrease * e;
      let rp = t < 0.55 ? 0 : (t - 0.55) / 0.45;
      rp = rltEaseInQuad(Math.min(1, rp));
      const radiusNow = RLT_R.ballFast - (RLT_R.ballFast - RLT_R.ballLanded) * rp;
      const p = rltPt(radiusNow, angleNow);
      if (ballRef.current) { ballRef.current.setAttribute("cx", p.x.toFixed(2)); ballRef.current.setAttribute("cy", p.y.toFixed(2)); }

      if (!dropSoundPlayed && rp > 0) { dropSoundPlayed = true; sfx.drop(); }
      if (t < 0.92 && Math.abs(angleNow - lastTickAngle) >= RLT_SLICE && (now - lastTickTime) >= 30) { sfx.tick(); lastTickAngle = angleNow; lastTickTime = now; }

      if (t < 1) { rafRef.current = requestAnimationFrame(frame); }
      else {
        wheelRotationRef.current = wheelEnd % 360;
        ballAngleRef.current = ballFinal;
        finishSpin(winNumber);
      }
    };
    rafRef.current = requestAnimationFrame(frame);
  };

  const finishSpin = (winNumber) => {
    let payout = 0; const winners = [];
    for (const key in bets) { if (rltWinsOn(key, winNumber)) { payout += bets[key] * (rltOddsFor(key) + 1); winners.push(key); } }

    if (payout > 0) setBalance(b => b + payout);
    setHistory(h => [winNumber, ...h.slice(0, 15)]);

    const colorBg = winNumber === 0 ? "#0f7a45" : (RLT_REDS.has(winNumber) ? "#9e1b32" : "#141314");
    setResultChip({ bg: colorBg, label: String(winNumber) });
    setResultText(payout > 0 ? `You won ₹${payout.toLocaleString()}` : "No win — spin again");

    if (payout > 0) sfx.win(); else sfx.lose();

    setWinningPocket(winNumber);
    setFlashKeys([...winners, `straight_${winNumber}`]);
    setTimeout(() => { setWinningPocket(null); setFlashKeys([]); }, 2300);

    const netStake = Object.values(bets).reduce((s, v) => s + v, 0);
    addBetToHistory({ sport: "roulette", match: "Live Roulette", selection: winners.length ? winners.join(", ") : "No win", type: "back", odds: netStake ? +(payout / netStake).toFixed(2) || 0 : 0, stake: netStake, pnl: payout - netStake, result: payout > netStake ? "won" : "lost" });
    if (payout > 0) addToast(`🎡 ${winNumber}! Won ₹${payout.toLocaleString()}`, "success"); else addToast(`🎡 ${winNumber}! No win this round`, "error");

    setTimeout(() => { setBets({}); setSpinning(false); }, 1900);
  };

  const rltCss = `
    .rl-cell{ position:relative; border:1px solid rgba(239,231,211,.14); border-radius:5px; cursor:pointer; font-family:'Manrope',sans-serif; font-weight:700; color:#efe7d3; background:rgba(255,255,255,.03); display:flex; align-items:center; justify-content:center; padding:0; transition:background .12s ease, transform .1s ease; }
    .rl-cell:hover{ background:rgba(255,255,255,.1); }
    .rl-cell:active{ transform:scale(.94); }
    .rl-num-cell{ font-family:'Space Mono',monospace; font-size:15px; }
    .rl-num-cell.red{ background:#9e1b32; }
    .rl-num-cell.black{ background:#141314; }
    .rl-num-cell.red:hover,.rl-num-cell.black:hover{ filter:brightness(1.2); }
    .rl-zero-cell{ background:#0f7a45; font-family:'Space Mono',monospace; font-size:17px; }
    .rl-outside-cell{ font-size:10.5px; letter-spacing:.05em; text-transform:uppercase; line-height:1.2; text-align:center; }
    .rl-chip-token{ position:absolute; top:-8px; right:-8px; min-width:22px; height:22px; padding:0 5px; border-radius:999px; background:radial-gradient(circle at 30% 30%, #eed9a0, #c7a45f 70%); color:#2a1e0d; font-family:'Space Mono',monospace; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; border:1.5px solid rgba(0,0,0,.4); box-shadow:0 2px 4px rgba(0,0,0,.4); animation:rlChipPop .2s ease; z-index:2; }
    @keyframes rlChipPop{ from{ transform:scale(.3); opacity:0;} to{ transform:scale(1); opacity:1;} }
    .rl-win-pulse{ animation:rlWinPulse 1.15s ease 2; }
    @keyframes rlWinPulse{ 0%,100%{ box-shadow:0 0 0 0 rgba(238,217,160,0);} 50%{ box-shadow:0 0 0 6px rgba(238,217,160,.55);} }
    .rl-pocket-win path{ animation:rlPocketGlow 1.15s ease 2; }
    @keyframes rlPocketGlow{ 0%,100%{ filter:brightness(1);} 50%{ filter:brightness(1.6);} }
    .rl-chip{ width:50px; height:50px; border-radius:50%; position:relative; cursor:pointer; border:none; font-family:'Space Mono',monospace; font-weight:700; font-size:11px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 8px rgba(0,0,0,.4), inset 0 0 0 5px rgba(255,255,255,.14), inset 0 0 0 7px rgba(0,0,0,.32); transition:transform .15s ease, box-shadow .15s ease; }
    .rl-chip::after{ content:""; position:absolute; inset:9px; border-radius:50%; box-shadow:inset 0 2px 4px rgba(0,0,0,.35), inset 0 -2px 3px rgba(255,255,255,.18); }
    .rl-chip span{ position:relative; z-index:1; }
    .rl-btn{ font-family:'Manrope',sans-serif; font-weight:700; font-size:12.5px; letter-spacing:.02em; border-radius:9px; padding:10px 16px; border:1px solid transparent; cursor:pointer; transition:transform .15s ease, filter .15s ease, opacity .15s ease; }
    .rl-btn:active:not(:disabled){ transform:scale(.96); }
    .rl-btn:disabled{ opacity:.4; cursor:not-allowed; }
    .rl-btn-primary{ background:linear-gradient(180deg,#eed9a0,#c7a45f 75%); color:#2a1e0d; box-shadow:0 6px 14px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.5); min-width:100px; }
    .rl-btn-primary:not(:disabled):hover{ filter:brightness(1.07); }
    .rl-btn-ghost{ background:transparent; color:#efe7d3; border-color:rgba(239,231,211,.28); }
    .rl-btn-ghost:not(:disabled):hover{ border-color:#c7a45f; color:#eed9a0; }
    .rl-hist-dot{ flex:none; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'Space Mono',monospace; font-size:10px; font-weight:700; color:#fff; border:1px solid rgba(0,0,0,.4); }
  `;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", flexDirection: "column", fontFamily: "'Manrope',sans-serif", background: "radial-gradient(ellipse 900px 500px at 50% -5%, rgba(255,255,255,.06), transparent 60%), radial-gradient(ellipse 1000px 800px at 50% 110%, #052318, #010b07 85%), #0c4a34", overflowY: "auto" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Manrope:wght@400;500;700;800&family=Space+Mono:wght@400;700&display=swap');${rltCss}`}</style>

      {/* Close button */}
      <button onClick={onClose} style={{ position: "fixed", top: 16, right: 16, zIndex: 20, width: 36, height: 36, border: "1px solid rgba(239,231,211,.28)", borderRadius: "50%", background: "rgba(5,25,17,.85)", color: "#efe7d3", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#c7a45f"; e.currentTarget.style.color = "#eed9a0"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(239,231,211,.28)"; e.currentTarget.style.color = "#efe7d3"; }}>✕</button>

      {/* Balance pill top-left */}
      <div style={{ position: "fixed", top: 16, left: 16, zIndex: 20, padding: "8px 16px", background: "rgba(5,25,17,.85)", border: "1px solid rgba(199,164,95,.35)", borderRadius: 100, backdropFilter: "blur(6px)", fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700, color: "#eed9a0" }}>
        ₹{balance.toLocaleString()}
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 780, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 22, padding: "60px 14px 50px" }}>

        {/* Header */}
        <header style={{ textAlign: "center" }}>
          <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: ".24em", textTransform: "uppercase", color: "#c7a45f", opacity: 0.85, margin: "0 0 6px" }}>Table No. 7 · European Wheel</p>
          <h1 style={{ fontFamily: "'Bodoni Moda',serif", fontStyle: "italic", fontWeight: 700, fontSize: "clamp(34px,8vw,50px)", margin: 0, letterSpacing: ".01em", background: "linear-gradient(180deg,#eed9a0,#c7a45f 55%,#8a6c34)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Roulette</h1>
          <p style={{ fontSize: 12.5, color: "rgba(239,231,211,.55)", margin: "6px 0 0", letterSpacing: ".03em" }}>Single zero · Straight-up &amp; outside bets</p>
        </header>

        {/* Wheel */}
        <div style={{ position: "relative", width: "min(80vw,440px)", marginBottom: 10 }}>
          <svg viewBox="0 0 600 600" role="img" aria-label="Roulette wheel" onClick={spin} style={{ width: "100%", height: "auto", display: "block", filter: "drop-shadow(0 20px 32px rgba(0,0,0,.55))", cursor: "pointer" }}>
            <defs>
              <radialGradient id="rlgWood" cx="35%" cy="30%" r="75%"><stop offset="0%" stopColor="#6b4128" /><stop offset="55%" stopColor="#43230f" /><stop offset="100%" stopColor="#1c0e08" /></radialGradient>
              <linearGradient id="rlgBrassRing" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f3dfa3" /><stop offset="45%" stopColor="#a9803f" /><stop offset="55%" stopColor="#8a6a34" /><stop offset="100%" stopColor="#e8cf8a" /></linearGradient>
              <radialGradient id="rlgHub" cx="38%" cy="34%" r="70%"><stop offset="0%" stopColor="#f6e6b4" /><stop offset="50%" stopColor="#b08a45" /><stop offset="100%" stopColor="#5c4420" /></radialGradient>
              <radialGradient id="rlgBall" cx="35%" cy="30%" r="70%"><stop offset="0%" stopColor="#ffffff" /><stop offset="60%" stopColor="#e7e2d6" /><stop offset="100%" stopColor="#9c9689" /></radialGradient>
              <radialGradient id="rlgShade" cx="50%" cy="42%" r="60%"><stop offset="0%" stopColor="#000000" stopOpacity="0" /><stop offset="76%" stopColor="#000000" stopOpacity="0" /><stop offset="100%" stopColor="#000000" stopOpacity=".55" /></radialGradient>
              <radialGradient id="rlgGloss" cx="30%" cy="22%" r="55%"><stop offset="0%" stopColor="#ffffff" stopOpacity=".16" /><stop offset="45%" stopColor="#ffffff" stopOpacity=".03" /><stop offset="100%" stopColor="#ffffff" stopOpacity="0" /></radialGradient>
            </defs>

            <circle cx="300" cy="300" r="296" fill="url(#rlgWood)" />
            <circle cx="300" cy="300" r="296" fill="none" stroke="url(#rlgBrassRing)" strokeWidth="4" />
            <circle cx="300" cy="300" r="270" fill="none" stroke="url(#rlgBrassRing)" strokeWidth="3" opacity=".9" />
            <circle cx="300" cy="300" r="252" fill="#0d0f10" />
            <g>{RLT_DEFLECTORS.map((d, i) => <rect key={i} x={(d.x - 4).toFixed(2)} y={(d.y - 9).toFixed(2)} width="8" height="18" rx="2" fill="url(#rlgBrassRing)" stroke="#3a2c12" strokeWidth=".6" transform={`rotate(${d.a} ${d.x.toFixed(2)} ${d.y.toFixed(2)})`} />)}</g>

            <g ref={wheelGroupRef} style={{ transformOrigin: "300px 300px" }}>
              <circle cx="300" cy="300" r="250" fill="#1b1b1d" />
              <g>
                {RLT_POCKETS.map(p => (
                  <g key={p.num} className={winningPocket === p.num ? "rl-pocket-win" : ""} transform={`rotate(${p.rot} ${RLT_CX} ${RLT_CY})`}>
                    <path d={p.d} fill={p.color} stroke="#c9c2ad" strokeWidth="1.1" />
                    <text x={p.tx} y={p.ty} textAnchor="middle" dominantBaseline="central" style={{ fontFamily: "Manrope,sans-serif", fontWeight: 800, fontSize: 19, fill: "#efe7d3", paintOrder: "stroke", stroke: "rgba(0,0,0,.4)", strokeWidth: "2px" }}>{p.num}</text>
                  </g>
                ))}
              </g>
              <circle cx="300" cy="300" r="150" fill="url(#rlgBrassRing)" />
              <circle cx="300" cy="300" r="150" fill="none" stroke="#3a2c12" strokeWidth="2" />
              <g>{RLT_SPOKES.map((s, i) => <line key={i} x1={s.p1.x.toFixed(2)} y1={s.p1.y.toFixed(2)} x2={s.p2.x.toFixed(2)} y2={s.p2.y.toFixed(2)} stroke="#3a2c12" strokeWidth="2.2" strokeLinecap="round" />)}</g>
              <circle cx="300" cy="300" r="72" fill="url(#rlgHub)" stroke="#3a2c12" strokeWidth="2" />
              <circle cx="300" cy="300" r="36" fill="url(#rlgHub)" stroke="#3a2c12" strokeWidth="2" />
              <circle cx="300" cy="300" r="11" fill="#2a1e0d" />
            </g>

            <circle cx="300" cy="300" r="296" fill="url(#rlgShade)" />
            <circle cx="300" cy="300" r="296" fill="url(#rlgGloss)" />
            <circle ref={ballRef} cx="300" cy="104" r="7.5" fill="url(#rlgBall)" stroke="#6b665a" strokeWidth=".6" style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,.55))" }} />
          </svg>

          {/* Result badge */}
          <div style={{ position: "absolute", left: "50%", bottom: -16, transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 10, background: "rgba(5,25,17,.9)", border: "1px solid rgba(199,164,95,.4)", padding: "8px 16px 8px 8px", borderRadius: 999, backdropFilter: "blur(6px)", whiteSpace: "nowrap", boxShadow: "0 8px 18px rgba(0,0,0,.4)" }}>
            <span style={{ width: 30, height: 30, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 13, color: "#fff", border: "2px solid rgba(255,255,255,.5)", background: resultChip.bg }}>{resultChip.label}</span>
            <span style={{ fontSize: 12.5, color: "#efe7d3" }}>{resultText}</span>
          </div>
        </div>

        {/* Console */}
        <div style={{ width: "100%", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "10px 14px", background: "linear-gradient(180deg,#4a2c1a,#2c1810)", border: "1px solid rgba(0,0,0,.4)", borderRadius: 16, padding: "14px 16px", boxShadow: "inset 0 1px 0 rgba(255,255,255,.07), 0 8px 18px rgba(0,0,0,.35)" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 82 }}><span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".14em", color: "rgba(239,231,211,.55)" }}>Balance</span><b style={{ fontFamily: "'Space Mono',monospace", fontSize: 19, fontWeight: 700, color: "#eed9a0" }}>₹{balance.toLocaleString()}</b></div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 82 }}><span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".14em", color: "rgba(239,231,211,.55)" }}>Bet</span><b style={{ fontFamily: "'Space Mono',monospace", fontSize: 19, fontWeight: 700, color: "#eed9a0" }}>₹{totalBet.toLocaleString()}</b></div>
          <button className="rl-btn rl-btn-ghost" disabled={spinning || totalBet === 0} onClick={clearBets}>Clear bets</button>
          <button className="rl-btn rl-btn-ghost" disabled={spinning || !lastRoundBets} onClick={rebet}>Rebet</button>
          <button className="rl-btn rl-btn-primary" disabled={spinning || totalBet === 0} onClick={spin}>{spinning ? "Spinning…" : "Spin"}</button>
          <button onClick={() => setSoundOn(s => !s)} title="Toggle sound" style={{ background: "transparent", border: "1px solid rgba(239,231,211,.28)", color: "#efe7d3", borderRadius: 999, width: 38, height: 38, padding: 0, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>{soundOn ? "♪" : "✕"}</button>
        </div>

        <p style={{ fontSize: 11.5, color: "rgba(239,231,211,.45)", textAlign: "center", margin: "-8px 0 -6px" }}>Pick a chip, then tap the table to place your bet.</p>

        {/* Chips */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {[1, 5, 10, 25, 100, 500].map(v => {
            const cs = CHIP_STYLES[v];
            const selected = selectedChip === v;
            return (
              <button key={v} className="rl-chip" onClick={() => setSelectedChip(v)}
                style={{ background: `repeating-conic-gradient(${cs.c1} 0deg 20deg, ${cs.c2} 20deg 40deg)`, color: cs.text, transform: selected ? "translateY(-6px)" : "none", boxShadow: selected ? "0 10px 18px rgba(0,0,0,.5), 0 0 0 3px #eed9a0" : "0 4px 8px rgba(0,0,0,.4), inset 0 0 0 5px rgba(255,255,255,.14), inset 0 0 0 7px rgba(0,0,0,.32)" }}>
                <span>₹{v}</span>
              </button>
            );
          })}
        </div>

        {/* Betting table */}
        <div style={{ width: "100%", overflowX: "auto", paddingBottom: 8, WebkitOverflowScrolling: "touch" }}>
          <div style={{ minWidth: 760, margin: "0 auto", position: "relative", display: "grid", gridTemplateColumns: "56px repeat(12,50px) 66px", gridTemplateRows: "56px 56px 56px 48px 48px", gap: 3, background: "linear-gradient(160deg,#0c4a34,#073322)", border: "3px solid #2c1810", borderRadius: 10, padding: 8, boxShadow: "inset 0 2px 10px rgba(0,0,0,.4)" }}>

            {/* Zero */}
            <button className="rl-cell rl-zero-cell" onClick={() => placeBet("straight_0")} style={{ gridColumn: 1, gridRow: "1 / 4" }}>
              <span>0</span>{bets["straight_0"] > 0 && <span className={`rl-chip-token ${flashKeys.includes("straight_0") ? "" : ""}`}>{rltFmtChip(bets["straight_0"])}</span>}
            </button>

            {/* Number grid */}
            {RLT_NUMBER_CELLS.map(c => (
              <button key={c.num} className={`rl-cell rl-num-cell ${c.red ? "red" : "black"} ${flashKeys.includes(`straight_${c.num}`) ? "rl-win-pulse" : ""}`} onClick={() => placeBet(`straight_${c.num}`)} style={{ gridColumn: c.col, gridRow: c.row }}>
                <span>{c.num}</span>{bets[`straight_${c.num}`] > 0 && <span className="rl-chip-token">{rltFmtChip(bets[`straight_${c.num}`])}</span>}
              </button>
            ))}

            {/* Columns 2:1 */}
            <button className="rl-cell rl-outside-cell" onClick={() => placeBet("col3")} style={{ gridColumn: 14, gridRow: 1 }}>2:1{bets.col3 > 0 && <span className="rl-chip-token">{rltFmtChip(bets.col3)}</span>}</button>
            <button className="rl-cell rl-outside-cell" onClick={() => placeBet("col2")} style={{ gridColumn: 14, gridRow: 2 }}>2:1{bets.col2 > 0 && <span className="rl-chip-token">{rltFmtChip(bets.col2)}</span>}</button>
            <button className="rl-cell rl-outside-cell" onClick={() => placeBet("col1")} style={{ gridColumn: 14, gridRow: 3 }}>2:1{bets.col1 > 0 && <span className="rl-chip-token">{rltFmtChip(bets.col1)}</span>}</button>

            {/* Dozens */}
            <button className={`rl-cell rl-outside-cell ${flashKeys.includes("dozen1") ? "rl-win-pulse" : ""}`} onClick={() => placeBet("dozen1")} style={{ gridColumn: "2 / 6", gridRow: 4 }}>1st 12{bets.dozen1 > 0 && <span className="rl-chip-token">{rltFmtChip(bets.dozen1)}</span>}</button>
            <button className={`rl-cell rl-outside-cell ${flashKeys.includes("dozen2") ? "rl-win-pulse" : ""}`} onClick={() => placeBet("dozen2")} style={{ gridColumn: "6 / 10", gridRow: 4 }}>2nd 12{bets.dozen2 > 0 && <span className="rl-chip-token">{rltFmtChip(bets.dozen2)}</span>}</button>
            <button className={`rl-cell rl-outside-cell ${flashKeys.includes("dozen3") ? "rl-win-pulse" : ""}`} onClick={() => placeBet("dozen3")} style={{ gridColumn: "10 / 14", gridRow: 4 }}>3rd 12{bets.dozen3 > 0 && <span className="rl-chip-token">{rltFmtChip(bets.dozen3)}</span>}</button>

            {/* Outside bets */}
            <button className={`rl-cell rl-outside-cell ${flashKeys.includes("low") ? "rl-win-pulse" : ""}`} onClick={() => placeBet("low")} style={{ gridColumn: "2 / 4", gridRow: 5 }}>1–18{bets.low > 0 && <span className="rl-chip-token">{rltFmtChip(bets.low)}</span>}</button>
            <button className={`rl-cell rl-outside-cell ${flashKeys.includes("even") ? "rl-win-pulse" : ""}`} onClick={() => placeBet("even")} style={{ gridColumn: "4 / 6", gridRow: 5 }}>Even{bets.even > 0 && <span className="rl-chip-token">{rltFmtChip(bets.even)}</span>}</button>
            <button className={`rl-cell rl-outside-cell ${flashKeys.includes("red") ? "rl-win-pulse" : ""}`} onClick={() => placeBet("red")} style={{ gridColumn: "6 / 8", gridRow: 5, background: "#9e1b32" }}>Red{bets.red > 0 && <span className="rl-chip-token">{rltFmtChip(bets.red)}</span>}</button>
            <button className={`rl-cell rl-outside-cell ${flashKeys.includes("black") ? "rl-win-pulse" : ""}`} onClick={() => placeBet("black")} style={{ gridColumn: "8 / 10", gridRow: 5, background: "#141314" }}>Black{bets.black > 0 && <span className="rl-chip-token">{rltFmtChip(bets.black)}</span>}</button>
            <button className={`rl-cell rl-outside-cell ${flashKeys.includes("odd") ? "rl-win-pulse" : ""}`} onClick={() => placeBet("odd")} style={{ gridColumn: "10 / 12", gridRow: 5 }}>Odd{bets.odd > 0 && <span className="rl-chip-token">{rltFmtChip(bets.odd)}</span>}</button>
            <button className={`rl-cell rl-outside-cell ${flashKeys.includes("high") ? "rl-win-pulse" : ""}`} onClick={() => placeBet("high")} style={{ gridColumn: "12 / 14", gridRow: 5 }}>19–36{bets.high > 0 && <span className="rl-chip-token">{rltFmtChip(bets.high)}</span>}</button>
          </div>
        </div>

        {/* History */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", maxWidth: "100%", padding: 2 }}>
          <span style={{ fontSize: 10.5, color: "rgba(239,231,211,.5)", flex: "none", textTransform: "uppercase", letterSpacing: ".1em" }}>Recent</span>
          <div style={{ display: "flex", gap: 6 }}>
            {history.map((n, i) => (
              <div key={i} className="rl-hist-dot" style={{ background: n === 0 ? "#0f7a45" : (RLT_REDS.has(n) ? "#9e1b32" : "#141314") }}>{n}</div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 11, color: "rgba(239,231,211,.4)", textAlign: "center", maxWidth: 480 }}>Table stakes come from your shared Hukam Bet balance — winnings and losses sync with your account.</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. BACCARAT — Sterling Salon, chrome punto banco
// ═══════════════════════════════════════════════════════════════════════════════
const BAC_SUITS2 = [["♠","black"],["♥","red"],["♦","red"],["♣","black"]];
const BAC_RANKS2 = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const bacVal2 = r => r==="A" ? 1 : (["10","J","Q","K"].includes(r) ? 0 : +r);
const bacNames2 = {2:"deuce",3:"three",4:"four",5:"five",6:"six",7:"seven",8:"eight",9:"nine",0:"ten-value",1:"ace"};

function bacBuildShoe() {
  const shoe = [];
  for (let d = 0; d < 6; d++) for (const [s,c] of BAC_SUITS2) for (const r of BAC_RANKS2) shoe.push({ r, s, c, v: bacVal2(r) });
  for (let i = shoe.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1));[shoe[i],shoe[j]] = [shoe[j],shoe[i]]; }
  return shoe;
}

function BacCard({ card, flipped, delay }) {
  return (
    <div className="bac-card" style={{ animationDelay: (delay||0)+"s" }}>
      <div className={`bac-card-inner ${flipped ? "bac-flipped" : ""}`}>
        <div className="bac-face bac-back"></div>
        <div className={`bac-face bac-front ${card.c}`}>
          <div className="bac-corner">{card.r}<small>{card.s}</small></div>
          <div className="bac-pip">{card.s}</div>
          <div className="bac-corner bac-bot">{card.r}<small>{card.s}</small></div>
        </div>
      </div>
    </div>
  );
}

function BaccaratGame({ balance, setBalance, addToast, onClose, addBetToHistory }) {
  const [chip, setChip] = useState(10);
  const [bets, setBets] = useState({ player: 0, banker: 0, tie: 0 });
  const [lastBets, setLastBets] = useState(null);
  const [phase, setPhase] = useState("bet"); // bet | deal
  const [playerCards, setPlayerCards] = useState([]);
  const [bankerCards, setBankerCards] = useState([]);
  const [playerFlipped, setPlayerFlipped] = useState([]);
  const [bankerFlipped, setBankerFlipped] = useState([]);
  const [playerScore, setPlayerScore] = useState("–");
  const [bankerScore, setBankerScore] = useState("–");
  const [playerNatural, setPlayerNatural] = useState(false);
  const [bankerNatural, setBankerNatural] = useState(false);
  const [winnerHand, setWinnerHand] = useState(null);
  const [statusText, setStatusText] = useState("Place your bets");
  const [statusBig, setStatusBig] = useState(false);
  const [note, setNote] = useState("Select a chip, then tap Player, Banker or Tie");
  const [stats, setStats] = useState({ rounds:0, P:0, B:0, T:0 });
  const [road, setRoad] = useState([]);
  const [beads, setBeads] = useState([]);
  const [winZone, setWinZone] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const shoeRef = useRef(bacBuildShoe());
  const pendingTiesRef = useRef(0);
  const stakeThisRoundRef = useRef(0);

  const totalBet = bets.player + bets.banker + bets.tie;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const placeBet = (zone) => {
    if (phase !== "bet") return;
    if (chip > balance) { addToast("Not enough balance for that chip", "error"); return; }
    setBalance(b => b - chip);
    setBets(b => ({ ...b, [zone]: b[zone] + chip }));
    setNote(zone === "banker" ? "Banker is the statistical favourite — a small commission applies on wins" : zone === "player" ? "Player pays even money" : "Tie pays 8 to 1 — the long-shot wager");
  };
  const clearBets = () => {
    if (phase !== "bet") return;
    setBalance(b => b + totalBet);
    setBets({ player:0, banker:0, tie:0 });
    setNote("Bets returned");
  };
  const rebet = () => {
    if (phase !== "bet" || !lastBets) return;
    const total = lastBets.player + lastBets.banker + lastBets.tie;
    if (total > balance) { addToast("Not enough balance to repeat that wager", "error"); return; }
    setBalance(b => b - total);
    setBets({ ...lastBets });
    setNote("Previous wager restored");
  };

  const total3 = hand => hand.reduce((a,c) => a + c.v, 0) % 10;

  async function playRound() {
    setPhase("deal");
    setLastBets({ ...bets });
    stakeThisRoundRef.current = totalBet;
    if (shoeRef.current.length < 20) { shoeRef.current = bacBuildShoe(); await sleep(400); setNote("Fresh six-deck shoe — 312 cards shuffled"); }

    setPlayerCards([]); setBankerCards([]); setPlayerFlipped([]); setBankerFlipped([]);
    setPlayerScore("–"); setBankerScore("–"); setWinnerHand(null); setPlayerNatural(false); setBankerNatural(false); setWinZone(null);
    setStatusText("Dealing"); setStatusBig(false);
    setNote("Cards leave the shoe Player – Banker – Player – Banker");

    const P = [], B = [];
    const dealTo = async (arr, setArr, setFlip) => {
      const card = shoeRef.current.pop();
      arr.push(card);
      setArr([...arr]);
      await sleep(220);
      setFlip(f => [...f, true]);
      await sleep(320);
    };

    await dealTo(P, setPlayerCards, setPlayerFlipped); setPlayerScore(total3(P));
    await dealTo(B, setBankerCards, setBankerFlipped); setBankerScore(total3(B));
    await dealTo(P, setPlayerCards, setPlayerFlipped); setPlayerScore(total3(P));
    await dealTo(B, setBankerCards, setBankerFlipped); setBankerScore(total3(B));

    let pt = total3(P), bt = total3(B);
    const pNat = pt >= 8, bNat = bt >= 8;

    if (pNat || bNat) {
      if (pNat) setPlayerNatural(true); if (bNat) setBankerNatural(true);
      setStatusText("Natural " + Math.max(pt,bt)); setStatusBig(true);
      setNote("A natural 8 or 9 freezes both hands — no third card is drawn by rule");
      await sleep(700);
    } else {
      let pThird = null;
      if (pt <= 5) {
        setStatusText("Player draws"); setNote(`Player draws on ${pt} — the tableau draws every total from 0 to 5`);
        await sleep(500);
        pThird = shoeRef.current.pop(); P.push(pThird); setPlayerCards([...P]); await sleep(200); setPlayerFlipped(f => [...f, true]); await sleep(300);
        setPlayerScore(total3(P)); pt = total3(P);
      } else { setStatusText("Player stands"); setNote(`Player stands on ${pt} — never draws on 6 or 7`); await sleep(550); }

      let bankerDraws, why;
      if (pThird === null) {
        bankerDraws = bt <= 5;
        why = bankerDraws ? `Player stood, so Banker plays like a Player — draws on ${bt}` : `Player stood, so Banker plays like a Player — stands on ${bt}`;
      } else {
        const t = pThird.v; const cardName = bacNames2[t];
        if (bt <= 2) { bankerDraws = true; why = `Banker always draws on ${bt}, regardless of Player's card`; }
        else if (bt === 3) { bankerDraws = t !== 8; why = bankerDraws ? `Banker draws on 3 against a ${cardName} — only an 8 stops it` : `Banker stands on 3 — the Player's 8 is the one card that stops the draw`; }
        else if (bt === 4) { bankerDraws = t>=2 && t<=7; why = bankerDraws ? `Banker draws on 4 — Player's ${cardName} falls in the 2–7 window` : `Banker stands on 4 — Player's ${cardName} is outside the 2–7 window`; }
        else if (bt === 5) { bankerDraws = t>=4 && t<=7; why = bankerDraws ? `Banker draws on 5 — Player's ${cardName} falls in the 4–7 window` : `Banker stands on 5 — Player's ${cardName} is outside the 4–7 window`; }
        else if (bt === 6) { bankerDraws = t===6 || t===7; why = bankerDraws ? `Banker draws on 6 — only against a Player six or seven` : `Banker stands on 6 — it only draws against a six or seven`; }
        else { bankerDraws = false; why = `Banker always stands on 7`; }
      }
      setStatusText(bankerDraws ? "Banker draws" : "Banker stands"); setNote(why);
      await sleep(600);
      if (bankerDraws) {
        const card = shoeRef.current.pop(); B.push(card); setBankerCards([...B]); await sleep(200); setBankerFlipped(f => [...f, true]); await sleep(300);
        setBankerScore(total3(B)); bt = total3(B);
      }
    }

    let result, msg;
    if (pt > bt) { result = "P"; msg = `Player wins ${pt} over ${bt}`; setWinnerHand("player"); }
    else if (bt > pt) { result = "B"; msg = `Banker wins ${bt} over ${pt}`; setWinnerHand("banker"); }
    else { result = "T"; msg = `Égalité — tie at ${pt}`; }

    setStats(s => ({ rounds: s.rounds+1, P: s.P+(result==="P"?1:0), B: s.B+(result==="B"?1:0), T: s.T+(result==="T"?1:0) }));

    let payout = 0;
    if (result === "P") payout += bets.player * 2;
    if (result === "B") payout += Math.floor(bets.banker * 1.95);
    if (result === "T") { payout += bets.tie * 9; payout += bets.player + bets.banker; }
    if (payout > 0) setBalance(b => b + payout);

    setWinZone(result === "P" ? "player" : result === "B" ? "banker" : "tie");

    const staked = bets.player + bets.banker + bets.tie;
    const net = payout - staked;
    setStatusText(msg + (net > 0 ? `  ·  +₹${net.toLocaleString()}` : net < 0 ? `  ·  −₹${Math.abs(net).toLocaleString()}` : "")); setStatusBig(true);
    setNote(result==="B" && bets.banker>0 ? `Banker win pays 19 to 20 — a ₹${Math.ceil(bets.banker*0.05)} commission was retained`
      : result==="T" ? "Player and Banker wagers push on a tie and have been returned"
      : net>0 ? "Winnings credited" : net===0 ? "" : "Better luck next hand");

    recordResult(result);
    addBetToHistory({ sport:"baccarat", match:"Baccarat", selection: result==="P"?"Player":result==="B"?"Banker":"Tie", type:"back", odds: staked>0 ? +(payout/staked).toFixed(2) : 0, stake: staked, pnl: net, result: net>=0?"won":"lost" });
    if (net > 0) addToast(`🎰 ${msg} — +₹${net.toLocaleString()}`, "success"); else if (net < 0) addToast(`${msg} — you lost`, "error"); else addToast(msg, "info");

    setBets({ player:0, banker:0, tie:0 });
    await sleep(1300);
    setPhase("bet");
    if (balance <= 0) { setNote("Balance restored — talk to the cashier for a top-up"); }
  }

  function recordResult(res) {
    setRoad(prevRoad => {
      let newRoad = prevRoad;
      if (res === "T") {
        if (prevRoad.length) { newRoad = prevRoad.slice(0, -1).concat([{ ...prevRoad[prevRoad.length-1], ties: prevRoad[prevRoad.length-1].ties+1 }]); }
        else { pendingTiesRef.current++; newRoad = prevRoad; }
      } else {
        newRoad = [...prevRoad, { res, ties: pendingTiesRef.current }];
        pendingTiesRef.current = 0;
      }
      return newRoad;
    });
    setBeads(b => [...b, res].slice(-60));
  }

  // Build big-road columns from `road`
  const bigRoadCols = [];
  road.forEach(cell => {
    const lastCol = bigRoadCols[bigRoadCols.length - 1];
    if (!lastCol || lastCol[0].res !== cell.res || lastCol.length >= 6) bigRoadCols.push([cell]);
    else lastCol.push(cell);
  });

  return (
    <div className="bac-body">
      <style>{BAC_CSS}</style>
      <button onClick={onClose} className="bac-close">✕</button>

      <header className="bac-header">
        <div className="bac-crest">EST · PUNTO BANCO · MMXXVI</div>
        <h1 className="bac-h1">BACCARAT</h1>
        <div className="bac-rule-line"></div>
        <button className="bac-info-btn" onClick={() => setShowRules(true)} title="House rules & odds">i</button>
      </header>

      <div className="bac-table">
        <div className="bac-hands">
          <div className={`bac-hand ${winnerHand==="player"?"bac-winner":""}`}>
            <div className={`bac-natural ${playerNatural?"bac-show":""}`}>Natural</div>
            <div className="bac-hand-label"><span>Player</span><div className="bac-score">{playerScore}</div></div>
            <div className="bac-cards">{playerCards.map((c,i) => <BacCard key={i} card={c} flipped={playerFlipped[i]} />)}</div>
          </div>
          <div className={`bac-hand ${winnerHand==="banker"?"bac-winner":""}`}>
            <div className={`bac-natural ${bankerNatural?"bac-show":""}`}>Natural</div>
            <div className="bac-hand-label"><div className="bac-score">{bankerScore}</div><span>Banker</span></div>
            <div className="bac-cards">{bankerCards.map((c,i) => <BacCard key={i} card={c} flipped={bankerFlipped[i]} />)}</div>
          </div>
        </div>

        <div className={`bac-status ${statusBig?"bac-big":""}`}>{statusText}</div>
        <div className="bac-note">{note}</div>

        <div className="bac-zones">
          <div className={`bac-zone ${phase!=="bet"?"bac-disabled":""} ${winZone==="player"?"bac-win":""} ${bets.player>0?"bac-hasbet":""}`} onClick={() => placeBet("player")}>
            <div className="bac-zname">PLAYER</div><div className="bac-zpay">pays 1 : 1</div>
            <div className="bac-zbet">{bets.player}</div>
          </div>
          <div className={`bac-zone bac-tie ${phase!=="bet"?"bac-disabled":""} ${winZone==="tie"?"bac-win":""} ${bets.tie>0?"bac-hasbet":""}`} onClick={() => placeBet("tie")}>
            <div className="bac-zname">TIE</div><div className="bac-zpay">pays 8 : 1</div>
            <div className="bac-zbet">{bets.tie}</div>
          </div>
          <div className={`bac-zone ${phase!=="bet"?"bac-disabled":""} ${winZone==="banker"?"bac-win":""} ${bets.banker>0?"bac-hasbet":""}`} onClick={() => placeBet("banker")}>
            <div className="bac-zname">BANKER</div><div className="bac-zpay">pays 0.95 : 1</div>
            <div className="bac-zbet">{bets.banker}</div>
          </div>
        </div>
      </div>

      <div className="bac-stats">
        <div className="bac-stat"><div className="bac-k">Rounds</div><div className="bac-v">{stats.rounds}</div></div>
        <div className="bac-stat"><div className="bac-k">Player</div><div className="bac-v">{stats.P}</div></div>
        <div className="bac-stat"><div className="bac-k">Banker</div><div className="bac-v">{stats.B}</div></div>
        <div className="bac-stat"><div className="bac-k">Ties</div><div className="bac-v">{stats.T}</div></div>
        <div className="bac-stat"><div className="bac-k">Shoe</div><div className="bac-v">{shoeRef.current.length}</div></div>
      </div>

      <div className="bac-tray">
        <div className="bac-chips">
          {[10,50,100,500].map(v => <div key={v} className={`bac-chip bac-c${v} ${chip===v?"bac-sel":""}`} onClick={() => setChip(v)}>{v}</div>)}
        </div>
        <div className="bac-row">
          <button className="bac-btn bac-btn-ghost" onClick={clearBets} disabled={totalBet===0 || phase!=="bet"}>Clear</button>
          <button className="bac-btn bac-btn-deal" onClick={playRound} disabled={totalBet===0 || phase!=="bet"}>Deal</button>
          <button className="bac-btn bac-btn-ghost" onClick={rebet} disabled={!lastBets || phase!=="bet"}>Rebet</button>
        </div>
        <div className="bac-bank">
          <div>Balance<b>₹{balance.toLocaleString()}</b></div>
          <div>Wagered<b>₹{totalBet.toLocaleString()}</b></div>
        </div>
      </div>

      <div className="bac-boards">
        <div className="bac-board">
          <div className="bac-board-title">Big Road <i>columns break when the winner changes</i></div>
          <div className="bac-bigroad">
            {bigRoadCols.map((col, ci) => (
              <div key={ci} style={{ display:"grid", gridTemplateRows:"repeat(6,20px)", gap:3 }}>
                {Array.from({length:6}, (_,r) => {
                  const c = col[r];
                  return <div key={r} className={`bac-cell ${c?c.res:""}`}>{c && c.ties>0 && <span className="bac-ties">{c.ties}</span>}</div>;
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="bac-board">
          <div className="bac-board-title">Bead Plate <i>every result in sequence</i></div>
          <div className="bac-beads">{beads.map((b,i) => <div key={i} className={`bac-dot ${b}`}>{b}</div>)}</div>
        </div>
      </div>

      {showRules && (
        <div className="bac-overlay bac-open" onClick={() => setShowRules(false)}>
          <div className="bac-modal" onClick={e => e.stopPropagation()}>
            <h2>HOUSE RULES</h2>
            <div className="bac-msub">Punto Banco · Six-Deck Shoe</div>
            <h3>Card Values</h3>
            <p>Aces count <b>1</b>. Twos through nines count <b>face value</b>. Tens and court cards count <b>0</b>. Only the last digit of a hand's sum matters. The highest possible hand is <b>9</b>.</p>
            <h3>The Deal</h3>
            <p>Two cards each to Player and Banker. A two-card total of <b>8 or 9</b> is a <b>natural</b> — both hands stand immediately.</p>
            <h3>Player's Third Card</h3>
            <p>Player draws on <b>0–5</b>, stands on <b>6–7</b>.</p>
            <h3>Banker's Tableau</h3>
            <p>If the Player stood, the Banker draws on 0–5, stands on 6–7. If the Player drew, the Banker's action depends on the Player's third card:</p>
            <table>
              <tbody>
                <tr><th>Banker total</th><th>Draws when Player's third card is…</th></tr>
                <tr><td><b>0–2</b></td><td>anything — always draws</td></tr>
                <tr><td><b>3</b></td><td>anything except an 8</td></tr>
                <tr><td><b>4</b></td><td>2, 3, 4, 5, 6 or 7</td></tr>
                <tr><td><b>5</b></td><td>4, 5, 6 or 7</td></tr>
                <tr><td><b>6</b></td><td>6 or 7 only</td></tr>
                <tr><td><b>7</b></td><td>never — always stands</td></tr>
              </tbody>
            </table>
            <h3>Payouts</h3>
            <table>
              <tbody>
                <tr><th>Wager</th><th>Pays</th><th>Note</th></tr>
                <tr><td><b>Banker</b></td><td>0.95 : 1</td><td>commission retained on wins</td></tr>
                <tr><td><b>Player</b></td><td>1 : 1</td><td>even money</td></tr>
                <tr><td><b>Tie</b></td><td>8 : 1</td><td>Player &amp; Banker wagers push</td></tr>
              </tbody>
            </table>
            <button className="bac-btn bac-btn-ghost bac-close-btn" onClick={() => setShowRules(false)}>Return to table</button>
          </div>
        </div>
      )}
    </div>
  );
}

const BAC_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Jost:wght@300;400;500;600&display=swap');
.bac-body{ position:fixed; inset:0; z-index:600; overflow-y:auto;
  background: repeating-radial-gradient(circle at 50% 130%, transparent 0 7px, rgba(255,255,255,.012) 7px 8px), radial-gradient(1400px 900px at 50% -15%, #121519 0%, #050607 62%);
  font-family:'Jost',sans-serif; color:#9ba0aa; display:flex; flex-direction:column; align-items:center; user-select:none; padding-bottom:30px; }
.bac-close{ position:fixed; top:14px; right:14px; z-index:20; width:34px; height:34px; border-radius:50%; border:1px solid #2b3038; background:rgba(12,14,16,.85); color:#9ba0aa; cursor:pointer; font-size:15px; display:flex; align-items:center; justify-content:center; }
.bac-header{ padding:36px 0 4px; text-align:center; position:relative; width:min(700px,96vw); }
.bac-crest{ font-size:13px; letter-spacing:.6em; text-indent:.6em; color:#5c626d; }
.bac-h1{ font-family:'Cinzel',serif; font-weight:700; letter-spacing:.4em; text-indent:.4em; font-size:clamp(28px,5.4vw,44px); margin-top:2px;
  background:linear-gradient(160deg,#d3d6db 0%,#8b919c 28%,#535964 50%,#9aa0aa 72%,#c8ccd2 100%); -webkit-background-clip:text; background-clip:text; color:transparent; }
.bac-rule-line{ width:220px; height:1px; margin:8px auto 0; background:linear-gradient(90deg,transparent,#5c626d,transparent); position:relative; }
.bac-rule-line::after{ content:"❖"; position:absolute; left:50%; top:-8px; transform:translateX(-50%); font-size:10px; color:#5c626d; background:#050607; padding:0 8px; }
.bac-info-btn{ position:absolute; left:0; top:36px; width:34px; height:34px; border-radius:50%; cursor:pointer; border:1px solid #2b3038; background:linear-gradient(180deg,#16191d,#0b0d0f); color:#9ba0aa; font-family:'Cinzel',serif; font-size:15px; font-weight:600; display:flex; align-items:center; justify-content:center; }
.bac-table{ width:min(700px,96vw); background:linear-gradient(180deg,#121417,#0c0e10); border:1px solid #1a1d22; border-radius:24px; box-shadow:inset 0 1px 0 rgba(255,255,255,.06), 0 24px 70px rgba(0,0,0,.6); padding:18px 16px; margin-top:14px; position:relative; }
.bac-hands{ display:flex; justify-content:space-between; gap:12px; min-height:178px; }
.bac-hand{ flex:1; display:flex; flex-direction:column; align-items:center; gap:9px; position:relative; }
.bac-hand-label{ display:flex; align-items:center; gap:9px; }
.bac-hand-label span{ font-family:'Cinzel',serif; font-size:13px; letter-spacing:.3em; text-indent:.3em; color:#5c626d; }
.bac-score{ min-width:38px; height:38px; padding:0 9px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-family:'Cinzel',serif; font-weight:700; font-size:19px; color:#d9dce1; background:linear-gradient(180deg,#191c21,#0e1013); border:1px solid #2b3038; transition:box-shadow .4s,border-color .4s; }
.bac-hand.bac-winner .bac-score{ border-color:#d9dce1; box-shadow:0 0 16px rgba(240,243,248,.38); }
.bac-natural{ position:absolute; top:-6px; right:6px; font-size:9px; font-weight:600; letter-spacing:.22em; text-transform:uppercase; padding:3px 8px; border-radius:20px; color:#14161a; background:linear-gradient(160deg,#d3d6db,#535964); opacity:0; transform:translateY(-4px); transition:all .3s; }
.bac-natural.bac-show{ opacity:1; transform:translateY(0); }
.bac-cards{ display:flex; gap:8px; min-height:112px; align-items:flex-start; }
.bac-card{ width:74px; height:106px; perspective:700px; animation:bacDealIn .45s cubic-bezier(.2,.9,.3,1.2) both; }
@keyframes bacDealIn{from{transform:translate(0,-150px) rotate(-9deg);opacity:0}to{transform:translate(0,0) rotate(0);opacity:1}}
.bac-card-inner{ width:100%; height:100%; position:relative; transform-style:preserve-3d; transition:transform .5s cubic-bezier(.3,.7,.3,1); }
.bac-card-inner.bac-flipped{ transform:rotateY(180deg); }
.bac-face{ position:absolute; inset:0; border-radius:9px; backface-visibility:hidden; box-shadow:0 7px 16px rgba(0,0,0,.55); }
.bac-back{ background:repeating-conic-gradient(from 45deg, rgba(255,255,255,.04) 0deg 4deg, transparent 4deg 12deg), linear-gradient(160deg,#24282f,#0f1114); border:1px solid #33383f; }
.bac-front{ background:linear-gradient(170deg,#c9ccd2,#a7abb3); border:1px solid #7e838d; transform:rotateY(180deg); display:flex; flex-direction:column; justify-content:space-between; padding:6px 7px; font-weight:600; }
.bac-front .bac-corner{ font-size:15px; line-height:1.05; } .bac-front .bac-corner small{ display:block; font-size:13px; }
.bac-front .bac-pip{ align-self:center; font-size:30px; margin-top:-14px; }
.bac-front .bac-corner.bac-bot{ transform:rotate(180deg); }
.bac-front.red{ color:#8e2f2f; } .bac-front.black{ color:#15171b; }
.bac-status{ text-align:center; min-height:26px; margin:10px 0 0; font-size:14px; letter-spacing:.2em; text-transform:uppercase; color:#9ba0aa; }
.bac-status.bac-big{ font-family:'Cinzel',serif; font-size:19px; font-weight:700; letter-spacing:.12em; background:linear-gradient(160deg,#d3d6db,#535964); -webkit-background-clip:text; background-clip:text; color:transparent; }
.bac-note{ text-align:center; min-height:20px; margin:3px 0 10px; font-size:12.5px; font-weight:300; letter-spacing:.06em; color:#5c626d; font-style:italic; }
.bac-zones{ display:flex; gap:10px; }
.bac-zone{ flex:1; border-radius:15px; padding:13px 8px 11px; text-align:center; cursor:pointer; background:linear-gradient(180deg,#14171b,#0b0d0f); border:1px solid #1a1d22; position:relative; transition:transform .15s,border-color .25s,box-shadow .25s; }
.bac-zone:active{ transform:scale(.97); }
.bac-zname{ font-family:'Cinzel',serif; font-size:15px; font-weight:600; letter-spacing:.2em; color:#d9dce1; }
.bac-zpay{ font-size:10.5px; color:#5c626d; letter-spacing:.12em; margin-top:2px; }
.bac-zbet{ margin:8px auto 0; min-width:60px; width:max-content; padding:3px 12px; border-radius:20px; font-size:14px; font-weight:600; color:#15171b; background:linear-gradient(160deg,#d3d6db,#535964); opacity:0; transform:scale(.7); transition:all .25s; }
.bac-zone.bac-hasbet .bac-zbet{ opacity:1; transform:scale(1); }
.bac-zone.bac-win{ border-color:#d9dce1; box-shadow:0 0 20px rgba(240,243,248,.3); }
.bac-zone.bac-disabled{ pointer-events:none; opacity:.55; }
.bac-zone.bac-tie .bac-zname{ color:#d4a9a9; }
.bac-stats{ width:min(700px,96vw); margin-top:10px; display:grid; grid-template-columns:repeat(5,1fr); background:linear-gradient(180deg,#0f1114,#0a0c0e); border:1px solid #1a1d22; border-radius:14px; overflow:hidden; }
.bac-stat{ padding:9px 4px; text-align:center; border-right:1px solid #1a1d22; }
.bac-stat:last-child{ border-right:none; }
.bac-k{ font-size:9.5px; letter-spacing:.24em; text-transform:uppercase; color:#5f6572; }
.bac-v{ font-family:'Cinzel',serif; font-size:16px; font-weight:600; color:#d9dce1; margin-top:2px; }
.bac-tray{ width:min(700px,96vw); margin-top:12px; display:flex; flex-direction:column; gap:13px; align-items:center; }
.bac-chips{ display:flex; gap:13px; }
.bac-chip{ width:58px; height:58px; border-radius:50%; cursor:pointer; position:relative; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:14px; color:#1a1d22; transition:transform .18s; box-shadow:0 5px 12px rgba(0,0,0,.55), inset 0 2px 3px rgba(255,255,255,.5); }
.bac-chip:active{ transform:scale(.92); }
.bac-chip.bac-sel{ transform:translateY(-8px); box-shadow:0 0 0 3px #d9dce1,0 12px 20px rgba(0,0,0,.65); }
.bac-c10{ background:radial-gradient(circle at 35% 30%,#c3c7ce,#7d838e); }
.bac-c50{ background:radial-gradient(circle at 35% 30%,#a2a7b1,#5b616c); color:#eceef1; }
.bac-c100{ background:radial-gradient(circle at 35% 30%,#787e89,#3a3f48); color:#e6e8ec; }
.bac-c500{ background:radial-gradient(circle at 35% 30%,#33373f,#101215); color:#d5d8de; }
.bac-row{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; justify-content:center; }
.bac-btn{ font-family:'Jost',sans-serif; font-size:14px; font-weight:600; letter-spacing:.22em; text-indent:.22em; text-transform:uppercase; padding:12px 32px; border-radius:12px; border:none; cursor:pointer; transition:transform .15s,opacity .2s; }
.bac-btn:active{ transform:scale(.96); } .bac-btn:disabled{ opacity:.4; pointer-events:none; }
.bac-btn-deal{ color:#101216; background:linear-gradient(160deg,#d3d6db,#8b919c,#535964,#9aa0aa,#c8ccd2); box-shadow:0 7px 18px rgba(0,0,0,.55); }
.bac-btn-ghost{ color:#9ba0aa; background:transparent; border:1px solid #2b3038; }
.bac-bank{ display:flex; gap:28px; font-size:13.5px; letter-spacing:.12em; text-transform:uppercase; color:#5c626d; }
.bac-bank b{ font-family:'Cinzel',serif; color:#d9dce1; font-weight:600; font-size:17px; margin-left:7px; }
.bac-boards{ width:min(700px,96vw); margin:4px 0 20px; display:flex; flex-direction:column; gap:8px; }
.bac-board{ background:linear-gradient(180deg,#0e1013,#090b0d); border:1px solid #1a1d22; border-radius:14px; padding:10px 12px; }
.bac-board-title{ font-size:9.5px; letter-spacing:.3em; text-transform:uppercase; color:#5f6572; margin-bottom:8px; display:flex; justify-content:space-between; }
.bac-board-title i{ font-style:normal; color:#4c515c; letter-spacing:.06em; text-transform:none; }
.bac-bigroad{ display:flex; gap:3px; overflow-x:auto; padding-bottom:2px; min-height:135px; }
.bac-cell{ width:20px; height:20px; border-radius:50%; position:relative; display:flex; align-items:center; justify-content:center; font-size:8.5px; font-weight:600; }
.bac-cell.P{ border:2px solid #b8bcc4; color:#b8bcc4; }
.bac-cell.B{ border:2px solid #4d535e; background:#1b1e23; color:#9ba0aa; }
.bac-cell .bac-ties{ position:absolute; right:-3px; bottom:-3px; width:10px; height:10px; border-radius:50%; background:#9c3d3d; color:#fff; font-size:7px; display:flex; align-items:center; justify-content:center; }
.bac-beads{ display:flex; gap:5px; flex-wrap:wrap; min-height:22px; }
.bac-dot{ width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:600; }
.bac-dot.P{ background:linear-gradient(160deg,#d3d6db,#535964); color:#15171b; }
.bac-dot.B{ background:#191c21; border:1px solid #5c626d; color:#d9dce1; }
.bac-dot.T{ background:transparent; border:1px solid #9c3d3d; color:#9c3d3d; }
.bac-overlay{ position:fixed; inset:0; background:rgba(8,9,11,.78); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:16px; z-index:70; }
.bac-modal{ width:min(560px,100%); max-height:86vh; overflow-y:auto; background:linear-gradient(180deg,#121417,#0c0e10); border:1px solid #2b3038; border-radius:20px; padding:22px 22px 26px; box-shadow:0 30px 80px rgba(0,0,0,.7); }
.bac-modal h2{ font-family:'Cinzel',serif; font-size:19px; letter-spacing:.24em; text-align:center; background:linear-gradient(160deg,#d3d6db,#535964); -webkit-background-clip:text; background-clip:text; color:transparent; margin-bottom:4px; }
.bac-msub{ text-align:center; font-size:11px; color:#5c626d; letter-spacing:.2em; text-transform:uppercase; margin-bottom:16px; }
.bac-modal h3{ font-family:'Cinzel',serif; font-size:12.5px; letter-spacing:.26em; text-transform:uppercase; color:#9ba0aa; margin:18px 0 8px; padding-bottom:5px; border-bottom:1px solid #1a1d22; }
.bac-modal p{ font-size:13.5px; font-weight:300; line-height:1.55; color:#9ba0aa; margin-bottom:6px; }
.bac-modal p b{ font-weight:600; color:#d9dce1; }
.bac-modal table{ width:100%; border-collapse:collapse; font-size:12.5px; margin-top:6px; }
.bac-modal th,.bac-modal td{ padding:6px 8px; text-align:left; border-bottom:1px solid #1a1d22; }
.bac-modal th{ font-size:9.5px; letter-spacing:.2em; text-transform:uppercase; color:#5f6572; font-weight:500; }
.bac-modal td b{ font-family:'Cinzel',serif; color:#d9dce1; font-weight:600; }
.bac-close-btn{ margin:20px auto 0; display:block; }
@media (max-width:500px){ .bac-card{ width:58px; height:84px; } .bac-front .bac-pip{ font-size:24px; } .bac-chip{ width:52px; height:52px; } .bac-stat .bac-v{ font-size:13px; } }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 7. AVIATOR — dual panels, live bots, canvas flight path
// ═══════════════════════════════════════════════════════════════════════════════
function avGenerateCrashPoint() {
  const houseEdge = 0.04;
  const r = Math.random();
  if (r < houseEdge) return 1.00;
  let crash = (1 - houseEdge) / (1 - r);
  crash = Math.floor(crash * 100) / 100;
  return Math.min(crash, 1000);
}
function avMultiplierAt(t) { const k = Math.log(2) / 5; return Math.pow(Math.E, k * t); }
function avRandomMaskedName() {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const len = 3 + Math.floor(Math.random() * 3);
  let base = ""; for (let i = 0; i < len; i++) base += letters[Math.floor(Math.random() * letters.length)];
  base = base[0].toUpperCase() + base.slice(1);
  return base + "***" + (Math.floor(Math.random() * 90) + 10);
}
function avFmt(n) { const sign = n < 0 ? "-" : ""; return sign + "₹" + Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function avDrawPlaneIcon(ctx, x, y, angle, fillColor, glowColor) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(15.4,0); ctx.lineTo(11.9,1.4); ctx.lineTo(2.1,1.6); ctx.lineTo(-4.2,14); ctx.lineTo(-6.3,2); ctx.lineTo(-10.5,1.5);
  ctx.lineTo(-14.7,5.6); ctx.lineTo(-16.1,1.3); ctx.lineTo(-17.5,0); ctx.lineTo(-16.1,-1.3); ctx.lineTo(-14.7,-5.6); ctx.lineTo(-10.5,-1.5);
  ctx.lineTo(-6.3,-2); ctx.lineTo(-4.2,-14); ctx.lineTo(2.1,-1.6); ctx.lineTo(11.9,-1.4); ctx.closePath();
  ctx.fillStyle = fillColor; ctx.shadowColor = glowColor; ctx.shadowBlur = 16; ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(76,29,149,0.7)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}

function AvBetPanel({ id, p, phase, displayMult, updatePanel, onActionBtnClick }) {
  const amt = parseFloat(p.amount) || 0;
  let label, amountText, cls;
  if (p.status === "idle") { label = "BET"; amountText = avFmt(amt); cls = phase === "waiting" ? "av-state-bet" : "av-state-disabled"; }
  else if (p.status === "queued") { label = "CANCEL BET"; amountText = avFmt(amt); cls = "av-state-cancel"; }
  else if (p.status === "active") { label = "CASH OUT"; amountText = avFmt(Math.floor(amt*displayMult)); cls = "av-state-cashout"; }
  else if (p.status === "cashedOut") { label = "CASHED OUT"; amountText = "+"+avFmt(Math.floor(amt*p.cashoutAt)); cls = "av-state-won"; }
  else { label = "FLEW AWAY"; amountText = "-"+avFmt(amt); cls = "av-state-lost"; }
  const disabled = p.status === "cashedOut" || p.status === "lost" || (p.status === "idle" && phase !== "waiting");

  return (
    <div className="av-bet-panel">
      <div className="av-amount-row">
        <button className="av-stepper" disabled={p.status!=="idle"} onClick={() => updatePanel(id, { amount: String(Math.max(10, amt-10)) })}>−</button>
        <div className="av-amount-box">
          <span className="av-currency">₹</span>
          <input className="av-amount-input" type="number" value={p.amount} disabled={p.status!=="idle"} onChange={e => updatePanel(id, { amount: e.target.value })} />
        </div>
        <button className="av-stepper" disabled={p.status!=="idle"} onClick={() => updatePanel(id, { amount: String(amt+10) })}>+</button>
      </div>
      <div className="av-quick-amounts">
        {[100,500,1000,5000].map(v => <button key={v} disabled={p.status!=="idle"} onClick={() => updatePanel(id, { amount: String(v) })}>{v>=1000?v/1000+"K":v}</button>)}
      </div>
      <div className="av-auto-row">
        <label className="av-auto-left">
          <input type="checkbox" checked={p.autoEnabled} onChange={e => updatePanel(id, { autoEnabled: e.target.checked })} />
          <span>Auto Cash Out</span>
        </label>
        <div className={`av-auto-wrap ${!p.autoEnabled?"av-disabled":""}`}>
          <input className="av-auto-input" type="number" step="0.01" min="1.01" value={p.autoValue} onChange={e => updatePanel(id, { autoValue: e.target.value })} />
          <span>x</span>
        </div>
      </div>
      <button className={`av-action-btn ${cls}`} disabled={disabled} onClick={() => onActionBtnClick(id)}>
        <span className="av-action-label">{label}</span>
        <span className="av-action-amount">{amountText}</span>
      </button>
    </div>
  );
}

function AviatorGame({ balance, setBalance, addToast, onClose, addBetToHistory }) {
  const [phase, setPhase] = useState("waiting"); // waiting | flying | crashed
  const [displayMult, setDisplayMult] = useState(1);
  const [waitingCount, setWaitingCount] = useState(5.0);
  const [history, setHistory] = useState(() => Array.from({ length: 15 }, () => avGenerateCrashPoint()));
  const [panels, setPanels] = useState({
    1: { amount: "100", autoEnabled: false, autoValue: "2.00", status: "idle", cashoutAt: null },
    2: { amount: "100", autoEnabled: false, autoValue: "2.00", status: "idle", cashoutAt: null },
  });
  const [bots, setBots] = useState([]);
  const [, forceTick] = useState(0);

  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const phaseRef = useRef("waiting");
  const roundStartRef = useRef(0);
  const waitingEndRef = useRef(0);
  const crashEndRef = useRef(0);
  const crashPointRef = useRef(1);
  const currentMultRef = useRef(1);
  const pointsRef = useRef([]);
  const panelsRef = useRef(panels);
  const botsRef = useRef([]);
  const balanceRef = useRef(balance);
  const stakeThisRoundRef = useRef({});

  useEffect(() => { panelsRef.current = panels; }, [panels]);
  useEffect(() => { balanceRef.current = balance; }, [balance]);

  const syncPanels = () => { setPanels({ ...panelsRef.current, 1: { ...panelsRef.current[1] }, 2: { ...panelsRef.current[2] } }); };

  const doCashOut = (id) => {
    const p = panelsRef.current[id];
    if (!p || p.status !== "active") return;
    p.status = "cashedOut"; p.cashoutAt = currentMultRef.current;
    const won = Math.floor(parseFloat(p.amount) * currentMultRef.current);
    setBalance(b => b + won);
    const stake = stakeThisRoundRef.current[id] || parseFloat(p.amount);
    addBetToHistory({ sport: "aviator", match: "Aviator", selection: `Cashed @ ${currentMultRef.current.toFixed(2)}x`, type: "back", odds: +currentMultRef.current.toFixed(2), stake, pnl: won - stake, result: "won" });
    addToast(`✈️ Cashed out ${currentMultRef.current.toFixed(2)}x! +₹${(won - stake).toLocaleString()}`, "success");
    syncPanels();
  };

  const onActionBtnClick = (id) => {
    const p = panelsRef.current[id];
    if (phaseRef.current === "waiting" && p.status === "idle") {
      const amt = Math.round((parseFloat(p.amount) || 0));
      if (amt <= 0) return;
      if (amt > balanceRef.current) { addToast("Insufficient balance", "error"); return; }
      setBalance(b => b - amt);
      p.amount = String(amt); p.status = "queued";
      stakeThisRoundRef.current[id] = amt;
    } else if (phaseRef.current === "waiting" && p.status === "queued") {
      setBalance(b => b + parseFloat(p.amount));
      p.status = "idle";
    } else if (phaseRef.current === "flying" && p.status === "active") {
      doCashOut(id);
    }
    syncPanels();
  };

  const updatePanel = (id, patch) => {
    setPanels(prev => { const np = { ...prev, [id]: { ...prev[id], ...patch } }; panelsRef.current = np; return np; });
  };

  const generateBots = () => {
    const count = 8 + Math.floor(Math.random() * 6);
    const amounts = [50,100,150,200,250,500,750,1000,1500,2000];
    const arr = [];
    for (let i = 0; i < count; i++) arr.push({ name: avRandomMaskedName(), amount: amounts[Math.floor(Math.random()*amounts.length)], target: avGenerateCrashPoint(), status: "playing", cashedAt: null });
    arr.sort((a,b) => b.amount - a.amount);
    botsRef.current = arr; setBots(arr);
  };

  const checkBotCashouts = () => {
    let changed = false;
    botsRef.current.forEach(b => { if (b.status === "playing" && currentMultRef.current >= b.target) { b.status = "cashedOut"; b.cashedAt = b.target; changed = true; } });
    if (changed) setBots([...botsRef.current]);
  };

  const checkAutoCashouts = () => {
    [1,2].forEach(id => {
      const p = panelsRef.current[id];
      if (p.status === "active" && p.autoEnabled && currentMultRef.current >= parseFloat(p.autoValue)) doCashOut(id);
    });
  };

  const startWaitingPhase = (now) => {
    phaseRef.current = "waiting"; setPhase("waiting");
    waitingEndRef.current = now + 5000;
    crashPointRef.current = avGenerateCrashPoint();
    currentMultRef.current = 1; setDisplayMult(1);
    pointsRef.current = [];
    generateBots();
    [1,2].forEach(id => { if (panelsRef.current[id].status === "cashedOut" || panelsRef.current[id].status === "lost") { panelsRef.current[id].status = "idle"; panelsRef.current[id].cashoutAt = null; } });
    syncPanels();
  };

  const startFlyingPhase = (now) => {
    phaseRef.current = "flying"; setPhase("flying");
    roundStartRef.current = now;
    pointsRef.current = [{ t: 0, m: 1 }];
    currentMultRef.current = 1; setDisplayMult(1);
    [1,2].forEach(id => { if (panelsRef.current[id].status === "queued") panelsRef.current[id].status = "active"; });
    syncPanels();
  };

  const handleCrash = (now) => {
    phaseRef.current = "crashed"; setPhase("crashed");
    setHistory(h => [crashPointRef.current, ...h].slice(0, 20));
    [1,2].forEach(id => { if (panelsRef.current[id].status === "active") panelsRef.current[id].status = "lost"; });
    botsRef.current.forEach(b => { if (b.status === "playing") b.status = "lost"; });
    setBots([...botsRef.current]);
    syncPanels();
    [1,2].forEach(id => {
      const p = panelsRef.current[id];
      if (p.status === "lost") {
        const stake = stakeThisRoundRef.current[id] || parseFloat(p.amount);
        addBetToHistory({ sport:"aviator", match:"Aviator", selection:`Crashed @ ${crashPointRef.current.toFixed(2)}x`, type:"back", odds:crashPointRef.current, stake, pnl:-stake, result:"lost" });
      }
    });
    crashEndRef.current = now + 2500;
  };

  const drawGraph = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.clientWidth, h = canvas.clientHeight;
    ctx.clearRect(0,0,w,h);
    ctx.strokeStyle = "rgba(255,255,255,0.045)"; ctx.lineWidth = 1;
    for (let i=1;i<5;i++){ const y=h*i/5; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
    for (let i=1;i<6;i++){ const x=w*i/6; ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    const points = pointsRef.current;
    if (points.length < 2) return;
    const last = points[points.length-1];
    const maxT = Math.max(last.t*1.15, 4);
    const maxM = Math.max(currentMultRef.current*1.25, 2);
    const padL=8,padR=8,padT=24,padB=8;
    const mapX = t => padL + (t/maxT)*(w-padL-padR);
    const mapY = m => h-padB - ((m-1)/(maxM-1))*(h-padT-padB);

    ctx.beginPath(); ctx.moveTo(mapX(0), mapY(1));
    points.forEach(p => ctx.lineTo(mapX(p.t), mapY(p.m)));
    ctx.lineTo(mapX(last.t), h-padB); ctx.lineTo(mapX(0), h-padB); ctx.closePath();
    const grad = ctx.createLinearGradient(0,0,0,h);
    if (phaseRef.current === "crashed") { grad.addColorStop(0,"rgba(255,71,87,0.32)"); grad.addColorStop(1,"rgba(255,71,87,0)"); }
    else { grad.addColorStop(0,"rgba(168,85,247,0.30)"); grad.addColorStop(1,"rgba(168,85,247,0)"); }
    ctx.fillStyle = grad; ctx.fill();

    ctx.beginPath();
    points.forEach((p,i) => { const px=mapX(p.t),py=mapY(p.m); if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py); });
    ctx.strokeStyle = phaseRef.current === "crashed" ? "#ff4757" : "#a855f7";
    ctx.lineWidth = 3; ctx.shadowColor = phaseRef.current === "crashed" ? "rgba(255,71,87,0.55)" : "rgba(168,85,247,0.55)"; ctx.shadowBlur = 10;
    ctx.stroke(); ctx.shadowBlur = 0;

    const x = mapX(last.t), y = mapY(last.m);
    if (phaseRef.current === "crashed") {
      ctx.font = "26px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("💥", x, y);
    } else {
      let angle = -0.5;
      if (points.length >= 2) { const prev = points[points.length-2]; const dx=x-mapX(prev.t),dy=y-mapY(prev.m); if(dx!==0||dy!==0) angle = Math.atan2(dy,dx); }
      avDrawPlaneIcon(ctx, x, y, angle, "#c084fc", "rgba(168,85,247,0.8)");
    }
  };

  const mainLoop = (now) => {
    if (phaseRef.current === "waiting") {
      const remain = Math.max(0, waitingEndRef.current - now);
      setWaitingCount(remain / 1000);
      if (remain <= 0) startFlyingPhase(now);
    } else if (phaseRef.current === "flying") {
      const t = (now - roundStartRef.current) / 1000;
      const m = avMultiplierAt(t);
      if (m >= crashPointRef.current) {
        currentMultRef.current = crashPointRef.current;
        pointsRef.current.push({ t, m: crashPointRef.current });
        handleCrash(now);
      } else {
        currentMultRef.current = m;
        pointsRef.current.push({ t, m });
        setDisplayMult(m);
        checkAutoCashouts(); checkBotCashouts();
      }
      drawGraph();
    } else if (phaseRef.current === "crashed") {
      drawGraph();
      if (now >= crashEndRef.current) startWaitingPhase(now);
    }
    rafRef.current = requestAnimationFrame(mainLoop);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.parentElement.clientWidth, cssH = canvas.parentElement.clientHeight;
      canvas.width = Math.max(1, Math.round(cssW*dpr)); canvas.height = Math.max(1, Math.round(cssH*dpr));
      const ctx = canvas.getContext("2d"); ctx.setTransform(dpr,0,0,dpr,0,0);
      drawGraph();
    };
    window.addEventListener("resize", resize);
    resize();
    startWaitingPhase(performance.now());
    rafRef.current = requestAnimationFrame(mainLoop);
    return () => { window.removeEventListener("resize", resize); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line
  }, []);

  const tier = h => h < 2 ? "low" : h < 10 ? "mid" : "high";

  return (
    <div className="av-app-wrap">
      <style>{AV_CSS}</style>
      <button onClick={onClose} className="av-close">✕</button>
      <div className="av-app">
        <header className="av-topbar">
          <div className="av-brand"><span className="av-brand-icon">✈️</span><span className="av-brand-name">AVIATOR</span></div>
          <div className="av-balance-pill">
            <span className="av-balance-label">Balance</span>
            <span className="av-balance-value">{avFmt(balance)}</span>
          </div>
        </header>

        <div className="av-history-strip">
          {history.map((h,i) => <span key={i} className={`av-hist-pill av-tier-${tier(h)}`}>{h.toFixed(2)}x</span>)}
        </div>

        <div className={`av-game-panel av-phase-${phase}`}>
          <canvas ref={canvasRef}></canvas>
          <div className="av-center-display">
            {phase === "waiting" ? (
              <div className="av-waiting-wrap">
                <div className="av-waiting-label">Next round in</div>
                <div className="av-waiting-count">{waitingCount.toFixed(1)}s</div>
              </div>
            ) : (<>
              <div className={`av-multiplier ${phase==="crashed"?"av-crashed":""}`}>{displayMult.toFixed(2)}x</div>
              <div className={`av-round-message ${phase==="crashed"?"av-show":""}`}>FLEW AWAY!</div>
            </>)}
          </div>
        </div>

        <div className="av-bet-panels">
          <AvBetPanel id={1} p={panels[1]} phase={phase} displayMult={displayMult} updatePanel={updatePanel} onActionBtnClick={onActionBtnClick} />
          <AvBetPanel id={2} p={panels[2]} phase={phase} displayMult={displayMult} updatePanel={updatePanel} onActionBtnClick={onActionBtnClick} />
        </div>

        <div className="av-live-bets-panel">
          <div className="av-live-bets-header"><span>Live Bets</span><span>{bots.length} players</span></div>
          <div className="av-bet-row av-bet-row-head"><span>Player</span><span>Bet</span><span>Mult</span><span>Win</span></div>
          <div className="av-live-bets-table">
            {bots.map((b,i) => {
              let multClass="dim", multText="-", winText="-", winClass="dim";
              if (b.status==="cashedOut") { multClass="won"; multText=b.cashedAt.toFixed(2)+"x"; winText="+"+avFmt(Math.floor(b.amount*b.cashedAt)); winClass="won"; }
              else if (b.status==="lost") { multClass="lost"; winText="-"+avFmt(b.amount); winClass="lost"; }
              return <div key={i} className="av-bet-row"><span className="av-col-name">{b.name}</span><span className="av-col-amount">{avFmt(b.amount)}</span><span className={`av-col-mult av-${multClass}`}>{multText}</span><span className={`av-col-win av-${winClass}`}>{winText}</span></div>;
            })}
          </div>
        </div>
        <div className="av-footer-note">Live simulation · Balance syncs with your Hukam Bet account</div>
      </div>
    </div>
  );
}

const AV_CSS = `
.av-app-wrap{ position:fixed; inset:0; z-index:600; overflow-y:auto;
  background: radial-gradient(1200px 600px at 50% -10%, #1e1e23, #08080a 60%); background-color:#08080a; color:#eceef2;
  font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
.av-app{ max-width:520px; margin:0 auto; display:flex; flex-direction:column; gap:14px; padding:50px 12px 40px; }
.av-close{ position:fixed; top:14px; right:14px; z-index:20; width:34px; height:34px; border-radius:50%; border:1px solid #2c2c33; background:rgba(20,20,24,.85); color:#c9cbd3; cursor:pointer; font-size:15px; display:flex; align-items:center; justify-content:center; }
.av-topbar{ display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; }
.av-brand{ display:flex; align-items:center; gap:8px; font-weight:800; font-size:20px; }
.av-brand-icon{ font-size:20px; filter:drop-shadow(0 0 6px rgba(255,255,255,0.35)); }
.av-brand-name{ background:linear-gradient(135deg,#f5f6f8,#9698a1); -webkit-background-clip:text; background-clip:text; color:transparent; }
.av-balance-pill{ background:linear-gradient(180deg,#1c1c21,#141417); border:1px solid #2c2c33; border-radius:999px; padding:8px 14px; display:flex; flex-direction:column; align-items:flex-end; line-height:1.2; }
.av-balance-label{ font-size:10px; color:#75757e; text-transform:uppercase; }
.av-balance-value{ font-size:15px; font-weight:700; color:#f0f1f4; }
.av-history-strip{ display:flex; gap:6px; overflow-x:auto; padding-bottom:2px; }
.av-hist-pill{ flex:0 0 auto; padding:5px 10px; border-radius:999px; font-size:12px; font-weight:700; background:#151518; border:1px solid #2a2a30; }
.av-hist-pill.av-tier-low{ color:#a9abb3; }
.av-hist-pill.av-tier-mid{ color:#e7e8ec; border-color:#4a4a53; box-shadow:0 0 8px rgba(230,230,240,0.15); }
.av-hist-pill.av-tier-high{ color:#f5c451; border-color:#6b5a2c; box-shadow:0 0 10px rgba(245,196,81,0.25); }
.av-game-panel{ position:relative; background:radial-gradient(circle at 50% 20%, #17171b, #0a0a0c 75%); border:1px solid #232329; border-radius:20px; aspect-ratio:16/10; overflow:hidden; }
.av-game-panel.av-phase-crashed{ border-color:#3a1f22; }
.av-game-panel canvas{ position:absolute; inset:0; width:100%; height:100%; display:block; }
.av-center-display{ position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none; text-align:center; }
.av-multiplier{ font-size:clamp(38px,12vw,52px); font-weight:800; color:#f5f6f8; text-shadow:0 0 24px rgba(255,255,255,0.25); }
.av-multiplier.av-crashed{ color:#ff4757; text-shadow:0 0 24px rgba(255,71,87,0.45); }
.av-round-message{ margin-top:4px; font-size:14px; font-weight:700; letter-spacing:1px; color:#ff4757; opacity:0; }
.av-round-message.av-show{ opacity:1; }
.av-waiting-wrap{ display:flex; flex-direction:column; align-items:center; gap:6px; }
.av-waiting-label{ font-size:11px; letter-spacing:2px; color:#75757e; text-transform:uppercase; }
.av-waiting-count{ font-size:clamp(26px,8vw,34px); font-weight:800; color:#eceef2; }
.av-bet-panels{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
@media (max-width:380px){ .av-bet-panels{ grid-template-columns:1fr; } }
.av-bet-panel{ background:linear-gradient(180deg,#17171b,#111114); border:1px solid #232329; border-radius:16px; padding:12px; display:flex; flex-direction:column; gap:10px; }
.av-amount-row{ display:flex; align-items:stretch; gap:8px; }
.av-stepper{ width:34px; border-radius:10px; background:#1e1e23; border:1px solid #2c2c33; color:#c9cbd3; font-size:18px; cursor:pointer; }
.av-stepper:disabled{ opacity:.4; cursor:default; }
.av-amount-box{ flex:1; display:flex; align-items:center; gap:4px; background:#0f0f12; border:1px solid #2c2c33; border-radius:10px; padding:0 10px; }
.av-currency{ color:#75757e; font-weight:700; font-size:14px; }
.av-amount-input{ flex:1; width:100%; background:transparent; border:none; outline:none; color:#f0f1f4; font-size:15px; font-weight:700; padding:8px 0; }
.av-quick-amounts{ display:grid; grid-template-columns:repeat(4,1fr); gap:6px; }
.av-quick-amounts button{ background:#1a1a1f; border:1px solid #26262c; color:#a9abb3; border-radius:8px; padding:6px 0; font-size:11px; font-weight:600; cursor:pointer; }
.av-quick-amounts button:disabled{ opacity:.4; cursor:default; }
.av-auto-row{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
.av-auto-left{ display:flex; align-items:center; gap:6px; font-size:12px; color:#a9abb3; cursor:pointer; }
.av-auto-wrap{ display:flex; align-items:center; gap:3px; background:#0f0f12; border:1px solid #2c2c33; border-radius:8px; padding:3px 8px; font-size:12px; color:#a9abb3; }
.av-auto-wrap.av-disabled{ opacity:0.4; pointer-events:none; }
.av-auto-input{ width:40px; background:transparent; border:none; outline:none; color:#f0f1f4; font-size:12px; font-weight:700; }
.av-action-btn{ border:none; border-radius:12px; padding:12px 0; display:flex; flex-direction:column; align-items:center; gap:2px; cursor:pointer; transition:transform 0.1s; }
.av-action-btn:active{ transform:scale(0.98); }
.av-action-btn:disabled{ cursor:default; }
.av-action-label{ font-size:15px; font-weight:800; letter-spacing:0.5px; }
.av-action-amount{ font-size:12px; font-weight:600; opacity:0.85; }
.av-state-bet{ background:linear-gradient(135deg,#eceef2,#b8bac2); color:#0a0a0c; }
.av-state-cancel{ background:#1e1e23; border:1px solid #ff4757; color:#ff4757; }
.av-state-cashout{ background:linear-gradient(135deg,#00e07a,#00a85c); color:#052d1b; animation:avPulseGlow 1.1s infinite; }
.av-state-won{ background:#122a1c; border:1px solid #00e07a; color:#00e07a; }
.av-state-lost{ background:#2a1416; border:1px solid #ff4757; color:#ff4757; }
.av-state-disabled{ background:#1a1a1f; color:#55555c; }
@keyframes avPulseGlow{ 0%,100%{ box-shadow:0 0 0 rgba(0,224,122,0.5); } 50%{ box-shadow:0 0 18px rgba(0,224,122,0.55); } }
.av-live-bets-panel{ background:#111114; border:1px solid #232329; border-radius:16px; padding:12px; }
.av-live-bets-header{ display:flex; justify-content:space-between; font-size:12px; color:#75757e; margin-bottom:8px; text-transform:uppercase; }
.av-bet-row{ display:grid; grid-template-columns:1.4fr 1fr 0.8fr 1fr; gap:6px; padding:7px 6px; border-radius:8px; font-size:12px; align-items:center; }
.av-bet-row-head{ font-size:10px; text-transform:uppercase; color:#55555c; padding:0 6px 6px; }
.av-live-bets-table{ display:flex; flex-direction:column; gap:2px; max-height:220px; overflow-y:auto; }
.av-live-bets-table .av-bet-row:nth-child(odd){ background:#151518; }
.av-col-name{ color:#c9cbd3; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.av-col-amount{ color:#8e8f97; }
.av-col-mult{ font-weight:700; } .av-col-mult.av-won{ color:#00e07a; } .av-col-mult.av-lost, .av-col-mult.av-dim{ color:#55555c; }
.av-col-win{ text-align:right; font-weight:700; } .av-col-win.av-won{ color:#00e07a; } .av-col-win.av-lost{ color:#ff4757; } .av-col-win.av-dim{ color:#55555c; }
.av-footer-note{ text-align:center; font-size:11px; color:#4c4c53; padding-top:4px; }
`;

// ─── DATA ──────────────────────────────────────────────────────────────────────
// ── LIVE REAL MATCHES (fetched June 2, 2026) ──────────────────────────────────
function makeOdds(base, spread = 0.08) {
  const r = () => +(base + (Math.random() - 0.5) * spread).toFixed(2);
  return [{ odds: r(), stake: `${(Math.random()*30+5).toFixed(0)}K` }, { odds: r(), stake: `${(Math.random()*20+3).toFixed(0)}K` }, { odds: r(), stake: `${(Math.random()*10+1).toFixed(0)}K` }];
}
const INITIAL_MATCHES = [
  // ── CRICKET LIVE ────────────────────────────────────────────────────────────
  {
    id: 1, sport: "cricket", league: "ODI Series • LIVE",
    teamA: { name: "Pakistan", short: "PAK", flag: "🇵🇰", score: "In Progress", overs: "" },
    teamB: { name: "Australia", short: "AUS", flag: "🇦🇺", score: "In Progress", overs: "" },
    status: "live", time: "5:00 PM IST", info: "🔴 Pakistan vs Australia — ODI Series",
    back: makeOdds(1.95), lay: makeOdds(2.05), backB: makeOdds(1.88), layB: makeOdds(1.98),
    draw: null, markets: 38,
    fancy: [{ label: "PAK 10 Over Runs", no: 52, yes: 54, min: 42, max: 68 }, { label: "Total Match Runs", no: 490, yes: 496, min: 420, max: 560 }],
  },
  {
    id: 2, sport: "cricket", league: "T20 • Women's Series LIVE",
    teamA: { name: "England W", short: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", score: "In Progress", overs: "" },
    teamB: { name: "India W", short: "IND", flag: "🇮🇳", score: "In Progress", overs: "" },
    status: "live", time: "11:00 PM IST", info: "🔴 T20 Series — England vs India Women",
    back: makeOdds(2.10), lay: makeOdds(2.22), backB: makeOdds(1.72), layB: makeOdds(1.82),
    draw: null, markets: 24,
    fancy: [{ label: "ENG W 6 Over Runs", no: 42, yes: 44, min: 36, max: 54 }, { label: "India W Total Runs", no: 158, yes: 162, min: 130, max: 200 }],
  },
  {
    id: 3, sport: "cricket", league: "T20 Inter-Provincial LIVE",
    teamA: { name: "NW Warriors", short: "NOR", flag: "🟣", score: "In Progress", overs: "" },
    teamB: { name: "Leinster Lightning", short: "LEI", flag: "⚡", score: "In Progress", overs: "" },
    status: "live", time: "8:00 PM IST", info: "🔴 T20 Inter Provincial Trophy",
    back: makeOdds(1.62), lay: makeOdds(1.74), backB: makeOdds(2.18), layB: makeOdds(2.32),
    draw: null, markets: 14, fancy: [],
  },
  // ── CRICKET UPCOMING ────────────────────────────────────────────────────────
  {
    id: 4, sport: "cricket", league: "Mumbai Premier League",
    teamA: { name: "Sobo Falcons", short: "SOB", flag: "🦅", score: "—", overs: "" },
    teamB: { name: "Arcs Andheri", short: "ARC", flag: "🔶", score: "—", overs: "" },
    status: "upcoming", time: "Today 7:00 PM IST", info: "Mumbai Premier League 2026",
    back: makeOdds(1.88), lay: makeOdds(2.00), backB: makeOdds(1.95), layB: makeOdds(2.08),
    draw: null, markets: 22,
    fancy: [{ label: "SOB 6 Over Runs", no: 46, yes: 48, min: 38, max: 60 }],
  },
  {
    id: 5, sport: "cricket", league: "T20 Baroda Premier League",
    teamA: { name: "Pruthvi Panthers", short: "PRU", flag: "🐆", score: "—", overs: "" },
    teamB: { name: "A4 Power Strikers", short: "POW", flag: "⚡", score: "—", overs: "" },
    status: "upcoming", time: "Today 7:30 PM IST", info: "Baroda Premier League 2026",
    back: makeOdds(2.05), lay: makeOdds(2.18), backB: makeOdds(1.80), layB: makeOdds(1.92),
    draw: null, markets: 16, fancy: [],
  },
  // ── TENNIS LIVE ─────────────────────────────────────────────────────────────
  {
    id: 6, sport: "tennis", league: "French Open • LIVE",
    teamA: { name: "J. Mensik", short: "MEN", flag: "🎾", score: "", overs: "Starting" },
    teamB: { name: "J. Fonseca", short: "FON", flag: "🎾", score: "", overs: "" },
    status: "upcoming", time: "11:45 PM IST", info: "French Open Men's Singles",
    back: makeOdds(1.72), lay: makeOdds(1.84), backB: makeOdds(2.05), layB: makeOdds(2.18),
    draw: null, markets: 18, fancy: [],
  },
  {
    id: 7, sport: "tennis", league: "ATP Challenger Birmingham LIVE",
    teamA: { name: "C. Wong", short: "WON", flag: "🎾", score: "7-6", overs: "Set 2" },
    teamB: { name: "O. Tarvet", short: "TAR", flag: "🎾", score: "6-", overs: "4-5" },
    status: "live", time: "6:40 PM IST", info: "🔴 ATP Challenger Birmingham — Set 2",
    back: makeOdds(1.45), lay: makeOdds(1.56), backB: makeOdds(2.60), layB: makeOdds(2.78),
    draw: null, markets: 12, fancy: [],
  },
  {
    id: 8, sport: "tennis", league: "ATP Challenger Birmingham LIVE",
    teamA: { name: "C. Chidekh", short: "CHI", flag: "🎾", score: "6-3", overs: "Set 2" },
    teamB: { name: "F. Romano", short: "ROM", flag: "🎾", score: "", overs: "4-5" },
    status: "live", time: "7:25 PM IST", info: "🔴 ATP Challenger Birmingham",
    back: makeOdds(1.38), lay: makeOdds(1.48), backB: makeOdds(2.90), layB: makeOdds(3.10),
    draw: null, markets: 10, fancy: [],
  },
  {
    id: 9, sport: "tennis", league: "WTA 125K Makarska LIVE",
    teamA: { name: "T. Zidansek", short: "ZID", flag: "🎾", score: "", overs: "3-4" },
    teamB: { name: "E. Avanesyan", short: "AVA", flag: "🎾", score: "", overs: "" },
    status: "live", time: "11:10 PM IST", info: "🔴 WTA 125K Makarska, Croatia",
    back: makeOdds(1.80), lay: makeOdds(1.94), backB: makeOdds(1.92), layB: makeOdds(2.08),
    draw: null, markets: 8, fancy: [],
  },
  // ── FOOTBALL ────────────────────────────────────────────────────────────────
  {
    id: 10, sport: "football", league: "Premier League • Final Day",
    teamA: { name: "Crystal Palace", short: "CRY", flag: "🦅", score: "1", overs: "FT" },
    teamB: { name: "Arsenal FC", short: "ARS", flag: "🔴", score: "2", overs: "" },
    status: "upcoming", time: "Next Season", info: "Season 2025/26 Ended • EPL Final Day Results",
    back: makeOdds(1.55), lay: makeOdds(1.68), backB: makeOdds(4.80), layB: makeOdds(5.20),
    draw: [{ odds: 3.60, stake: "8K", side: "back" }, { odds: 3.55, stake: "5K", side: "back" }, { odds: 3.50, stake: "3K", side: "back" }, { odds: 3.65, stake: "7K", side: "lay" }, { odds: 3.70, stake: "4K", side: "lay" }, { odds: 3.75, stake: "2K", side: "lay" }],
    markets: 65, fancy: [],
  },
  {
    id: 11, sport: "football", league: "Premier League • Final Day",
    teamA: { name: "Manchester United", short: "MUN", flag: "🔴", score: "3", overs: "FT" },
    teamB: { name: "Brighton", short: "BRI", flag: "🔵", score: "0", overs: "" },
    status: "upcoming", time: "Next Season", info: "Season 2025/26 Ended • EPL Final Day",
    back: makeOdds(1.42), lay: makeOdds(1.52), backB: makeOdds(6.50), layB: makeOdds(7.00),
    draw: [{ odds: 4.20, stake: "6K", side: "back" }, { odds: 4.10, stake: "4K", side: "back" }, { odds: 4.00, stake: "2K", side: "back" }, { odds: 4.30, stake: "5K", side: "lay" }, { odds: 4.40, stake: "3K", side: "lay" }, { odds: 4.50, stake: "1K", side: "lay" }],
    markets: 58, fancy: [],
  },
];

const SPORTS = [{ id: "all", label: "All Sports", icon: "🏟", count: 11 }, { id: "cricket", label: "Cricket", icon: "🏏", count: 5 }, { id: "football", label: "Football", icon: "⚽", count: 2 }, { id: "tennis", label: "Tennis", icon: "🎾", count: 4 }];

const CASINO_GAMES = [
  { id: 1, name: "3 Patti", icon: "🃏", players: "14.2K", badge: "hot", playable: true },
  { id: 2, name: "Dragon Tiger", icon: "🐉", players: "9.8K", badge: "live", playable: true },
  { id: 3, name: "Andar Bahar", icon: "🎴", players: "7.4K", badge: "new", playable: true },
  { id: 4, name: "Live Roulette", icon: "🎡", players: "5.1K", badge: "vip", playable: true },
  { id: 5, name: "Speed Baccarat", icon: "🎰", players: "3.9K", badge: "hot", playable: true },
  { id: 6, name: "Aviator", icon: "✈️", players: "22.1K", badge: "hot", playable: true },
  { id: 8, name: "Mines", icon: "💣", players: "11.4K", badge: "hot", playable: true },
  { id: 9, name: "7 Up Down", icon: "🎲", players: "6.7K", badge: "new", playable: true },
];

const DEMO_HISTORY = [
  { id: 1, sport: "cricket", match: "MI v CSK", selection: "Mumbai Indians", type: "back", odds: 1.92, stake: 500, pnl: 460, result: "won", time: ft(new Date(now - 480000)) },
  { id: 2, sport: "football", match: "Arsenal v Liverpool", selection: "Arsenal", type: "back", odds: 1.44, stake: 1000, pnl: -1000, result: "lost", time: ft(new Date(now - 1320000)) },
  { id: 3, sport: "aviator", match: "Aviator", selection: "Cashed @ 3.14x", type: "back", odds: 3.14, stake: 200, pnl: 428, result: "won", time: ft(new Date(now - 2700000)) },
  { id: 5, sport: "cricket", match: "IND v ENG", selection: "India", type: "back", odds: 1.40, stake: 2000, pnl: 800, result: "won", time: ft(new Date(now - 4500000)) },
  { id: 7, sport: "tennis", match: "Alcaraz v Sinner", selection: "C. Alcaraz", type: "back", odds: 1.55, stake: 300, pnl: -300, result: "lost", time: ft(new Date(now - 6300000)) },
  { id: 8, sport: "football", match: "Real Madrid v Bayern", selection: "Real Madrid", type: "back", odds: 2.30, stake: 750, pnl: 1225, result: "won", time: ft(new Date(now - 7200000)) },
];

// ─── LIVE ICON ────────────────────────────────────────────────────────────────
const LiveDot = () => <span style={{ width: 7, height: 7, background: "#E8445A", borderRadius: "50%", display: "inline-block", animation: "pulse 1s infinite" }} />;

// ─── ODDS BUTTON ──────────────────────────────────────────────────────────────
// ── LIVE ODDS BACKEND ───────────────────────────────────────────────────────
// Run the server in the backend/ folder (node server.js) — it holds your
// Odds API key and serves real matches + real bookmaker odds on port 8787.
// After deploying it (Render / Railway / any VPS), change this URL to e.g.
//   const HUKAM_BACKEND_URL = "https://hukambook-api.onrender.com";
const HUKAM_BACKEND_URL = "http://localhost:8787";

// ═══════════════════════════════════════════════════════════════════════════════
// HUKAM BOOKIE — chrome sportsbook shell (casino untouched, shares balance/history)
// ═══════════════════════════════════════════════════════════════════════════════
const CHROME_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap');
.hb-root{
  --black-void:#08080a; --panel:#131317; --panel-2:#1b1c21; --line:#2a2b31;
  --chrome-1:#f2f3f4; --chrome-2:#9aa0a6; --chrome-3:#5b5f66;
  --up:#3ddc84; --down:#ff4f5e; --text-dim:#8a8d94;
  background:var(--black-void); color:#e9eaec; font-family:'Inter',sans-serif;
  min-height:100vh; overflow-x:hidden; max-width:100vw; position:relative;
}
.hb-root *{box-sizing:border-box;}
.hb-root ::selection{background:var(--chrome-2); color:#000;}
.chrome-text{
  background:linear-gradient(180deg,#ffffff 0%,#d7d9db 25%,#8b8f95 50%,#c7cacd 75%,#f5f6f7 100%);
  -webkit-background-clip:text; background-clip:text; color:transparent;
  filter:drop-shadow(0 1px 0 rgba(255,255,255,.15));
}
.hb-root h1,.hb-root h2,.hb-root h3{ font-family:'Oswald',sans-serif; letter-spacing:.02em; text-transform:uppercase; margin:0; }
.mono{ font-family:'JetBrains Mono',monospace; }
.hb-root a{ color:inherit; text-decoration:none; cursor:pointer; }
.hb-root button{ font-family:'Inter',sans-serif; }

/* HEADER */
.hb-header{ position:sticky; top:0; z-index:100; background:rgba(8,8,10,.85); backdrop-filter:blur(10px); border-bottom:1px solid var(--line); }
.nav-wrap{ max-width:1280px; margin:0 auto; padding:12px 24px; display:flex; align-items:center; justify-content:space-between; gap:16px; }
.brand{ display:flex; align-items:center; gap:10px; cursor:pointer; }
.brand-mark{ width:38px; height:38px; border-radius:8px; flex-shrink:0;
  background:linear-gradient(145deg,#e9eaec,#6b6f76 45%,#c9cbce);
  display:flex; align-items:center; justify-content:center;
  font-family:'Oswald',sans-serif; font-weight:700; color:#0a0a0c; font-size:18px;
  box-shadow:inset 0 1px 1px rgba(255,255,255,.6), 0 3px 8px rgba(0,0,0,.6); }
.brand-name{ font-size:19px; font-weight:600; letter-spacing:.08em; font-family:'Oswald',sans-serif; text-transform:uppercase; }
.brand-name span{ color:var(--text-dim); font-weight:400; font-size:10px; display:block; letter-spacing:.25em; margin-top:-2px; font-family:'Inter',sans-serif; }
nav.links{ display:flex; gap:26px; font-size:13px; letter-spacing:.05em; text-transform:uppercase; }
nav.links a{ color:var(--text-dim); transition:color .2s; position:relative; padding-bottom:4px; }
nav.links a:hover, nav.links a.active{ color:#fff; }
nav.links a.active::after{ content:''; position:absolute; left:0; right:0; bottom:0; height:2px;
  background:linear-gradient(90deg,var(--chrome-2),#fff,var(--chrome-2)); }
.header-actions{ display:flex; gap:10px; align-items:center; }
.hb-btn{ padding:9px 16px; border-radius:6px; font-size:12.5px; font-weight:600; letter-spacing:.03em; cursor:pointer;
  border:1px solid var(--line); text-transform:uppercase; transition:transform .15s, box-shadow .15s, border-color .2s;
  background:transparent; color:#e9eaec; }
.hb-btn:hover{ border-color:var(--chrome-2); }
.btn-chrome{ background:linear-gradient(180deg,#f4f5f6,#b9bcc0 55%,#e6e7e9); color:#0a0a0c; border:none;
  box-shadow:0 2px 0 rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.8); }
.btn-chrome:hover{ transform:translateY(-1px); box-shadow:0 4px 10px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.9); }
.balance-chip{ font-family:'JetBrains Mono',monospace; font-size:12.5px; color:var(--chrome-1);
  border:1px solid var(--line); border-radius:6px; padding:8px 12px; background:var(--panel); cursor:pointer; }
.live-pill{ display:flex; align-items:center; gap:6px; font-size:10.5px; letter-spacing:.1em; cursor:pointer;
  color:var(--up); border:1px solid rgba(61,220,132,.35); padding:6px 10px; border-radius:20px; background:rgba(61,220,132,.06); text-transform:uppercase; }
.live-pill.demo{ color:var(--chrome-2); border-color:var(--line); background:transparent; }
.live-pill.sync{ color:#e6c453; border-color:rgba(230,196,83,.4); background:rgba(230,196,83,.05); }
.live-dot{ width:7px; height:7px; border-radius:50%; background:var(--up); box-shadow:0 0 8px var(--up); animation:hbpulse 1.4s infinite; flex-shrink:0; }
.live-pill.demo .live-dot{ background:var(--chrome-3); box-shadow:none; animation:none; }
.live-pill.sync .live-dot{ background:#e6c453; box-shadow:0 0 8px #e6c453; }
@keyframes hbpulse{ 0%,100%{opacity:1; transform:scale(1);} 50%{opacity:.4; transform:scale(1.3);} }
.menu-toggle{ display:none; width:38px; height:38px; border-radius:6px; border:1px solid var(--line);
  background:transparent; color:#fff; font-size:17px; cursor:pointer; align-items:center; justify-content:center; }
.mobile-nav{ display:none; flex-direction:column; padding:4px 24px 14px; border-bottom:1px solid var(--line); background:var(--panel); }
.mobile-nav.open{ display:flex; }
.mobile-nav a{ color:var(--text-dim); padding:11px 0; font-size:13.5px; text-transform:uppercase; letter-spacing:.04em; border-bottom:1px solid var(--line); }
.mobile-nav a:last-child{ border-bottom:none; }
.mobile-nav a:hover, .mobile-nav a.active{ color:#fff; }

/* DATA BANNER + TICKER */
.data-banner{ max-width:1280px; margin:0 auto; padding:8px 24px; display:flex; align-items:center; gap:10px;
  font-size:12px; color:var(--text-dim); flex-wrap:wrap; }
.data-banner .ok{ color:var(--up); }
.data-banner .warn{ color:#e6c453; }
.banner-retry{ padding:5px 12px; border-radius:5px; font-size:11px; font-weight:600; cursor:pointer;
  border:1px solid var(--line); background:transparent; color:#e9eaec; text-transform:uppercase; letter-spacing:.05em; }
.banner-retry:hover{ border-color:var(--chrome-2); }
.ticker{ border-top:1px solid var(--line); border-bottom:1px solid var(--line); background:var(--panel); overflow:hidden; white-space:nowrap; }
.ticker-track{ display:inline-flex; gap:48px; padding:8px 0; animation:hbscroll 38s linear infinite; }
.ticker:hover .ticker-track{ animation-play-state:paused; }
@keyframes hbscroll{ from{ transform:translateX(0);} to{ transform:translateX(-50%);} }
.ticker-item{ font-size:12.5px; color:var(--text-dim); display:inline-flex; gap:8px; align-items:center; }
.ticker-item b{ color:#e9eaec; font-weight:600; }
.ticker-item .odds-mini{ color:var(--chrome-1); font-family:'JetBrains Mono',monospace; }
.tk-live{ color:var(--up); font-size:9px; letter-spacing:.1em; }

/* HERO */
.hero{ max-width:1280px; margin:0 auto; padding:64px 24px 46px; }
.eyebrow{ font-size:11.5px; letter-spacing:.3em; color:var(--chrome-2); text-transform:uppercase; margin-bottom:16px; display:block; }
.hero h1{ font-size:56px; line-height:1.02; margin-bottom:20px; font-weight:700; }
.hero p.sub{ color:var(--text-dim); font-size:15.5px; max-width:480px; margin:0 0 28px; line-height:1.6; }
.hero-cta{ display:flex; gap:14px; flex-wrap:wrap; }
.hero-stats{ display:flex; gap:30px; margin-top:38px; flex-wrap:wrap; }
.hero-stats>div{ border-left:2px solid var(--line); padding-left:14px; cursor:pointer; }
.hero-stats .num{ font-family:'Oswald',sans-serif; font-size:26px; }
.hero-stats .lbl{ font-size:10.5px; color:var(--text-dim); text-transform:uppercase; letter-spacing:.08em; }

/* SECTIONS */
.hb-block{ max-width:1280px; margin:0 auto; padding:44px 24px; }
.section-head{ display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:24px; gap:12px; flex-wrap:wrap; }
.section-head h2{ font-size:25px; }
.section-head .sub{ color:var(--text-dim); font-size:12.5px; margin-top:4px; }
.league-strip{ display:grid; grid-template-columns:repeat(6,1fr); gap:14px; }
.league-chip{ border:1px solid var(--line); border-radius:12px; padding:18px 10px; text-align:center;
  background:var(--panel); transition:transform .2s, border-color .2s; cursor:pointer; }
.league-chip:hover{ transform:translateY(-4px); border-color:var(--chrome-2); }
.league-chip .ic{ font-size:25px; margin-bottom:8px; }
.league-chip .nm{ font-size:11.5px; text-transform:uppercase; letter-spacing:.04em; color:#e9eaec; }
.league-chip .ct{ font-size:10px; color:var(--chrome-2); margin-top:3px; }
.tabs{ display:flex; gap:10px; overflow-x:auto; padding-bottom:6px; margin-bottom:26px; -webkit-overflow-scrolling:touch; }
.hb-tab{ padding:9px 18px; border:1px solid var(--line); border-radius:24px; font-size:12.5px; white-space:nowrap;
  cursor:pointer; color:var(--text-dim); background:var(--panel); transition:all .18s; text-transform:capitalize; }
.hb-tab.active{ background:linear-gradient(180deg,#f4f5f6,#aeb2b6); color:#0a0a0c; border-color:transparent; font-weight:600; }
.hb-tab:hover:not(.active){ color:#fff; border-color:var(--chrome-2); }

/* MATCH CARDS */
.match-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
.hb-card{ background:linear-gradient(160deg,var(--panel-2),var(--panel)); border:1px solid var(--line); border-radius:14px;
  padding:18px; position:relative; overflow:hidden; transition:box-shadow .15s, border-color .2s; }
.hb-card::before{ content:''; position:absolute; inset:0; opacity:0; transition:opacity .3s; pointer-events:none;
  background:radial-gradient(500px circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,.06), transparent 60%); }
.hb-card:hover::before{ opacity:1; }
.hb-card:hover{ border-color:#40434a; box-shadow:0 20px 40px rgba(0,0,0,.5); }
.card-top{ display:flex; justify-content:space-between; align-items:center; font-size:10.5px; color:var(--text-dim);
  margin-bottom:12px; text-transform:uppercase; letter-spacing:.06em; gap:8px; }
.card-top .live{ color:var(--up); display:flex; align-items:center; gap:5px; flex-shrink:0; }
.team-row{ display:flex; justify-content:space-between; align-items:center; padding:6px 0; font-size:14.5px; font-weight:500; gap:8px; }
.team-row .tnm{ display:flex; align-items:center; gap:8px; min-width:0; }
.team-row .tnm span.nm{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.team-row .score{ font-family:'JetBrains Mono',monospace; color:var(--chrome-1); font-size:14px; text-align:right; flex-shrink:0; }
.team-row .score small{ display:block; font-size:10px; color:var(--text-dim); }
.vs-line{ height:1px; background:var(--line); margin:3px 0; }
.match-note{ margin-top:8px; font-size:11px; color:var(--chrome-2); border:1px dashed var(--line); border-radius:6px; padding:5px 9px; text-align:center; }
.odds-row{ display:grid; gap:8px; margin-top:14px; }
.odd-box{ background:var(--black-void); border:1px solid var(--line); border-radius:8px; padding:9px 6px 7px;
  text-align:center; cursor:pointer; transition:border-color .2s, background .2s; user-select:none; }
.odd-box:hover{ border-color:var(--chrome-2); background:#0f0f12; }
.odd-box:active{ transform:scale(.97); }
.odd-box .lbl{ font-size:9.5px; color:var(--text-dim); text-transform:uppercase; letter-spacing:.06em; margin-bottom:4px;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.odd-box .val{ font-family:'JetBrains Mono',monospace; font-size:17px; font-weight:700; color:#fff; display:inline-block; transition:color .4s; }
.odd-box .liq{ font-size:9px; color:var(--chrome-3); margin-top:3px; font-family:'JetBrains Mono',monospace; }
.flip{ animation:flipnum .5s ease; }
@keyframes flipnum{ 0%{transform:rotateX(0);} 50%{transform:rotateX(90deg);} 100%{transform:rotateX(0);} }
.val.up{ color:var(--up); } .val.down{ color:var(--down); }
.arrow{ font-size:9px; margin-left:3px; }
.card-foot{ display:flex; justify-content:space-between; margin-top:12px; font-size:10.5px; color:var(--text-dim); }
.empty-note{ border:1px dashed var(--line); border-radius:12px; padding:34px; text-align:center; color:var(--text-dim); font-size:13px; grid-column:1/-1; }

/* BET SLIP */
.betslip-fab{ position:fixed; right:22px; bottom:22px; z-index:800;
  background:linear-gradient(180deg,#f4f5f6,#aeb2b6); color:#0a0a0c; padding:13px 20px; border-radius:30px;
  font-weight:700; font-size:12.5px; box-shadow:0 10px 30px rgba(0,0,0,.6); cursor:pointer;
  display:flex; align-items:center; gap:8px; text-transform:uppercase; letter-spacing:.04em; border:none; }
.betslip-fab .count{ background:#0a0a0c; color:#fff; border-radius:50%; min-width:20px; height:20px;
  display:flex; align-items:center; justify-content:center; font-size:11px; padding:0 4px; }
.slip-panel{ position:fixed; right:22px; bottom:78px; z-index:800; width:340px; max-height:70vh; overflow-y:auto;
  background:var(--panel); border:1px solid var(--line); border-radius:14px; box-shadow:0 20px 50px rgba(0,0,0,.65); }
.slip-panel.sheet{ left:10px; right:10px; width:auto; bottom:72px; }
.slip-head{ display:flex; justify-content:space-between; align-items:center; padding:13px 16px; border-bottom:1px solid var(--line); }
.slip-head b{ font-family:'Oswald',sans-serif; letter-spacing:.06em; text-transform:uppercase; font-size:14px; }
.slip-x{ background:none; border:none; color:var(--text-dim); font-size:16px; cursor:pointer; }
.slip-row{ padding:12px 16px; border-bottom:1px solid var(--line); }
.slip-row .sel{ display:flex; justify-content:space-between; font-size:13.5px; font-weight:600; gap:8px; }
.slip-row .sel .od{ font-family:'JetBrains Mono',monospace; color:var(--chrome-1); }
.slip-row .mt{ font-size:11px; color:var(--text-dim); margin:2px 0 8px; }
.slip-row .tag{ font-size:9px; letter-spacing:.08em; border:1px solid var(--line); border-radius:4px; padding:1px 6px; color:var(--chrome-2); text-transform:uppercase; margin-right:6px; }
.stake-line{ display:flex; gap:8px; align-items:center; }
.stake-line input{ flex:1; background:var(--black-void); border:1px solid var(--line); border-radius:6px; color:#fff;
  padding:8px 10px; font-size:13px; font-family:'JetBrains Mono',monospace; min-width:0; }
.stake-line input:focus{ outline:none; border-color:var(--chrome-2); }
.rm-bet{ background:none; border:1px solid var(--line); color:var(--down); border-radius:6px; width:30px; height:32px; cursor:pointer; flex-shrink:0; }
.quick-chips{ display:flex; gap:6px; margin-top:8px; }
.quick-chips button{ flex:1; background:var(--black-void); border:1px solid var(--line); color:var(--text-dim);
  border-radius:5px; padding:5px 0; font-size:11px; cursor:pointer; font-family:'JetBrains Mono',monospace; }
.quick-chips button:hover{ border-color:var(--chrome-2); color:#fff; }
.slip-totals{ padding:12px 16px; font-size:12.5px; color:var(--text-dim); display:flex; justify-content:space-between; }
.slip-totals b{ color:var(--chrome-1); font-family:'JetBrains Mono',monospace; }
.slip-actions{ display:flex; gap:8px; padding:0 16px 14px; }
.slip-actions .hb-btn{ flex:1; text-align:center; }
.slip-empty{ padding:26px 16px; text-align:center; color:var(--text-dim); font-size:12.5px; }

/* FOOTER */
.hb-footer{ border-top:1px solid var(--line); background:var(--panel); margin-top:56px; padding:38px 24px 26px; }
.foot-wrap{ max-width:1280px; margin:0 auto; display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:28px; font-size:13px; color:var(--text-dim); }
.foot-wrap h4{ color:#fff; font-size:11.5px; text-transform:uppercase; letter-spacing:.08em; margin:0 0 13px; }
.foot-wrap a{ display:block; margin-bottom:8px; color:var(--text-dim); }
.foot-wrap a:hover{ color:#fff; }
.foot-bottom{ max-width:1280px; margin:28px auto 0; padding-top:18px; border-top:1px solid var(--line);
  font-size:11px; color:#5c5f66; display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px; }
.age-badge{ border:1px solid var(--line); border-radius:6px; padding:2px 8px; font-weight:700; color:#fff; }

@media (max-width:900px){
  .nav-wrap nav.links{ display:none; }
  .menu-toggle{ display:flex; }
  .header-actions .hide-m{ display:none; }
  .hero{ padding:44px 18px 36px; }
  .hero h1{ font-size:38px; }
  .hb-block{ padding:34px 16px; }
  .match-grid{ grid-template-columns:1fr; }
  .league-strip{ grid-template-columns:repeat(3,1fr); }
  .foot-wrap{ grid-template-columns:1fr 1fr; }
}
@media (max-width:520px){
  .brand-name{ font-size:15px; }
  .hero h1{ font-size:30px; }
  .league-strip{ grid-template-columns:repeat(2,1fr); }
  .foot-wrap{ grid-template-columns:1fr; }
  .nav-wrap{ padding:10px 14px; }
  .data-banner{ padding:8px 14px; }
}
`;

function useIsMobile(bp = 760) {
  const [m, setM] = useState(typeof window !== "undefined" ? window.innerWidth <= bp : false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${bp}px)`);
    const fn = e => setM(e.matches);
    setM(mq.matches);
    mq.addEventListener ? mq.addEventListener("change", fn) : mq.addListener(fn);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", fn) : mq.removeListener(fn); };
  }, [bp]);
  return m;
}

function OddBox({ label, cell, sel, onPick }) {
  const [dir, setDir] = useState("");
  const prev = useRef(cell ? cell.odds : null);
  useEffect(() => {
    if (cell && prev.current !== null && cell.odds !== prev.current) {
      setDir(cell.odds > prev.current ? "up" : "down");
      const t = setTimeout(() => setDir(""), 650);
      prev.current = cell.odds;
      return () => clearTimeout(t);
    }
    if (cell) prev.current = cell.odds;
  }, [cell && cell.odds]);
  if (!cell) return <div className="odd-box" style={{ opacity: .35, cursor: "default" }}><div className="lbl">{label}</div><div className="val">—</div><div className="liq">&nbsp;</div></div>;
  return (
    <div className="odd-box" onClick={onPick} title={`Back ${sel} @ ${cell.odds.toFixed(2)}`}>
      <div className="lbl">{label}</div>
      <div className={`val ${dir} ${dir ? "flip" : ""}`}>{cell.odds.toFixed(2)}{dir && <span className="arrow">{dir === "up" ? "▲" : "▼"}</span>}</div>
      <div className="liq">{cell.stake || ""}</div>
    </div>
  );
}

function ChromeCard({ match, addToSlip }) {
  const isLive = match.status === "live";
  const bA = match.back && match.back[0];
  const bB = (match.backB || match.back) && (match.backB || match.back)[0];
  const drawCell = match.draw && match.draw.length > 0 ? (match.draw.find(d => d.side === "back" || !d.side) || null) : null;
  const three = !!drawCell;
  const onMove = e => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  const scoreOf = t => (t.score && t.score !== "-" && t.score !== "—") ? t.score : "";
  return (
    <div className="hb-card" onMouseMove={onMove}>
      <div className="card-top">
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{match.league}</span>
        {isLive
          ? <span className="live"><span className="live-dot" style={{ width: 6, height: 6 }} />LIVE</span>
          : <span>{match.time}</span>}
      </div>
      {[match.teamA, match.teamB].map((t, i) => (
        <div key={i}>
          <div className="team-row">
            <span className="tnm"><span>{t.flag}</span><span className="nm">{t.name}</span></span>
            <span className="score">{scoreOf(t)}{t.overs ? <small>{t.overs}</small> : null}</span>
          </div>
          {i === 0 && <div className="vs-line" />}
        </div>
      ))}
      {match.info && <div className="match-note">{match.info}</div>}
      <div className="odds-row" style={{ gridTemplateColumns: three ? "repeat(3,1fr)" : "repeat(2,1fr)" }}>
        <OddBox label={match.teamA.short || match.teamA.name} cell={bA} sel={match.teamA.name}
          onPick={() => bA && addToSlip(match, "back", bA.odds, 0, match.teamA.name)} />
        {three && <OddBox label="Draw" cell={drawCell} sel="The Draw"
          onPick={() => drawCell && addToSlip(match, "back", drawCell.odds, 0, "The Draw")} />}
        <OddBox label={match.teamB.short || match.teamB.name} cell={bB} sel={match.teamB.name}
          onPick={() => bB && addToSlip(match, "back", bB.odds, 0, match.teamB.name)} />
      </div>
      <div className="card-foot">
        <span>{isLive ? "In-Play" : match.time}</span>
        <span>{match.oddsAvailable === false ? "Scores only" : `${match.markets || 0}+ markets`}</span>
      </div>
    </div>
  );
}

function BettingSlip({ slip, removeFromSlip, updateStake, placeBets, clearSlip }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const QUICK = [100, 500, 1000, 5000];
  const ts = slip.reduce((s, b) => s + (parseFloat(b.stake) || 0), 0);
  const tr = slip.reduce((s, b) => { const st = parseFloat(b.stake) || 0; return s + st * b.odds; }, 0);
  return (
    <>
      {open && (
        <div className={`slip-panel ${isMobile ? "sheet" : ""}`}>
          <div className="slip-head"><b>Bet Slip</b><button className="slip-x" onClick={() => setOpen(false)}>✕</button></div>
          {slip.length === 0 && <div className="slip-empty">Your slip is empty — tap any odds box to add a selection.</div>}
          {slip.map(b => (
            <div className="slip-row" key={b.uid}>
              <div className="sel"><span>{b.selection}</span><span className="od">{b.odds.toFixed(2)}</span></div>
              <div className="mt"><span className="tag">{b.type}</span>{b.match}</div>
              <div className="stake-line">
                <input type="number" placeholder="Stake ₹" value={b.stake} onChange={e => updateStake(b.uid, e.target.value)} />
                <button className="rm-bet" onClick={() => removeFromSlip(b.uid)} title="Remove">✕</button>
              </div>
              <div className="quick-chips">
                {QUICK.map(q => <button key={q} onClick={() => updateStake(b.uid, String(q))}>{q >= 1000 ? q / 1000 + "K" : q}</button>)}
              </div>
            </div>
          ))}
          {slip.length > 0 && (
            <>
              <div className="slip-totals"><span>Total stake <b>₹{ts.toLocaleString()}</b></span><span>Returns <b>₹{Math.round(tr).toLocaleString()}</b></span></div>
              <div className="slip-actions">
                <button className="hb-btn" onClick={clearSlip}>Clear</button>
                <button className="hb-btn btn-chrome" onClick={placeBets}>Place Bets</button>
              </div>
            </>
          )}
        </div>
      )}
      <button className="betslip-fab" onClick={() => setOpen(o => !o)}>
        <span>Bet Slip</span><span className="count">{slip.length}</span>
      </button>
    </>
  );
}

function BetHistoryPanel({ betHistory, onClose }) {
  const isMobile = useIsMobile();
  const won = betHistory.filter(b => b.result === "won").length;
  const net = betHistory.reduce((s, b) => s + (b.pnl || 0), 0);
  const ic = s => { try { return sportIcon(s); } catch (e) { return "🎯"; } };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(0,0,0,.6)", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <style>{`
        .bh-panel{ position:fixed; top:0; right:0; bottom:0; width:400px; max-width:100vw; background:#131317;
          border-left:1px solid #2a2b31; display:flex; flex-direction:column; animation:bhIn .28s ease both; }
        .bh-panel.sheet{ left:0; width:auto; border-left:none; top:auto; max-height:82vh; border-top:1px solid #2a2b31; border-radius:16px 16px 0 0; animation:bhUp .28s ease both; }
        @keyframes bhIn{ from{ transform:translateX(40px); opacity:0;} to{ transform:none; opacity:1;} }
        @keyframes bhUp{ from{ transform:translateY(40px); opacity:0;} to{ transform:none; opacity:1;} }
        .bh-head{ display:flex; justify-content:space-between; align-items:center; padding:16px 18px; border-bottom:1px solid #2a2b31; }
        .bh-head b{ font-family:'Oswald',sans-serif; letter-spacing:.06em; text-transform:uppercase; font-size:16px; color:#f2f3f4; }
        .bh-sum{ display:flex; gap:10px; padding:12px 18px; border-bottom:1px solid #2a2b31; }
        .bh-sum div{ flex:1; border:1px solid #2a2b31; border-radius:8px; padding:9px 10px; background:#08080a; }
        .bh-sum .k{ font-size:9.5px; color:#8a8d94; text-transform:uppercase; letter-spacing:.08em; }
        .bh-sum .v{ font-family:'JetBrains Mono',monospace; font-size:15px; color:#f2f3f4; margin-top:2px; }
        .bh-list{ overflow-y:auto; flex:1; }
        .bh-row{ padding:12px 18px; border-bottom:1px solid #232428; }
        .bh-row .r1{ display:flex; justify-content:space-between; gap:8px; font-size:13.5px; font-weight:600; color:#e9eaec; }
        .bh-row .r2{ display:flex; justify-content:space-between; gap:8px; font-size:11px; color:#8a8d94; margin-top:3px; }
        .bh-pnl{ font-family:'JetBrains Mono',monospace; }
        .bh-x{ background:none; border:1px solid #2a2b31; color:#8a8d94; width:32px; height:32px; border-radius:6px; cursor:pointer; font-size:14px; }
        .bh-x:hover{ color:#fff; border-color:#9aa0a6; }
        .bh-empty{ padding:40px 18px; text-align:center; color:#8a8d94; font-size:13px; }
      `}</style>
      <div className={`bh-panel ${isMobile ? "sheet" : ""}`} onClick={e => e.stopPropagation()}>
        <div className="bh-head"><b>My Bets</b><button className="bh-x" onClick={onClose}>✕</button></div>
        <div className="bh-sum">
          <div><div className="k">Bets</div><div className="v">{betHistory.length}</div></div>
          <div><div className="k">Won</div><div className="v" style={{ color: "#3ddc84" }}>{won}</div></div>
          <div><div className="k">Net P&L</div><div className="v" style={{ color: net >= 0 ? "#3ddc84" : "#ff4f5e" }}>{net >= 0 ? "+" : "-"}₹{Math.abs(net).toLocaleString()}</div></div>
        </div>
        <div className="bh-list">
          {betHistory.length === 0 && <div className="bh-empty">No bets yet — tap odds on the board or play a casino game.</div>}
          {betHistory.map(b => (
            <div className="bh-row" key={b.id}>
              <div className="r1">
                <span>{ic(b.sport)} {b.selection}</span>
                <span className="bh-pnl" style={{ color: b.result === "won" ? "#3ddc84" : "#ff4f5e" }}>{b.pnl >= 0 ? "+" : "-"}₹{Math.abs(b.pnl).toLocaleString()}</span>
              </div>
              <div className="r2">
                <span>{b.match}{b.type ? ` · ${String(b.type).toUpperCase()}` : ""}{b.odds ? ` @ ${Number(b.odds).toFixed(2)}` : ""}</span>
                <span>{b.stake ? `₹${Number(b.stake).toLocaleString()} · ` : ""}{b.time || ""}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HukamBook() {

  const [matches, setMatches] = useState(INITIAL_MATCHES);
  const [activeSport, setActiveSport] = useState("all");
  const [slip, setSlip] = useState([]);
  const [balance, setBalance] = useState(50000);
  const [toasts, setToasts] = useState([]);
  const [activeNav, setActiveNav] = useState("exchange");
  const [aviatorOpen, setAviatorOpen] = useState(false);
  const [minesOpen, setMinesOpen] = useState(false);
  const [teenPattiOpen, setTeenPattiOpen] = useState(false);
  const [dragonTigerOpen, setDragonTigerOpen] = useState(false);
  const [andarBaharOpen, setAndarBaharOpen] = useState(false);
  const [rouletteOpen, setRouletteOpen] = useState(false);
  const [baccaratOpen, setBaccaratOpen] = useState(false);
  const [sevenUpDownOpen, setSevenUpDownOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [betHistory, setBetHistory] = useState(DEMO_HISTORY);
  const betIdRef = useRef(DEMO_HISTORY.length + 1), toastId = useRef(0);

  // Odds fluctuation
  useEffect(() => {
    const iv = setInterval(() => {
      setMatches(prev => prev.map(m => {
        if (m.status !== "live") return m;
        return {
          ...m,
          back: m.back ? m.back.map(b => ({ ...b, odds: fluctuate(b.odds) })) : m.back,
          lay: m.lay ? m.lay.map(l => ({ ...l, odds: fluctuate(l.odds) })) : m.lay,
          backB: m.backB ? m.backB.map(b => ({ ...b, odds: fluctuate(b.odds) })) : m.backB,
          layB: m.layB ? m.layB.map(l => ({ ...l, odds: fluctuate(l.odds) })) : m.layB,
          draw: m.draw ? m.draw.map(d => ({ ...d, odds: fluctuate(d.odds) })) : m.draw,
          fancy: m.fancy ? m.fancy.map(f => ({ ...f, no: fluctuateFancy(f.no, f.min, f.max - 2), yes: Math.max(fluctuateFancy(f.yes, f.min + 1, f.max), fluctuateFancy(f.no, f.min, f.max - 2) + 1) })) : m.fancy,
        };
      }));
    }, 1400);
    return () => clearInterval(iv);
  }, []);

  // ── LIVE API: fetch real match updates every 45 seconds via Claude AI ────────
  const [liveStatus, setLiveStatus] = useState("idle"); // idle | fetching | live | error
  const [lastUpdated, setLastUpdated] = useState(null);
  const [nextRefresh, setNextRefresh] = useState(45);
  const liveIntervalRef = useRef(null);
  const countdownRef = useRef(null);
  const fetchAttemptRef = useRef(0);

  const fetchLiveMatches = useCallback(async () => {
    setLiveStatus("fetching");
    fetchAttemptRef.current += 1;
    const attempt = fetchAttemptRef.current;

    // Real matches + real bookmaker odds via the HukamBook backend.
    // Tries the configured URL first, then same-origin (/api/matches) — so when
    // the backend serves this site from its /public folder, zero config is needed.
    const bases = Array.from(new Set([HUKAM_BACKEND_URL, ""]));
    for (const base of bases) {
      try {
        const res = await fetch(`${base}/api/matches`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (attempt !== fetchAttemptRef.current) return;
        if (Array.isArray(data) && data.length > 0) {
          setMatches(data);
          setLastUpdated(new Date());
          setLiveStatus("live");
          return;
        }
      } catch (e) { /* try next base */ }
    }

    if (attempt !== fetchAttemptRef.current) return;

    // Fallback: locally generated demo matches. Status pill turns red (RETRY)
    // so demo data is never mistaken for live markets.
    setMatches(generateLocalMatches());
    setLastUpdated(null);
    setLiveStatus("error");
  }, []);

  // Local match generator as fallback when all APIs unavailable
  const generateLocalMatches = () => {
    const o = (base, spread = 0.06) => {
      const r = () => Math.max(1.05, +(base + (Math.random() - 0.5) * spread).toFixed(2));
      return [
        { odds: r(), stake: `${(Math.random() * 25 + 5).toFixed(0)}K` },
        { odds: r(), stake: `${(Math.random() * 15 + 3).toFixed(0)}K` },
        { odds: r(), stake: `${(Math.random() * 8 + 1).toFixed(0)}K` }
      ];
    };
    const istTime = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
    return [
      { id: 1, sport: "cricket", league: "ODI Series • LIVE", teamA: { name: "Pakistan", short: "PAK", flag: "🇵🇰", score: `${Math.floor(Math.random() * 150 + 80)}/${Math.floor(Math.random() * 5 + 2)}`, overs: `${Math.floor(Math.random() * 15 + 20)}.${Math.floor(Math.random() * 6)} ov` }, teamB: { name: "Australia", short: "AUS", flag: "🇦🇺", score: "Yet to bat", overs: "" }, status: "live", time: istTime, info: "🔴 Pakistan vs Australia — ODI Series", back: o(1.95), lay: o(2.06), backB: o(1.88), layB: o(1.99), draw: null, markets: 38, fancy: [{ label: "PAK 10 Over Runs", no: 52, yes: 54, min: 42, max: 68 }] },
      { id: 2, sport: "cricket", league: "T20 Women's • LIVE", teamA: { name: "England W", short: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", score: `${Math.floor(Math.random() * 80 + 50)}/${Math.floor(Math.random() * 4 + 1)}`, overs: `${Math.floor(Math.random() * 8 + 8)}.${Math.floor(Math.random() * 6)} ov` }, teamB: { name: "India W", short: "IND", flag: "🇮🇳", score: "Yet to bat", overs: "" }, status: "live", time: istTime, info: "🔴 T20 Series — England vs India Women", back: o(2.10), lay: o(2.22), backB: o(1.72), layB: o(1.84), draw: null, markets: 24, fancy: [] },
      { id: 3, sport: "tennis", league: "ATP Challenger • LIVE", teamA: { name: "C. Wong", short: "WON", flag: "🎾", score: "7-6", overs: "Set 2" }, teamB: { name: "O. Tarvet", short: "TAR", flag: "🎾", score: "", overs: `4-${Math.floor(Math.random() * 3 + 4)}` }, status: "live", time: istTime, info: "🔴 ATP Challenger Birmingham", back: o(1.45), lay: o(1.56), backB: o(2.60), layB: o(2.78), draw: null, markets: 12, fancy: [] },
      { id: 4, sport: "cricket", league: "Mumbai Premier League", teamA: { name: "Sobo Falcons", short: "SOB", flag: "🦅", score: "—", overs: "" }, teamB: { name: "Arcs Andheri", short: "ARC", flag: "🔶", score: "—", overs: "" }, status: "upcoming", time: "7:00 PM IST", info: "Mumbai Premier League 2026", back: o(1.88), lay: o(2.00), backB: o(1.95), layB: o(2.08), draw: null, markets: 22, fancy: [] },
      { id: 5, sport: "tennis", league: "French Open", teamA: { name: "J. Mensik", short: "MEN", flag: "🎾", score: "", overs: "" }, teamB: { name: "J. Fonseca", short: "FON", flag: "🎾", score: "", overs: "" }, status: "upcoming", time: "11:45 PM IST", info: "French Open Men's Singles", back: o(1.72), lay: o(1.84), backB: o(2.05), layB: o(2.18), draw: null, markets: 18, fancy: [] },
      { id: 6, sport: "football", league: "Premier League", teamA: { name: "Man United", short: "MUN", flag: "🔴", score: "—", overs: "" }, teamB: { name: "Brighton", short: "BRI", flag: "🔵", score: "—", overs: "" }, status: "upcoming", time: "Tonight", info: "Premier League Fixture", back: o(2.10), lay: o(2.25), backB: o(3.40), layB: o(3.65), draw: [{ odds: 3.20, stake: "8K", side: "back" }, { odds: 3.15, stake: "5K", side: "back" }, { odds: 3.10, stake: "3K", side: "back" }, { odds: 3.25, stake: "7K", side: "lay" }, { odds: 3.30, stake: "4K", side: "lay" }, { odds: 3.35, stake: "2K", side: "lay" }], markets: 65, fancy: [] },
    ];
  };

  // Start live polling when component mounts
  useEffect(() => {
    const startCountdown = () => {
      setNextRefresh(45);
      clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setNextRefresh(n => {
          if (n <= 1) { clearInterval(countdownRef.current); return 45; }
          return n - 1;
        });
      }, 1000);
    };

    // First fetch after 2 seconds
    const initial = setTimeout(() => { fetchLiveMatches(); startCountdown(); }, 2000);
    // Then every 45 seconds
    liveIntervalRef.current = setInterval(() => { fetchLiveMatches(); startCountdown(); }, 45000);
    return () => {
      clearTimeout(initial);
      clearInterval(liveIntervalRef.current);
      clearInterval(countdownRef.current);
    };
  }, [fetchLiveMatches]);

  const addToast = useCallback((msg, type = "info") => {
    const id = ++toastId.current; setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  const removeToast = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), []);
  const addBetToHistory = useCallback((data) => {
    const id = betIdRef.current++, time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    setBetHistory(h => [{ ...data, id, time }, ...h]);
  }, []);
  const addToSlip = useCallback((match, type, odds, idx, selection) => {
    const uid = `${match.id}-${type}-${idx}-${Date.now()}`, sel = selection || (type === "back" ? match.teamA.name : match.teamB.name);
    setSlip(prev => { if (prev.length >= 8) { addToast("Max 8 bets per slip", "error"); return prev; } return [...prev, { uid, match: `${match.teamA.name} v ${match.teamB.name}`, selection: sel, type, odds, stake: "", sport: match.sport }]; });
    addToast(`${type.toUpperCase()} ${sel} @ ${odds.toFixed(2)}`, "info");
  }, [addToast]);
  const removeFromSlip = useCallback(uid => setSlip(p => p.filter(b => b.uid !== uid)), []);
  const updateStake = useCallback((uid, val) => setSlip(p => p.map(b => b.uid === uid ? { ...b, stake: val } : b)), []);
  const clearSlip = useCallback(() => setSlip([]), []);
  const placeBets = useCallback(() => {
    const ts = slip.reduce((s, b) => s + (parseFloat(b.stake) || 0), 0);
    if (ts === 0) { addToast("Enter stake amounts first", "error"); return; }
    if (ts > balance) { addToast("Insufficient balance", "error"); return; }
    setBalance(b => b - ts);
    slip.forEach(b => {
      const stake = parseFloat(b.stake) || 0; if (stake <= 0) return;
      const won = Math.random() > 0.45, pnl = won ? +(stake * (b.odds - 1)).toFixed(0) : -stake;
      if (won) setBalance(prev => prev + stake + (stake * (b.odds - 1)));
      addBetToHistory({ sport: b.sport || "cricket", match: b.match, selection: b.selection, type: b.type, odds: b.odds, stake, pnl, result: won ? "won" : "lost" });
    });
    addToast(`${slip.length} bet${slip.length > 1 ? "s" : ""} placed! ₹${ts.toLocaleString()} staked`, "success");
    setSlip([]);
  }, [slip, balance, addToast, addBetToHistory]);

  const filtered = activeSport === "all" ? matches : matches.filter(m => m.sport === activeSport);
  const totalWon = betHistory.filter(b => b.result === "won").length;
  const totalBets = betHistory.length;
  const netPnl = betHistory.reduce((s, b) => s + b.pnl, 0);

  const handleCasinoClick = (game) => {
    if (game.name === "Aviator") setAviatorOpen(true);
    else if (game.name === "Mines") setMinesOpen(true);
    else if (game.name === "3 Patti") setTeenPattiOpen(true);
    else if (game.name === "Dragon Tiger") setDragonTigerOpen(true);
    else if (game.name === "Andar Bahar") setAndarBaharOpen(true);
    else if (game.name === "Live Roulette") setRouletteOpen(true);
    else if (game.name === "Speed Baccarat") setBaccaratOpen(true);
    else if (game.name === "7 Up Down") setSevenUpDownOpen(true);
  };

  const isMobile = useIsMobile();

  // ── Derived live-record values for the chrome shell ─────────────────────────
  const liveCount = matches.filter(m => m.status === "live").length;
  const sportIconOf = s => (SPORTS.find(x => x.id === s) || {}).icon || "🏟";
  const tabsList = ["all", ...Array.from(new Set(matches.map(m => m.sport)))];
  const leaguesLive = Array.from(
    matches.reduce((map, m) => {
      const nm = (m.league || "").replace(/ • .*/, "").trim() || "League";
      const e = map.get(nm) || { nm, sport: m.sport, count: 0, live: false };
      e.count += 1; e.live = e.live || m.status === "live";
      map.set(nm, e); return map;
    }, new Map()).values()
  ).slice(0, 6);
  const tickerItems = matches.map(m => ({
    live: m.status === "live",
    txt: `${m.teamA.short || m.teamA.name} v ${m.teamB.short || m.teamB.name}`,
    odds: `${(m.back && m.back[0] ? m.back[0].odds.toFixed(2) : "—")} · ${((m.backB || m.back) && (m.backB || m.back)[0] ? (m.backB || m.back)[0].odds.toFixed(2) : "—")}`,
  }));
  const statMarkets = matches.reduce((s, m) => s + (m.markets || 0), 0);
  const lastSyncTxt = lastUpdated ? lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";
  const goNav = id => { setActiveNav(id); setMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const scrollToId = id => { setActiveNav("exchange"); setMenuOpen(false); setTimeout(() => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60); };
  const pickSport = s => { setActiveSport(s); scrollToId("hb-matches"); };
  const demoAction = label => addToast(`${label} — demo interface, no real accounts`, "info");
  const pillCls = liveStatus === "live" ? "" : liveStatus === "fetching" ? "sync" : "demo";
  const pillTxt = liveStatus === "live" ? "LIVE FEED" : liveStatus === "fetching" ? "SYNCING" : "DEMO FEED";

  return (
    <div className="hb-root">
      <style>{STYLES}</style>
      <style>{CHROME_CSS}</style>

      {/* ── HEADER ── */}
      <header className="hb-header">
        <div className="nav-wrap">
          <div className="brand" onClick={() => goNav("exchange")}>
            <div className="brand-mark">H</div>
            <div className="brand-name chrome-text">HUKAM BOOKIE<span>Live Odds &amp; Markets</span></div>
          </div>
          <nav className="links">
            <a className={activeNav === "exchange" ? "active" : ""} onClick={() => goNav("exchange")}>Live</a>
            <a onClick={() => scrollToId("hb-matches")}>Matches</a>
            <a className={activeNav === "casino" ? "active" : ""} onClick={() => goNav("casino")}>Casino</a>
            <a className={activeNav === "promotions" ? "active" : ""} onClick={() => goNav("promotions")}>Promotions</a>
            <a onClick={() => setHistoryOpen(true)}>My Bets</a>
          </nav>
          <div className="header-actions">
            <div className={`live-pill ${pillCls}`} onClick={() => liveStatus !== "fetching" && fetchLiveMatches()}
              title={lastUpdated ? `Updated ${lastSyncTxt} · click to refresh` : "Click to connect"}>
              <span className="live-dot" /><span>{pillTxt}</span>
            </div>
            <div className="balance-chip" onClick={() => setHistoryOpen(true)} title="Open My Bets">₹{balance.toLocaleString()}</div>
            <button className="hb-btn hide-m" onClick={() => demoAction("Log In")}>Log In</button>
            <button className="hb-btn btn-chrome hide-m" onClick={() => demoAction("Sign Up")}>Sign Up</button>
            <button className="menu-toggle" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">☰</button>
          </div>
        </div>
        <nav className={`mobile-nav ${menuOpen ? "open" : ""}`}>
          <a className={activeNav === "exchange" ? "active" : ""} onClick={() => goNav("exchange")}>Live</a>
          <a onClick={() => scrollToId("hb-matches")}>Matches</a>
          <a className={activeNav === "casino" ? "active" : ""} onClick={() => goNav("casino")}>Casino</a>
          <a className={activeNav === "promotions" ? "active" : ""} onClick={() => goNav("promotions")}>Promotions</a>
          <a onClick={() => { setHistoryOpen(true); setMenuOpen(false); }}>My Bets · {totalWon}W {totalBets - totalWon}L</a>
          <a onClick={() => demoAction("Log In / Sign Up")}>Log In / Sign Up</a>
        </nav>
        <div className="data-banner">
          {liveStatus === "live" && <><span className="ok">●</span><span>LIVE FEED — real bookmaker odds · updated {lastSyncTxt} · auto-refresh in {nextRefresh}s</span></>}
          {liveStatus === "fetching" && <><span className="warn">⟳</span><span>Syncing live odds from backend…</span></>}
          {liveStatus === "idle" && <span>Connecting to live odds…</span>}
          {liveStatus === "error" && <>
            <span>Backend offline — showing simulated demo odds.</span>
            <button className="banner-retry" onClick={() => fetchLiveMatches()}>↻ Retry</button>
          </>}
        </div>
        {tickerItems.length > 0 && (
          <div className="ticker">
            <div className="ticker-track">
              {[...tickerItems, ...tickerItems].map((t, i) => (
                <span className="ticker-item" key={i}>
                  {t.live && <span className="tk-live">● LIVE</span>}
                  <b>{t.txt}</b><span className="odds-mini">{t.odds}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ── SPORTSBOOK ── */}
      {activeNav === "exchange" && <>
        <section className="hero">
          <span className="eyebrow">In-Play · Pre-Match · 24/7</span>
          <h1 className="chrome-text">Every Odd.<br />Every Order.<br />HUKAM.</h1>
          <p className="sub">Live prices across cricket, football and tennis — real bookmaker odds streamed through our own backend and refreshed as the action moves.</p>
          <div className="hero-cta">
            <button className="hb-btn btn-chrome" onClick={() => scrollToId("hb-matches")}>Explore Live Markets</button>
            <button className="hb-btn" onClick={() => { setActiveSport("all"); scrollToId("hb-matches"); }}>See Today's Card</button>
          </div>
          <div className="hero-stats">
            <div onClick={() => scrollToId("hb-matches")}><div className="num chrome-text">{statMarkets || "—"}</div><div className="lbl">Live Markets</div></div>
            <div onClick={() => scrollToId("hb-leagues")}><div className="num chrome-text">{leaguesLive.length || "—"}</div><div className="lbl">Leagues Tracked</div></div>
            <div onClick={() => liveStatus !== "fetching" && fetchLiveMatches()} title="Click to refresh"><div className="num chrome-text">{lastSyncTxt}</div><div className="lbl">Last Sync</div></div>
          </div>
        </section>

        <section className="hb-block" id="hb-leagues" style={{ paddingTop: 8 }}>
          <div className="section-head">
            <div><h2>Leagues &amp; Competitions</h2><div className="sub">Tap a league to filter the board</div></div>
          </div>
          <div className="league-strip">
            {leaguesLive.map(l => (
              <div className="league-chip" key={l.nm} onClick={() => pickSport(l.sport)}>
                <div className="ic">{sportIconOf(l.sport)}</div>
                <div className="nm">{l.nm}</div>
                <div className="ct">{l.live ? "LIVE · " : ""}{l.count} match{l.count > 1 ? "es" : ""}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="hb-block" id="hb-matches" style={{ paddingTop: 12 }}>
          <div className="section-head">
            <div><h2>Live &amp; Upcoming Matches</h2><div className="sub">Odds update automatically — watch the board move</div></div>
            <div className="sub">{liveCount} live now</div>
          </div>
          <div className="tabs">
            {tabsList.map(s => (
              <div key={s} className={`hb-tab ${activeSport === s ? "active" : ""}`} onClick={() => setActiveSport(s)}>
                {s === "all" ? "All Sports" : `${sportIconOf(s)} ${s}`}
              </div>
            ))}
          </div>
          <div className="match-grid">
            {filtered.length === 0 && <div className="empty-note">No {activeSport} matches in the current feed — try another tab or hit Retry above.</div>}
            {filtered.map(m => <ChromeCard key={m.id} match={m} addToSlip={addToSlip} />)}
          </div>
        </section>
      </>}

      <div style={{ background: "var(--black-void, #08080a)" }}>
        {/* CASINO */}
        {activeNav === "casino" && (
          <div style={{ padding: isMobile ? "20px 14px 36px" : "28px 24px 44px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
              <div style={{ width: 3, height: 18, background: "linear-gradient(180deg,#FFFFFF,#00A8E1)", borderRadius: 2 }} />
              <span style={{ fontFamily: "Cinzel,serif", fontSize: 13, letterSpacing: 3, color: "#F1F1F1", fontWeight: 600, textTransform: "uppercase" }}>Live Casino</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(auto-fill,minmax(150px,1fr))" : "repeat(auto-fill,minmax(190px,1fr))", gap: isMobile ? 10 : 14 }}>
              {CASINO_GAMES.map((g, i) => (
                <div key={g.id} onClick={() => handleCasinoClick(g)}
                  style={{ background: "#1F2F3D", border: `1px solid ${g.playable ? "rgba(0,168,225,0.2)" : "#2C3E50"}`, borderRadius: 12, overflow: "hidden", cursor: "pointer", transition: "all 0.28s cubic-bezier(0.22,1,0.36,1)", animation: `cardIn 0.5s ${i * 0.07}s both` }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.boxShadow = "0 12px 36px rgba(0,0,0,0.4)"; const ov = e.currentTarget.querySelector(".ghov"); if (ov) ov.style.opacity = "1"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; const ov = e.currentTarget.querySelector(".ghov"); if (ov) ov.style.opacity = "0"; }}>
                  <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, position: "relative", background: i % 2 === 0 ? "linear-gradient(135deg,#0F171E,#1A242F)" : "linear-gradient(135deg,#151F27,#1A242F)" }}>
                    {g.icon}
                    <div className="ghov" style={{ position: "absolute", inset: 0, background: "rgba(11,16,20,0.82)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s", fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: g.playable ? "#00A8E1" : "#5F7580", textTransform: "uppercase" }}>
                      {g.playable ? "▶ Play Now" : "Coming Soon"}
                    </div>
                    <span style={{ position: "absolute", top: 8, right: 8, fontSize: 8.5, fontWeight: 700, letterSpacing: 1, padding: "2px 7px", borderRadius: 100, textTransform: "uppercase", background: g.badge === "hot" ? "rgba(232,68,90,0.15)" : g.badge === "new" ? "rgba(0,168,225,0.1)" : "rgba(255,255,255,0.1)", color: g.badge === "hot" ? "#E8445A" : g.badge === "new" ? "#00A8E1" : "#FFFFFF", border: `1px solid ${g.badge === "hot" ? "rgba(232,68,90,0.3)" : g.badge === "new" ? "rgba(0,168,225,0.25)" : "rgba(255,255,255,0.25)"}` }}>
                      {g.badge}
                    </span>
                    {g.playable && <span style={{ position: "absolute", bottom: 8, left: 8, fontSize: 8, fontWeight: 800, padding: "2px 7px", borderRadius: 100, background: "rgba(6,214,160,0.15)", color: "#06d6a0", border: "1px solid rgba(6,214,160,0.3)", letterSpacing: 1, textTransform: "uppercase" }}>PLAYABLE</span>}
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: g.playable ? "#F1F1F1" : "#8197A4" }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: "#5F7580", marginTop: 4 }}>{g.players} playing</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROMOTIONS */}
        {activeNav === "promotions" && (
          <div style={{ padding: isMobile ? "20px 14px 36px" : "28px 24px 44px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
              <div style={{ width: 3, height: 18, background: "linear-gradient(180deg,#FFFFFF,#00A8E1)", borderRadius: 2 }} />
              <span style={{ fontFamily: "Cinzel,serif", fontSize: 13, letterSpacing: 3, color: "#F1F1F1", fontWeight: 600, textTransform: "uppercase" }}>Promotions</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }}>
              {[
                { title: "Welcome Bonus", sub: "100% up to ₹10,000", tag: "New Users", color: "#00A8E1", bg: "rgba(0,168,225,0.06)", border: "rgba(0,168,225,0.2)" },
                { title: "IPL Special", sub: "Enhanced odds on every IPL match", tag: "Cricket", color: "#FFFFFF", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.18)" },
                { title: "Cashback Tuesday", sub: "5% cashback on all losses", tag: "Weekly", color: "#3DAAEE", bg: "rgba(61,170,238,0.05)", border: "rgba(61,170,238,0.18)" },
              ].map((p, i) => (
                <div key={i} style={{ background: p.bg, border: `1px solid ${p.border}`, borderRadius: 14, padding: "28px", cursor: "pointer", transition: "all 0.25s", animation: `cardIn 0.5s ${i * 0.1}s both` }} onClick={() => addToast(`${p.title} — claimed! (demo promo)`, "success")} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                  <div style={{ fontSize: 9.5, color: p.color, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>{p.tag}</div>
                  <div style={{ fontFamily: "Cinzel,serif", fontSize: 22, color: "#F1F1F1", letterSpacing: 1, marginBottom: 6 }}>{p.title}</div>
                  <div style={{ fontSize: 13, color: "#8197A4" }}>{p.sub}</div>
                  <div style={{ marginTop: 20, fontSize: 11, color: p.color, fontWeight: 700, letterSpacing: 1.2 }}>CLAIM NOW →</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <footer className="hb-footer">
        <div className="foot-wrap">
          <div>
            <div className="brand" style={{ marginBottom: 14 }}>
              <div className="brand-mark" style={{ width: 30, height: 30, fontSize: 14 }}>H</div>
              <div className="brand-name chrome-text" style={{ fontSize: 15 }}>HUKAM BOOKIE</div>
            </div>
            <p style={{ maxWidth: 320, lineHeight: 1.6, margin: 0 }}>The thrill isn't just in winning.<br />It's in predicting the impossible before everyone else.</p>
          </div>
          <div>
            <h4>Sports</h4>
            <a onClick={() => pickSport("cricket")}>Cricket</a>
            <a onClick={() => pickSport("football")}>Football</a>
            <a onClick={() => pickSport("tennis")}>Tennis</a>
            <a onClick={() => goNav("casino")}>Casino</a>
          </div>
          <div>
            <h4>Company</h4>
            <a onClick={() => demoAction("About")}>About</a>
            <a onClick={() => demoAction("Careers")}>Careers</a>
            <a onClick={() => demoAction("Affiliates")}>Affiliates</a>
          </div>
          <div>
            <h4>Support</h4>
            <a onClick={() => demoAction("Help Centre")}>Help Centre</a>
            <a onClick={() => demoAction("Responsible Gambling")}>Responsible Gambling</a>
            <a onClick={() => setHistoryOpen(true)}>My Bets</a>
          </div>
        </div>
        <div className="foot-bottom">
          <div className="age-badge">18+ &nbsp;Please gamble responsibly</div>
        </div>
      </footer>

      {/* OVERLAYS */}
      {aviatorOpen && <AviatorGame balance={balance} setBalance={setBalance} addToast={addToast} addBetToHistory={addBetToHistory} onClose={() => setAviatorOpen(false)} />}
      {minesOpen && <MinesGame balance={balance} setBalance={setBalance} addToast={addToast} addBetToHistory={addBetToHistory} onClose={() => setMinesOpen(false)} />}
      {teenPattiOpen && <TeenPattiGame balance={balance} setBalance={setBalance} addToast={addToast} addBetToHistory={addBetToHistory} onClose={() => setTeenPattiOpen(false)} />}
      {dragonTigerOpen && <DragonTigerGame balance={balance} setBalance={setBalance} addToast={addToast} addBetToHistory={addBetToHistory} onClose={() => setDragonTigerOpen(false)} />}
      {andarBaharOpen && <AndarBaharGame balance={balance} setBalance={setBalance} addToast={addToast} addBetToHistory={addBetToHistory} onClose={() => setAndarBaharOpen(false)} />}
      {rouletteOpen && <RouletteGame balance={balance} setBalance={setBalance} addToast={addToast} addBetToHistory={addBetToHistory} onClose={() => setRouletteOpen(false)} />}
      {baccaratOpen && <BaccaratGame balance={balance} setBalance={setBalance} addToast={addToast} addBetToHistory={addBetToHistory} onClose={() => setBaccaratOpen(false)} />}
      {sevenUpDownOpen && <SevenUpDownGame balance={balance} setBalance={setBalance} addToast={addToast} addBetToHistory={addBetToHistory} onClose={() => setSevenUpDownOpen(false)} />}
      {historyOpen && <BetHistoryPanel betHistory={betHistory} onClose={() => setHistoryOpen(false)} />}
      <BettingSlip slip={slip} removeFromSlip={removeFromSlip} updateStake={updateStake} placeBets={placeBets} clearSlip={clearSlip} />
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
