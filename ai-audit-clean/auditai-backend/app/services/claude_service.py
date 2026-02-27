"""
claude_service.py — Calls Anthropic Claude API to generate:
  - Executive summary
  - Intelligent recommendations
  - Compliance narrative
"""
import json
import logging
import anthropic
from app.core.config import settings

logger = logging.getLogger(__name__)

COMPLIANCE_MAP = {
    "bias":           [("EU AI Act", "Art. 10(2)"), ("ISO 42001", "§6.1.2")],
    "hallucination":  [("NIST AI RMF", "GOVERN 1.1"), ("EU AI Act", "Art. 13")],
    "toxicity":       [("EU AI Act", "Art. 9(4)"), ("GDPR", "Art. 22")],
    "robustness":     [("NIST AI RMF", "MANAGE 2.4"), ("ISO 42001", "§8.4")],
    "explainability": [("GDPR", "Art. 13(2)(f)"), ("EU AI Act", "Art. 13(1)")],
    "data_leakage":   [("GDPR", "Art. 32"), ("ISO 42001", "§8.2.3")],
    "drift":          [("NIST AI RMF", "MEASURE 2.5"), ("EU AI Act", "Art. 17")],
}

def risk_level(score: float) -> str:
    if score >= 0.75: return "CRITICAL"
    if score >= 0.50: return "HIGH"
    if score >= 0.25: return "MEDIUM"
    return "LOW"


async def generate_ai_analysis(scores: dict, system_info: dict) -> dict:
    """
    Send real scores to Claude and get back:
      - executiveSummary
      - topPriority
      - recommendations (list)
      - readinessAssessment
      - complianceNarrative
    """
    if not settings.ANTHROPIC_API_KEY:
        logger.warning("No ANTHROPIC_API_KEY — returning rule-based analysis")
        return _rule_based_analysis(scores, system_info)

    risk_summary = "\n".join(
        f"  - {k.replace('_',' ').title()}: {v:.0%} ({risk_level(v)})"
        for k, v in scores.items()
    )

    compliance_refs = []
    for metric, val in scores.items():
        level = risk_level(val)
        if level in ("HIGH", "CRITICAL"):
            for fw, ref in COMPLIANCE_MAP.get(metric, []):
                compliance_refs.append(f"{fw} {ref} ({metric.replace('_',' ')})")

    prompt = f"""You are a senior AI compliance expert producing a formal regulatory audit report.

SYSTEM BEING AUDITED:
- Organisation: {system_info.get('org_name', 'Not specified')}
- Model: {system_info.get('model_name', 'Not specified')} v{system_info.get('model_version', 'N/A')}
- Use case: {system_info.get('use_case', 'Not specified')}
- Deployment: {system_info.get('deploy_env', 'production')}
- Training data: {system_info.get('training_data', 'Not specified')}
- Human oversight policy: {system_info.get('oversight_policy', 'Not specified')}
- Incident response: {system_info.get('incident_policy', 'Not specified')}

MEASURED RISK SCORES (computed from real model output data):
{risk_summary}

HIGH/CRITICAL COMPLIANCE OBLIGATIONS TRIGGERED:
{chr(10).join(compliance_refs) if compliance_refs else 'None — system is low risk'}

Produce a JSON response with this exact structure (pure JSON, no markdown):
{{
  "executiveSummary": "3-4 sentence board-ready summary referencing the specific use case and highest risks",
  "topPriority": "Single most urgent action with specific regulation reference",
  "complianceNarrative": "2-3 sentences on overall compliance posture and regulatory exposure",
  "recommendations": [
    {{
      "title": "Specific action title",
      "detail": "Detailed implementation guidance including specific tools or methods",
      "effort": "Low|Medium|High",
      "timeline": "e.g. Immediate (0-2 weeks)",
      "regulation": "Primary regulation reference e.g. EU AI Act Art. 10(2)"
    }}
  ],
  "readinessAssessment": "1-2 sentences assessing readiness for regulatory submission"
}}

Provide 3-5 recommendations, prioritised by risk level. Be specific to the use case and scores provided."""

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = message.content[0].text
        cleaned = raw.replace("```json", "").replace("```", "").strip()
        result = json.loads(cleaned)
        logger.info("Claude AI analysis generated successfully")
        return result
    except Exception as e:
        logger.error(f"Claude API error: {e}")
        return _rule_based_analysis(scores, system_info)


def _rule_based_analysis(scores: dict, system_info: dict) -> dict:
    """Fallback rule-based analysis when Claude API unavailable."""
    sorted_risks = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top_risk_name, top_risk_val = sorted_risks[0]
    critical = [(k, v) for k, v in scores.items() if risk_level(v) == "CRITICAL"]
    high     = [(k, v) for k, v in scores.items() if risk_level(v) == "HIGH"]

    recs = []
    for metric, val in sorted_risks[:4]:
        level = risk_level(val)
        if level in ("CRITICAL", "HIGH", "MEDIUM"):
            fw, ref = COMPLIANCE_MAP.get(metric, [("General", "Best Practice")])[0]
            recs.append({
                "title": f"Remediate {metric.replace('_',' ').title()} Risk",
                "detail": MITIGATION_TEXT.get(metric, "Implement appropriate controls"),
                "effort": "High" if level == "CRITICAL" else "Medium",
                "timeline": "Immediate (0–2 weeks)" if level == "CRITICAL" else "Short-term (2–6 weeks)",
                "regulation": f"{fw} {ref}"
            })

    return {
        "executiveSummary": (
            f"This audit of {system_info.get('model_name','the AI system')} deployed by "
            f"{system_info.get('org_name','the organisation')} for {system_info.get('use_case','the stated use case')} "
            f"identified {len(critical)} critical and {len(high)} high-severity risks. "
            f"Immediate attention is required for {top_risk_name.replace('_',' ')} scoring {top_risk_val:.0%}."
        ),
        "topPriority": f"Address {top_risk_name.replace('_',' ').title()} ({top_risk_val:.0%}) — "
                       f"{COMPLIANCE_MAP.get(top_risk_name,[])[0][0] if COMPLIANCE_MAP.get(top_risk_name) else 'General'} compliance required",
        "complianceNarrative": (
            f"The system presents {'significant' if critical else 'moderate'} regulatory exposure. "
            f"Remediation of critical findings is required before regulatory submission or production scale-up."
        ),
        "recommendations": recs,
        "readinessAssessment": (
            f"The system is currently {'not ready' if critical else 'conditionally ready'} for regulatory submission. "
            f"{'Critical issues must be resolved first.' if critical else 'Address high-severity findings to improve confidence.'}"
        )
    }


MITIGATION_TEXT = {
    "bias":           "Implement stratified sampling and adversarial debiasing using Fairlearn or IBM AIF360. Schedule quarterly fairness audits across all protected attributes.",
    "hallucination":  "Deploy retrieval-augmented generation (RAG) pipelines, add output verification layers, and enforce human-in-the-loop for high-stakes decisions.",
    "toxicity":       "Integrate real-time toxicity classifiers (Detoxify or Perspective API), apply input/output filtering, and conduct monthly red-team testing.",
    "robustness":     "Run adversarial robustness testing using TextAttack or ART. Implement input validation and confidence thresholds for uncertain predictions.",
    "explainability": "Generate SHAP/LIME explanations per decision, publish model cards, and provide human-readable decision rationales to affected parties.",
    "data_leakage":   "Apply differential privacy during training, enforce role-based data access, and implement automated PII scrubbing in all data pipelines.",
    "drift":          "Deploy automated drift detection (Evidently AI or WhyLabs), configure retraining triggers at PSI > 0.1, and maintain real-time performance dashboards.",
}
