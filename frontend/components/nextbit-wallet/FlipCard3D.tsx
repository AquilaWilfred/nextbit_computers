"use client";

import { FC, useState, useRef, useEffect, useCallback } from 'react';
import { Copy, Eye, EyeOff, Lock, Unlock, Loader2 } from 'lucide-react';
import { VirtualCard } from '@/types/nextbit-wallet/cards.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FlipCard3DProps {
  card: VirtualCard;
  balance: number;
  cardholderName: string;
  redeemablePoints?: number;
  onToggleFreeze: () => void;
  onCopy: (text: string, label: string) => void;
  toggling: boolean;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const CARD_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700&family=Share+Tech+Mono&family=Rajdhani:wght@300;400;500;600;700&display=swap');

  /* ── wrapper: full width, cards centered with fluid gap ── */
  .nb-cards-wrap {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: clamp(30px, 10vw, 100px);
    width: 100%;
    justify-content: center;
    padding: 12px 0 20px;
    box-sizing: border-box;
  }

  /* ── column: scene + label/controls stacked ── */
  .nb-card-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }

  /* ── 3-D scene ── */
  .nb-scene {
    width: clamp(280px, 38vw, 400px);
    aspect-ratio: 85.6 / 54;        /* ISO 7810 ID-1 exact ratio */
    perspective: 1200px;
    cursor: pointer;
    user-select: none;
    flex-shrink: 0;
    position: relative;
  }

  /* ── card flipper ── */
  .nb-card-3d {
    width: 100%;
    height: 100%;
    position: relative;
    transform-style: preserve-3d;
    transition: transform .8s cubic-bezier(.35, 0, .15, 1);
  }
  .nb-card-3d.flipped { transform: rotateY(180deg); }

  /* ── face shared ── */
  .nb-face {
    position: absolute;
    inset: 0;
    border-radius: 18px;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    overflow: hidden;
  }

  /* ══════════════════════════════════════
     VISA CARD — deep space navy / cyan
  ══════════════════════════════════════ */
  .nb-face-visa-front {
    background:
      radial-gradient(ellipse 80% 60% at 70% -10%, rgba(0,100,255,.22) 0%, transparent 60%),
      radial-gradient(ellipse 60% 50% at -10% 90%, rgba(0,210,255,.14) 0%, transparent 55%),
      linear-gradient(145deg, #080d1f 0%, #0c1e3d 30%, #091526 60%, #110a28 100%);
    box-shadow:
      0 30px 70px rgba(0,0,0,.65),
      0 0 0 .6px rgba(0,200,255,.22),
      inset 0 1.5px 0 rgba(0,230,255,.14),
      inset 0 -1px 0 rgba(0,0,0,.4);
  }
  .nb-face-visa-back {
    background: linear-gradient(150deg, #080c1e 0%, #0b1c38 40%, #0e0b22 100%);
    transform: rotateY(180deg);
    box-shadow:
      0 30px 70px rgba(0,0,0,.65),
      0 0 0 .6px rgba(0,200,255,.18);
  }

  /* ══════════════════════════════════════
     POINTS CARD — deep forest / emerald
  ══════════════════════════════════════ */
  .nb-face-pts-front {
    background:
      radial-gradient(ellipse 70% 55% at 65% -5%, rgba(0,200,80,.18) 0%, transparent 55%),
      radial-gradient(ellipse 55% 45% at -5% 95%, rgba(0,255,120,.1) 0%, transparent 50%),
      linear-gradient(145deg, #060e08 0%, #091e0e 30%, #051408 60%, #081a08 100%);
    box-shadow:
      0 30px 70px rgba(0,0,0,.65),
      0 0 0 .6px rgba(0,220,120,.2),
      inset 0 1.5px 0 rgba(0,255,140,.1),
      inset 0 -1px 0 rgba(0,0,0,.4);
  }
  .nb-face-pts-back {
    background: linear-gradient(150deg, #050c06 0%, #081a0c 40%, #050e06 100%);
    transform: rotateY(180deg);
    box-shadow:
      0 30px 70px rgba(0,0,0,.65),
      0 0 0 .6px rgba(0,220,120,.16);
  }

  /* ── fine grid ── */
  .nb-grid-overlay {
    position: absolute;
    inset: 0;
    border-radius: 18px;
    background-image:
      linear-gradient(rgba(0,210,255,.018) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,210,255,.018) 1px, transparent 1px);
    background-size: 22px 22px;
    pointer-events: none;
  }
  .nb-grid-overlay.pts {
    background-image:
      linear-gradient(rgba(0,255,140,.018) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,255,140,.018) 1px, transparent 1px);
  }

  /* ── diagonal light sweep ── */
  .nb-sheen {
    position: absolute;
    inset: 0;
    border-radius: 18px;
    background: linear-gradient(
      115deg,
      transparent 30%,
      rgba(255,255,255,.028) 50%,
      transparent 70%
    );
    pointer-events: none;
  }

  /* ── holo orb ── */
  .nb-holo-orb {
    position: absolute;
    width: 90px; height: 90px;
    border-radius: 50%;
    background: conic-gradient(from 0deg,
      rgba(0,200,255,.20),
      rgba(0,80,255,.16),
      rgba(0,200,200,.18),
      rgba(60,0,255,.14),
      rgba(0,200,255,.20));
    filter: blur(16px);
    top: -18px; right: -18px;
    animation: nbHoloSpin 9s linear infinite;
    opacity: .55;
    pointer-events: none;
  }
  .nb-holo-orb.pts {
    background: conic-gradient(from 0deg,
      rgba(0,255,140,.20),
      rgba(0,180,60,.16),
      rgba(60,255,100,.18),
      rgba(0,220,80,.14),
      rgba(0,255,140,.20));
  }
  @keyframes nbHoloSpin { to { transform: rotate(360deg); } }

  /* ── EMV chip ── */
  .nb-chip-wrap {
    position: absolute;
    top: 18%; left: 6%;
    width: 13%; aspect-ratio: 4/3;
    min-width: 36px;
    background: linear-gradient(145deg, #b8922a, #e8c84a, #966a14, #d4ac2e, #f4d860);
    border-radius: 5px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 6px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.25);
  }
  .nb-chip-inner {
    width: 78%; height: 78%;
    display: grid;
    grid-template-columns: repeat(3,1fr);
    grid-template-rows: repeat(3,1fr);
    gap: 1.5px;
    border-radius: 2px;
    overflow: hidden;
  }
  .nb-chip-cell {
    background: rgba(0,0,0,.12);
    border: .5px solid rgba(0,0,0,.2);
  }
  .nb-chip-center { background: rgba(0,0,0,.28); }

  /* ── contactless icon ── */
  .nb-nfc {
    position: absolute;
    top: 20%; right: 6%;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 2px;
    opacity: .35;
    pointer-events: none;
  }
  .nb-nfc-arc {
    border: 1.5px solid currentColor;
    border-radius: 50%;
    border-left-color: transparent;
    border-bottom-color: transparent;
    transform: rotate(45deg);
  }

  /* ── card number / balance area ── */
  .nb-balance-area {
    position: absolute;
    top: 12px; right: 14px;
    text-align: right;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 8px;
    transition: background .2s;
  }
  .nb-balance-area:hover { background: rgba(0,200,255,.07); }
  .nb-balance-area.pts:hover { background: rgba(0,255,140,.07); }

  /* ── mag stripe (back) ── */
  .nb-mag-stripe {
    position: absolute;
    top: 14%; left: 0; right: 0;
    height: 18%;
    background: linear-gradient(90deg,
      #181818 0%, #0c0c0c 30%, #141414 60%, #0a0a0a 80%, #181818 100%);
    box-shadow: 0 2px 8px rgba(0,0,0,.4);
  }

  /* ── signature panel (back) ── */
  .nb-sig-panel {
    position: absolute;
    top: 42%; left: 5%; right: 5%;
    height: 17%;
    background: repeating-linear-gradient(
      90deg,
      #ede8e0 0px, #ede8e0 7px,
      #ddd8d0 7px, #ddd8d0 14px
    );
    border-radius: 4px;
    display: flex; align-items: center; justify-content: flex-end;
    padding-right: 3%;
    gap: 8px;
    box-shadow: inset 0 1px 2px rgba(0,0,0,.12);
  }

  /* ── holographic sticker (back) ── */
  .nb-holo-sticker {
    position: absolute;
    top: 42%; right: 5%;
    width: 14%; aspect-ratio: 1.2;
    min-width: 38px;
    border-radius: 5px;
    background: conic-gradient(from 0deg,
      #ff006688,#ff660088,#ffcc0088,#00ff8888,#0088ff88,#8800ff88,#ff006688);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
    animation: nbHoloColor 3s linear infinite;
    border: .5px solid rgba(255,255,255,.3);
    box-shadow: 0 2px 8px rgba(0,0,0,.35);
  }
  @keyframes nbHoloColor {
    0%   { filter: hue-rotate(0deg) brightness(1); }
    50%  { filter: hue-rotate(180deg) brightness(1.1); }
    100% { filter: hue-rotate(360deg) brightness(1); }
  }

  /* ── frozen overlay ── */
  .nb-frozen { filter: grayscale(.75) brightness(.55) saturate(.3); }
  .nb-frozen::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 18px;
    background: rgba(30,50,100,.18);
    backdrop-filter: blur(.5px);
    pointer-events: none;
  }

  /* ── selected ring ── */
  .nb-selected-ring {
    position: absolute;
    inset: -3px;
    border-radius: 21px;
    box-shadow:
      0 0 0 2.5px rgba(0,210,255,.75),
      0 0 22px rgba(0,180,255,.3),
      0 0 45px rgba(0,100,255,.12);
    pointer-events: none;
    z-index: 10;
    animation: nbRingPulse 2.5s ease-in-out infinite;
  }
  .nb-selected-ring.pts {
    box-shadow:
      0 0 0 2.5px rgba(0,255,140,.75),
      0 0 22px rgba(0,220,100,.3),
      0 0 45px rgba(0,180,60,.12);
  }
  @keyframes nbRingPulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: .7; }
  }

  /* ── points badge ── */
  .nb-pts-badge {
    position: absolute;
    top: 13px; left: calc(13% + 12px);
    background: rgba(0,255,140,.1);
    border: .5px solid rgba(0,255,140,.3);
    border-radius: 20px;
    padding: 2px 10px;
    font-size: clamp(7px, 1.2vw, 9px);
    font-family: 'Rajdhani', sans-serif;
    font-weight: 600;
    letter-spacing: 1.8px;
    text-transform: uppercase;
    color: rgba(0,255,140,.75);
  }

  /* ── controls strip ── */
  .nb-controls {
    display: flex;
    gap: 8px;
    width: clamp(280px, 38vw, 400px);
    flex-wrap: wrap;
  }
  .nb-btn {
    flex: 1;
    min-width: 72px;
    background: rgba(12, 16, 32, .7);
    border: .7px solid rgba(90, 120, 180, .3);
    color: #b8cce4;
    padding: 9px 6px;
    border-radius: 12px;
    font-size: clamp(10px, 1.3vw, 12px);
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
    transition: background .18s, border-color .2s, color .18s, transform .1s;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: .6px;
    white-space: nowrap;
    backdrop-filter: blur(6px);
  }
  .nb-btn:hover {
    background: rgba(22, 36, 80, .8);
    border-color: rgba(100, 150, 230, .5);
    transform: translateY(-1px);
  }
  .nb-btn:active { transform: translateY(0); }

  /* freeze — white/red alert */
  .nb-btn.freeze {
    background: rgba(255, 255, 255, .96);
    border-color: rgba(220, 20, 20, .7);
    color: #cc0000;
  }
  .nb-btn.freeze:hover {
    background: rgba(180, 0, 0, .9);
    border-color: rgba(220, 0, 0, .8);
    color: #ffffff;
  }

  /* unfreeze — blue tint */
  .nb-btn.unfreeze {
    background: rgba(8, 22, 70, .65);
    border-color: rgba(50, 100, 230, .35);
    color: #80aaf0;
  }
  .nb-btn.unfreeze:hover {
    background: rgba(14, 36, 110, .8);
    border-color: rgba(80, 130, 255, .5);
  }

  .nb-btn:disabled { opacity: .4; cursor: not-allowed; transform: none !important; }

  /* points card controls — emerald accent */
  .nb-btn.pts {
    background: rgba(6, 18, 10, .7);
    border-color: rgba(0, 170, 80, .3);
    color: #60d89a;
  }
  .nb-btn.pts:hover {
    background: rgba(0, 28, 14, .85);
    border-color: rgba(0, 200, 100, .5);
    color: #80eaaa;
  }

  /* ── "click to select" label ── */
  .nb-select-hint {
    font-size: clamp(10px, 1.5vw, 13px);
    color: rgba(160, 180, 220, .55);
    letter-spacing: 1.8px;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 500;
    text-transform: uppercase;
    cursor: pointer;
  }
  .nb-select-hint.pts { color: rgba(0, 200, 100, .45); }

  /* ── responsive ── */
  @media (max-width: 720px) {
    .nb-cards-wrap {
      flex-direction: column;
      align-items: center;
      gap: 28px;
      padding: 8px 16px 24px;
    }
    .nb-scene,
    .nb-controls {
      width: min(340px, 90vw);
    }
  }
`;

// ─── Card back face ───────────────────────────────────────────────────────────

const CardBack: FC<{ cvv: string; variant: 'visa' | 'pts' }> = ({ cvv, variant }) => {
  const [showCvv, setShowCvv] = useState(false);
  const isVisa = variant === 'visa';

  return (
    <div className={`nb-face ${isVisa ? 'nb-face-visa-back' : 'nb-face-pts-back'}`}>
      <div className={`nb-grid-overlay${isVisa ? '' : ' pts'}`} />
      <div className="nb-sheen" />
      <div className="nb-mag-stripe" />

      <div className="nb-sig-panel">
        <span style={{
          fontFamily: "'Rajdhani',sans-serif", fontSize: 9, fontWeight: 600,
          letterSpacing: 1.2, textTransform: 'uppercase', color: '#555', marginRight: 4,
        }}>CVV</span>
        <div
          style={{
            background: 'white', padding: '3px 12px', borderRadius: 3,
            fontFamily: "'Share Tech Mono',monospace", fontSize: 14, color: '#111',
            letterSpacing: 2.5, fontWeight: 700, minWidth: 46, textAlign: 'center',
            cursor: 'pointer', boxShadow: 'inset 0 1px 3px rgba(0,0,0,.12)',
          }}
          onClick={e => { e.stopPropagation(); setShowCvv(v => !v); }}
        >
          {showCvv ? cvv : '•••'}
        </div>
      </div>

      <div className="nb-holo-sticker">◈</div>

      {/* Issuer watermark on back */}
      <div style={{
        position: 'absolute', bottom: '14%', right: '5%',
        fontFamily: isVisa ? "'Rajdhani',sans-serif" : "'Orbitron',monospace",
        fontSize: isVisa ? 18 : 10,
        fontWeight: 700,
        fontStyle: isVisa ? 'italic' : 'normal',
        letterSpacing: isVisa ? -0.5 : 1.5,
        background: isVisa
          ? 'linear-gradient(135deg,rgba(26,110,247,.6),rgba(0,242,255,.55))'
          : 'linear-gradient(135deg,rgba(0,200,100,.6),rgba(0,255,160,.55))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        opacity: .7,
      }}>
        {isVisa ? 'VISA' : 'NEXTBIT'}
      </div>

      {/* Back-face instruction */}
      <div style={{
        position: 'absolute', bottom: '8%', left: '5%',
        fontFamily: "'Rajdhani',sans-serif", fontSize: 8,
        color: isVisa ? 'rgba(0,200,255,.3)' : 'rgba(0,200,100,.3)',
        letterSpacing: 1.2, textTransform: 'uppercase',
      }}>
        Tap CVV to reveal · Click card to flip
      </div>
    </div>
  );
};

// ─── Visa Card ────────────────────────────────────────────────────────────────

interface VisaCardProps {
  card: VirtualCard;
  balance: number;
  cardholderName: string;
  onCopy: (text: string, label: string) => void;
  onToggleFreeze: () => void;
  toggling: boolean;
  selected: boolean;
  onSelect: () => void;
}

const VisaCard: FC<VisaCardProps> = ({
  card, balance, cardholderName, onCopy, onToggleFreeze, toggling, selected, onSelect,
}) => {
  const [flipped, setFlipped] = useState(false);
  const [showNumber, setShowNumber] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const balanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maskedNumber = card.cardNumber.replace(/(\d{4}) (\d{4}) (\d{4}) (\d{4})/, '$1 •••• •••• $4');
  const displayNumber = showNumber ? card.cardNumber : maskedNumber;

  const revealBalance = useCallback(() => {
    setShowBalance(true);
    if (balanceTimer.current) clearTimeout(balanceTimer.current);
    balanceTimer.current = setTimeout(() => setShowBalance(false), 3000);
  }, []);

  useEffect(() => () => { if (balanceTimer.current) clearTimeout(balanceTimer.current); }, []);

  const handleSceneClick = () => {
    if (!selected) { onSelect(); return; }
    setFlipped(f => !f);
  };

  const isFrozen = card.status === 'frozen';

  return (
    <div className="nb-card-col">
      <div
        className={`nb-scene${isFrozen ? ' nb-frozen' : ''}`}
        onClick={handleSceneClick}
        title={selected ? 'Click to flip' : 'Click to select'}
        style={{ position: 'relative' }}
      >
        {/* Selected glow ring outside the 3D scene */}
        {selected && <div className="nb-selected-ring" />}

        <div className={`nb-card-3d${flipped ? ' flipped' : ''}`}>
          {/* ── FRONT ── */}
          <div className="nb-face nb-face-visa-front">
            <div className="nb-grid-overlay" />
            <div className="nb-sheen" />
            <div className="nb-holo-orb" />

            {/* Chip */}
            <div className="nb-chip-wrap">
              <div className="nb-chip-inner">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className={`nb-chip-cell${i === 4 ? ' nb-chip-center' : ''}`} />
                ))}
              </div>
            </div>

            {/* Contactless icon */}
            <div className="nb-nfc" style={{ color: 'rgba(0,210,255,.6)', top: '20%', right: '22%' }}>
              {[10, 16, 22].map(s => (
                <div key={s} className="nb-nfc-arc" style={{ width: s, height: s }} />
              ))}
            </div>

            {/* Balance reveal */}
            <div
              className="nb-balance-area"
              onMouseEnter={revealBalance}
              onMouseLeave={() => { if (balanceTimer.current) clearTimeout(balanceTimer.current); setShowBalance(false); }}
              onClick={e => e.stopPropagation()}
              title="Hover to reveal balance"
            >
              <div style={{
                fontFamily: "'Rajdhani',sans-serif", fontSize: 'clamp(7px,1.1vw,8px)',
                letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(0,210,255,.4)',
              }}>Balance</div>
              {showBalance
                ? <div style={{
                    fontFamily: "'Orbitron',monospace", fontSize: 'clamp(10px,1.6vw,13px)',
                    fontWeight: 600, color: '#00e8ff', letterSpacing: 1,
                  }}>KES {balance.toLocaleString()}</div>
                : <div style={{
                    fontFamily: "'Share Tech Mono',monospace", fontSize: 'clamp(10px,1.6vw,13px)',
                    color: 'rgba(0,210,255,.4)', letterSpacing: 2,
                  }}>•••••••</div>
              }
            </div>

            {/* Card number */}
            <div style={{
              fontFamily: "'Share Tech Mono',monospace",
              fontSize: 'clamp(11px,2vw,16px)',
              letterSpacing: 'clamp(2px,0.5vw,4px)',
              color: 'rgba(210,230,255,.9)',
              position: 'absolute', bottom: '28%', left: '5%', right: '5%',
              textShadow: '0 1px 8px rgba(0,180,255,.25)',
            }}>
              {displayNumber}
            </div>

            {/* Cardholder */}
            <div style={{
              fontFamily: "'Rajdhani',sans-serif", fontSize: 'clamp(9px,1.5vw,12px)',
              fontWeight: 600, letterSpacing: 2.5, textTransform: 'uppercase',
              color: 'rgba(160,200,240,.75)',
              position: 'absolute', bottom: '9%', left: '5%',
            }}>
              {cardholderName.toUpperCase()}
            </div>

            {/* Valid Thru */}
            <div style={{ position: 'absolute', bottom: '18%', right: '18%', textAlign: 'right' }}>
              <div style={{
                fontFamily: "'Rajdhani',sans-serif", fontSize: 'clamp(6px,1vw,7px)',
                letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(130,180,220,.45)',
              }}>Valid Thru</div>
              <div style={{
                fontFamily: "'Share Tech Mono',monospace", fontSize: 'clamp(10px,1.6vw,13px)',
                letterSpacing: 2, color: 'rgba(160,200,240,.75)',
              }}>
                {card.expiryMonth}/{card.expiryYear}
              </div>
            </div>

            {/* VISA logo */}
            <div style={{
              fontFamily: "'Rajdhani',sans-serif", fontWeight: 700,
              fontSize: 'clamp(18px,3.5vw,28px)',
              fontStyle: 'italic', position: 'absolute', bottom: '8%', right: '4%',
              letterSpacing: -1,
              background: 'linear-gradient(135deg, #1a6ef7 0%, #00d4ff 50%, #ffffff 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 8px rgba(0,180,255,.4))',
            }}>
              VISA
            </div>
          </div>

          <CardBack cvv={card.cvv} variant="visa" />
        </div>
      </div>

      {/* Controls — shown when selected */}
      {selected ? (
        <div className="nb-controls">
          <button className="nb-btn" onClick={() => onCopy(card.cardNumber, 'Card number')}>
            <Copy size={13} /> Copy
          </button>
          <button className="nb-btn" onClick={() => setShowNumber(v => !v)}>
            {showNumber ? <EyeOff size={13} /> : <Eye size={13} />}
            {showNumber ? 'Hide' : 'Reveal'}
          </button>
          <button
            className={`nb-btn ${isFrozen ? 'unfreeze' : 'freeze'}`}
            onClick={onToggleFreeze}
            disabled={toggling}
          >
            {toggling
              ? <Loader2 size={13} className="animate-spin" />
              : isFrozen ? <Unlock size={13} /> : <Lock size={13} />}
            {toggling ? 'Processing…' : isFrozen ? 'Unfreeze' : 'Freeze'}
          </button>
        </div>
      ) : (
        <div className="nb-select-hint" onClick={onSelect}>▸ Select card</div>
      )}
    </div>
  );
};

// ─── Points Card ──────────────────────────────────────────────────────────────

interface PointsCardProps {
  card: VirtualCard;
  cardholderName: string;
  redeemablePoints: number;
  onCopy: (text: string, label: string) => void;
  selected: boolean;
  onSelect: () => void;
}

const PointsCard: FC<PointsCardProps> = ({
  card, cardholderName, redeemablePoints, onCopy, selected, onSelect,
}) => {
  const [flipped, setFlipped] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const pointsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const revealPoints = useCallback(() => {
    setShowPoints(true);
    if (pointsTimer.current) clearTimeout(pointsTimer.current);
    pointsTimer.current = setTimeout(() => setShowPoints(false), 3000);
  }, []);

  useEffect(() => () => { if (pointsTimer.current) clearTimeout(pointsTimer.current); }, []);

  const handleSceneClick = () => {
    if (!selected) { onSelect(); return; }
    setFlipped(f => !f);
  };

  return (
    <div className="nb-card-col">
      <div
        className="nb-scene"
        onClick={handleSceneClick}
        title={selected ? 'Click to flip' : 'Click to select'}
        style={{ position: 'relative' }}
      >
        {selected && <div className="nb-selected-ring pts" />}

        <div className={`nb-card-3d${flipped ? ' flipped' : ''}`}>
          {/* ── FRONT ── */}
          <div className="nb-face nb-face-pts-front">
            <div className="nb-grid-overlay pts" />
            <div className="nb-sheen" />
            <div className="nb-holo-orb pts" />

            {/* Chip */}
            <div className="nb-chip-wrap">
              <div className="nb-chip-inner">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className={`nb-chip-cell${i === 4 ? ' nb-chip-center' : ''}`} />
                ))}
              </div>
            </div>

            {/* Rewards badge */}
            <div className="nb-pts-badge">Rewards</div>

            {/* Contactless icon */}
            <div className="nb-nfc" style={{ color: 'rgba(0,230,120,.5)', top: '20%', right: '22%' }}>
              {[10, 16, 22].map(s => (
                <div key={s} className="nb-nfc-arc" style={{ width: s, height: s }} />
              ))}
            </div>

            {/* Points hover/tap reveal */}
            <div
              className="nb-balance-area pts"
              onMouseEnter={revealPoints}
              onMouseLeave={() => { if (pointsTimer.current) clearTimeout(pointsTimer.current); setShowPoints(false); }}
              onClick={e => { e.stopPropagation(); revealPoints(); }}
              title="Hover to reveal points"
            >
              <div style={{
                fontFamily: "'Rajdhani',sans-serif", fontSize: 'clamp(7px,1.1vw,8px)',
                letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(0,230,120,.4)',
              }}>Points</div>
              {showPoints
                ? <div style={{
                    fontFamily: "'Orbitron',monospace", fontSize: 'clamp(10px,1.6vw,13px)',
                    fontWeight: 600, color: '#00ff9a', letterSpacing: 1,
                  }}>{redeemablePoints.toLocaleString()} pts</div>
                : <div style={{
                    fontFamily: "'Share Tech Mono',monospace", fontSize: 'clamp(10px,1.6vw,13px)',
                    color: 'rgba(0,220,120,.4)', letterSpacing: 2,
                  }}>•••••••</div>
              }
            </div>

            {/* Big points display centre */}
            <div style={{ position: 'absolute', bottom: '32%', left: '5%', right: '5%' }}>
              <div style={{
                fontFamily: "'Rajdhani',sans-serif", fontSize: 'clamp(7px,1.1vw,8px)',
                letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(0,180,80,.4)',
                marginBottom: 3,
              }}>Redeemable Points</div>
              <div style={{
                fontFamily: "'Orbitron',monospace", fontSize: 'clamp(18px,3.5vw,28px)',
                fontWeight: 700, color: 'rgba(0,255,140,.85)',
                letterSpacing: 2, lineHeight: 1,
                textShadow: '0 0 20px rgba(0,255,120,.35)',
              }}>
                {redeemablePoints.toLocaleString()}
              </div>
              <div style={{
                fontFamily: "'Rajdhani',sans-serif", fontSize: 'clamp(8px,1.3vw,10px)',
                letterSpacing: 1.8, color: 'rgba(0,170,70,.5)', marginTop: 2,
              }}>PTS</div>
            </div>

            {/* Cardholder */}
            <div style={{
              fontFamily: "'Rajdhani',sans-serif", fontSize: 'clamp(9px,1.5vw,12px)',
              fontWeight: 600, letterSpacing: 2.5, textTransform: 'uppercase',
              color: 'rgba(0,210,110,.65)',
              position: 'absolute', bottom: '9%', left: '5%',
            }}>
              {cardholderName.toUpperCase()}
            </div>

            {/* Valid Thru */}
            <div style={{ position: 'absolute', bottom: '18%', right: '18%', textAlign: 'right' }}>
              <div style={{
                fontFamily: "'Rajdhani',sans-serif", fontSize: 'clamp(6px,1vw,7px)',
                letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(0,160,60,.38)',
              }}>Valid Thru</div>
              <div style={{
                fontFamily: "'Share Tech Mono',monospace", fontSize: 'clamp(10px,1.6vw,13px)',
                letterSpacing: 2, color: 'rgba(0,210,110,.6)',
              }}>
                {card.expiryMonth}/{card.expiryYear}
              </div>
            </div>

            {/* NEXTBIT logo */}
            <div style={{
              fontFamily: "'Orbitron',monospace", fontWeight: 700,
              fontSize: 'clamp(8px,1.4vw,11px)',
              position: 'absolute', bottom: '8%', right: '4%',
              letterSpacing: 2,
              background: 'linear-gradient(135deg,#00c864 0%,#00ff9a 60%,#80ffcc 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 6px rgba(0,200,100,.4))',
            }}>
              NEXTBIT
            </div>
          </div>

          <CardBack cvv={card.cvv} variant="pts" />
        </div>
      </div>

      {/* Controls */}
      {selected ? (
        <div className="nb-controls">
          <button className="nb-btn pts" onClick={() => onCopy(card.cardNumber, 'Card number')}>
            <Copy size={13} /> Copy Number
          </button>
          <button className="nb-btn pts" onClick={() => { revealPoints(); }}>
            <Eye size={13} /> Reveal Points
          </button>
        </div>
      ) : (
        <div className="nb-select-hint pts" onClick={onSelect}>▸ Select card</div>
      )}
    </div>
  );
};

// ─── Root export ──────────────────────────────────────────────────────────────

export const FlipCard3D: FC<FlipCard3DProps> = ({
  card,
  balance,
  cardholderName,
  redeemablePoints = 0,
  onToggleFreeze,
  onCopy,
  toggling,
}) => {
  const [activeCard, setActiveCard] = useState<'visa' | 'pts' | null>(null);

  return (
    <>
      <style>{CARD_STYLES}</style>
      <div className="nb-cards-wrap">
        <VisaCard
          card={card}
          balance={balance}
          cardholderName={cardholderName}
          onCopy={onCopy}
          onToggleFreeze={onToggleFreeze}
          toggling={toggling}
          selected={activeCard === 'visa'}
          onSelect={() => setActiveCard(prev => prev === 'visa' ? null : 'visa')}
        />
        <PointsCard
          card={card}
          cardholderName={cardholderName}
          redeemablePoints={redeemablePoints}
          onCopy={onCopy}
          selected={activeCard === 'pts'}
          onSelect={() => setActiveCard(prev => prev === 'pts' ? null : 'pts')}
        />
      </div>
    </>
  );
};