# Masterplan: Integrierte GRC-Workflows (Risk & VVT)

Dieses Dokument vereint die Strategien für die Risikoanalyse und die VVT-Dokumentation zu einem durchgängigen Governance-Modell. Ziel ist die Vermeidung von Datensilos und die Automatisierung von Compliance-Nachweisen (TOM).

---

## 🎯 Kernvision: "Single Source of Truth"
Daten fließen entlang der Wertschöpfungskette:
`Risiko (Bedrohung) --> Maßnahme (TOM) --> Richtlinie (Policy) --> Ressource (Asset) --> Prozess (Workflow) --> VVT (Zweck)`.

---

## 🏗️ Phase 1: Datenmodell & Relationen (Das Fundament)
Bevor funktionale Erweiterungen erfolgen, müssen die Relationen im Backend stabil sein.

1.  **Erweiterung `risks`**: Verknüpfung mit Prozessen.
2.  **Erweiterung `processingActivities` (VVT)**: Entkoppelung der direkten System-Zuweisung.
3.  **Erweiterung `riskMeasures` (TOM)**: Validierung der Wirksamkeit.

---

## 🏗️ Phase 6: Policy Management (Neu)
*Zweck: Revisionssichere Verwaltung von Vorgabedokumenten.*

1.  **Phase 6a: Isolierte Dokumentenablage**:
    *   Einführung der Entity `Policy` und `PolicyVersion`.
    *   Integration eines **Markdown-Editors** zur Erstellung von Inhalten ohne Medienbruch.
    *   Manueller Workflow für Freigabe und Versionierung.
2.  **Phase 6b: Relationale Einbettung**:
    *   Verknüpfung von Kapiteln mit Maßnahmen aus dem RiskHub.
    *   Warnhinweis in der Richtlinie, wenn verknüpfte Maßnahmen "nicht wirksam" sind.

---
*Status: Integrierter Plan erstellt. Phase 6a als nächster großer konzeptioneller Block identifiziert.*
