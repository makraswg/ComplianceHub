# ComplianceHub - Governance Platform

Der ComplianceHub ist eine mandantenfähige Plattform zur Verwaltung von IT-Berechtigungen (IAM), Risikomanagement nach BSI IT-Grundschutz und Datenschutz-Compliance (DSGVO).

## 🚀 Installation & Hosting (Docker)

Die Plattform ist für den Betrieb in einer Docker-Umgebung optimiert und nutzt standardmäßig eine MySQL-Datenbank.

### 1. Erstinstallation
Stellen Sie sicher, dass `docker` und das `docker-compose-plugin` installiert sind. 

**Hinweis:** Verwenden Sie den modernen Befehl `docker compose` (V2), um Fehler mit veralteten Python-Versionen zu vermeiden.

```bash
# Container bauen und im Hintergrund starten
docker compose up -d --build
```

Die Anwendung ist anschließend unter `http://localhost:9002` erreichbar.

### 2. Datenbank-Initialisierung
Nach dem ersten Start müssen die Tabellen in der MySQL-Datenbank angelegt werden:
1. Navigieren Sie zu `http://localhost:9002/setup`.
2. Wählen Sie als Datenquelle **"Lokal (MySQL / SQL)"**.
3. Klicken Sie auf **"Initialisieren"**. Dieser Vorgang erstellt alle Tabellen und legt den Standard-Administrator an.

## 🔐 Standard-Login

Verwenden Sie für die erste Anmeldung nach der Initialisierung folgende Zugangsdaten:

*   **E-Mail:** `admin@compliance-hub.local`
*   **Passwort:** `admin123`

*Hinweis: Bitte ändern Sie das Passwort umgehend nach der ersten Anmeldung über das Benutzermenü unten links.*

## 🔄 Updates durchführen

Wenn neue Funktionen implementiert wurden, führen Sie folgende Schritte aus, um das Image zu aktualisieren und die Datenbank-Migrationen anzuwenden:

```bash
# Container stoppen und neue Version bauen
docker compose down
docker compose up -d --build

# WICHTIG: Nach jedem Update
# Gehen Sie in der App auf 'Setup' -> 'Initialisieren'
# Dies fügt neue Spalten oder Tabellen hinzu, ohne bestehende Daten zu löschen.
```

## 🛠 Fehlerbehebung (Troubleshooting)

### ModuleNotFoundError: No module named 'distutils'
Falls dieser Fehler beim Aufruf von `docker-compose` erscheint, verwenden Sie eine veraltete Python-basierte Version. 
**Lösung:** Installieren Sie das Docker Compose Plugin (`apt install docker-compose-v2`) und nutzen Sie den Befehl ohne Bindestrich:
`docker compose up` statt `docker-compose up`.

## 🛠 Technologien
*   **Frontend/Backend:** Next.js 15 (App Router)
*   **UI:** Tailwind CSS, ShadCN
*   **Datenbank:** MySQL 8.0
*   **KI:** Genkit (Ollama / Google Gemini)
*   **Integration:** Jira Service Management API v3
