# Masterplan: VVT-Restrukturierung & Hub-Synchronisation

Dieses Dokument beschreibt den Ausführungspfad für die strikte funktionale Trennung der Module (Policy, Workflow, Access, Risk) gemäß dem Referenz-Prinzip ("Single Source of Truth").

## 🧠 Kernprinzip der Aufteilung
- **Policy Hub (VVT):** Rechtlich-fachliches "Was & Warum" (Art. 30 DSGVO).
- **Workflow Hub (Prozesse):** Operativ-technisches "Wie" (Systeme, Datenflüsse).
- **Access Hub (IAM):** Autorisierung "Wer darf was" (Rollen, Berechtigungen).
- **Risk Hub (Gefahren):** Prävention "Was kann schiefgehen" (Risiken, Kontrollen).

---

## 🏗️ Phase 1: Datenbank-Schema & Model-Alignment
Bevor die UI angepasst wird, muss das Backend die neuen Relationen unterstützen.

1. **Update `processingActivities` (VVT):**
   - Hinzufügen: `jointController` (Boolean/Text), `dataProcessorId` (Referenz), `receiverCategories` (Text), `thirdCountryTransfer` (Boolean), `targetCountry` (Text), `transferMechanism` (Enum: SCC, BCR, etc.).
   - Entfernen: Direkte System-IDs (diese werden künftig über den Workflow Hub vererbt).

2. **Update `processes` (Workflow):**
   - Hinzufügen: `vvtId` (Referenz auf VVT-Eintrag), `automationLevel` (Enum), `dataVolume` (Enum), `processingFrequency` (Enum).
   - Verknüpfung: Sicherstellen, dass jeder Prozess einem VVT-Eintrag zugeordnet werden kann.

3. **Update `entitlements` (Access):**
   - Hinzufügen: `vvtId` (Optionaler Link für direkte Art-30-Relevanz).

4. **Update `risks` (Risk):**
   - Hinzufügen: `vvtId` (Direkte Kopplung für Datenschutz-Folgenabschätzung/DSFA).

---

## 🛠️ Phase 2: Policy Hub Refactoring (VVT-Kern)
Fokus auf rechtliche Steuerung.

- **UI-Anpassung:** Überarbeitung des VVT-Dialogs. Entfernung technischer IT-Details.
- **Neu:** Implementierung der Drittland-Abfrage und der logischen Empfängerkategorien.
- **Reporting:** Anpassung des Art. 30 Exports (PDF/Excel), sodass er Daten aus dem referenzierten Workflow Hub (Systeme) automatisch mitzieht.

---

## ⚙️ Phase 3: Workflow Hub Erweiterung (Die technische Realität)
Fokus auf prozessuale Abbildung.

- **Metadata-Update:** Prozesse erhalten Felder für Automatisierungsgrad und Volumen.
- **System-Verknüpfung:** Die Zuordnung von IT-Ressourcen erfolgt ausschließlich hier.
- **Vererbung:** Wenn ein Prozess mit VVT-ID "X" verknüpft ist, gelten alle hier genutzten Ressourcen automatisch als "verarbeitende Systeme" für das VVT.

---

## 🔐 Phase 4: Access Hub Operationalisierung
Fokus auf "Audit-Readiness".

- **Rollen-Mapping:** Möglichkeit, eine Rolle (JobTitle) direkt einer Verarbeitungstätigkeit (VVT) zuzuordnen.
- **Compliance-View:** "Wer hat Zugriff auf Daten aus VVT-Eintrag XY?" – Implementierung eines Filters im Benutzerverzeichnis, der über die Kette *User -> Rolle -> VVT* auflöst.

---

## ⚠️ Phase 5: Risk Hub Automatisierung
Fokus auf dynamische Kontrolle.

- **Trigger-Logik:** Wenn im VVT "Besondere Kategorien" (Art. 9) oder "Drittland" gewählt wird -> Automatische Erstellung einer Aufgabe/Risiko im Risk Hub.
- **Kontroll-Mapping:** Verknüpfung von TOMs (Maßnahmen) mit VVT-Einträgen zur Nachweisführung der Angemessenheit.

---

## 🗺️ Phase 6: Visual Governance (Data Map)
- **Graph-Update:** Die Daten-Landkarte muss die neue Hierarchie (VVT -> Prozess -> Ressource -> Rolle) visuell abbilden.
- **Impact-Visualisierung:** "Was passiert rechtlich (VVT), wenn dieses technische System (Ressource) ausfällt?"

---
*Status: In Planung. Nächster Schritt: Schema-Migration (Phase 1).*
