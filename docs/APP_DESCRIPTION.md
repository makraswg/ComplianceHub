# AccessHub - Master Backlog & Strategisches Manifest

**Rolle**: Dieses Dokument ist das zentrale Steuerungs-Instrument für Entwickler und Unternehmensberater. Es kombiniert die funktionale Dokumentation mit einer tiefgreifenden GRC-Audit-Logik.

---

## 🎯 Die Vision: "Governance am Frühstückstisch"
AccessHub soll die erste Compliance-App sein, die **alles in einem Guss** denkt. 
- **Zielgruppe**: Mittelstand (SME).
- **Usability-Benchmark**: "Azubi-tauglich" (Intuitiv, geführt, keine Fachbegriffe ohne Erklärung).
- **Audit-Benchmark**: "Prüfer-fest" (Lückenlose Historie, Revisionssicherheit, klare Verantwortlichkeiten).

---

## 📜 Master-Anweisungen (Nicht löschen!)
1. **Ganzheitlichkeit**: Module dürfen keine Datensilos sein. Daten aus dem Risikomanagement müssen im IAM sichtbar sein und umgekehrt.
2. **KI-First**: Jedes Formular braucht eine KI-Assistenz für Ausfüllhilfen und Plausibilitätschecks.
3. **Workflow-Zwang**: Aktionen (wie Löschen oder Zuweisen) sind als geführte Prozesse zu verstehen, nicht nur als Tabelleneinträge.
4. **Export-Pflicht**: Jede Ansicht muss einen "Audit-Export" (PDF/Excel) besitzen, der Zeitstempel und Akteure enthält.
5. **Bedien-Einheitlichkeit**: Formulare, Dialoge und Buttons folgen einem strengen Design-System.

---

## 🏗️ Modul-Audit & Roadmap (Step-by-Step)

### 1. Zentrale Steuerung & Analytik (Dashboard)
*Das Nervenzentrum. Hier wird entschieden, was heute wichtig ist.*

*   **Step 1.1: Unified Metrics**
    *   *Status*: Implementiert (`src/app/(dashboard)/dashboard/page.tsx`).
    *   *Consultant Audit*: Sind nur Zähler. Ein Azubi weiß nicht, ob "100 Nutzer" gut oder schlecht sind.
    *   **NEUE AUFGABE**: Einführung von Trend-Indikatoren (+/- % zum Vormonat) und "Health-Ampeln".
*   **Step 1.2: Zertifizierungs-Kampagne**
    *   *Status*: Visueller Fortschritt vorhanden.
    *   *Consultant Audit*: Es fehlt der direkte Workflow-Einstieg.
    *   **NEUE AUFGABE**: "Jetzt prüfen"-Button, der direkt zu den überfälligen Reviews springt.
*   **Step 1.3: Risiko-Profil (Pie Chart)**
    *   *Status*: Statische Darstellung.
    *   *Consultant Audit*: Keine Drill-Down Funktion.
    *   **NEUE AUFGABE**: Klick auf "Hohes Risiko" filtert sofort die Risikoliste.
*   **Step 1.4: Smart Governance Insights (KI)**
    *   *Status*: KI-Warnungen vorhanden.
    *   *Consultant Audit*: Zu generisch.
    *   **NEUE AUFGABE**: Verknüpfung mit Jira-Tickets (z.B. "Warnung: 5 offene Leaver-Tickets seit > 3 Tagen").
*   **Step 1.5: Global Search (Cmd+K)**
    *   *Status*: Implementiert (`src/components/layout/command-menu.tsx`).
    *   *Consultant Audit*: UI ist exzellent.
    *   **NEUE AUFGABE**: Erweiterung der Suche auf "Aktionen" (z.B. "Neuen Nutzer anlegen" direkt aus der Suche).

### 2. Identity & Access Management (IAM)
*Der Kern der digitalen Identität.*

*   **Step 2.1: Benutzerverzeichnis**
    *   *Status*: Tabelle & Cards vorhanden (`src/app/(dashboard)/users/page.tsx`).
    *   *Consultant Audit*: Woher kommen die Daten? (Cross-Check mit LDAP).
    *   **NEUE AUFGABE**: "Inkonsistenz-Flag", wenn LDAP-Daten von Hub-Daten abweichen.
*   **Step 2.2: Einzelzuweisungen**
    *   *Status*: Manuelle Vergabe möglich (`src/app/(dashboard)/assignments/page.tsx`).
    *   *Consultant Audit*: Ein Azubi könnte kritische Rechte versehentlich vergeben.
    *   **NEUE AUFGABE**: "Risk-Check" vor dem Speichern (KI warnt: "Diese Rolle ist hochkritisch für diese Abteilung").
*   **Step 2.3: Access Reviews (Rezertifizierung)**
    *   *Status*: Workflow vorhanden (`src/app/(dashboard)/reviews/page.tsx`).
    *   *Consultant Audit*: Zu trocken. 
    *   **NEUE AUFGABE**: "Bulk-Zertifizierung" für Standardrechte, um Review-Fatigue zu vermeiden.
*   **Step 2.4: KI-Access-Advisor**
    *   *Status*: Flow vorhanden (`src/ai/flows/access-advisor-flow.ts`).
    *   *Consultant Audit*: Sehr wertvoll.
    *   **NEUE AUFGABE**: Advisor soll proaktiv "Peer-Analysen" machen ("Andere in der IT haben dieses Recht nicht").

### 3. Lifecycle Hub & Automatisierung
*Effizienz durch JML-Prozesse (Joiner, Mover, Leaver).*

*   **Step 3.1: Onboarding-Wizard**
    *   *Status*: Formular vorhanden (`src/app/(dashboard)/lifecycle/page.tsx`).
    *   *Consultant Audit*: Wirkt wie ein normales Formular, nicht wie ein Wizard.
    *   **NEUE AUFGABE**: Schritt-für-Schritt UI (1. Person, 2. Paket, 3. Hardware/Jira).
*   **Step 3.2: Offboarding-Engine**
    *   *Status*: Ein-Klick Entzug.
    *   *Consultant Audit*: Revisionsgefahr! Was ist mit physischen Schlüsseln?
    *   **NEUE AUFGABE**: Erweiterung um "Offboarding-Checkliste" (Hardware-Rückgabe, Schlüssel, Token).
*   **Step 3.3: Berechtigungspakete (Bundles)**
    *   *Status*: Definition möglich.
    *   *Consultant Audit*: Pakete müssten abteilungsspezifisch vorgeschlagen werden.
    *   **NEUE AUFGABE**: KI schlägt Bundle-Inhalte basierend auf bestehenden Top-Zuweisungen vor.

### 4. Ressourcen- & Assetkatalog
*Die Inventarisierung der IT-Landschaft.*

*   **Step 4.1: System-Registrierung**
    *   *Status*: Umfangreiches Formular (`src/app/(dashboard)/resources/page.tsx`).
    *   *Consultant Audit*: Zu viele Felder für einen Azubi.
    *   **NEUE AUFGABE**: "Simple Mode" vs. "Expert Mode". KI füllt technische CIA-Werte basierend auf Systemtyp aus.
*   **Step 4.2: Rollendefinition (Entitlements)**
    *   *Status*: Granular hinterlegbar.
    *   *Consultant Audit*: Verknüpfung zum Prozess fehlt.
    *   **NEUE AUFGABE**: Anzeige, in welchen Geschäftsprozessen (ProcessHub) eine Rolle benötigt wird.

### 5. Risikomanagement (GRC Core)
*Präventive Abwehr nach BSI.*

*   **Step 5.1: Risikoinventar**
    *   *Status*: Liste vorhanden (`src/app/(dashboard)/risks/page.tsx`).
    *   *Consultant Audit*: Brutto/Netto Logik ist schwer zu erklären.
    *   **NEUE AUFGABE**: Erklär-Tooltips für jeden Risikoschritt. Automatischer Vorschlag der Minderung durch Maßnahmen.
*   **Step 5.2: Interaktive Risiko-Matrix**
    *   *Status*: Heatmap implementiert (`src/app/(dashboard)/risks/reports/page.tsx`).
    *   *Consultant Audit*: UI ist top.
    *   **NEUE AUFGABE**: Export der Matrix als "Vorstandsvorlage" (Hochwertiges PDF).
*   **Step 5.3: Gefährdungskatalog (BSI)**
    *   *Status*: Browser vorhanden.
    *   *Consultant Audit*: Suche muss auch Beschreibungen durchsuchen.
    *   **NEUE AUFGABE**: KI-Matching: "Welche Gefährdungen passen zu meiner neuen SaaS-Ressource?".

### 6. ProcessHub (Business Architecture)
*Governance trifft operative Realität.*

*   **Step 6.1: Process Designer**
    *   *Status*: mxGraph Integration (`src/app/(dashboard)/processhub/[id]/page.tsx`).
    *   *Consultant Audit*: Komplexität für Azubis hoch.
    *   **NEUE AUFGABE**: "Auto-Layout" Button und Vorlagen für Standardprozesse (z.B. Passwort-Reset).
*   **Step 6.2: KI Process Advisor**
    *   *Status*: Chat & Ops vorhanden.
    *   *Consultant Audit*: Beste Funktion der App.
    *   **NEUE AUFGABE**: Advisor soll aktiv auf fehlende Kontrollen (Maßnahmen) im Prozess hinweisen.

### 7. Integrationen & Ökosystem
*Das Gateway zur Außenwelt.*

*   **Step 7.1: Jira Sync**
    *   *Status*: Tickets & Assets (`src/app/actions/jira-actions.ts`).
    *   *Consultant Audit*: Synchronisations-Fehler sind schwer zu debuggen.
    *   **NEUE AUFGABE**: Visuelles "Sync-Log" für den Nutzer (Was wurde wann zuletzt abgeglichen?).

### 8. Compliance & Auditierung
*Der "Wirtschaftsprüfer-Modus".*

*   **Step 8.1: Datenschutz-Register (VVT)**
    *   *Status*: Art. 30 Dokumentation (`src/app/(dashboard)/gdpr/page.tsx`).
    *   *Consultant Audit*: Verknüpfung zu Systemen ist manuell.
    *   **NEUE AUFGABE**: Automatischer Vorschlag von VVT-Einträgen, wenn ein System als "enthält personenbezogene Daten" markiert wird.
*   **Step 8.2: Globales Audit Log**
    *   *Status*: Ledger vorhanden (`src/app/(dashboard)/audit/page.tsx`).
    *   *Consultant Audit*: Filterung nach "kritischen Änderungen" fehlt.
    *   **NEUE AUFGABE**: "Audit-Alerts" für Administratoren bei unbefugten Zugriffsversuchen.

---
*Backlog Stand: Strategisches Audit v1.0 - Erstellt vom System-Architekten & Unternehmensberater.*
