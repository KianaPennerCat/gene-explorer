import { useState } from "react";

const API = "http://localhost:5001/api";

const GENES = ["BRCA1", "TP53", "EGFR", "FLT3", "KRAS"];

export default function App() {
  const [gene, setGene] = useState("");
  const [tab, setTab] = useState("drugs");
  const [drugData, setDrugData] = useState(null);
  const [crisprData, setCrisprData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  async function search() {
    if (!gene.trim()) return;
    setLoading(true);
    setError(null);
    setDrugData(null);
    setCrisprData(null);

    try {
      const [drugRes, crisprRes] = await Promise.all([
        fetch(`${API}/drugs?gene=${gene.toUpperCase()}`),
        fetch(`${API}/crispr?gene=${gene.toUpperCase()}`),
      ]);
      const drugs = await drugRes.json();
      const crispr = await crisprRes.json();

      if (drugs.error && crispr.error) {
        setError(`No data found for gene: ${gene.toUpperCase()}`);
      } else {
        if (!drugs.error) setDrugData(drugs);
        if (!crispr.error) setCrisprData(crispr);
      }
    } catch (e) {
      setError("Could not connect to backend. Make sure api.py is running.");
    }
    setLoading(false);
  }

  const scoreColor = (score) => {
    if (score >= 90) return "#2ecc71";
    if (score >= 75) return "#f39c12";
    return "#e74c3c";
  };

  const filteredDrugs = drugData
    ? filter === "approved"
      ? drugData.interactions.filter((i) => i.approved)
      : filter === "unapproved"
      ? drugData.interactions.filter((i) => !i.approved)
      : drugData.interactions
    : [];

  const hasData = drugData || crisprData;

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <h1 style={styles.title}>Gene Explorer</h1>
        <p style={styles.subtitle}>Drug interactions and CRISPR guide RNA design for any human gene</p>

        {/* Search */}
        <div style={styles.searchRow}>
          <input
            style={styles.input}
            placeholder="Enter gene (e.g. BRCA1, TP53, EGFR)"
            value={gene}
            onChange={(e) => setGene(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <button style={styles.button} onClick={search}>Search</button>
        </div>

        <div style={styles.chips}>
          {GENES.map((g) => (
            <button key={g} style={styles.chip} onClick={() => setGene(g)}>{g}</button>
          ))}
        </div>

        {loading && <p style={styles.status}>Fetching data from NCBI and DGIdb...</p>}
        {error && <p style={styles.error}>{error}</p>}

        {hasData && (
          <>
            {/* Gene header */}
            <div style={styles.geneCard}>
              <div>
                <h2 style={styles.geneName}>{drugData?.gene || crisprData?.gene}</h2>
                <p style={styles.geneSubtitle}>{drugData?.full_name || crisprData?.title}</p>
              </div>
              <div style={styles.statRow}>
                {drugData && (
                  <>
                    <div style={styles.stat}>
                      <span style={styles.statNum}>{drugData.total}</span>
                      <span style={styles.statLabel}>Drug Interactions</span>
                    </div>
                    <div style={styles.stat}>
                      <span style={{ ...styles.statNum, color: "#2ecc71" }}>{drugData.approved_count}</span>
                      <span style={styles.statLabel}>FDA Approved</span>
                    </div>
                  </>
                )}
                {crisprData && (
                  <div style={styles.stat}>
                    <span style={{ ...styles.statNum, color: "#9b59b6" }}>{crisprData.guides.length}</span>
                    <span style={styles.statLabel}>CRISPR Sites</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div style={styles.tabRow}>
              <button
                style={{ ...styles.tabBtn, ...(tab === "drugs" ? styles.tabActive : {}) }}
                onClick={() => setTab("drugs")}
              >
                Drug Interactions
              </button>
              <button
                style={{ ...styles.tabBtn, ...(tab === "crispr" ? styles.tabActive : {}) }}
                onClick={() => setTab("crispr")}
              >
                CRISPR Guide RNAs
              </button>
            </div>

            {/* Drug Tab */}
            {tab === "drugs" && drugData && (
              <>
                <div style={styles.filterRow}>
                  {["all", "approved", "unapproved"].map((f) => (
                    <button
                      key={f}
                      style={{ ...styles.filterBtn, ...(filter === f ? styles.filterActive : {}) }}
                      onClick={() => setFilter(f)}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {["Drug", "Approved", "Type", "Score"].map((h) => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrugs.map((r, i) => (
                      <tr key={i} style={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                        <td style={styles.td}>{r.drug}</td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, background: r.approved ? "#2ecc71" : "#e74c3c" }}>
                            {r.approved ? "Yes" : "No"}
                          </span>
                        </td>
                        <td style={styles.td}>{r.types.join(", ")}</td>
                        <td style={styles.td}>{r.score ? r.score.toFixed(2) : "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* CRISPR Tab */}
            {tab === "crispr" && crisprData && (
              <>
                <div style={styles.legend}>
                  {[["#2ecc71", "≥ 90 Excellent"], ["#f39c12", "≥ 75 Good"], ["#e74c3c", "< 75 Poor"]].map(([color, label]) => (
                    <span key={label} style={styles.legendItem}>
                      <span style={{ ...styles.dot, background: color }} />{label}
                    </span>
                  ))}
                </div>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {["#", "Guide RNA (20bp)", "PAM", "Score", "GC%", "Strand", "Position"].map((h) => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {crisprData.guides.map((g, i) => (
                      <>
                        <tr key={i} style={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                          <td style={styles.td}>{i + 1}</td>
                          <td style={{ ...styles.td, fontFamily: "monospace", fontSize: 13 }}>{g.guide}</td>
                          <td style={{ ...styles.td, fontFamily: "monospace" }}>{g.pam}</td>
                          <td style={styles.td}>
                            <span style={{ ...styles.badge, background: scoreColor(g.score) }}>{g.score}</span>
                          </td>
                          <td style={styles.td}>{g.gc_content}%</td>
                          <td style={styles.td}>
                            <span style={{ ...styles.badge, background: g.strand === "+" ? "#1A5276" : "#6C3483" }}>
                              {g.strand}
                            </span>
                          </td>
                          <td style={styles.td}>{g.position}</td>
                        </tr>
                        <tr key={`${i}-r`} style={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                          <td />
                          <td colSpan={6} style={styles.reasons}>{g.reasons.join("  ·  ")}</td>
                        </tr>
                      </>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#0f1117", color: "#fff", fontFamily: "Arial, sans-serif", padding: "40px 20px" },
  container: { maxWidth: 960, margin: "0 auto" },
  title: { fontSize: 30, fontWeight: "bold", marginBottom: 6 },
  subtitle: { color: "#888", marginBottom: 24, fontSize: 15 },
  searchRow: { display: "flex", gap: 10, marginBottom: 12 },
  input: { flex: 1, padding: "12px 16px", borderRadius: 8, border: "1px solid #333", background: "#1a1a2e", color: "#fff", fontSize: 16 },
  button: { padding: "12px 28px", borderRadius: 8, border: "none", background: "#1A5276", color: "#fff", fontSize: 16, cursor: "pointer" },
  chips: { display: "flex", gap: 8, marginBottom: 28 },
  chip: { padding: "4px 12px", borderRadius: 20, border: "1px solid #333", background: "transparent", color: "#aaa", cursor: "pointer", fontSize: 13 },
  status: { color: "#888", textAlign: "center", padding: 40 },
  error: { color: "#e74c3c", textAlign: "center", padding: 20 },
  geneCard: { background: "#1a1a2e", borderRadius: 10, padding: "20px 24px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" },
  geneName: { fontSize: 24, fontWeight: "bold", margin: 0 },
  geneSubtitle: { color: "#888", margin: "6px 0 0 0", fontSize: 13 },
  statRow: { display: "flex", gap: 24 },
  stat: { textAlign: "right" },
  statNum: { fontSize: 28, fontWeight: "bold", display: "block" },
  statLabel: { fontSize: 12, color: "#888" },
  tabRow: { display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid #222" },
  tabBtn: { padding: "10px 24px", border: "none", background: "transparent", color: "#888", fontSize: 15, cursor: "pointer", borderBottom: "2px solid transparent" },
  tabActive: { color: "#fff", borderBottom: "2px solid #1A5276" },
  filterRow: { display: "flex", gap: 8, marginBottom: 16 },
  filterBtn: { padding: "6px 16px", borderRadius: 20, border: "1px solid #333", background: "transparent", color: "#aaa", cursor: "pointer", fontSize: 13 },
  filterActive: { background: "#1A5276", color: "#fff", border: "1px solid #1A5276" },
  legend: { display: "flex", gap: 20, marginBottom: 16 },
  legendItem: { fontSize: 13, color: "#888", display: "flex", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: "50%", display: "inline-block" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "10px 12px", background: "#1a1a2e", color: "#888", fontSize: 13, fontWeight: "normal" },
  td: { padding: "10px 12px", fontSize: 14, verticalAlign: "middle" },
  rowEven: { background: "#12121f" },
  rowOdd: { background: "#0f1117" },
  badge: { padding: "3px 10px", borderRadius: 20, fontSize: 12, color: "#fff" },
  reasons: { padding: "0 12px 10px 12px", fontSize: 12, color: "#666", fontStyle: "italic" },
};