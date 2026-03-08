import { useState, useCallback, useRef } from "react";
import Papa from "papaparse";

const ACCENT = "#00e5a0";
const BG = "#0d0d0d";
const SURFACE = "#161616";
const BORDER = "#2a2a2a";

const styles = {
  app: {
    minHeight: "100vh",
    background: BG,
    color: "#e8e8e8",
    fontFamily: "'DM Mono', 'Fira Mono', 'Courier New', monospace",
    padding: "0",
  },
  header: {
    borderBottom: `1px solid ${BORDER}`,
    padding: "28px 40px",
    display: "flex",
    alignItems: "baseline",
    gap: "16px",
    background: SURFACE,
  },
  title: {
    fontSize: "22px",
    fontWeight: "700",
    color: ACCENT,
    letterSpacing: "-0.5px",
    margin: 0,
    fontFamily: "'DM Mono', monospace",
  },
  subtitle: {
    fontSize: "13px",
    color: "#555",
    margin: 0,
  },
  main: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "40px",
  },
  dropzone: (active) => ({
    border: `2px dashed ${active ? ACCENT : BORDER}`,
    borderRadius: "8px",
    padding: "60px 40px",
    textAlign: "center",
    cursor: "pointer",
    background: active ? "rgba(0,229,160,0.04)" : SURFACE,
    transition: "all 0.2s ease",
    marginBottom: "32px",
  }),
  dropIcon: {
    fontSize: "40px",
    marginBottom: "12px",
  },
  dropText: {
    fontSize: "15px",
    color: "#888",
    marginBottom: "8px",
  },
  dropHint: {
    fontSize: "12px",
    color: "#444",
  },
  btn: (variant = "primary") => ({
    background: variant === "primary" ? ACCENT : "transparent",
    color: variant === "primary" ? "#000" : ACCENT,
    border: `1px solid ${variant === "primary" ? ACCENT : ACCENT}`,
    borderRadius: "4px",
    padding: "9px 20px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: "0.5px",
    transition: "all 0.15s",
  }),
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
    marginBottom: "28px",
  },
  statCard: (highlight) => ({
    background: highlight ? "rgba(0,229,160,0.07)" : SURFACE,
    border: `1px solid ${highlight ? ACCENT : BORDER}`,
    borderRadius: "6px",
    padding: "18px 22px",
  }),
  statLabel: {
    fontSize: "11px",
    color: "#555",
    letterSpacing: "1px",
    textTransform: "uppercase",
    marginBottom: "6px",
  },
  statValue: (highlight) => ({
    fontSize: "30px",
    fontWeight: "700",
    color: highlight ? ACCENT : "#e8e8e8",
  }),
  section: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: "6px",
    overflow: "hidden",
    marginBottom: "20px",
  },
  sectionHeader: {
    padding: "14px 20px",
    borderBottom: `1px solid ${BORDER}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: "12px",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    color: "#666",
  },
  colGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    padding: "16px 20px",
  },
  colTag: (active) => ({
    background: active ? ACCENT : "transparent",
    color: active ? "#000" : "#888",
    border: `1px solid ${active ? ACCENT : BORDER}`,
    borderRadius: "3px",
    padding: "5px 12px",
    fontSize: "12px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: active ? "700" : "400",
    transition: "all 0.15s",
  }),
  tableWrap: {
    overflowX: "auto",
    maxHeight: "320px",
    overflowY: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },
  th: {
    padding: "10px 14px",
    background: "#111",
    color: "#555",
    fontSize: "11px",
    letterSpacing: "1px",
    textTransform: "uppercase",
    textAlign: "left",
    position: "sticky",
    top: 0,
    borderBottom: `1px solid ${BORDER}`,
    whiteSpace: "nowrap",
  },
  td: (isDup) => ({
    padding: "9px 14px",
    borderBottom: `1px solid ${BORDER}`,
    color: isDup ? "#c0392b" : "#ccc",
    background: isDup ? "rgba(192,57,43,0.06)" : "transparent",
    whiteSpace: "nowrap",
    maxWidth: "200px",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }),
  actionRow: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    padding: "20px 0 0",
  },
  badge: (color) => ({
    background: `${color}22`,
    color: color,
    border: `1px solid ${color}44`,
    borderRadius: "3px",
    padding: "2px 8px",
    fontSize: "11px",
    fontWeight: "700",
  }),
};

export default function App() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [selectedCols, setSelectedCols] = useState([]);
  const [dupRows, setDupRows] = useState(new Set());
  const [dragging, setDragging] = useState(false);
  const [processed, setProcessed] = useState(false);
  const inputRef = useRef();

  const parseFile = (f) => {
    setFile(f);
    setProcessed(false);
    setDupRows(new Set());
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setHeaders(res.meta.fields || []);
        setData(res.data);
        setSelectedCols(res.meta.fields || []);
      },
    });
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith(".csv")) parseFile(f);
  }, []);

  const findDuplicates = () => {
    const seen = new Map();
    const dups = new Set();
    data.forEach((row, i) => {
      const key = selectedCols.map((c) => row[c]).join("|||");
      if (seen.has(key)) {
        dups.add(i);
      } else {
        seen.set(key, i);
      }
    });
    setDupRows(dups);
    setProcessed(true);
  };

  const downloadClean = () => {
    const clean = data.filter((_, i) => !dupRows.has(i));
    const csv = Papa.unparse(clean);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file ? `bereinigt_${file.name}` : "bereinigt.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleCol = (col) => {
    setSelectedCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
    setProcessed(false);
  };

  const toggleAllCols = () => {
    if (selectedCols.length === headers.length) setSelectedCols([]);
    else setSelectedCols([...headers]);
    setProcessed(false);
  };

  return (
    <div style={styles.app}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <header style={styles.header}>
        <h1 style={styles.title}>CSV // DUPLIKAT-ENTFERNER</h1>
        <p style={styles.subtitle}>doppelte Zeilen erkennen & entfernen</p>
      </header>

      <main style={styles.main}>
        {!data.length ? (
          <div
            style={styles.dropzone(dragging)}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current.click()}
          >
            <div style={styles.dropIcon}>📂</div>
            <div style={styles.dropText}>CSV-Datei hier reinziehen</div>
            <div style={styles.dropHint}>oder klicken zum Auswählen · nur .csv Dateien</div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={(e) => e.target.files[0] && parseFile(e.target.files[0])}
            />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div style={styles.statsRow}>
              <div style={styles.statCard(false)}>
                <div style={styles.statLabel}>Zeilen gesamt</div>
                <div style={styles.statValue(false)}>{data.length}</div>
              </div>
              <div style={styles.statCard(dupRows.size > 0)}>
                <div style={styles.statLabel}>Duplikate gefunden</div>
                <div style={styles.statValue(dupRows.size > 0)}>
                  {processed ? dupRows.size : "—"}
                </div>
              </div>
              <div style={styles.statCard(false)}>
                <div style={styles.statLabel}>Spalten</div>
                <div style={styles.statValue(false)}>{headers.length}</div>
              </div>
            </div>

            {/* Column selector */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>Vergleichs-Spalten auswählen</span>
                <button style={styles.btn("ghost")} onClick={toggleAllCols}>
                  {selectedCols.length === headers.length ? "Alle abwählen" : "Alle wählen"}
                </button>
              </div>
              <div style={styles.colGrid}>
                {headers.map((h) => (
                  <button
                    key={h}
                    style={styles.colTag(selectedCols.includes(h))}
                    onClick={() => toggleCol(h)}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Table preview */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>
                  Vorschau{" "}
                  {processed && dupRows.size > 0 && (
                    <span style={{ ...styles.badge("#c0392b"), marginLeft: 8 }}>
                      {dupRows.size} Duplikate markiert
                    </span>
                  )}
                </span>
                <span style={{ fontSize: "11px", color: "#444" }}>
                  erste 200 Zeilen
                </span>
              </div>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>#</th>
                      {headers.map((h) => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.slice(0, 200).map((row, i) => (
                      <tr key={i}>
                        <td style={{ ...styles.td(dupRows.has(i)), color: dupRows.has(i) ? "#c0392b" : "#444" }}>
                          {i + 1}
                          {dupRows.has(i) && " ✕"}
                        </td>
                        {headers.map((h) => (
                          <td key={h} style={styles.td(dupRows.has(i))}>
                            {row[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div style={styles.actionRow}>
              <button style={styles.btn("ghost")} onClick={() => { setData([]); setFile(null); setProcessed(false); }}>
                ← Neue Datei
              </button>
              <button
                style={{ ...styles.btn("primary"), opacity: selectedCols.length ? 1 : 0.4 }}
                disabled={!selectedCols.length}
                onClick={findDuplicates}
              >
                🔍 Duplikate suchen
              </button>
              {processed && dupRows.size > 0 && (
                <button style={styles.btn("primary")} onClick={downloadClean}>
                  ⬇ Bereinigt herunterladen ({data.length - dupRows.size} Zeilen)
                </button>
              )}
              {processed && dupRows.size === 0 && (
                <span style={styles.badge(ACCENT)}>✓ Keine Duplikate gefunden</span>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
