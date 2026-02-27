// src/App.jsx
import { useState, useEffect, useRef } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import * as api from "./api/client";

/* ─── Global CSS ─────────────────────────────────────────────────────────── */
const G = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Mono:wght@300;400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#07080d;--s1:#0c0e15;--s2:#11141d;--s3:#171b27;
  --b1:#1c2030;--b2:#252b3d;--b3:#2e364f;
  --a1:#3dffa0;--a2:#3d9fff;--a3:#ff6b3d;--a4:#ffd93d;
  --t1:#edf0f8;--t2:#8b93ab;--t3:#4e5670;--t4:#2a3048;
  --danger:#ff3b5c;--warn:#ffaa30;--ok:#3dffa0;
  --r1:6px;--r2:10px;
}
body{background:var(--bg);color:var(--t1);font-family:'IBM Plex Mono',monospace;font-size:13px;line-height:1.6}
input,select,textarea,button{font-family:'IBM Plex Mono',monospace}
::-webkit-scrollbar{width:3px;height:3px}
::-webkit-scrollbar-track{background:var(--s1)}
::-webkit-scrollbar-thumb{background:var(--b2);border-radius:2px}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes glow{0%,100%{box-shadow:0 0 8px #3dffa040}50%{box-shadow:0 0 20px #3dffa080}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
`;

/* ─── Risk utils ─────────────────────────────────────────────────────────── */
const RISK_COLOR = {LOW:"#3dffa0",MEDIUM:"#ffd93d",HIGH:"#ff6b3d",CRITICAL:"#ff3b5c"};
const RISK_BG    = {LOW:"#3dffa010",MEDIUM:"#ffd93d10",HIGH:"#ff6b3d12",CRITICAL:"#ff3b5c15"};
const riskLevel  = s => s>=.75?"CRITICAL":s>=.5?"HIGH":s>=.25?"MEDIUM":"LOW";

/* ─── UI Primitives ──────────────────────────────────────────────────────── */
const Badge = ({level}) => {
  const c=RISK_COLOR[level]||"#8b93ab";
  return <span style={{background:RISK_BG[level]||"#8b93ab10",color:c,border:`1px solid ${c}40`,padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:600,letterSpacing:"0.1em",whiteSpace:"nowrap"}}>{level}</span>;
};
const ScoreBar = ({score}) => {
  const c=RISK_COLOR[riskLevel(score)];
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{flex:1,height:3,background:"#1c2030",borderRadius:2,overflow:"hidden"}}>
        <div style={{width:`${score*100}%`,height:"100%",background:c,transition:"width .5s ease"}}/>
      </div>
      <span style={{fontSize:11,color:c,fontWeight:600,minWidth:30,textAlign:"right"}}>{(score*100).toFixed(0)}%</span>
    </div>
  );
};
const Card = ({children,style={}}) => <div style={{background:"var(--s1)",border:"1px solid var(--b1)",borderRadius:"var(--r2)",padding:20,...style}}>{children}</div>;
const Btn = ({children,onClick,variant="primary",disabled=false,style={}}) => {
  const v = {primary:{background:"var(--a1)",color:"#000",border:"none"},secondary:{background:"var(--s2)",color:"var(--t2)",border:"1px solid var(--b1)"},danger:{background:"var(--danger)15",color:"var(--danger)",border:"1px solid var(--danger)40"},ghost:{background:"transparent",color:"var(--t3)",border:"1px solid var(--b1)"}};
  return <button onClick={onClick} disabled={disabled} style={{...v[variant],borderRadius:"var(--r1)",padding:"8px 16px",fontSize:12,fontWeight:600,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,letterSpacing:"0.03em",...style}}>{children}</button>;
};
const Inp = ({label,value,onChange,placeholder,type="text"}) => (
  <div style={{display:"flex",flexDirection:"column",gap:5}}>
    {label&&<label style={{fontSize:10,color:"var(--t3)",letterSpacing:"0.1em",textTransform:"uppercase"}}>{label}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:"var(--r1)",padding:"9px 11px",color:"var(--t1)",fontSize:12,outline:"none",transition:"border .15s"}}
      onFocus={e=>e.target.style.borderColor="var(--b3)"}
      onBlur={e=>e.target.style.borderColor="var(--b1)"}/>
  </div>
);
const Sel = ({label,value,onChange,opts}) => (
  <div style={{display:"flex",flexDirection:"column",gap:5}}>
    {label&&<label style={{fontSize:10,color:"var(--t3)",letterSpacing:"0.1em",textTransform:"uppercase"}}>{label}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)} style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:"var(--r1)",padding:"9px 11px",color:"var(--t1)",fontSize:12,outline:"none"}}>{opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>
  </div>
);
const Spinner = ({size=20,color="var(--a1)"}) => <div style={{width:size,height:size,borderRadius:"50%",border:`2px solid ${color}30`,borderTopColor:color,animation:"spin .7s linear infinite",flexShrink:0}}/>;
const Tag = ({children,color="var(--a1)"}) => <span style={{background:`${color}18`,color,border:`1px solid ${color}35`,padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:500,whiteSpace:"nowrap"}}>{children}</span>;
const Divider = () => <div style={{height:1,background:"var(--b1)",margin:"16px -20px"}}/>;
const SHead = ({children,sub}) => (
  <div style={{marginBottom:18}}>
    <h2 style={{fontFamily:"'DM Serif Display',serif",fontWeight:400,fontSize:20}}>{children}</h2>
    {sub&&<p style={{fontSize:10,color:"var(--t4)",marginTop:2}}>{sub}</p>}
  </div>
);

/* ─── Root ───────────────────────────────────────────────────────────────── */
export default function Root() {
  return (
    <AuthProvider>
      <style>{G}</style>
      <AppShell/>
    </AuthProvider>
  );
}

function AppShell() {
  const { user, logout, loading } = useAuth();
  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh"}}><Spinner size={32}/></div>;
  if (!user)   return <AuthPage/>;
  return <App user={user} logout={logout}/>;
}

/* ─── Main App ───────────────────────────────────────────────────────────── */
function App({ user, logout }) {
  const [page,    setPage]    = useState("new");
  const [report,  setReport]  = useState(null);
  const [reports, setReports] = useState([]);
  const [section, setSection] = useState(0);
  const [loadingReports, setLoadingReports] = useState(false);

  const loadReports = async () => {
    setLoadingReports(true);
    try { setReports(await api.listReports()); }
    catch(e) { console.error(e); }
    finally { setLoadingReports(false); }
  };

  useEffect(() => { loadReports(); }, []);

  const openReport = r => { setReport(r); setPage("report"); setSection(0); };
  const handleDelete = async id => {
    await api.deleteReport(id);
    setReports(p => p.filter(r=>r.id!==id));
  };

  const NAV = [
    {id:"new",icon:"⊕",label:"New Audit"},
    {id:"reports",icon:"≡",label:"Reports"},
    {id:"frameworks",icon:"◫",label:"Frameworks"},
  ];

  return (
    <div style={{display:"flex",minHeight:"100vh"}}>
      {/* Sidebar */}
      <aside style={{width:200,background:"var(--s1)",borderRight:"1px solid var(--b1)",display:"flex",flexDirection:"column",position:"fixed",top:0,left:0,height:"100vh",zIndex:50}}>
        <div style={{padding:"18px 16px",borderBottom:"1px solid var(--b1)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:"var(--a1)",animation:"glow 2s ease infinite"}}/>
            <span style={{fontFamily:"'DM Serif Display',serif",fontSize:16}}>AuditAI</span>
          </div>
          <div style={{fontSize:9,color:"var(--t4)",marginTop:3,letterSpacing:"0.08em"}}>COMPLIANCE PLATFORM</div>
        </div>

        <nav style={{flex:1,padding:"12px 8px"}}>
          {NAV.map(n=>(
            <div key={n.id} onClick={()=>setPage(n.id)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:"var(--r1)",cursor:"pointer",marginBottom:2,
                background:(page===n.id||(page==="report"&&n.id==="new"))?"var(--s2)":"transparent",
                color:(page===n.id||(page==="report"&&n.id==="new"))?"var(--a1)":"var(--t3)",
                border:(page===n.id||(page==="report"&&n.id==="new"))?"1px solid var(--b2)":"1px solid transparent",
                transition:"all .15s"}}>
              <span style={{fontSize:14}}>{n.icon}</span>
              <span style={{fontSize:12}}>{n.label}</span>
              {n.id==="reports"&&reports.length>0&&(
                <span style={{marginLeft:"auto",background:"var(--b2)",color:"var(--t3)",borderRadius:10,padding:"1px 6px",fontSize:9}}>{reports.length}</span>
              )}
            </div>
          ))}
        </nav>

        <div style={{padding:"12px 16px",borderTop:"1px solid var(--b1)"}}>
          <div style={{fontSize:10,color:"var(--t3)",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>
          <div style={{fontSize:9,color:"var(--t4)",marginBottom:8}}>{user.orgName||"Organisation"}</div>
          <Btn variant="ghost" onClick={logout} style={{width:"100%",fontSize:10,padding:"5px"}}>Sign Out</Btn>
        </div>
      </aside>

      {/* Main */}
      <main style={{marginLeft:200,flex:1,padding:32,minHeight:"100vh"}}>
        {page==="new"        && <NewAuditPage onReportReady={r=>{setReport(r);setPage("report");setSection(0);loadReports();}} user={user}/>}
        {page==="report"     && report && <ReportPage report={report} section={section} setSection={setSection}/>}
        {page==="reports"    && <ReportsPage reports={reports} loading={loadingReports} onOpen={openReport} onDelete={handleDelete}/>}
        {page==="frameworks" && <FrameworksPage/>}
      </main>
    </div>
  );
}

/* ─── New Audit Page ─────────────────────────────────────────────────────── */
function NewAuditPage({ onReportReady, user }) {
  const [tab, setTab] = useState("upload");
  const [form, setForm] = useState({
    modelName:"", modelVersion:"", orgName:user.orgName||"",
    useCase:"", deployEnv:"production", trainingData:"",
    oversightPolicy:"", incidentPolicy:"", framework:"all",
  });
  const setF = k => v => setForm(p=>({...p,[k]:v}));

  const [manualMetrics, setManual] = useState({
    bias_score:0.3, hallucination_score:0.3, toxicity_score:0.1,
    robustness_score:0.3, explainability_score:0.4, data_leakage_score:0.2, drift_score:0.25,
  });
  const setM = k => v => setManual(p=>({...p,[k]:parseFloat(v)}));

  // Upload state
  const [uploadResult, setUploadResult] = useState(null);
  const [uploading,    setUploading]    = useState(false);
  const [uploadError,  setUploadError]  = useState("");
  const fileRef = useRef();

  // Generate state
  const [generating, setGenerating] = useState(false);
  const [genStep,    setGenStep]    = useState("");
  const [genError,   setGenError]   = useState("");

  const handleFile = async file => {
    if (!file) return;
    setUploading(true); setUploadError(""); setUploadResult(null);
    try {
      const result = await api.uploadFile(file);
      setUploadResult(result);
      // Auto-fill metrics from backend-computed scores
      if (result.scores) {
        const s = result.scores;
        setManual({
          bias_score:          s.bias          || 0.3,
          hallucination_score: s.hallucination || 0.3,
          toxicity_score:      s.toxicity      || 0.1,
          robustness_score:    s.robustness    || 0.3,
          explainability_score:s.explainability|| 0.4,
          data_leakage_score:  s.data_leakage  || 0.2,
          drift_score:         s.drift         || 0.25,
        });
      }
    } catch(e) { setUploadError(e.message); }
    finally { setUploading(false); }
  };

  const handleGenerate = async () => {
    if (!form.modelName) { setGenError("Model name is required"); return; }
    setGenerating(true); setGenError("");

    const steps = [
      "Validating inputs...",
      "Computing risk scores...",
      "Mapping compliance frameworks...",
      "Calling Claude AI for analysis...",
      "Compiling audit report...",
    ];

    for (const s of steps) {
      setGenStep(s);
      await new Promise(r=>setTimeout(r,400));
    }

    try {
      const payload = {
        model_name:       form.modelName,
        model_version:    form.modelVersion,
        org_name:         form.orgName,
        use_case:         form.useCase,
        deploy_env:       form.deployEnv,
        training_data:    form.trainingData,
        oversight_policy: form.oversightPolicy,
        incident_policy:  form.incidentPolicy,
        framework:        form.framework,
        ...(uploadResult?.upload_id
          ? { upload_id: uploadResult.upload_id }
          : manualMetrics
        ),
      };
      const report = await api.generateReport(payload);
      onReportReady(report);
    } catch(e) {
      setGenError(e.message);
      setGenerating(false);
    }
  };

  const METRIC_LABELS = {
    bias_score:"Bias / Fairness", hallucination_score:"Hallucination Rate",
    toxicity_score:"Toxicity", robustness_score:"Robustness Risk",
    explainability_score:"Explainability Gap", data_leakage_score:"Data Leakage",
    drift_score:"Model Drift",
  };

  if (generating) {
    return (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"70vh",gap:28,animation:"fadeUp .4s ease"}}>
        <Spinner size={48}/>
        <div style={{textAlign:"center"}}>
          <h2 style={{fontFamily:"'DM Serif Display',serif",fontWeight:400,fontSize:22,marginBottom:16}}>Generating Audit Report</h2>
          <div style={{fontSize:12,color:"var(--a1)",display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}>
            <Spinner size={10}/>{genStep}
          </div>
          {uploadResult && <div style={{marginTop:12,fontSize:11,color:"var(--t3)"}}>Using real scores from {uploadResult.row_count} rows · {uploadResult.filename}</div>}
        </div>
        {genError && (
          <div style={{background:"var(--danger)15",border:"1px solid var(--danger)40",borderRadius:"var(--r1)",padding:"10px 16px",fontSize:12,color:"var(--danger)",maxWidth:400,textAlign:"center"}}>
            ⚠ {genError}
            <br/><button onClick={()=>setGenerating(false)} style={{marginTop:8,background:"transparent",border:"1px solid var(--danger)40",color:"var(--danger)",borderRadius:4,padding:"4px 12px",cursor:"pointer",fontSize:11}}>Go Back</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{animation:"fadeUp .4s ease",maxWidth:1000}}>
      <div style={{marginBottom:28}}>
        <div style={{fontSize:10,color:"var(--a1)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6}}>New Compliance Audit</div>
        <h1 style={{fontFamily:"'DM Serif Display',serif",fontWeight:400,fontSize:28}}>AI System Audit</h1>
        <p style={{color:"var(--t3)",fontSize:12,marginTop:4}}>Scores computed by real backend · Claude AI analysis · EU AI Act · GDPR · NIST · ISO 42001</p>
      </div>

      {genError && <div style={{background:"var(--danger)15",border:"1px solid var(--danger)40",borderRadius:"var(--r1)",padding:"10px 16px",fontSize:12,color:"var(--danger)",marginBottom:16}}>⚠ {genError}</div>}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        {/* Left */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <Card>
            <h3 style={{fontFamily:"'DM Serif Display',serif",fontWeight:400,fontSize:16,marginBottom:16}}>System Information</h3>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <Inp label="Organisation Name" value={form.orgName} onChange={setF("orgName")} placeholder="Acme Financial Ltd"/>
              <Inp label="Model / System Name *" value={form.modelName} onChange={setF("modelName")} placeholder="CreditRisk-LLM"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <Inp label="Version" value={form.modelVersion} onChange={setF("modelVersion")} placeholder="2.1.0"/>
                <Sel label="Environment" value={form.deployEnv} onChange={setF("deployEnv")}
                  opts={[{v:"production",l:"Production"},{v:"staging",l:"Staging"},{v:"research",l:"Research"},{v:"poc",l:"Proof of Concept"}]}/>
              </div>
              <Inp label="Use Case / Domain" value={form.useCase} onChange={setF("useCase")} placeholder="Credit scoring for retail banking"/>
              <Inp label="Training Data Source" value={form.trainingData} onChange={setF("trainingData")} placeholder="Internal transactions 2018–2023"/>
            </div>
          </Card>

          <Card>
            <h3 style={{fontFamily:"'DM Serif Display',serif",fontWeight:400,fontSize:16,marginBottom:16}}>Governance & Policies</h3>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <Inp label="Human Oversight Policy" value={form.oversightPolicy} onChange={setF("oversightPolicy")} placeholder="Human review for all high-risk decisions"/>
              <Inp label="Incident Response Policy" value={form.incidentPolicy} onChange={setF("incidentPolicy")} placeholder="24hr escalation to compliance team"/>
              <Sel label="Compliance Framework" value={form.framework} onChange={setF("framework")}
                opts={[{v:"all",l:"All (EU AI Act + GDPR + NIST + ISO)"},{v:"euai",l:"EU AI Act only"},{v:"nist",l:"NIST AI RMF only"},{v:"gdpr",l:"GDPR only"},{v:"iso",l:"ISO 42001 only"}]}/>
            </div>
          </Card>
        </div>

        {/* Right */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <Card>
            {/* Tabs */}
            <div style={{display:"flex",gap:0,marginBottom:16,background:"var(--s2)",borderRadius:"var(--r1)",padding:3}}>
              {[["upload","↑ Upload File (Real Scoring)"],["manual","⊞ Manual Entry"]].map(([t,l])=>(
                <div key={t} onClick={()=>setTab(t)}
                  style={{flex:1,textAlign:"center",padding:"7px",borderRadius:"var(--r1)",cursor:"pointer",fontSize:11,fontWeight:600,
                    background:tab===t?"var(--s1)":"transparent",
                    color:tab===t?"var(--a1)":"var(--t3)",
                    border:tab===t?"1px solid var(--b2)":"1px solid transparent",transition:"all .15s"}}>
                  {l}
                </div>
              ))}
            </div>

            {tab==="upload" && (
              <div>
                <div
                  onClick={()=>fileRef.current?.click()}
                  onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}}
                  onDragOver={e=>e.preventDefault()}
                  style={{border:"1px dashed var(--b2)",borderRadius:"var(--r2)",padding:"28px 20px",textAlign:"center",cursor:"pointer",background:"var(--s2)",transition:"border .2s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="var(--a1)"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="var(--b2)"}>
                  {uploading ? (
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}><Spinner/><span style={{fontSize:12,color:"var(--t2)"}}>Computing real scores...</span></div>
                  ) : (
                    <>
                      <div style={{fontSize:24,marginBottom:8}}>⇪</div>
                      <div style={{fontSize:12,color:"var(--t2)",marginBottom:4}}>Drop your model output CSV or JSON</div>
                      <div style={{fontSize:10,color:"var(--t3)"}}>Backend computes real bias, toxicity, hallucination scores</div>
                    </>
                  )}
                  <input ref={fileRef} type="file" accept=".csv,.json" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
                </div>

                {uploadError && (
                  <div style={{marginTop:10,padding:"10px 12px",background:"var(--danger)10",border:"1px solid var(--danger)30",borderRadius:"var(--r1)",fontSize:11,color:"var(--danger)"}}>
                    ⚠ {uploadError}
                  </div>
                )}

                {uploadResult && (
                  <div style={{marginTop:10,padding:"12px 14px",background:"var(--a1)08",border:"1px solid var(--a1)30",borderRadius:"var(--r1)"}}>
                    <div style={{fontSize:11,color:"var(--a1)",fontWeight:600,marginBottom:8}}>✓ Scores computed from real data</div>
                    <div style={{fontSize:10,color:"var(--t3)",marginBottom:8}}>{uploadResult.row_count} rows · {uploadResult.filename}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                      {Object.entries(uploadResult.scores||{}).map(([k,v])=>(
                        <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"4px 8px",background:"var(--s2)",borderRadius:4}}>
                          <span style={{fontSize:9,color:"var(--t3)"}}>{k.replace(/_/g," ")}</span>
                          <Badge level={riskLevel(v)}/>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{marginTop:10,padding:"10px 12px",background:"var(--s2)",borderRadius:"var(--r1)"}}>
                  <div style={{fontSize:9,color:"var(--t4)",marginBottom:5,letterSpacing:"0.06em"}}>SAMPLE CSV COLUMNS THE BACKEND DETECTS</div>
                  <div style={{fontSize:10,color:"var(--t3)",lineHeight:1.8}}>decision, confidence, ground_truth, response, gender, race, age, prompt, explanation</div>
                  <a href="http://localhost:8000/upload/sample-csv" target="_blank" rel="noreferrer" style={{fontSize:10,color:"var(--a2)",display:"block",marginTop:6}}>
                    View full expected format →
                  </a>
                </div>
              </div>
            )}

            {tab==="manual" && (
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <div style={{fontSize:10,color:"var(--t4)",lineHeight:1.7}}>Enter scores manually (0 = no risk, 1 = max risk). Use file upload for real measurement.</div>
                {Object.entries(METRIC_LABELS).map(([key,label])=>{
                  const num = manualMetrics[key]; const lvl=riskLevel(num); const c=RISK_COLOR[lvl];
                  return (
                    <div key={key}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                        <span style={{fontSize:11,fontWeight:600}}>{label}</span>
                        <div style={{display:"flex",alignItems:"center",gap:6}}><Badge level={lvl}/><span style={{fontSize:11,color:c,fontWeight:700}}>{(num*100).toFixed(0)}%</span></div>
                      </div>
                      <input type="range" min="0" max="1" step="0.01" value={num} onChange={e=>setM(key)(e.target.value)} style={{width:"100%",accentColor:c}}/>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Source badge */}
          <div style={{padding:"10px 14px",background:"var(--s2)",borderRadius:"var(--r1)",border:"1px solid var(--b1)",fontSize:11,color:"var(--t3)",display:"flex",alignItems:"center",gap:8}}>
            {uploadResult
              ? <><span style={{color:"var(--a1)"}}>✓</span> Real scores from <strong style={{color:"var(--t1)"}}>{uploadResult.filename}</strong> · {uploadResult.row_count} rows</>
              : <><span style={{color:"var(--warn)"}}>○</span> {tab==="upload"?"Drop a CSV/JSON above for real measurement":"Using manual scores — file upload gives real measurement"}</>
            }
          </div>
        </div>
      </div>

      <div style={{marginTop:24,display:"flex",justifyContent:"flex-end",gap:10}}>
        <Btn variant="secondary" onClick={()=>{setUploadResult(null);setGenError("");}}>Reset</Btn>
        <Btn onClick={handleGenerate} disabled={!form.modelName}>
          {uploadResult ? `Generate Report from Real Data (${uploadResult.row_count} rows) →` : "Generate Audit Report →"}
        </Btn>
      </div>
    </div>
  );
}

/* ─── Report Page ────────────────────────────────────────────────────────── */
function ReportPage({ report, section, setSection }) {
  const r = report;
  const metrics = r.metrics || {};
  const full    = r.full_report || {};
  const ai      = full.ai_analysis || {};
  const risks   = full.risks || [];
  const summary = full.summary || {};

  const SECTIONS = ["Executive Summary","System Description","Risk Breakdown","Compliance Mapping","Governance","Recommendations"];

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(report,null,2)],{type:"application/json"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download=`AuditAI_${r.model_name||"report"}_${new Date(r.created_at).toISOString().slice(0,10)}.json`;
    a.click();
  };

  return (
    <div style={{animation:"fadeUp .4s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <div style={{fontSize:10,color:"var(--a1)",letterSpacing:"0.12em",textTransform:"uppercase"}}>Audit Report</div>
            {full.data_source?.has_real_data && <Tag color="var(--a2)">Real Data · {full.data_source.row_count} rows</Tag>}
            {ai.executiveSummary && <Tag color="var(--a4)">Claude AI Enhanced</Tag>}
          </div>
          <h1 style={{fontFamily:"'DM Serif Display',serif",fontWeight:400,fontSize:24}}>{r.model_name||"AI System"}</h1>
          <p style={{color:"var(--t3)",fontSize:12,marginTop:3}}>{r.org_name} · {new Date(r.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})}</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="ghost" onClick={handleExport}>↓ JSON</Btn>
          <Btn variant="secondary" onClick={()=>window.print()}>⎙ Print / PDF</Btn>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
        {[
          {l:"Overall Risk",    v:r.overall_risk,         c:RISK_COLOR[r.overall_risk]},
          {l:"Readiness",       v:`${r.readiness_pct}%`,  c:r.readiness_pct>=70?"var(--ok)":"var(--warn)"},
          {l:"Critical Issues", v:summary.critical||0,    c:(summary.critical||0)>0?"var(--danger)":"var(--ok)"},
          {l:"High Risks",      v:summary.high||0,        c:(summary.high||0)>0?"var(--warn)":"var(--ok)"},
        ].map(({l,v,c})=>(
          <Card key={l} style={{textAlign:"center"}}>
            <div style={{fontSize:9,color:"var(--t4)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>{l}</div>
            <div style={{fontFamily:"'DM Serif Display',serif",fontWeight:400,fontSize:28,color:c}}>{v}</div>
          </Card>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"180px 1fr",gap:20}}>
        {/* Nav */}
        <Card style={{padding:6,alignSelf:"start"}}>
          {SECTIONS.map((s,i)=>(
            <div key={s} onClick={()=>setSection(i)}
              style={{padding:"9px 11px",borderRadius:6,cursor:"pointer",fontSize:11,marginBottom:2,
                color:section===i?"var(--a1)":"var(--t3)",
                background:section===i?"var(--s2)":"transparent",
                border:section===i?"1px solid var(--b2)":"1px solid transparent",transition:"all .15s"}}>
              <span style={{marginRight:8,color:"var(--t4)",fontSize:10}}>{String(i+1).padStart(2,"0")}</span>{s}
            </div>
          ))}
        </Card>

        {/* Content */}
        <div style={{animation:"fadeUp .25s ease"}}>
          {section===0 && <ExecSection report={r} ai={ai} summary={summary} risks={risks}/>}
          {section===1 && <SystemSection report={r} full={full}/>}
          {section===2 && <RiskSection risks={risks} metrics={metrics}/>}
          {section===3 && <ComplianceSection risks={risks}/>}
          {section===4 && <GovernanceSection report={r} full={full}/>}
          {section===5 && <RecsSection risks={risks} ai={ai}/>}
        </div>
      </div>
    </div>
  );
}

function ExecSection({report:r, ai, summary, risks}) {
  const top3 = [...risks].sort((a,b)=>b.score-a.score).slice(0,3);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {ai.executiveSummary && (
        <Card style={{borderColor:"#ffd93d30"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><Tag color="var(--a4)">Claude AI Analysis</Tag></div>
          <p style={{fontSize:13,color:"var(--t2)",lineHeight:1.8,marginBottom:12}}>{ai.executiveSummary}</p>
          {ai.topPriority && (<><Divider/><div style={{marginTop:12}}><div style={{fontSize:10,color:"var(--t4)",marginBottom:6}}>TOP PRIORITY</div><p style={{fontSize:13,color:"var(--a1)",fontWeight:600}}>{ai.topPriority}</p></div></>)}
          {ai.readinessAssessment && <div style={{marginTop:12,padding:"10px 12px",background:"var(--s2)",borderRadius:"var(--r1)"}}><div style={{fontSize:10,color:"var(--t4)",marginBottom:4}}>READINESS ASSESSMENT</div><p style={{fontSize:12,color:"var(--t2)"}}>{ai.readinessAssessment}</p></div>}
        </Card>
      )}
      <Card>
        <SHead>Executive Summary</SHead>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
          {[{l:"Overall Risk",v:r.overall_risk,c:RISK_COLOR[r.overall_risk]},{l:"Readiness",v:`${r.readiness_pct}%`,c:r.readiness_pct>=70?"var(--ok)":"var(--warn)"},{l:"Critical",v:summary.critical||0,c:(summary.critical||0)>0?"var(--danger)":"var(--ok)"},{l:"High",v:summary.high||0,c:(summary.high||0)>0?"var(--warn)":"var(--ok)"}].map(({l,v,c})=>(
            <div key={l} style={{padding:"12px 14px",background:"var(--s2)",borderRadius:"var(--r1)",border:"1px solid var(--b1)"}}>
              <div style={{fontSize:9,color:"var(--t4)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5}}>{l}</div>
              <div style={{fontSize:20,fontFamily:"'DM Serif Display',serif",color:c}}>{v}</div>
            </div>
          ))}
        </div>
        <Divider/>
        <div style={{marginTop:16}}>
          <div style={{fontSize:10,color:"var(--t4)",marginBottom:12}}>TOP 3 FINDINGS</div>
          {top3.map((r,i)=>(
            <div key={r.key} style={{display:"flex",gap:12,padding:"12px 14px",marginBottom:8,background:"var(--s2)",borderRadius:"var(--r1)",borderLeft:`3px solid ${RISK_COLOR[r.level]}`}}>
              <span style={{color:"var(--t4)",fontSize:11}}>{i+1}.</span>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,marginBottom:3}}>{r.label}</div><div style={{fontSize:11,color:"var(--t3)"}}>{r.mitigation?.split(".")[0]}.</div></div>
              <Badge level={r.level}/>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SystemSection({report:r, full}) {
  const sys = full.system || {};
  const ds  = full.data_source || {};
  const rows = [
    ["Model Name",         r.model_name||"—"],
    ["Organisation",       r.org_name||"—"],
    ["Version",            sys.model_version||"—"],
    ["Deployment Env",     sys.deploy_env||"—"],
    ["Use Case",           r.use_case||"—"],
    ["Training Data",      sys.training_data||"—"],
    ["Human Oversight",    sys.oversight_policy||"Not specified"],
    ["Incident Response",  sys.incident_policy||"Not specified"],
    ["Data Source",        ds.has_real_data?`Real model outputs (${ds.row_count} rows)`:"Manual entry"],
    ["Measurement Method", ds.measurement_method||"—"],
    ["Frameworks",         (full.compliance_frameworks||[]).join(" · ")||"—"],
    ["Risk Classification","HIGH RISK — EU AI Act Annex III"],
  ];
  return (
    <Card>
      <SHead>System Description</SHead>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {rows.map(([l,v])=>(
          <div key={l} style={{padding:"11px 13px",background:"var(--s2)",borderRadius:"var(--r1)",border:"1px solid var(--b1)"}}>
            <div style={{fontSize:9,color:"var(--t4)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>{l}</div>
            <div style={{fontSize:12,color:"var(--t1)"}}>{v}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RiskSection({risks, metrics}) {
  const m = metrics;
  const displayRisks = risks.length > 0 ? risks : Object.entries(m).map(([k,v])=>({key:k,label:k,score:v,level:riskLevel(v),compliance:[],mitigation:""}));
  return (
    <Card>
      <SHead>Risk Breakdown</SHead>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead>
            <tr>{["Dimension","Score","Level","Primary Regulation","Mitigation"].map(h=>(
              <th key={h} style={{textAlign:"left",padding:"8px 10px",borderBottom:"1px solid var(--b1)",color:"var(--t4)",fontSize:9,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:500,whiteSpace:"nowrap"}}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {displayRisks.map((r,i)=>(
              <tr key={r.key} style={{borderBottom:"1px solid var(--b1)",background:i%2?"var(--s2)":"transparent"}}>
                <td style={{padding:"11px 10px",fontWeight:600,whiteSpace:"nowrap"}}>{r.label}</td>
                <td style={{padding:"11px 10px",minWidth:110}}><ScoreBar score={r.score}/></td>
                <td style={{padding:"11px 10px"}}><Badge level={r.level}/></td>
                <td style={{padding:"11px 10px",color:"var(--a2)",fontSize:10}}>{r.compliance?.[0]?.ref||"—"}</td>
                <td style={{padding:"11px 10px",color:"var(--t3)",maxWidth:220,fontSize:10}}>{r.mitigation?.split(".")[0]||"—"}.</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ComplianceSection({risks}) {
  const all = risks.flatMap(r=>(r.compliance||[]).map(c=>({...c,riskLabel:r.label,level:r.level})));
  const grouped = all.reduce((acc,m)=>{ (acc[m.framework]??=[]).push(m); return acc; },{});
  const FW_COLOR = {"EU AI Act":"var(--a1)","GDPR":"var(--a2)","NIST AI RMF":"var(--a3)","ISO 42001":"var(--a4)"};
  if (Object.keys(grouped).length===0) return <Card><SHead>Compliance Mapping</SHead><p style={{color:"var(--t3)",fontSize:12}}>No compliance data available.</p></Card>;
  return (
    <Card>
      <SHead>Compliance Mapping</SHead>
      {Object.entries(grouped).map(([fw,items])=>(
        <div key={fw} style={{marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <div style={{width:3,height:16,background:FW_COLOR[fw]||"var(--a1)",borderRadius:2}}/>
            <span style={{fontSize:13,fontWeight:600,color:FW_COLOR[fw]||"var(--a1)"}}>{fw}</span>
          </div>
          {items.map((item,i)=>(
            <div key={i} style={{display:"flex",gap:12,alignItems:"center",padding:"9px 12px",marginBottom:5,background:"var(--s2)",borderRadius:"var(--r1)"}}>
              <span style={{fontSize:11,color:FW_COLOR[fw]||"var(--a1)",fontWeight:600,minWidth:90,flexShrink:0}}>{item.ref}</span>
              <span style={{fontSize:11,color:"var(--t2)",flex:1}}>{item.desc}</span>
              <Badge level={item.level}/>
            </div>
          ))}
        </div>
      ))}
    </Card>
  );
}

function GovernanceSection({report:r, full}) {
  const sys = full.system||{};
  const checks = [
    {l:"Human Oversight Mechanism",  v:sys.oversight_policy||"Not defined — required under EU AI Act Art. 14", ok:!!sys.oversight_policy},
    {l:"Incident Escalation Workflow",v:sys.incident_policy||"Not defined — establish escalation path", ok:!!sys.incident_policy},
    {l:"Immutable Audit Logging",     v:"Tamper-proof logs required under EU AI Act Art. 12", ok:false},
    {l:"Performance Monitoring",      v:"Implement automated drift detection (Evidently AI, WhyLabs)", ok:false},
    {l:"Model Documentation",         v:"Formal model card required per EU AI Act Art. 11", ok:false},
    {l:"Data Governance Policy",      v:"Document data provenance and access controls per GDPR Art. 5", ok:false},
  ];
  return (
    <Card>
      <SHead>Governance Review</SHead>
      {checks.map(({l,v,ok})=>(
        <div key={l} style={{display:"flex",gap:14,padding:"14px 0",borderBottom:"1px solid var(--b1)"}}>
          <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,marginTop:1,background:ok?"var(--ok)20":"var(--warn)20",border:`1px solid ${ok?"var(--ok)":"var(--warn)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:ok?"var(--ok)":"var(--warn)"}}>{ok?"✓":"!"}</div>
          <div><div style={{fontSize:12,fontWeight:600,marginBottom:4}}>{l}</div><div style={{fontSize:11,color:"var(--t3)",lineHeight:1.6}}>{v}</div></div>
        </div>
      ))}
    </Card>
  );
}

function RecsSection({risks, ai}) {
  const sorted = [...risks].sort((a,b)=>{const o={CRITICAL:0,HIGH:1,MEDIUM:2,LOW:3};return o[a.level]-o[b.level];}).filter(r=>r.level!=="LOW");
  const TL = {CRITICAL:"Immediate (0–2 weeks)",HIGH:"Short-term (2–6 weeks)",MEDIUM:"Medium-term (1–3 months)"};
  const EF = {CRITICAL:"High",HIGH:"Medium–High",MEDIUM:"Medium"};
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {ai.recommendations?.length>0 && (
        <Card style={{borderColor:"#ffd93d30"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}><SHead>AI-Generated Recommendations</SHead><Tag color="var(--a4)">Claude AI</Tag></div>
          {ai.recommendations.map((rec,i)=>(
            <div key={i} style={{padding:"14px",marginBottom:10,background:"var(--s2)",borderRadius:"var(--r1)",borderLeft:"3px solid var(--a4)"}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>{i+1}. {rec.title}</div>
              <p style={{fontSize:12,color:"var(--t2)",lineHeight:1.7,marginBottom:10}}>{rec.detail}</p>
              <div style={{display:"flex",gap:14,fontSize:10,color:"var(--t4)"}}>
                <span>⏱ {rec.timeline}</span><span>⚙ {rec.effort}</span>{rec.regulation&&<span>📋 {rec.regulation}</span>}
              </div>
            </div>
          ))}
        </Card>
      )}
      <Card>
        <SHead>Rule-Based Recommendations</SHead>
        {sorted.length===0
          ? <p style={{color:"var(--ok)",fontSize:13}}>✓ No critical or high risks. Continue monitoring.</p>
          : sorted.map((r,i)=>(
            <div key={r.key} style={{padding:"14px",marginBottom:10,background:"var(--s2)",borderRadius:"var(--r1)",borderLeft:`3px solid ${RISK_COLOR[r.level]}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{fontSize:13,fontWeight:600}}>Address {r.label}</div><Badge level={r.level}/>
              </div>
              <p style={{fontSize:12,color:"var(--t2)",lineHeight:1.7,marginBottom:10}}>{r.mitigation}</p>
              <div style={{display:"flex",gap:14,fontSize:10,color:"var(--t4)"}}>
                <span>⏱ {TL[r.level]}</span><span>⚙ {EF[r.level]}</span>
                {r.compliance?.[0]&&<span>📋 {r.compliance[0].framework} {r.compliance[0].ref}</span>}
              </div>
            </div>
          ))
        }
      </Card>
    </div>
  );
}

/* ─── Reports History ────────────────────────────────────────────────────── */
function ReportsPage({reports, loading, onOpen, onDelete}) {
  const [confirm, setConfirm] = useState(null);
  return (
    <div style={{animation:"fadeUp .4s ease",maxWidth:860}}>
      <div style={{marginBottom:28}}>
        <div style={{fontSize:10,color:"var(--a1)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6}}>Saved Reports</div>
        <h1 style={{fontFamily:"'DM Serif Display',serif",fontWeight:400,fontSize:28}}>Audit History</h1>
        <p style={{color:"var(--t3)",fontSize:12,marginTop:4}}>Stored in your backend database. Persists across sessions.</p>
      </div>
      {loading ? (
        <div style={{display:"flex",justifyContent:"center",padding:48}}><Spinner size={32}/></div>
      ) : reports.length===0 ? (
        <Card style={{textAlign:"center",padding:48}}>
          <div style={{fontSize:32,marginBottom:12}}>≡</div>
          <div style={{fontSize:14,color:"var(--t3)",marginBottom:6}}>No reports yet</div>
          <div style={{fontSize:12,color:"var(--t4)"}}>Generate your first audit to see it here.</div>
        </Card>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {reports.map(r=>(
            <Card key={r.id} style={{display:"flex",alignItems:"center",gap:16,cursor:"pointer",transition:"border .15s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor="var(--b2)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="var(--b1)"}>
              <div style={{flex:1}} onClick={()=>onOpen(r)}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontSize:14,fontWeight:600}}>{r.model_name||"Unnamed"}</span>
                  <Badge level={r.overall_risk}/>
                </div>
                <div style={{fontSize:11,color:"var(--t3)"}}>
                  {r.org_name||"—"} · Readiness: <span style={{color:r.readiness_pct>=70?"var(--ok)":"var(--warn)"}}>{r.readiness_pct}%</span>
                </div>
                <div style={{fontSize:10,color:"var(--t4)",marginTop:3}}>{new Date(r.created_at).toLocaleString()}</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn variant="secondary" onClick={e=>{e.stopPropagation();onOpen(r);}}>View</Btn>
                {confirm===r.id
                  ? <Btn variant="danger" onClick={e=>{e.stopPropagation();onDelete(r.id);setConfirm(null);}}>Confirm</Btn>
                  : <Btn variant="ghost" onClick={e=>{e.stopPropagation();setConfirm(r.id);}}>✕</Btn>
                }
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Frameworks Page ────────────────────────────────────────────────────── */
function FrameworksPage() {
  const [active,setActive] = useState(0);
  const FWS = [
    {name:"EU AI Act",color:"var(--a1)",tag:"In Force 2024",summary:"The world's first comprehensive legal framework for AI, establishing risk-based obligations. High-risk AI systems face strict documentation, transparency, and human oversight requirements.",
      articles:[{ref:"Art. 9",title:"Risk Management System",desc:"Ongoing risk identification, analysis, and mitigation throughout AI lifecycle."},{ref:"Art. 10",title:"Data Governance",desc:"Training data must be relevant, representative, and bias-examined."},{ref:"Art. 11",title:"Technical Documentation",desc:"Detailed system documentation must be maintained at all times."},{ref:"Art. 12",title:"Logging",desc:"Automatic logging of operations for post-market monitoring."},{ref:"Art. 13",title:"Transparency",desc:"Users must understand AI system capabilities and limitations."},{ref:"Art. 14",title:"Human Oversight",desc:"Effective human oversight measures to prevent or minimise risks."},{ref:"Art. 17",title:"Quality Management",desc:"Systematic QMS covering design, development, and monitoring."}]},
    {name:"GDPR",color:"var(--a2)",tag:"Regulation (EU) 2016/679",summary:"Governs personal data processing in the EU. AI systems processing personal data must comply with lawfulness, fairness, transparency, data minimisation, and security principles.",
      articles:[{ref:"Art. 5",title:"Principles",desc:"Lawfulness, fairness, transparency, purpose limitation, data minimisation."},{ref:"Art. 13(2)(f)",title:"Automated Decisions",desc:"Right to receive meaningful information about automated decision logic."},{ref:"Art. 22",title:"Profiling",desc:"Right not to be subject to solely automated decisions with significant effects."},{ref:"Art. 25",title:"Privacy by Design",desc:"Data protection integrated into system design by default."},{ref:"Art. 32",title:"Security",desc:"Appropriate technical and organisational security measures."},{ref:"Art. 35",title:"DPIA",desc:"Data Protection Impact Assessment for high-risk processing."}]},
    {name:"NIST AI RMF",color:"var(--a3)",tag:"NIST AI 100-1",summary:"Voluntary flexible framework for managing AI risks. Four core functions: GOVERN, MAP, MEASURE, MANAGE — providing structured approach to trustworthy AI.",
      articles:[{ref:"GOVERN 1.1",title:"AI Risk Policies",desc:"Policies for AI risk management established and maintained."},{ref:"GOVERN 4.1",title:"Org Teams",desc:"Roles and responsibilities for AI risk defined."},{ref:"MAP 1.1",title:"Context",desc:"AI risk context including objectives and stakeholders understood."},{ref:"MEASURE 1.1",title:"Metrics",desc:"AI risk measurement approaches identified and documented."},{ref:"MEASURE 2.5",title:"Monitoring",desc:"AI system performance monitored vs established benchmarks."},{ref:"MANAGE 2.4",title:"Residual Risk",desc:"Residual risks documented and communicated to stakeholders."}]},
    {name:"ISO 42001",color:"var(--a4)",tag:"ISO/IEC 42001:2023",summary:"First international AI management system standard. Specifies requirements for establishing, implementing, maintaining, and improving an AI Management System (AIMS).",
      articles:[{ref:"§6.1",title:"Risk Assessment",desc:"Identify AI risks and opportunities; assess likelihood and impact."},{ref:"§6.1.2",title:"AI Risk",desc:"Evaluate fairness, transparency, safety, privacy, and security risks."},{ref:"§8.2",title:"AI Lifecycle",desc:"Systematic management from design through disposal."},{ref:"§8.2.3",title:"Data Management",desc:"Data quality, provenance, and privacy controls."},{ref:"§8.4",title:"Performance",desc:"Monitoring procedures for AI system compliance."},{ref:"§9.1",title:"Audit & Review",desc:"Internal audits and management reviews of the AIMS."}]},
  ];
  const fw=FWS[active];
  return (
    <div style={{animation:"fadeUp .4s ease",maxWidth:860}}>
      <div style={{marginBottom:28}}>
        <div style={{fontSize:10,color:"var(--a1)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6}}>Reference Library</div>
        <h1 style={{fontFamily:"'DM Serif Display',serif",fontWeight:400,fontSize:28}}>Compliance Frameworks</h1>
        <p style={{color:"var(--t3)",fontSize:12,marginTop:4}}>Key articles mapped in your audit reports.</p>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {FWS.map((f,i)=>(
          <div key={f.name} onClick={()=>setActive(i)} style={{padding:"8px 16px",borderRadius:"var(--r1)",cursor:"pointer",fontSize:12,fontWeight:600,background:active===i?`${f.color}15`:"var(--s1)",color:active===i?f.color:"var(--t3)",border:`1px solid ${active===i?f.color+"40":"var(--b1)"}`,transition:"all .15s"}}>{f.name}</div>
        ))}
      </div>
      <Card>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <h2 style={{fontFamily:"'DM Serif Display',serif",fontWeight:400,fontSize:22,color:fw.color}}>{fw.name}</h2>
          <Tag color={fw.color}>{fw.tag}</Tag>
        </div>
        <p style={{fontSize:13,color:"var(--t2)",lineHeight:1.8,marginBottom:20,paddingBottom:20,borderBottom:"1px solid var(--b1)"}}>{fw.summary}</p>
        {fw.articles.map((a,i)=>(
          <div key={a.ref} style={{display:"flex",gap:14,padding:"13px 0",borderBottom:i<fw.articles.length-1?"1px solid var(--b1)":"none"}}>
            <span style={{fontSize:11,color:fw.color,fontWeight:600,minWidth:100,flexShrink:0}}>{a.ref}</span>
            <div><div style={{fontSize:12,fontWeight:600,marginBottom:3}}>{a.title}</div><div style={{fontSize:11,color:"var(--t3)",lineHeight:1.6}}>{a.desc}</div></div>
          </div>
        ))}
      </Card>
    </div>
  );
}
