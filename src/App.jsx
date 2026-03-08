import { useState, useCallback, useRef, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

const ACCENT = "#00e5a0";
const BG = "#0d0d0d";
const SURFACE = "#161616";
const BORDER = "#2a2a2a";
const RED = "#c0392b";
const PAGE_SIZE = 50;

// ── localStorage helpers ────────────────────────────────────────────────────
const LS_KEY = "csvtool_settings";
const loadSettings = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } };
const saveSettings = (s) => localStorage.setItem(LS_KEY, JSON.stringify(s));

// ── styles ──────────────────────────────────────────────────────────────────
const st = {
  app: { minHeight: "100vh", background: BG, color: "#e8e8e8", fontFamily: "'DM Mono','Fira Mono','Courier New',monospace" },
  header: { borderBottom: `1px solid ${BORDER}`, padding: "24px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", background: SURFACE },
  title: { fontSize: "20px", fontWeight: "700", color: ACCENT, letterSpacing: "-0.5px", margin: 0 },
  subtitle: { fontSize: "12px", color: "#555", margin: "4px 0 0" },
  headerRight: { display: "flex", gap: "8px", alignItems: "center" },
  main: { maxWidth: "1200px", margin: "0 auto", padding: "32px 40px" },
  dropzone: (active) => ({ border: `2px dashed ${active ? ACCENT : BORDER}`, borderRadius: "8px", padding: "56px 40px", textAlign: "center", cursor: "pointer", background: active ? "rgba(0,229,160,0.04)" : SURFACE, transition: "all 0.2s", marginBottom: "28px" }),
  dropIcon: { fontSize: "36px", marginBottom: "10px" },
  dropText: { fontSize: "15px", color: "#888", marginBottom: "6px" },
  dropHint: { fontSize: "12px", color: "#444" },
  btn: (variant = "primary", disabled = false) => ({ background: variant === "primary" ? ACCENT : variant === "red" ? RED : "transparent", color: variant === "primary" ? "#000" : variant === "red" ? "#fff" : ACCENT, border: `1px solid ${variant === "primary" ? ACCENT : variant === "red" ? RED : ACCENT}`, borderRadius: "4px", padding: "8px 16px", fontSize: "12px", fontWeight: "700", cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", letterSpacing: "0.5px", transition: "all 0.15s", opacity: disabled ? 0.4 : 1 }),
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" },
  statCard: (highlight) => ({ background: highlight ? "rgba(0,229,160,0.07)" : SURFACE, border: `1px solid ${highlight ? ACCENT : BORDER}`, borderRadius: "6px", padding: "16px 20px" }),
  statLabel: { fontSize: "10px", color: "#555", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px" },
  statValue: (highlight) => ({ fontSize: "28px", fontWeight: "700", color: highlight ? ACCENT : "#e8e8e8" }),
  section: { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: "6px", overflow: "hidden", marginBottom: "16px" },
  sectionHeader: { padding: "12px 18px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#666" },
  colGrid: { display: "flex", flexWrap: "wrap", gap: "6px", padding: "14px 18px" },
  colTag: (active) => ({ background: active ? ACCENT : "transparent", color: active ? "#000" : "#888", border: `1px solid ${active ? ACCENT : BORDER}`, borderRadius: "3px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", fontWeight: active ? "700" : "400", transition: "all 0.15s" }),
  tableWrap: { overflowX: "auto", maxHeight: "380px", overflowY: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "12px" },
  th: (sorted) => ({ padding: "9px 12px", background: "#111", color: sorted ? ACCENT : "#555", fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", textAlign: "left", position: "sticky", top: 0, borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }),
  td: (isDup) => ({ padding: "8px 12px", borderBottom: `1px solid ${BORDER}`, color: isDup ? RED : "#ccc", background: isDup ? "rgba(192,57,43,0.05)" : "transparent", whiteSpace: "nowrap", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis" }),
  actionRow: { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", padding: "18px 0 0" },
  badge: (color) => ({ background: `${color}22`, color: color, border: `1px solid ${color}44`, borderRadius: "3px", padding: "2px 8px", fontSize: "11px", fontWeight: "700" }),
  input: { background: "#0a0a0a", border: `1px solid ${BORDER}`, borderRadius: "4px", color: "#e8e8e8", padding: "7px 12px", fontSize: "12px", fontFamily: "inherit", outline: "none" },
  select: { background: "#0a0a0a", border: `1px solid ${BORDER}`, borderRadius: "4px", color: "#e8e8e8", padding: "7px 10px", fontSize: "12px", fontFamily: "inherit", cursor: "pointer" },
  pagination: { display: "flex", gap: "6px", alignItems: "center", justifyContent: "center", padding: "12px", borderTop: `1px solid ${BORDER}` },
  pageBtn: (active) => ({ background: active ? ACCENT : "transparent", color: active ? "#000" : "#666", border: `1px solid ${active ? ACCENT : BORDER}`, borderRadius: "3px", padding: "4px 10px", fontSize: "11px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }),
  toolbar: { display: "flex", gap: "8px", alignItems: "center", padding: "12px 18px", borderBottom: `1px solid ${BORDER}`, flexWrap: "wrap" },
  barBg: { background: BORDER, borderRadius: "2px", height: "4px", marginTop: "4px", overflow: "hidden" },
  bar: (pct) => ({ width: `${pct}%`, height: "100%", background: RED, borderRadius: "2px", transition: "width 0.3s" }),
};

export default function App() {
  // ── core state ─────────────────────────────────────────────────────────────
  const [files, setFiles] = useState([]);
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [selectedCols, setSelectedCols] = useState([]);
  const [dupRows, setDupRows] = useState(new Set());
  const [dragging, setDragging] = useState(false);
  const [processed, setProcessed] = useState(false);

  // ── new feature state ──────────────────────────────────────────────────────
  const [keepMode, setKeepMode] = useState(() => loadSettings().keepMode || "first");
  const [filterMode, setFilterMode] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [delimiter, setDelimiter] = useState(() => loadSettings().delimiter || "auto");
  const [history, setHistory] = useState(null);
  const [colStats, setColStats] = useState({});

  const inputRef = useRef();

  // ── persist settings ───────────────────────────────────────────────────────
  useEffect(() => { saveSettings({ keepMode, delimiter }); }, [keepMode, delimiter]);

  // ── Ctrl+Enter shortcut ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && data.length && selectedCols.length) {
        findDuplicates();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [data, selectedCols, keepMode]);

  // ── parse files ────────────────────────────────────────────────────────────
  const parseFiles = (fileList) => {
    const allFiles = Array.from(fileList).filter(f => f.name.match(/\.(csv|tsv|txt|xlsx|xls)$/i));
    if (allFiles.length === 0) return;

    setFiles(allFiles);
    setProcessed(false);
    setDupRows(new Set());
    setColStats({});
    setHistory(null);
    setPage(1);
    setSearchTerm("");

    const parseDelimiter = delimiter === "auto" ? undefined : delimiter;

    const parseOne = (f) => new Promise((resolve) => {
      if (f.name.match(/\.(xlsx|xls)$/i)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const wb = XLSX.read(e.target.result, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
          const fields = json.length ? Object.keys(json[0]) : [];
          resolve({ data: json, fields });
        };
        reader.readAsArrayBuffer(f);
      } else {
        Papa.parse(f, {
          header: true,
          skipEmptyLines: true,
          delimiter: parseDelimiter,
          complete: (res) => resolve({ data: res.data, fields: res.meta.fields || [] }),
        });
      }
    });

    Promise.all(allFiles.map(parseOne)).then((results) => {
      const allData = results.flatMap((r) => r.data);
      const combinedHeaders = [...results[0].fields];
      results.slice(1).forEach((r) => {
        r.fields.forEach((h) => { if (!combinedHeaders.includes(h)) combinedHeaders.push(h); });
      });
      setHeaders(combinedHeaders);
      setData(allData);
      setSelectedCols(combinedHeaders);
    });
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    parseFiles(e.dataTransfer.files);
  }, [delimiter]);

  // ── find duplicates ────────────────────────────────────────────────────────
  const findDuplicates = () => {
    setHistory({ dupRows, processed, colStats });
    const seen = new Map();
    const dups = new Set();

    if (keepMode === "first") {
      data.forEach((row, i) => {
        const key = selectedCols.map((c) => String(row[c] ?? "")).join("|||");
        if (seen.has(key)) dups.add(i); else seen.set(key, i);
      });
    } else {
      for (let i = data.length - 1; i >= 0; i--) {
        const key = selectedCols.map((c) => String(data[i][c] ?? "")).join("|||");
        if (seen.has(key)) dups.add(i); else seen.set(key, i);
      }
    }

    const stats = {};
    headers.forEach((h) => { stats[h] = 0; });
    dups.forEach(() => { selectedCols.forEach((col) => { stats[col] = (stats[col] || 0) + 1; }); });

    setDupRows(dups);
    setColStats(stats);
    setProcessed(true);
    setPage(1);
    setFilterMode("all");
  };

  const undo = () => {
    if (!history) return;
    setDupRows(history.dupRows);
    setProcessed(history.processed);
    setColStats(history.colStats);
    setHistory(null);
  };

  // ── export helpers ─────────────────────────────────────────────────────────
  const downloadCSV = (rows, filename) => {
    const csv = Papa.unparse(rows, { columns: headers });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadXLSX = (rows, filename) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daten");
    XLSX.writeFile(wb, filename);
  };

  const cleanRows = data.filter((_, i) => !dupRows.has(i));
  const dupRowsList = data.filter((_, i) => dupRows.has(i));
  const baseName = files.length === 1 ? files[0].name.replace(/\.\w+$/, "") : "kombiniert";

  // ── filtered + sorted + paginated display data ─────────────────────────────
  let displayData = data.map((row, i) => ({ ...row, __idx: i }));
  if (filterMode === "dups") displayData = displayData.filter((r) => dupRows.has(r.__idx));
  if (filterMode === "clean") displayData = displayData.filter((r) => !dupRows.has(r.__idx));
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    displayData = displayData.filter((r) => headers.some((h) => String(r[h] ?? "").toLowerCase().includes(term)));
  }
  if (sortCol) {
    displayData = [...displayData].sort((a, b) => {
      const n = String(a[sortCol] ?? "").toLowerCase().localeCompare(String(b[sortCol] ?? "").toLowerCase(), undefined, { numeric: true });
      return sortDir === "asc" ? n : -n;
    });
  }

  const totalPages = Math.ceil(displayData.length / PAGE_SIZE);
  const paginated = displayData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const maxDupCount = Math.max(1, ...Object.values(colStats));

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
    setPage(1);
  };

  const toggleCol = (col) => {
    setSelectedCols((prev) => prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]);
    setProcessed(false);
  };

  const toggleAllCols = () => {
    setSelectedCols(selectedCols.length === headers.length ? [] : [...headers]);
    setProcessed(false);
  };

  const reset = () => {
    setData([]); setFiles([]); setHeaders([]); setSelectedCols([]);
    setDupRows(new Set()); setProcessed(false); setHistory(null);
    setColStats({}); setSearchTerm(""); setSortCol(null); setPage(1); setFilterMode("all");
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={st.app}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

      <header style={st.header}>
        <div>
          <h1 style={st.title}>CSV // DUPLIKAT-ENTFERNER</h1>
          <p style={st.subtitle}>Ctrl+Enter = Duplikate suchen</p>
        </div>
        {!data.length && (
          <div style={st.headerRight}>
            <span style={{ fontSize: "11px", color: "#555" }}>Trennzeichen</span>
            <select style={st.select} value={delimiter} onChange={(e) => setDelimiter(e.target.value)}>
              <option value="auto">Auto</option>
              <option value=",">Komma (,)</option>
              <option value=";">Semikolon (;)</option>
              <option value={"\t"}>Tab</option>
            </select>
          </div>
        )}
      </header>

      <main style={st.main}>
        {!data.length ? (
          <div
            style={st.dropzone(dragging)}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current.click()}
          >
            <div style={st.dropIcon}>📂</div>
            <div style={st.dropText}>CSV- oder Excel-Dateien hier reinziehen</div>
            <div style={st.dropHint}>oder klicken · mehrere Dateien · .csv .xlsx .xls .tsv</div>
            <input ref={inputRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" multiple
              style={{ display: "none" }}
              onChange={(e) => e.target.files.length > 0 && parseFiles(e.target.files)} />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div style={st.statsRow}>
              <div style={st.statCard(false)}>
                <div style={st.statLabel}>Zeilen gesamt</div>
                <div style={st.statValue(false)}>{data.length.toLocaleString()}</div>
              </div>
              <div style={st.statCard(dupRows.size > 0)}>
                <div style={st.statLabel}>Duplikate</div>
                <div style={st.statValue(dupRows.size > 0)}>{processed ? dupRows.size.toLocaleString() : "—"}</div>
              </div>
              <div style={st.statCard(false)}>
                <div style={st.statLabel}>Saubere Zeilen</div>
                <div style={st.statValue(false)}>{processed ? cleanRows.length.toLocaleString() : "—"}</div>
              </div>
              <div style={st.statCard(false)}>
                <div style={st.statLabel}>{files.length > 1 ? "Dateien" : "Spalten"}</div>
                <div style={st.statValue(false)}>{files.length > 1 ? files.length : headers.length}</div>
              </div>
            </div>

            {/* File list */}
            {files.length > 1 && (
              <div style={st.section}>
                <div style={st.sectionHeader}><span style={st.sectionTitle}>Geladene Dateien</span></div>
                <div style={st.colGrid}>
                  {files.map((f, i) => <span key={i} style={{ ...st.badge(ACCENT), fontSize: "11px" }}>📄 {f.name}</span>)}
                </div>
              </div>
            )}

            {/* Options */}
            <div style={{ display: "flex", gap: "16px", marginBottom: "16px", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: "#555", textTransform: "uppercase", letterSpacing: "1px" }}>Behalten:</span>
                {["first", "last"].map((m) => (
                  <button key={m} style={st.colTag(keepMode === m)} onClick={() => { setKeepMode(m); setProcessed(false); }}>
                    {m === "first" ? "Erste" : "Letzte"}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: "#555", textTransform: "uppercase", letterSpacing: "1px" }}>Trennzeichen:</span>
                <select style={st.select} value={delimiter} onChange={(e) => setDelimiter(e.target.value)}>
                  <option value="auto">Auto</option>
                  <option value=",">Komma (,)</option>
                  <option value=";">Semikolon (;)</option>
                  <option value={"\t"}>Tab</option>
                </select>
              </div>
              {history && (
                <span style={{ fontSize: "11px", color: "#555", cursor: "pointer", textDecoration: "underline" }} onClick={undo}>
                  ↩ Rückgängig
                </span>
              )}
            </div>

            {/* Column selector with dup-per-column bar */}
            <div style={st.section}>
              <div style={st.sectionHeader}>
                <span style={st.sectionTitle}>Vergleichs-Spalten</span>
                <button style={st.btn("ghost")} onClick={toggleAllCols}>
                  {selectedCols.length === headers.length ? "Alle abwählen" : "Alle wählen"}
                </button>
              </div>
              <div style={st.colGrid}>
                {headers.map((h) => (
                  <div key={h} style={{ display: "flex", flexDirection: "column", minWidth: "60px" }}>
                    <button style={st.colTag(selectedCols.includes(h))} onClick={() => toggleCol(h)}>{h}</button>
                    {processed && colStats[h] > 0 && (
                      <>
                        <div style={st.barBg}><div style={st.bar((colStats[h] / maxDupCount) * 100)} /></div>
                        <div style={{ fontSize: "9px", color: RED, textAlign: "center", marginTop: "2px" }}>{colStats[h]}</div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Table with toolbar */}
            <div style={st.section}>
              <div style={st.toolbar}>
                <input
                  style={{ ...st.input, maxWidth: "220px" }}
                  placeholder="🔍 Suchen…"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                />
                {processed && ["all", "dups", "clean"].map((m) => (
                  <button key={m} style={st.colTag(filterMode === m)} onClick={() => { setFilterMode(m); setPage(1); }}>
                    {m === "all" ? `Alle (${data.length})` : m === "dups" ? `Duplikate (${dupRows.size})` : `Sauber (${cleanRows.length})`}
                  </button>
                ))}
                <span style={{ marginLeft: "auto", fontSize: "11px", color: "#444" }}>
                  {displayData.length.toLocaleString()} Zeilen
                </span>
              </div>

              <div style={st.tableWrap}>
                <table style={st.table}>
                  <thead>
                    <tr>
                      <th style={st.th(false)}>#</th>
                      {headers.map((h) => (
                        <th key={h} style={st.th(sortCol === h)} onClick={() => handleSort(h)}>
                          {h} {sortCol === h ? (sortDir === "asc" ? "↑" : "↓") : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((row) => {
                      const isDup = dupRows.has(row.__idx);
                      return (
                        <tr key={row.__idx}>
                          <td style={{ ...st.td(isDup), color: isDup ? RED : "#444" }}>
                            {row.__idx + 1}{isDup && " ✕"}
                          </td>
                          {headers.map((h) => (
                            <td key={h} style={st.td(isDup)}>{row[h]}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={st.pagination}>
                  <button style={st.pageBtn(false)} onClick={() => setPage(1)} disabled={page === 1}>«</button>
                  <button style={st.pageBtn(false)} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    const mid = Math.min(Math.max(page, 4), totalPages - 3);
                    const p = totalPages <= 7 ? i + 1 : i + mid - 3;
                    if (p < 1 || p > totalPages) return null;
                    return <button key={p} style={st.pageBtn(p === page)} onClick={() => setPage(p)}>{p}</button>;
                  })}
                  <button style={st.pageBtn(false)} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
                  <button style={st.pageBtn(false)} onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
                  <span style={{ fontSize: "11px", color: "#444", marginLeft: "8px" }}>Seite {page} / {totalPages}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={st.actionRow}>
              <button style={st.btn("ghost")} onClick={reset}>← Neue Dateien</button>

              <button
                style={st.btn("primary", !selectedCols.length)}
                disabled={!selectedCols.length}
                onClick={findDuplicates}
                title="Ctrl+Enter"
              >
                🔍 Duplikate suchen
              </button>

              {processed && (
                <>
                  <span style={{ fontSize: "11px", color: "#444" }}>Export:</span>
                  <button style={st.btn("ghost")} onClick={() => downloadCSV(cleanRows, `bereinigt_${baseName}.csv`)}>
                    ⬇ Sauber (.csv)
                  </button>
                  <button style={st.btn("ghost")} onClick={() => downloadXLSX(cleanRows, `bereinigt_${baseName}.xlsx`)}>
                    ⬇ Sauber (.xlsx)
                  </button>
                  {dupRows.size > 0 && (
                    <>
                      <button style={st.btn("red")} onClick={() => downloadCSV(dupRowsList, `duplikate_${baseName}.csv`)}>
                        ⬇ Duplikate (.csv)
                      </button>
                      <button style={st.btn("red")} onClick={() => downloadXLSX(dupRowsList, `duplikate_${baseName}.xlsx`)}>
                        ⬇ Duplikate (.xlsx)
                      </button>
                    </>
                  )}
                  {dupRows.size === 0 && <span style={st.badge(ACCENT)}>✓ Keine Duplikate gefunden</span>}
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
