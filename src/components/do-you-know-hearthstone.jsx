import React, { useState, useMemo, useCallback } from "react";
import {
  Leaf, Flame, Waves, Rat, CloudLightning, Ghost, Snowflake, Cat, Turtle,
  Bug, ShieldHalf, Bird, Wand2, Sun, Moon, Sword, Bone, Feather, Gem,
  TreeDeciduous, Zap, Eye, Crown, Stamp, Flag,
} from "lucide-react";
import parse from "html-react-parser";
import { getMinionData, tileArtUrl, renderArtUrl, getCacheAge, clearMinionCache } from "../hearthstoneData";

const RARITIES = ["FREE", "COMMON", "RARE", "EPIC", "LEGENDARY"];

const RARITY_COLOR = {
  FREE: "#8a8375",
  COMMON: "#8a8375",
  RARE: "#3f9c98",
  EPIC: "#9166d6",
  LEGENDARY: "#d4af37",
};

const POOL = await getMinionData();

// Curated duotone gradients for card art — deterministic per-name so the
// same minion always looks the same, without needing real artwork.
const GRADIENTS = [
  ["#2b2140", "#6a4fae"],
  ["#1f2f2a", "#3f9c78"],
  ["#3a1f1f", "#c0533a"],
  ["#1c2733", "#3f7fae"],
  ["#332417", "#c98a3d"],
  ["#241735", "#8a3fae"],
  ["#152a2a", "#2fa7a1"],
  ["#301a24", "#ae3f74"],
];

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function gradientFor(name) {
  const g = GRADIENTS[hashStr(name) % GRADIENTS.length];
  return `linear-gradient(160deg, ${g[0]}, ${g[1]})`;
}

/* ---------------------------------------------------------------------- */
/* Modification logic                                                     */
/* ---------------------------------------------------------------------- */

function firstNumber(text) {
  const m = text.match(/\d+/);
  return m ? { value: parseInt(m[0], 10), index: m.index, raw: m[0] } : null;
}

function applyModification(card) {
  const options = ["stat", "cost", "rarity"];
  const num = firstNumber(card.text);
  if (num) options.push("text");

  const type = options[Math.floor(Math.random() * options.length)];
  const modified = { ...card };
  let detail = null;

  if (type === "stat") {
    const which = Math.random() < 0.5 ? "atk" : "hp";
    const delta = Math.random() < 0.5 ? -1 : 1;
    const before = card[which];
    const after = Math.max(0, before + delta);
    modified[which] = after === before ? before + 1 : after;
    detail = {
      type: "Stats",
      before: `${card.atk}/${card.hp}`,
      after: `${which === "atk" ? modified.atk : card.atk}/${which === "hp" ? modified.hp : card.hp}`,
    };
  } else if (type === "cost") {
    const delta = Math.random() < 0.5 ? -1 : 1;
    const before = card.cost;
    let after = before + delta;
    if (after < 0) after = before + 1;
    modified.cost = after;
    detail = { type: "Mana Cost", before: String(before), after: String(after) };
  } else if (type === "rarity") {
    const currentIdx = RARITIES.indexOf(card.rarity);
    let newIdx = currentIdx;
    while (newIdx === currentIdx) newIdx = Math.floor(Math.random() * RARITIES.length);
    modified.rarity = RARITIES[newIdx];
    detail = { type: "Rarity", before: card.rarity, after: modified.rarity };
  } else if (type === "text") {
    const delta = Math.random() < 0.5 ? -1 : 1;
    const before = num.value;
    const after = Math.max(0, before + delta);
    const newText =
      card.text.slice(0, num.index) + String(after) + card.text.slice(num.index + num.raw.length);
    modified.text = newText;
    detail = { type: "Card Text", before: card.text, after: newText };
  }

  return { modified, detail };
}

function generateRound(pool) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const picks = shuffled.slice(0, 3).map((c) => ({ ...c }));
  const modIndex = Math.floor(Math.random() * 3);
  const { modified, detail } = applyModification(picks[modIndex]);
  const cards = picks.map((c, i) => (i === modIndex ? modified : c));
  return { cards, modIndex, detail };
}

/* ---------------------------------------------------------------------- */
/* UI                                                                      */
/* ---------------------------------------------------------------------- */

const INK = "#efe6cf";
const BG = "#12101a";
const PANEL = "#1b1826";
const LINE = "#332e42";

function MinionCard({ card, state, onClick }) {
  // state: "idle" | "correct" | "wrong-pick" | "actual-forgery"
  const ring =
    state === "correct" ? "#3f9c78" : state === "wrong-pick" ? "#c0533a" : state === "actual-forgery" ? "#d4af37" : LINE;

  return (
    <button
      onClick={onClick}
      className="flex flex-col text-left rounded-2xl overflow-hidden transition-transform"
      style={{
        width: 220,
        border: `2px solid ${ring}`,
        background: PANEL,
        boxShadow: state === "idle" ? "0 4px 18px rgba(0,0,0,0.35)" : `0 0 0 3px ${ring}33`,
        transform: state === "idle" ? "translateY(0)" : "translateY(-2px)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ height: 128, background: `url(${tileArtUrl(card.id)}) no-repeat center / cover` }}
      >
        <div
          className="absolute top-2 left-2 flex items-center justify-center rounded-full"
          style={{
            width: 30,
            height: 30,
            background: "#12101a",
            border: `2px solid ${INK}`,
            fontFamily: "'Spectral', serif",
            fontWeight: 700,
            color: INK,
            fontSize: 15,
          }}
        >
          {card.cost}
        </div>
        {(state === "correct" || state === "wrong-pick" || state === "actual-forgery") && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(10,9,15,0.4)" }}
          >
            <div
              className="flex items-center gap-1 px-3 py-1 rounded-full"
              style={{
                background: state === "correct" ? "#1e3d2e" : "#3d1f1e",
                border: `1.5px solid ${ring}`,
                color: ring,
                fontFamily: "'Cinzel', serif",
                fontSize: 12,
                letterSpacing: "0.06em",
                fontWeight: 600,
              }}
            >
              <Stamp size={13} />
              {state === "actual-forgery" ? "FORGED" : state === "correct" ? "FORGED — CAUGHT" : "AUTHENTIC"}
            </div>
          </div>
        )}
      </div>

      <div className="px-3 py-3 flex flex-col gap-1.5" style={{ color: INK }}>
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13.5, fontWeight: 600, lineHeight: 1.2 }}>
            {card.name}
          </span>
        </div>
        <div
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 10.5,
            letterSpacing: "0.08em",
            color: RARITY_COLOR[card.rarity],
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {card.rarity}
        </div>
        <p style={{ fontFamily: "'Spectral', serif", fontSize: 12, lineHeight: 1.35, color: "#c9bfa3", minHeight: 48, whiteSpace: "pre-wrap", textAlign: "center" }}>
          {parse(card.text)}
        </p>
        <div className="flex justify-end gap-3 pt-1" style={{ borderTop: `1px solid ${LINE}` }}>
          <span style={{ fontFamily: "'Spectral', serif", fontWeight: 700, fontSize: 15 }}>{card.atk}</span>
          <span style={{ opacity: 0.4 }}>/</span>
          <span style={{ fontFamily: "'Spectral', serif", fontWeight: 700, fontSize: 15 }}>{card.hp}</span>
        </div>
      </div>
    </button>
  );
}

export default function ForgedMinionGame() {
  const [round, setRound] = useState(() => generateRound(POOL));
  const [phase, setPhase] = useState("guessing");
  const [pickedIndex, setPickedIndex] = useState(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [rounds, setRounds] = useState(0);

  const nextRound = useCallback(() => {
    setRound(generateRound(POOL));
    setPhase("guessing");
    setPickedIndex(null);
  }, []);

  const handlEPICk = (i) => {
    if (phase !== "guessing") return;
    setPickedIndex(i);
    setPhase("revealed");
    setRounds((r) => r + 1);
    if (i === round.modIndex) {
      setStreak((s) => {
        const ns = s + 1;
        setBest((b) => Math.max(b, ns));
        return ns;
      });
    } else {
      setStreak(0);
    }
  };

  const correct = pickedIndex === round.modIndex;

  const cardState = (i) => {
    if (phase === "guessing") return "idle";
    if (i === round.modIndex) return i === pickedIndex ? "correct" : "actual-forgery";
    if (i === pickedIndex) return "wrong-pick";
    return "idle";
  };

  return (
    <div
      className="w-full min-h-screen flex flex-col items-center"
      style={{ background: `radial-gradient(ellipse at top, #1c1830, ${BG} 65%)`, color: INK, padding: "28px 16px 40px" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Spectral:wght@400;600;700&display=swap');
      `}</style>

      <div className="flex flex-col items-center gap-1 mb-2">
        <div className="flex items-center gap-2" style={{ color: "#8a8375" }}>
          <Stamp size={16} />
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            The Appraiser's Table
          </span>
        </div>
        <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: 30, fontWeight: 700, margin: 0 }}>
          Spot the Forged Minion
        </h1>
        <p style={{ fontFamily: "'Spectral', serif", fontSize: 13.5, color: "#a89d80", maxWidth: 480, textAlign: "center" }}>
          One of these three minions has been tampered with — a stat, a cost, a rarity, or a line
          of text quietly altered. Do you know the real thing well enough to catch the fake?
        </p>
      </div>

      <div className="flex items-center gap-6 my-4" style={{ fontFamily: "'Cinzel', serif" }}>
        <div className="flex flex-col items-center">
          <span style={{ fontSize: 11, letterSpacing: "0.1em", color: "#8a8375" }}>STREAK</span>
          <span style={{ fontSize: 26, fontWeight: 700, color: streak > 0 ? "#3f9c78" : INK }}>{streak}</span>
        </div>
        <div style={{ width: 1, height: 34, background: LINE }} />
        <div className="flex flex-col items-center">
          <span style={{ fontSize: 11, letterSpacing: "0.1em", color: "#8a8375" }}>BEST</span>
          <span style={{ fontSize: 26, fontWeight: 700 }}>{best}</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-5 mt-4">
        {round.cards.map((card, i) => (
          <MinionCard key={i} card={card} state={cardState(i)} onClick={() => handlEPICk(i)} />
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center gap-3" style={{ minHeight: 90 }}>
        {phase === "revealed" && (
          <>
            <div
              className="px-4 py-2 rounded-xl text-center"
              style={{
                border: `1.5px solid ${correct ? "#3f9c78" : "#c0533a"}`,
                background: correct ? "#16241c" : "#241716",
                fontFamily: "'Cinzel', serif",
                fontSize: 13.5,
                maxWidth: 480,
              }}
            >
              {correct ? "Caught it. " : "Missed one. "}
              <span style={{ color: "#a89d80", fontFamily: "'Spectral', serif", fontWeight: 400 }}>
                {round.detail.type} was altered — {round.detail.before} → {round.detail.after}
              </span>
            </div>
            <button
              onClick={nextRound}
              className="px-5 py-2 rounded-full"
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 13,
                letterSpacing: "0.06em",
                background: "#efe6cf",
                color: "#1b1826",
                fontWeight: 600,
              }}
            >
              Next Round
            </button>
          </>
        )}
      </div>
    </div>
  );
}
