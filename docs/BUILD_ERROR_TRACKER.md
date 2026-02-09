
# ComplianceHub - Build & Runtime Error Tracker

Dieses Dokument dient der systematischen Erfassung und Behebung von Fehlern, die während des Docker-Builds (Prerendering) oder zur Laufzeit auftreten.

## 🟢 Behoben (Build-Stabilität)

| ID | Fehler | Ort | Ursache | Lösung |
|:---|:---|:---|:---|:---|
| ERR-01 | `ReferenceError: Save is not defined` | `/settings/sync` | Icon `Save` verwendet ohne Import / Namenskollision | Importiert als `SaveIcon` |
| ERR-02 | `ReferenceError: Switch is not defined` | `/settings/email` | Fehlender Import der Shadcn Switch Komponente | Import hinzugefügt |
| ERR-03 | `ReferenceError: ArrowDown is not defined` | `/processhub/view/[id]` | Fehlender Import in der Versionshistorie | Icon zur Importliste hinzugefügt |
| ERR-04 | `Parsing ecmascript failed` (JSX) | `/processhub/view/[id]` | Falsch geschachteltes `<Label>` / `</Badge>` | JSX-Tags korrigiert |
| ERR-05 | `Hydration Mismatch` | `Select` Komponenten | Instabile IDs bei SSR | `suppressHydrationWarning` und Mount-Check |

## 🟡 In Prüfung

- [ ] Validierung der LDAP-Verbindungstests im Docker-Netzwerk.
- [ ] Prüfung der PDF-Generierung in der Alpine-Umgebung (Docker).

## 🛡️ Richtlinien für Entwickler

1. **Icons**: Lucide Icons immer mit Alias importieren, falls Namensgleichheit mit Funktionen besteht: `import { Save as SaveIcon } from 'lucide-react'`.
2. **Prerendering**: Next.js 15 validiert alle Codepfade beim Build. Variablen müssen auch in inaktiven Tabs (`TabsContent`) definiert sein.
3. **Client-Hooks**: `useUser` oder `useSettings` erst nach `useEffect` (isMounted) für Logik nutzen, die das initiale HTML beeinflusst.
