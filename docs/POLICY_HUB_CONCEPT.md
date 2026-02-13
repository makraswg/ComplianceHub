# Konzept: Strategisches Policy Management

Dieses Dokument beschreibt die theoretische Architektur für die Erweiterung des PolicyHubs um eine integrierte Richtlinienverwaltung.

## 1. Problemstellung
Aktuell sind Richtlinien (Dienstanweisungen, Sicherheitskonzept) oft isolierte PDF-Dokumente auf Fileservern. Es fehlt die Revisionssicherheit innerhalb der GRC-Plattform.

## 2. Lösungsansatz: "Isolated Document Registry"
Der Einstieg erfolgt isoliert von den restlichen Modulen, um eine saubere Dokumentenverwaltung aufzubauen.

### Kern-Komponenten
- **Policy Registry**: Datenbankgestützte Verwaltung von Richtlinientiteln, Kategorien und Verantwortlichkeiten.
- **Markdown Editor**: Erstellung der Inhalte direkt im Browser. Markdown wird bevorzugt, da es textbasiert ist (einfache Versionierung/Diffs) und später "Smart Tags" (Verknüpfungen zu Risiken/Maßnahmen) ermöglicht.
- **Status Workflow**: Einfacher Lebenszyklus: `Draft` (Entwurf) -> `Review` (In Prüfung) -> `Published` (Veröffentlicht) -> `Archived` (Archiviert).
- **Versioning Engine**: Jede Veröffentlichung erzeugt eine unveränderbare Version (V1.0, V2.0). Korrekturen erzeugen Minor-Revisions (V1.1).

## 3. Datenmodell (Theoretisch)

### Entity: `Policy`
- `id`: Eindeutige Kennung
- `title`: Name des Dokuments
- `type`: DA (Dienstanweisung), BV (Betriebsvereinbarung), ISK (Sicherheitskonzept), DS (Datenschutz)
- `ownerRoleId`: Verantwortliche Stelle
- `reviewInterval`: Tage bis zur nächsten obligatorischen Prüfung
- `status`: draft | review | published | archived

### Entity: `PolicyVersion`
- `policyId`: Referenz auf Policy
- `version`: Versionsnummer
- `content`: Inhalt im Markdown-Format
- `changelog`: Kurze Beschreibung der Änderungen
- `validFrom`: Gültigkeitsdatum

## 4. Ausbaustufe: "Smart Documents" (Später)
Nach dem isolierten Start können Markdown-Tags eingeführt werden:
- `{{measure:id}}`: Bettet den Status einer Maßnahme live in den Text ein.
- `{{resource:id}}`: Zeigt Details eines IT-Systems im Dokument an.

---
*Konzeptstand: Februar 2024 - Fokus auf Markdown und isoliertem Start.*
