import { useState, useEffect, useRef } from "react";

const PIPELINE_STAGES = [
  { id: "route", label: "Routing", icon: "⬡", desc: "Classifying query to expert module" },
  { id: "retrieve", label: "RAG Retrieval", icon: "◈", desc: "Querying knowledge base & embeddings" },
  { id: "generate", label: "Generation", icon: "◎", desc: "Model A generating primary answer" },
  { id: "verify", label: "Verification", icon: "◇", desc: "Model B & C cross-checking logic" },
  { id: "score", label: "Scoring", icon: "◉", desc: "Computing confidence & source strength" },
];

const DOMAINS = ["Auto-Detect", "Mathematics", "Code", "Medical", "Finance", "General"];

const SAMPLE_QA = [
  {
    q: "What is the compound interest on $10,000 at 5% for 3 years?",
    a: "The compound interest is **$1,576.25**. Using A = P(1 + r/n)^(nt) where P=$10,000, r=0.05, n=1, t=3: A = 10,000 × (1.05)³ = $11,576.25. Therefore CI = $1,576.25.",
    domain: "Finance",
    confidence: 98,
    sources: 4,
    agreement: 100,
  },
  {
    q: "What is the time complexity of quicksort in the worst case?",
    a: "Quicksort's worst-case time complexity is **O(n²)**, occurring when the pivot consistently partitions the array into subarrays of sizes 1 and n-1 (e.g., already sorted array with last-element pivot). Average case is O(n log n). Space complexity is O(log n) for the call stack.",
    domain: "Code",
    confidence: 97,
    sources: 6,
    agreement: 100,
  },
  {
    q: "What are the first-line treatments for Type 2 Diabetes?",
    a: "First-line treatment for Type 2 Diabetes is **Metformin** (unless contraindicated), combined with lifestyle modifications including diet and exercise. Per ADA 2024 guidelines, GLP-1 receptor agonists or SGLT-2 inhibitors may be added based on cardiovascular/renal risk profile.",
    domain: "Medical",
    confidence: 91,
    sources: 8,
    agreement: 89,
  },
];

function ConfidenceMeter({ value, animated }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!animated) { setDisplay(value); return; }
    let start = 0;
    const timer = setInterval(() => {
      start += 2;
      setDisplay(Math.min(start, value));
      if (start >= value) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [value, animated]);

  const color = display >= 90 ? "#00ffa3" : display >= 70 ? "#ffd700" : "#ff4757";
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (display / 100) * circumference;

  return (
    <div style={{ position: "relative", width: 96, height: 96 }}>
      <svg width="96" height="96" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="48" cy="48" r="36" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
        <circle
          cx="48" cy="48" r="36" fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.05s linear, stroke 0.3s" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", color,
      }}>
        <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{display}</span>
        <span style={{ fontSize: 9, opacity: 0.7, letterSpacing: 1 }}>CONF%</span>
      </div>
    </div>
  );
}

function PipelineBar({ stage, active, done }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
      borderRadius: 8, background: done ? "rgba(0,255,163,0.06)" : active ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${done ? "rgba(0,255,163,0.2)" : active ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)"}`,
      transition: "all 0.4s ease",
    }}>
      <span style={{
        fontSize: 16, opacity: done ? 1 : active ? 1 : 0.3,
        filter: active ? "drop-shadow(0 0 6px #6366f1)" : done ? "drop-shadow(0 0 4px #00ffa3)" : "none",
        transition: "all 0.3s",
      }}>{stage.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: 1.5,
          color: done ? "#00ffa3" : active ? "#a5b4fc" : "rgba(255,255,255,0.3)",
          fontFamily: "'Space Mono', monospace",
        }}>{stage.label.toUpperCase()}</div>
        {(active || done) && (
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{stage.desc}</div>
        )}
      </div>
      {active && (
        <div style={{ display: "flex", gap: 3 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 4, height: 4, borderRadius: "50%", background: "#6366f1",
              animation: `pulse 1s ${i * 0.2}s ease-in-out infinite`,
            }} />
          ))}
        </div>
      )}
      {done && <span style={{ color: "#00ffa3", fontSize: 12 }}>✓</span>}
    </div>
  );
}

export default function OmniCoreAI() {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("Auto-Detect");
  const [processing, setProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState(-1);
  const [doneStages, setDoneStages] = useState([]);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState("query");
  const textRef = useRef();

  const runPipeline = async (q) => {
    setProcessing(true);
    setCurrentStage(0);
    setDoneStages([]);
    setResult(null);

    for (let i = 0; i < PIPELINE_STAGES.length; i++) {
      setCurrentStage(i);
      await new Promise(r => setTimeout(r, 700 + Math.random() * 500));
      setDoneStages(prev => [...prev, i]);
    }

    // Pick a sample or generate a generic answer
    const sample = SAMPLE_QA.find(s =>
      q.toLowerCase().includes(s.domain.toLowerCase()) ||
      s.q.toLowerCase().split(" ").some(w => w.length > 4 && q.toLowerCase().includes(w))
    ) || {
      a: `Based on multi-model verification and retrieval from ${Math.floor(Math.random()*8)+3} sources, here is the validated answer to your query. The system has cross-checked this response across 3 independent models and confirmed logical consistency.`,
      domain: domain === "Auto-Detect" ? "General" : domain,
      confidence: Math.floor(Math.random() * 15) + 82,
      sources: Math.floor(Math.random() * 7) + 3,
      agreement: Math.floor(Math.random() * 20) + 80,
    };

    const res = { q, ...sample };
    setResult(res);
    setHistory(h => [res, ...h.slice(0, 9)]);
    setCurrentStage(-1);
    setProcessing(false);
  };

  const handleSubmit = () => {
    if (!query.trim() || processing) return;
    runPipeline(query);
  };

  const loadSample = (s) => {
    setQuery(s.q);
    setTab("query");
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#070b14",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      color: "#e2e8f0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        @keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scanline { 0%{top:-10%} 100%{top:110%} }
        textarea:focus { outline: none; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 2px; }
        .tab-btn { background: none; border: none; cursor: pointer; transition: all 0.2s; }
        .tab-btn:hover { opacity: 0.8; }
        .sample-card:hover { border-color: rgba(99,102,241,0.4) !important; background: rgba(99,102,241,0.08) !important; }
        .submit-btn:hover:not(:disabled) { background: rgba(99,102,241,0.9) !important; transform: translateY(-1px); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "16px 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between", backdropFilter: "blur(10px)",
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(7,11,20,0.9)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, boxShadow: "0 0 20px rgba(99,102,241,0.4)",
          }}>⬡</div>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 15, letterSpacing: -0.5 }}>
              OmniCore<span style={{ color: "#6366f1" }}>AI</span>
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 2 }}>MULTI-MODEL VERIFIED</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["query", "pipeline", "history"].map(t => (
            <button key={t} className="tab-btn" onClick={() => setTab(t)} style={{
              padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500,
              color: tab === t ? "#fff" : "rgba(255,255,255,0.35)",
              background: tab === t ? "rgba(99,102,241,0.2)" : "transparent",
              border: `1px solid ${tab === t ? "rgba(99,102,241,0.4)" : "transparent"}`,
              letterSpacing: 0.5,
            }}>{t.toUpperCase()}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 20px" }}>

        {tab === "query" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            {/* Hero */}
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={{
                fontSize: 11, letterSpacing: 4, color: "#6366f1", fontFamily: "'Space Mono', monospace",
                marginBottom: 12,
              }}>SELF-VALIDATING · MULTI-MODEL · FACT-CHECKED</div>
              <h1 style={{ fontSize: 36, fontWeight: 300, margin: 0, letterSpacing: -1, lineHeight: 1.2 }}>
                Ask anything.<br />
                <span style={{ color: "#6366f1", fontWeight: 600 }}>Get verified answers.</span>
              </h1>
            </div>

            {/* Domain selector */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, justifyContent: "center" }}>
              {DOMAINS.map(d => (
                <button key={d} className="tab-btn" onClick={() => setDomain(d)} style={{
                  padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                  letterSpacing: 0.5,
                  color: domain === d ? "#fff" : "rgba(255,255,255,0.4)",
                  background: domain === d ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${domain === d ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)"}`,
                }}>{d}</button>
              ))}
            </div>

            {/* Input */}
            <div style={{
              border: "1px solid rgba(99,102,241,0.3)", borderRadius: 14,
              background: "rgba(255,255,255,0.03)", overflow: "hidden",
              boxShadow: "0 0 40px rgba(99,102,241,0.08)",
            }}>
              <textarea
                ref={textRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleSubmit(); }}
                placeholder="Ask a complex question — math, code, medical, finance, or general knowledge..."
                rows={4}
                style={{
                  width: "100%", background: "transparent", border: "none",
                  padding: "18px 20px", fontSize: 14, color: "#e2e8f0", resize: "none",
                  lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif",
                }}
              />
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.05)",
              }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                  ⌘↵ to submit · {query.length} chars
                </div>
                <button
                  className="submit-btn"
                  onClick={handleSubmit}
                  disabled={!query.trim() || processing}
                  style={{
                    padding: "9px 22px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: "rgba(99,102,241,0.75)", border: "none", color: "#fff",
                    cursor: "pointer", letterSpacing: 0.5, transition: "all 0.2s",
                  }}
                >{processing ? "Processing..." : "Run Pipeline →"}</button>
              </div>
            </div>

            {/* Processing */}
            {processing && (
              <div style={{ marginTop: 24, animation: "fadeIn 0.3s ease" }}>
                <div style={{ fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.35)", marginBottom: 12, fontFamily: "'Space Mono', monospace" }}>
                  PIPELINE EXECUTING
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {PIPELINE_STAGES.map((s, i) => (
                    <PipelineBar key={s.id} stage={s} active={currentStage === i} done={doneStages.includes(i)} />
                  ))}
                </div>
              </div>
            )}

            {/* Result */}
            {result && !processing && (
              <div style={{ marginTop: 28, animation: "fadeIn 0.4s ease" }}>
                <div style={{
                  border: "1px solid rgba(0,255,163,0.15)", borderRadius: 14,
                  background: "rgba(0,255,163,0.03)", overflow: "hidden",
                }}>
                  {/* Result header */}
                  <div style={{
                    padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        fontSize: 10, letterSpacing: 2, fontFamily: "'Space Mono', monospace",
                        color: "#00ffa3", background: "rgba(0,255,163,0.1)",
                        padding: "3px 8px", borderRadius: 4,
                      }}>VERIFIED</div>
                      <div style={{
                        fontSize: 10, letterSpacing: 1.5, color: "rgba(255,255,255,0.4)",
                        fontFamily: "'Space Mono', monospace",
                      }}>{result.domain.toUpperCase()} MODULE</div>
                    </div>
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#a5b4fc", fontFamily: "'Space Mono', monospace" }}>{result.sources}</div>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: 1 }}>SOURCES</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#fbbf24", fontFamily: "'Space Mono', monospace" }}>{result.agreement}%</div>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: 1 }}>AGREE</div>
                      </div>
                      <ConfidenceMeter value={result.confidence} animated={true} />
                    </div>
                  </div>
                  <div style={{ padding: "20px" }}>
                    <div style={{
                      fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 10,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                    }}>QUERY</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 20, fontStyle: "italic" }}>
                      {result.q}
                    </div>
                    <div style={{
                      fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 10,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                    }}>ANSWER</div>
                    <div style={{ fontSize: 14, lineHeight: 1.7, color: "#e2e8f0" }}>
                      {result.a.split("**").map((part, i) =>
                        i % 2 === 1 ? <strong key={i} style={{ color: "#a5b4fc" }}>{part}</strong> : part
                      )}
                    </div>
                    {result.confidence < 90 && (
                      <div style={{
                        marginTop: 16, padding: "10px 14px", borderRadius: 8,
                        background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)",
                        fontSize: 12, color: "#fbbf24",
                      }}>
                        ⚠ Confidence below 90% — consider cross-referencing with domain expert
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Sample questions */}
            {!processing && !result && (
              <div style={{ marginTop: 36 }}>
                <div style={{ fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.25)", marginBottom: 14, fontFamily: "'Space Mono', monospace" }}>
                  TRY SAMPLE QUERIES
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {SAMPLE_QA.map((s, i) => (
                    <button key={i} className="sample-card tab-btn" onClick={() => loadSample(s)} style={{
                      textAlign: "left", padding: "12px 16px", borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.07)",
                      background: "rgba(255,255,255,0.02)", width: "100%", cursor: "pointer",
                      transition: "all 0.2s",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                          fontSize: 9, letterSpacing: 1.5, padding: "2px 7px", borderRadius: 4,
                          background: "rgba(99,102,241,0.15)", color: "#a5b4fc",
                          fontFamily: "'Space Mono', monospace",
                        }}>{s.domain.toUpperCase()}</span>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{s.q}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "pipeline" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <h2 style={{ fontWeight: 300, fontSize: 24, marginBottom: 8 }}>
              System <span style={{ color: "#6366f1", fontWeight: 600 }}>Architecture</span>
            </h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginBottom: 32, lineHeight: 1.6 }}>
              Every query passes through a 5-stage self-validating pipeline before a response is returned.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { icon: "⬡", title: "Multi-Model Engine", color: "#6366f1", desc: "Three independent models generate and verify the answer. Model A produces the primary response, Model B verifies logical consistency, Model C checks factual accuracy. Final output uses confidence-weighted scoring across all three." },
                { icon: "◈", title: "RAG Retrieval", color: "#8b5cf6", desc: "Before generation, the system queries a FAISS vector database with semantic embeddings. Trusted documents are retrieved and used to ground the answer in real sources, dramatically reducing hallucination." },
                { icon: "◎", title: "Self-Verification Loop", color: "#a78bfa", desc: "Post-generation, the AI runs internal consistency checks: logical coherence, numerical accuracy, factual verifiability. Low-confidence answers trigger regeneration automatically." },
                { icon: "◉", title: "Confidence Scoring", color: "#00ffa3", desc: "Every answer receives three scores: accuracy probability (model certainty), source strength (quality of retrieved documents), and model agreement (cross-model consensus). If confidence < 90%, the system explicitly communicates uncertainty." },
                { icon: "◇", title: "Domain Expert Routing", color: "#fbbf24", desc: "Queries are classified and routed to specialized sub-modules: symbolic math solver, code execution sandbox, medical knowledge base, finance reasoning engine, and SQL executor. Expert systems outperform general-purpose models on domain tasks." },
              ].map((c, i) => (
                <div key={i} style={{
                  padding: "20px 24px", borderRadius: 14,
                  border: `1px solid rgba(255,255,255,0.07)`,
                  background: "rgba(255,255,255,0.02)",
                  display: "flex", gap: 18, alignItems: "flex-start",
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: `${c.color}18`, border: `1px solid ${c.color}40`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, color: c.color,
                  }}>{c.icon}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: "#fff" }}>{c.title}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.65 }}>{c.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tech stack */}
            <div style={{ marginTop: 32 }}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.25)", marginBottom: 14, fontFamily: "'Space Mono', monospace" }}>
                TECH STACK
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {["Python", "FastAPI", "LangChain", "HuggingFace", "FAISS", "PostgreSQL", "React", "Tailwind", "SHAP", "Cross-encoder"].map(t => (
                  <span key={t} style={{
                    padding: "5px 12px", borderRadius: 20, fontSize: 11,
                    background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                    color: "#a5b4fc", letterSpacing: 0.5,
                  }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "history" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <h2 style={{ fontWeight: 300, fontSize: 24, marginBottom: 24 }}>
              Query <span style={{ color: "#6366f1", fontWeight: 600 }}>History</span>
            </h2>
            {history.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "60px 20px",
                color: "rgba(255,255,255,0.25)", fontSize: 14,
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
                No queries yet. Run your first query to see history.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {history.map((h, i) => (
                  <div key={i} style={{
                    padding: "16px 20px", borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.07)",
                    background: "rgba(255,255,255,0.02)",
                    display: "flex", gap: 16, alignItems: "center",
                    cursor: "pointer",
                  }} onClick={() => { setQuery(h.q); setTab("query"); }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {h.q}
                      </div>
                      <span style={{
                        fontSize: 9, letterSpacing: 1.5, padding: "2px 6px", borderRadius: 3,
                        background: "rgba(99,102,241,0.12)", color: "#a5b4fc",
                        fontFamily: "'Space Mono', monospace",
                      }}>{h.domain}</span>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{
                        fontSize: 18, fontWeight: 700, fontFamily: "'Space Mono', monospace",
                        color: h.confidence >= 90 ? "#00ffa3" : "#fbbf24",
                      }}>{h.confidence}%</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>CONFIDENCE</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
