"""
advisory_rule_engine.py
========================================================================
Space-to-Farm Intelligence Platform — TerraTech x PJTAU
Module: Knowledge-Graph / Rule-Based Advisory Engine

Design note (per earlier architecture review): a full Neo4j graph
database is justified once PoP relationships become genuinely
multi-hop (crop <-> pest <-> resource <-> season trade-offs). For MVP
and pilot scale, this module implements the SAME interface as a
Postgres-backed decision-table rule engine, with an optional Neo4j
backend that can be swapped in later without changing the calling code
in the Advisory microservice.
========================================================================
"""

import json
from dataclasses import dataclass
from typing import Optional


@dataclass
class AdvisoryRule:
    crop: str
    stage: str
    pest: str
    condition_humidity_gt: Optional[float]
    advisory_text: str
    dosage: str
    source_pop_reference: str


class RuleEngineBackend:
    """Postgres/decision-table backend (default, MVP)."""

    def __init__(self, rules: list):
        self.rules = rules

    @classmethod
    def from_json(cls, path: str) -> "RuleEngineBackend":
        with open(path) as f:
            raw = json.load(f)
        rules = [AdvisoryRule(**r) for r in raw]
        return cls(rules)

    def query(self, crop: str, stage: str, pest: str, humidity: Optional[float] = None) -> Optional[AdvisoryRule]:
        for rule in self.rules:
            if rule.crop == crop and rule.stage == stage and rule.pest == pest:
                if rule.condition_humidity_gt is not None and humidity is not None:
                    if humidity < rule.condition_humidity_gt:
                        continue
                return rule
        return None


class Neo4jBackend:
    """
    Optional graph-database backend for when PoP relationships become
    genuinely multi-hop. Requires `pip install neo4j`.
    """

    def __init__(self, uri: str, user: str, password: str):
        from neo4j import GraphDatabase
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def query(self, crop: str, stage: str, pest: str, humidity: Optional[float] = None) -> Optional[dict]:
        cypher = """
        MATCH (c:Crop {name: $crop})-[:HAS_STAGE]->(s:Stage {name: $stage})
              -[:AT_RISK_FROM]->(p:Pest {name: $pest})
              -[:RECOMMENDED_ACTION]->(a:Advisory)
        WHERE $humidity IS NULL OR a.min_humidity IS NULL OR $humidity >= a.min_humidity
        RETURN a.text AS advisory_text, a.dosage AS dosage, a.pop_reference AS source_pop_reference
        LIMIT 1
        """
        with self.driver.session() as session:
            result = session.run(cypher, crop=crop, stage=stage, pest=pest, humidity=humidity)
            record = result.single()
            return dict(record) if record else None


class AdvisoryEngine:
    """
    Thin facade used by the Advisory microservice. Confidence gating:
    AI model outputs (TFT pest-risk probability) are only converted into
    a farmer-facing advisory if (a) probability exceeds the confidence
    threshold AND (b) a matching PoP rule exists. This guarantees every
    farmer-facing message traces back to a PJTAU-approved PoP, even
    while the underlying ML models are still being fine-tuned (Stage 2/3
    of the bootstrap pipeline).
    """

    CONFIDENCE_THRESHOLD = 0.85

    def __init__(self, backend):
        self.backend = backend

    def generate_advisory(self, crop: str, stage: str, pest: str, risk_probability: float,
                           humidity: Optional[float] = None) -> Optional[dict]:
        if risk_probability < self.CONFIDENCE_THRESHOLD:
            return None  # below confidence gate — no farmer-facing alert

        rule = self.backend.query(crop=crop, stage=stage, pest=pest, humidity=humidity)
        if rule is None:
            return {
                "status": "NO_POP_MATCH",
                "message": "Model flagged elevated risk but no matching PJTAU PoP rule found. "
                           "Escalate to PJTAU scientist for manual review before notifying farmer.",
            }

        text = rule.advisory_text if hasattr(rule, "advisory_text") else rule["advisory_text"]
        dosage = rule.dosage if hasattr(rule, "dosage") else rule["dosage"]
        source = rule.source_pop_reference if hasattr(rule, "source_pop_reference") else rule["source_pop_reference"]

        return {
            "status": "OK",
            "advisory_text": text,
            "dosage": dosage,
            "confidence": round(risk_probability, 2),
            "source_pop_reference": source,
        }


if __name__ == "__main__":
    sample_rules = [
        {
            "crop": "cotton", "stage": "flowering", "pest": "bollworm",
            "condition_humidity_gt": 75.0,
            "advisory_text": "Apply Neem oil 5% or Profenofos @ 2ml/liter within 3 days.",
            "dosage": "2ml/liter", "source_pop_reference": "PJTAU PoP Cotton 2024, Sec 4.2",
        },
        {
            "crop": "paddy", "stage": "tillering", "pest": "stem_borer",
            "condition_humidity_gt": 80.0,
            "advisory_text": "Apply Chlorantraniliprole @ 0.3 ml/liter within 3 days.",
            "dosage": "0.3ml/liter", "source_pop_reference": "PJTAU PoP Paddy 2024, Sec 3.1",
        },
    ]
    with open("sample_pop_rules.json", "w") as f:
        json.dump(sample_rules, f, indent=2)

    engine = AdvisoryEngine(RuleEngineBackend.from_json("sample_pop_rules.json"))
    result = engine.generate_advisory("cotton", "flowering", "bollworm", risk_probability=0.91, humidity=80)
    print(json.dumps(result, indent=2))
