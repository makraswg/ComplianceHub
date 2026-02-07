# AccessHub - Master Backlog & Strategisches Manifest (V2.3)

**Rolle**: Dieses Dokument ist das zentrale Steuerungs-Instrument. Es ist nach einem **optimalen Ausführungspfad** sortiert und enthält nun technische Audit-Warnungen.

---

## 🎯 Die Vision: "Governance am Frühstückstisch"
AccessHub soll die erste Compliance-App sein, die **alles in einem Guss** denkt. 
- **Usability-Benchmark**: "Azubi-tauglich" (Intuitiv, geführt, keine Fachbegriffe ohne Erklärung).
- **Audit-Benchmark**: "Prüfer-fest" (Lückenlose Historie, Revisionssicherheit, klare Verantwortlichkeiten).

---

## 📜 Master-Anweisungen (Audit-Kriterien)
1. **Ganzheitlichkeit**: Module dürfen keine Datensilos sein. Daten aus dem Risikomanagement müssen im IAM sichtbar sein und umgekehrt.
2. **KI-First & Kontext-Aware**: Jede KI-Funktion MUSS die Unternehmensbeschreibung (Branche, Ziele) und den Organisationsaufbau (Stellenplan) als Kontext nutzen.
3. **Workflow-Zwang**: Aktionen sind als geführte Prozesse zu verstehen, nicht nur als Tabelleneinträge.
4. **Export-Pflicht**: Jede Ansicht muss einen "Audit-Export" (PDF/Excel) besitzen.

---

## 🏗️ Optimaler Ausführungspfad (Reihenfolge & Audit-Checks)

### Phase 1: Fundament & KI-Kontext (Basis für alles)
*Bevor die KI beraten kann, muss sie die Firma kennen.*

*   **Aufgabe 1.1: KI-Zentralkonfiguration (Step 8.1)**: Ein Feld für die "Unternehmensbeschreibung", das als System-Prompt für ALLE KI-Funktionen dient.
    *   *Audit-Notiz*: Muss im `Tenant`-Modell persistiert werden. Gefahr: Zu große Prompts könnten Token-Limits sprengen.
*   **Aufgabe 1.2: Setup-Wizard (Step 8.1)**: Ein mehrstufiger Onboarding-Prozess für das Plattform-Setup.
*   **Aufgabe 1.3: Organisations-Struktur & Stellenplan (Step 6.1)**: Visualisierung als grafisches Org-Chart (Baumstruktur) und Einführung von Stellenbeschreibungen.
    *   *Audit-Notiz*: Skalierbarkeit prüfen! Ab 100 Abteilungen ist ein statischer Baum unbrauchbar.

### Phase 2: Technische Assets (Das Inventar)
*Ohne IT-Assets gibt es keine Risiken und keinen Datenschutz.*

*   **Aufgabe 2.1: CIA-Wizard (Step 7.1)**: KI-geführte Schutzbedarfsfeststellung basierend auf dem Firmenprofil.
*   **Aufgabe 2.2: Usage-Explorer (Step 7.1)**: Zeige pro Asset alle Prozesse und VVT-Einträge, die dieses System nutzen.
    *   *Audit-Notiz*: Benötigt Reverse-Lookup in der Datenbank (Wer nutzt Ressource X?).
*   **Aufgabe 2.3: Drift-Detection (Step 7.1)**: Warnung, wenn Assets in Jira existieren, aber nicht im Hub.
    *   *Audit-Notiz*: Komplikation bei hohen Latenzen der Jira API. Muss im Hintergrund oder asynchron laufen.

### Phase 3: Identity & Visual Mapping (Wer darf was?)
*Verknüpfung von Phase 1 (Stellen) und Phase 2 (Assets).*

*   **Aufgabe 3.1: RBAC-Blueprint (Step 6.1)**: Stellen direkt mit Standard-Rechten verknüpfen.
    *   *Audit-Notiz*: Kern-Logik für "Default Access". Muss bei Stellenwechsel automatisch Trigger für Reviews auslösen.
*   **Aufgabe 3.2: Interaktive Zuweisungslandkarte (Step 2.4)**: Grafisches Diagramm (Graph-View) von Identitäten und Ressourcen.
    *   *Audit-Notiz*: Browser-Performance bei >1000 Kanten kritisch. D3.js oder ähnliches mit WebWorker einplanen.
*   **Aufgabe 3.3: Privileg-Anomalie-Erkennung (Step 2.4)**: Markiere untypische Rechte für Abteilungen.

### Phase 4: Risk & Compliance Tiefe (Fachlogik)
*Bewertung der Sicherheit und rechtliche Absicherung.*

*   **Aufgabe 4.1: KI-Szenario-Übersetzer (Step 3.1)**: Übersetzt Risk-Scores in Business-Sprache.
*   **Aufgabe 4.2: Nachweispflicht für Maßnahmen (Step 3.2)**: "Audit-Ready" Workflow: Beweis-Link oder Upload erzwingen.
*   **Aufgabe 4.3: KI-Legal-Translator für VVT (Step 5.1)**: Nutzt Firmenkontext für verständliche Rechtsgrundlagen.

### Phase 5: ProcessHub & Globales Monitoring
*Die Vernetzung der operativen Abläufe und finale Kontrolle.*

*   **Aufgabe 5.1: Strikte Rollen-Validierung im BPMN (Step 4.1)**: Kein Freitext bei Verantwortlichkeiten! Abgleich gegen Stellenplan.
    *   *Audit-Notiz*: "Strikte" Validierung kann Workflow blockieren. Braucht "Override"-Funktion für Admins.
*   **Aufgabe 5.2: Health-Overlay Landkarte (Step 4.2)**: Zeige farblich Compliance-Lücken in der Prozesskarte.
*   **Aufgabe 5.3: Global Health-Check Widget (Step 1.4)**: Status-Monitor für API-Verbindungen (Jira, KI, LDAP).
*   **Aufgabe 5.4: Dry-Run Preview (Step 8.2)**: Vorschau der Auswirkungen vor jedem Sync (LDAP/Jira).

---
*Ende des optimierten Masterplans. Stand: Strategisches Audit V2.3*