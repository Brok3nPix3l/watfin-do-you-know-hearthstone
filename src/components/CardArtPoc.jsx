import React, { useEffect, useState, useCallback } from "react";
import { getMinionData, tileArtUrl, renderArtUrl, getCacheAge, clearMinionCache } from "../hearthstoneData";
import parse from "html-react-parser";

const RARITY_COLOR = {
  FREE: "#8a8375",
  COMMON: "#8a8375",
  RARE: "#3f9c98",
  EPIC: "#9166d6",
  LEGENDARY: "#d4af37",
};

export default function CardArtPoc() {
  const [minions, setMinions] = useState([]);
  const [sample, setSample] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState(null);
  const [artMode, setArtMode] = useState("render"); // "render" | "tile"

  const load = useCallback(async (forceRefresh = false) => {
    setStatus("loading");
    setError(null);
    try {
      const data = await getMinionData({ forceRefresh });
      setMinions(data);
      setSample(pickRandom(data, 6));
      setStatus("ready");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const cacheAgeLabel = () => {
    const ageMs = getCacheAge();
    if (ageMs == null) return "no cache yet";
    const mins = Math.round(ageMs / 60000);
    if (mins < 60) return `cached ${mins}m ago`;
    return `cached ${Math.round(mins / 60)}h ago`;
  };

  return (
    <div style={{ background: "#12101a", color: "#efe6cf", minHeight: "100vh", padding: 24, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>HearthstoneJSON POC</h1>
      <p style={{ color: "#a89d80", fontSize: 13, marginBottom: 16 }}>
        Verifying fetch → filter → cache → art render before wiring into the game.
      </p>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, fontSize: 13 }}>
        <span style={{ color: "#8a8375" }}>{status === "ready" ? `${minions.length} minions loaded` : status}</span>
        <span style={{ color: "#8a8375" }}>·</span>
        <span style={{ color: "#8a8375" }}>{cacheAgeLabel()}</span>
        <button onClick={() => load(true)} style={btnStyle}>Force refetch</button>
        <button
          onClick={() => {
            clearMinionCache();
            load(false);
          }}
          style={btnStyle}
        >
          Clear cache
        </button>
        <button onClick={() => setSample(pickRandom(minions, 6))} style={btnStyle}>
          New sample
        </button>
        <button onClick={() => setArtMode((m) => (m === "render" ? "tile" : "render"))} style={btnStyle}>
          Art: {artMode}
        </button>
      </div>

      {status === "error" && (
        <div style={{ color: "#c0533a", fontSize: 13 }}>
          Failed to load: {error}. If this is running inside a sandboxed preview, it may be a
          CORS/network restriction rather than a bug in the code — try it in your local dev server.
        </div>
      )}

      {status === "loading" && sample.length === 0 && <div style={{ fontSize: 13 }}>Loading card data…</div>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {sample.map((card) => (
          <div
            key={card.id}
            style={{
              width: 200,
              border: "1px solid #332e42",
              borderRadius: 12,
              overflow: "hidden",
              background: "#1b1826",
            }}
          >
            <div style={{ height: artMode === "render" ? 260 : 110, background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img
                src={artMode === "render" ? renderArtUrl(card.id) : tileArtUrl(card.id)}
                alt={card.name}
                style={{ width: "100%", height: "100%", objectFit: artMode === "render" ? "contain" : "cover" }}
                loading="lazy"
              />
            </div>
            <div style={{ padding: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{card.name}</div>
              <div
                style={{
                  fontSize: 10.5,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: RARITY_COLOR[card.rarity] || "#8a8375",
                  margin: "3px 0 6px",
                }}
              >
                {card.rarity} · Cost {card.cost}
              </div>
              <div style={{ fontSize: 12, color: "#c9bfa3", minHeight: 40, whiteSpace: "pre-wrap", textAlign: "center" }}>{parse(card.text) || "—"}</div>
              <div style={{ textAlign: "right", fontWeight: 700, fontSize: 14, marginTop: 6 }}>
                {card.atk} / {card.hp}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function pickRandom(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

const btnStyle = {
  fontSize: 12,
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid #332e42",
  background: "#1b1826",
  color: "#efe6cf",
  cursor: "pointer",
};
