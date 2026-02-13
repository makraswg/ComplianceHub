# Konzept: Strategisches Policy Management

Dieses Dokument beschreibt die theoretische Architektur für die Erweiterung des PolicyHubs um eine integrierte Richtlinienverwaltung.

## 1. Problemstellung
Aktuell sind Richtlinien (Dienstanweisungen, Sicherheitskonzepte) oft isolierte PDF-Dokumente. Es fehlt die Verbindung zu den operativen Maßnahmen im RiskHub und den Prozessen im WorkflowHub.

## 2. Lösungsansatz: "Living Documents"
Richtlinien im ComplianceHub sollen dynamische Dokumente sein, die ihre Gültigkeit aus den verknüpften operativen Daten beziehen.

### Kern-Komponenten
- **Policy Registry**: Datenbankgestützte Verwaltung von Richtlinientiteln, Kategorien und Verantwortlichkeiten.
- **Versioning Engine**: Unterstützung von Major/Minor-Versionen mit Genehmigungs-Workflows (Draft -> Review -> Published).
- **Relational Embedding**: Integration von Risk-Measures direkt in den Textfluss. 
  *Beispiel: Kapitel 4.1 referenziert die Maßnahme "MSR-101 (Passwortkomplexität)". Ist diese im RiskHub nicht als "wirksam" markiert, erhält die Richtlinie einen Warnhinweis.*

## 3. Datenmodell (Theoretisch)

### Entity: `Policy`
- `id`: Eindeutige Kennung
- `type`: DA (Dienstanweisung), BV (Betriebsvereinbarung), ISK (Sicherheitskonzept), DS (Datenschutz)
- `ownerRoleId`: Verantwortliche Stelle
- `reviewInterval`: Tage bis zur nächsten Prüfung
- `status`: draft | review | published | archived

### Entity: `PolicyVersion`
- `policyId`: Referenz auf Policy
- `version`: Versionsnummer
- `content`: Markdown/HTML Inhalt
- `approvalLog`: JSON-Log der Freigaben
- `validFrom`: Gültigkeitsdatum

## 4. Synergie-Effekte
- **Audit-Readiness**: Bei einer Prüfung kann per Klick bewiesen werden, dass die Vorgabe in der Richtlinie durch eine operativ wirksame Kontrolle (RiskHub) gedeckt ist.
- **Automatisierung**: Wenn ein neues IT-System (Resource) registriert wird, schlägt die KI vor, welche Richtlinien für den Betrieb relevant sind.
- **Lifecycle**: Neue Mitarbeiter erhalten im Onboarding automatisch Zugriff auf die für ihr Rollenprofil relevanten Richtlinien.

---
*Konzeptstand: Februar 2024 - Strategische Erweiterung PolicyHub.*
