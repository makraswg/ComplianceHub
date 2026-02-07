# AccessHub - Master Backlog & Strategisches Manifest

**Rolle**: Dieses Dokument ist das zentrale Steuerungs-Instrument für Entwickler und Unternehmensberater. Es kombiniert die funktionale Dokumentation mit einer tiefgreifenden GRC-Audit-Logik.

---

## 🎯 Die Vision: "Governance am Frühstückstisch"
AccessHub soll die erste Compliance-App sein, die **alles in einem Guss** denkt. 
- **Zielgruppe**: Mittelstand (SME).
- **Usability-Benchmark**: "Azubi-tauglich" (Intuitiv, geführt, keine Fachbegriffe ohne Erklärung).
- **Audit-Benchmark**: "Prüfer-fest" (Lückenlose Historie, Revisionssicherheit, klare Verantwortlichkeiten).

---

## 📜 Master-Anweisungen (Audit-Kriterien)
1. **Ganzheitlichkeit**: Module dürfen keine Datensilos sein. Daten aus dem Risikomanagement müssen im IAM sichtbar sein und umgekehrt.
2. **KI-First**: Jedes Formular braucht eine KI-Assistenz für Ausfüllhilfen und Plausibilitätschecks.
3. **Workflow-Zwang**: Aktionen (wie Löschen oder Zuweisen) sind als geführte Prozesse zu verstehen, nicht nur als Tabelleneinträge.
4. **Export-Pflicht**: Jede Ansicht muss einen "Audit-Export" (PDF/Excel) besitzen, der Zeitstempel und Akteure enthält.
5. **Bedien-Einheitlichkeit**: Formulare, Dialoge und Buttons folgen einem strengen Design-System.
6. **Sprach-Präzision**: Keine "Developer-Sprache". Nutze Begriffe, die ein Azubi im ersten Lehrjahr versteht.

---

## 🏗️ Modul-Audit & Roadmap (Step-by-Step)

### 1. Zentrale Steuerung & Analytik (Dashboard)
*Das Nervenzentrum. Hier wird entschieden, was heute wichtig ist.*

*   **Step 1.1: Unified Metrics**
    *   *Status*: Implementiert.
    *   *Consultant Audit*: Es sind nur statische Zähler. Ein Azubi weiß nicht, ob "100 Nutzer" gut oder schlecht sind. 
    *   **KRITIK**: Fehlende Trend-Indikatoren (+/- % zum Vormonat) und "Health-Ampeln".
    *   **OPTIMIERUNG**: Metriken müssen Kontext bieten. "10 neue Nutzer seit gestern" ist eine Information, "100 Nutzer gesamt" nur eine Zahl.

*   **Step 1.2: Zertifizierungs-Kampagne**
    *   *Status*: Visueller Fortschritt vorhanden.
    *   *Consultant Audit*: Es fehlt der direkte Workflow-Einstieg. 
    *   **KRITIK**: "68%" sieht schön aus, aber wer hält uns auf? 
    *   **OPTIMIERUNG**: Ein Klick auf den Progress-Bar muss die Liste der "Säumigen Reviewer" öffnen.

*   **Step 1.3: Risiko-Profil (Pie Chart)**
    *   *Status*: Statische Darstellung.
    *   *Consultant Audit*: Keine Drill-Down Funktion. 
    *   **KRITIK**: Silo-Denken. Das Chart ist von den eigentlichen Daten isoliert.
    *   **OPTIMIERUNG**: Klick auf "Hohes Risiko" filtert sofort die Risikoliste (Modulübergreifender Link).

*   **Step 1.4: Smart Governance Insights (KI)**
    *   *Status*: KI-Warnungen vorhanden.
    *   *Consultant Audit*: Zu generisch. 
    *   **KRITIK**: Die KI weiß nicht, was im Jira passiert.
    *   **OPTIMIERUNG**: Verknüpfung mit Jira-Tickets (z.B. "Warnung: 5 offene Leaver-Tickets seit > 3 Tagen"). Proaktive Vorschläge statt nur Warnungen.

### 2. Identity & Access Management (IAM)
*Der Kern der digitalen Identität.*

*   **Step 2.1: Benutzerverzeichnis**
    *   *Status*: Tabelle & Cards vorhanden.
    *   *Consultant Audit*: Woher kommen die Daten? (LDAP-Herkunft muss klarer sein).
    *   **NEUE AUFGABE**: "Inkonsistenz-Flag" einführen. Wenn ein Nutzer im AD deaktiviert ist, aber im Hub noch als "Aktiv" steht, muss ein Azubi das sofort sehen.

*   **Step 2.2: Einzelzuweisungen & Quick Assign**
    *   *Status*: Manuelle Vergabe möglich.
    *   *Consultant Audit*: Ein Azubi könnte kritische Rechte versehentlich vergeben.
    *   **KRITIK**: Fehlende Kopplung zum Risiko-Modul. 
    *   **NEUE AUFGABE**: "Real-time Risk Check". Vor dem Speichern einer Zuweisung prüft das System: "Hat die Rolle 'Admin' im Risikomanagement ein hohes Score?". Falls ja: Warnung anzeigen.

*   **Step 2.3: Access Reviews (Rezertifizierung)**
    *   *Status*: Workflow vorhanden.
    *   *Consultant Audit*: "Review-Fatigue". Manager klicken alles schnell durch.
    *   **NEUE AUFGABE**: "Smart Pre-Selection". Die KI markiert unkritische Standard-Rechte vorab als "Ok", damit sich der Mensch auf die 5% gefährlichen Ausnahmen konzentriert.

*   **Step 2.4: KI-Access-Advisor**
    *   *Status*: Flow vorhanden.
    *   *Consultant Audit*: Der Advisor ist isoliert.
    *   **NEUE AUFGABE**: "Peer-Analytik". Der Advisor muss sagen können: "Andere Mitarbeiter in der Abteilung 'Marketing' haben dieses Recht nicht - eventuell Überprivilegierung?".

### 3. Risikomanagement & GRC
*Die strategische Absicherung.*

*   **Step 3.1: Risikoinventar**
    *   *Status*: Implementiert.
    *   *Consultant Audit*: Folgt noch in der nächsten Phase...

---
*(Fortsetzung folgt in den nächsten Audit-Schritten...)*
