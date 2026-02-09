
# ComplianceHub - Build & Runtime Error Tracker

Dieses Dokument dient der systematischen Erfassung und Behebung von Fehlern, die während des Docker-Builds (Prerendering) oder zur Laufzeit auftreten.

## 🔴 In Bearbeitung (Build-Blocker)

| ID | Fehler | Ort | Ursache | Lösung | Status |
|:---|:---|:---|:---|:---|:---|
| ERR-01 | `ReferenceError: Save is not defined` | `/settings/sync` | Namenskollision oder fehlender Import | Umbenennung in `SaveIcon` | ✅ Behoben |
| ERR-02 | `ReferenceError: Switch is not defined` | `/settings/email` | Fehlender Import der Switch-Komponente | Import hinzugefügt | ✅ Behoben |
| ERR-03 | `Parsing ecmascript failed` | `/processhub/view/[id]` | Nicht geschlossene Tags oder fehlerhafte Schachtelung | JSX-Struktur validiert & bereinigt | ✅ Behoben |

## 🟢 Behoben (Build-Stabilität)

*   **Namenskonventionen**: Alle Lucide-Icons, die mit Funktionen kollidieren könnten (insb. `Save`), wurden global in `SaveIcon` umbenannt.
*   **Import-Audit**: Alle Seiten wurden auf fehlende UI-Komponenten (`Switch`, `Select`, etc.) geprüft.
*   **Hydrierungs-Schutz**: `Select`-Komponenten in komplexen Ansichten rendern nun erst nach der Client-seitigen Hydrierung.

## 🛡️ Richtlinien für Entwickler

1. **Icons**: Lucide Icons immer mit Alias importieren, falls Namensgleichheit mit Funktionen besteht: `import { Save as SaveIcon } from 'lucide-react'`.
2. **Prerendering**: Next.js 15 validiert alle Codepfade beim Build. Variablen müssen auch in inaktiven Tabs (`TabsContent`) definiert sein.
3. **Client-Hooks**: `useUser` oder `useSettings` erst nach `useEffect` (isMounted) für Logik nutzen, die das initiale HTML beeinflusst.
