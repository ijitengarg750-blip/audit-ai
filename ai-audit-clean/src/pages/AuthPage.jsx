// src/pages/AuthPage.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Mono:wght@300;400;500&display=swap');
.auth-wrap {
  min-height:100vh; background:#07080d; display:flex; align-items:center; justify-content:center;
  font-family:'IBM Plex Mono',monospace; position:relative; overflow:hidden;
}
.auth-bg {
  position:absolute; inset:0; pointer-events:none;
  background: radial-gradient(ellipse 60% 50% at 50% 0%, #3dffa008 0%, transparent 70%),
              radial-gradient(ellipse 40% 40% at 80% 80%, #3d9fff06 0%, transparent 60%);
}
.auth-grid {
  position:absolute; inset:0;
  background-image: linear-gradient(#1c203018 1px, transparent 1px), linear-gradient(90deg, #1c203018 1px, transparent 1px);
  background-size: 40px 40px;
}
.auth-card {
  width:100%; max-width:420px; position:relative; z-index:1;
  background:#0c0e15; border:1px solid #1c2030; border-radius:12px; padding:40px;
  box-shadow: 0 0 0 1px #3dffa008, 0 32px 64px #00000060;
}
.auth-logo {
  display:flex; align-items:center; gap:10px; margin-bottom:32px;
}
.auth-dot {
  width:8px; height:8px; border-radius:50%; background:#3dffa0;
  box-shadow:0 0 12px #3dffa0; animation:glow 2s ease infinite;
}
@keyframes glow { 0%,100%{box-shadow:0 0 8px #3dffa040} 50%{box-shadow:0 0 20px #3dffa080} }
.auth-logo-text { font-family:'DM Serif Display',serif; font-size:20px; color:#edf0f8; }
.auth-title { font-family:'DM Serif Display',serif; font-size:26px; color:#edf0f8; margin-bottom:6px; font-weight:400; }
.auth-sub { font-size:11px; color:#4e5670; margin-bottom:28px; }
.auth-tab-row { display:flex; gap:0; margin-bottom:24px; background:#11141d; border-radius:6px; padding:3px; }
.auth-tab {
  flex:1; text-align:center; padding:8px; border-radius:4px; cursor:pointer;
  font-size:11px; font-weight:600; transition:all .15s; border:1px solid transparent;
  font-family:'IBM Plex Mono',monospace;
}
.auth-tab.active { background:#0c0e15; color:#3dffa0; border-color:#1c2030; }
.auth-tab.inactive { color:#4e5670; }
.auth-field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
.auth-label { font-size:10px; color:#4e5670; letter-spacing:0.1em; text-transform:uppercase; }
.auth-input {
  background:#11141d; border:1px solid #1c2030; border-radius:6px;
  padding:10px 12px; color:#edf0f8; font-size:12px; outline:none;
  font-family:'IBM Plex Mono',monospace; transition:border .15s;
}
.auth-input:focus { border-color:#2e364f; }
.auth-btn {
  width:100%; background:#3dffa0; color:#000; border:none; border-radius:6px;
  padding:12px; font-size:13px; font-weight:700; cursor:pointer;
  font-family:'DM Serif Display',serif; letter-spacing:0.02em; margin-top:8px;
  transition:opacity .15s;
}
.auth-btn:disabled { opacity:.5; cursor:not-allowed; }
.auth-btn:hover:not(:disabled) { opacity:.9; }
.auth-error {
  background:#ff3b5c15; border:1px solid #ff3b5c30; border-radius:6px;
  padding:10px 12px; font-size:11px; color:#ff3b5c; margin-bottom:14px; line-height:1.6;
}
.auth-divider { height:1px; background:#1c2030; margin:20px -40px; }
.auth-footer { font-size:10px; color:#2a3048; text-align:center; margin-top:20px; line-height:1.7; }
.auth-status {
  display:flex; align-items:center; gap:8px; padding:8px 12px;
  background:#11141d; border-radius:6px; margin-bottom:20px; font-size:11px;
}
.auth-status-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
`;

export default function AuthPage() {
  const { login, register } = useAuth();
  const [tab,     setTab]   = useState("login");
  const [email,   setEmail] = useState("");
  const [password,setPass]  = useState("");
  const [orgName, setOrg]   = useState("");
  const [error,   setError] = useState("");
  const [loading, setLoad]  = useState(false);
  const [backendOk, setBackendOk] = useState(null);

  // Check backend health on mount
  useState(() => {
    fetch("http://localhost:8000/health")
      .then(r => r.ok ? setBackendOk(true) : setBackendOk(false))
      .catch(() => setBackendOk(false));
  });

  const handleSubmit = async () => {
    setError(""); setLoad(true);
    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        if (!email || !password) throw new Error("Email and password are required");
        await register(email, password, orgName);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoad(false);
    }
  };

  const handleKey = e => { if (e.key === "Enter") handleSubmit(); };

  return (
    <>
      <style>{S}</style>
      <div className="auth-wrap">
        <div className="auth-bg"/>
        <div className="auth-grid"/>
        <div className="auth-card">
          {/* Logo */}
          <div className="auth-logo">
            <div className="auth-dot"/>
            <span className="auth-logo-text">AuditAI</span>
            <span style={{fontSize:9,color:"#2a3048",marginLeft:4,letterSpacing:"0.08em"}}>COMPLIANCE PLATFORM</span>
          </div>

          {/* Backend status */}
          <div className="auth-status">
            <div className="auth-status-dot" style={{background: backendOk===null?"#ffd93d": backendOk?"#3dffa0":"#ff3b5c"}}/>
            <span style={{color: backendOk===null?"#ffd93d": backendOk?"#3dffa0":"#ff3b5c"}}>
              {backendOk===null ? "Checking backend..." : backendOk ? "Backend connected · localhost:8000" : "Backend offline — start uvicorn first"}
            </span>
          </div>

          <h1 className="auth-title">{tab === "login" ? "Welcome back" : "Create account"}</h1>
          <p className="auth-sub">
            {tab === "login"
              ? "Sign in to access your compliance dashboard"
              : "Set up your organisation's audit platform"}
          </p>

          {/* Tabs */}
          <div className="auth-tab-row">
            {[["login","Sign In"],["register","Register"]].map(([t,l])=>(
              <div key={t} className={`auth-tab ${tab===t?"active":"inactive"}`} onClick={()=>{setTab(t);setError("");}}>
                {l}
              </div>
            ))}
          </div>

          {/* Error */}
          {error && <div className="auth-error">⚠ {error}</div>}

          {/* Fields */}
          {tab==="register" && (
            <div className="auth-field">
              <label className="auth-label">Organisation Name</label>
              <input className="auth-input" placeholder="Acme Financial Ltd" value={orgName} onChange={e=>setOrg(e.target.value)} onKeyDown={handleKey}/>
            </div>
          )}
          <div className="auth-field">
            <label className="auth-label">Email Address</label>
            <input className="auth-input" type="email" placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={handleKey}/>
          </div>
          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input className="auth-input" type="password" placeholder="••••••••" value={password} onChange={e=>setPass(e.target.value)} onKeyDown={handleKey}/>
          </div>

          <button className="auth-btn" onClick={handleSubmit} disabled={loading||!email||!password}>
            {loading ? "Please wait..." : tab==="login" ? "Sign In →" : "Create Account →"}
          </button>

          <div className="auth-divider"/>
          <div className="auth-footer">
            EU AI Act · GDPR · NIST AI RMF · ISO 42001<br/>
            Real AI risk measurement from your model outputs
          </div>
        </div>
      </div>
    </>
  );
}
