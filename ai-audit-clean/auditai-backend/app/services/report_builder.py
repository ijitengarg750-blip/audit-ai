"""
report_builder.py — assembles the full structured report from scores + AI analysis.
"""
import uuid
from datetime import datetime


COMPLIANCE_MAP = {
    "bias": [
        {"framework": "EU AI Act",   "ref": "Art. 10(2)",    "desc": "Training data governance & fairness requirements"},
        {"framework": "ISO 42001",   "ref": "§6.1.2",        "desc": "AI risk assessment — fairness dimension"},
    ],
    "hallucination": [
        {"framework": "NIST AI RMF", "ref": "GOVERN 1.1",    "desc": "Policies for AI reliability and accuracy"},
        {"framework": "EU AI Act",   "ref": "Art. 13",       "desc": "Transparency and information provision"},
    ],
    "toxicity": [
        {"framework": "EU AI Act",   "ref": "Art. 9(4)",     "desc": "Risk management — harmful output prevention"},
        {"framework": "GDPR",        "ref": "Art. 22",       "desc": "Automated decision-making safeguards"},
    ],
    "robustness": [
        {"framework": "NIST AI RMF", "ref": "MANAGE 2.4",   "desc": "Residual risk treatment controls"},
        {"framework": "ISO 42001",   "ref": "§8.4",          "desc": "AI system performance monitoring"},
    ],
    "explainability": [
        {"framework": "GDPR",        "ref": "Art. 13(2)(f)", "desc": "Right to explanation for automated decisions"},
        {"framework": "EU AI Act",   "ref": "Art. 13(1)",    "desc": "Transparency obligations for AI outputs"},
    ],
    "data_leakage": [
        {"framework": "GDPR",        "ref": "Art. 32",       "desc": "Security of processing — breach prevention"},
        {"framework": "ISO 42001",   "ref": "§8.2.3",        "desc": "Data privacy in AI system lifecycle"},
    ],
    "drift": [
        {"framework": "NIST AI RMF", "ref": "MEASURE 2.5",  "desc": "Model performance monitoring over time"},
        {"framework": "EU AI Act",   "ref": "Art. 17",       "desc": "Quality management — post-market monitoring"},
    ],
}

MITIGATION = {
    "bias":           "Implement stratified sampling, adversarial debiasing (Fairlearn/AIF360), and quarterly fairness audits.",
    "hallucination":  "Deploy RAG pipelines, output verification layers, and human-in-the-loop for high-stakes decisions.",
    "toxicity":       "Integrate Detoxify/Perspective API classifiers, apply I/O filtering, and run monthly red-team tests.",
    "robustness":     "Run adversarial testing (TextAttack/ART), implement input validation and confidence thresholds.",
    "explainability": "Generate SHAP/LIME per decision, publish model cards, provide decision rationales to users.",
    "data_leakage":   "Apply differential privacy, enforce RBAC on data access, automate PII scrubbing in pipelines.",
    "drift":          "Deploy Evidently AI / WhyLabs drift detection, set PSI > 0.1 retraining triggers.",
}

LABEL = {
    "bias": "Bias / Fairness", "hallucination": "Hallucination Rate",
    "toxicity": "Toxicity", "robustness": "Robustness Risk",
    "explainability": "Explainability Gap", "data_leakage": "Data Leakage Risk",
    "drift": "Model Drift",
}


def risk_level(score: float) -> str:
    if score >= 0.75: return "CRITICAL"
    if score >= 0.50: return "HIGH"
    if score >= 0.25: return "MEDIUM"
    return "LOW"


def build_report(
    scores: dict,
    system_info: dict,
    ai_analysis: dict,
    row_count: int = 0,
) -> dict:
    """Assemble the full structured report JSON."""

    risks = []
    for key, score in scores.items():
        level = risk_level(score)
        risks.append({
            "key":        key,
            "label":      LABEL.get(key, key),
            "score":      score,
            "level":      level,
            "compliance": COMPLIANCE_MAP.get(key, []),
            "mitigation": MITIGATION.get(key, "Review and implement appropriate controls."),
        })

    critical    = sum(1 for r in risks if r["level"] == "CRITICAL")
    high        = sum(1 for r in risks if r["level"] == "HIGH")
    avg_score   = sum(scores.values()) / len(scores)
    overall     = risk_level(avg_score)
    readiness   = round((1 - avg_score) * 100)

    return {
        "id":           str(uuid.uuid4()),
        "generated_at": datetime.utcnow().isoformat(),
        "system": {
            "model_name":    system_info.get("model_name"),
            "model_version": system_info.get("model_version"),
            "org_name":      system_info.get("org_name"),
            "use_case":      system_info.get("use_case"),
            "deploy_env":    system_info.get("deploy_env", "production"),
            "training_data": system_info.get("training_data"),
            "oversight_policy": system_info.get("oversight_policy"),
            "incident_policy":  system_info.get("incident_policy"),
            "framework":     system_info.get("framework", "all"),
        },
        "data_source": {
            "row_count":      row_count,
            "has_real_data":  row_count > 0,
            "measurement_method": "Automated scoring from uploaded model output data" if row_count > 0 else "Manual metric input",
        },
        "summary": {
            "overall_risk":  overall,
            "readiness_pct": readiness,
            "avg_score":     round(avg_score, 4),
            "critical":      critical,
            "high":          high,
        },
        "risks":       risks,
        "ai_analysis": ai_analysis,
        "compliance_frameworks": ["EU AI Act", "GDPR", "NIST AI RMF", "ISO 42001"],
        "methodology": {
            "bias":           "Demographic parity gap across gender/race/age groups",
            "hallucination":  "Decision accuracy vs ground_truth column; confidence proxy if unavailable",
            "toxicity":       "Detoxify transformer model (local) or keyword regex fallback",
            "robustness":     "Confidence variance + non-determinism rate analysis",
            "explainability": "Confidence calibration + presence of explanation columns",
            "data_leakage":   "PII pattern detection (email, phone, SSN, credit card, IP, credentials)",
            "drift":          "Population Stability Index (PSI) on first vs second half of data",
        }
    }
