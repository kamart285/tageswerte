# Tageswerte

Offline-Web-App (PWA) für Gesundheitswerte mit sechs Reitern (Leiste unten):

1. **Blutdruck** – morgens/abends Sys/Dia/Puls, Tageswerte der Uhr, Verlauf und Diagramme
2. **Gewicht** – mit BMI, Wochen-/Monats-Tendenz, gleitendem Schnitt, Kalorienaufnahme (von Hand) und -verbrauch
3. **Sport** – Sportart und Dauer, Schritte/PAI, Belastung Ist/Soll (Wochenplan in der App), Trainings-Form
4. **Schlaf** – Schlafdauer, Apnoe (Uhr) und AirSense 10 (AHI, Nutzung, Maskenleckage, Maskensitz)
5. **Waage** – alle Werte der Körperwaage (Fett, Muskeln, Wasser, Viszeralfett, Segmente …)
6. **Maße** – Körperumfänge

Tage vor-/zurückblättern (Pfeile oder Wischen), Diagramme je Reiter, Export als CSV (Excel) und JSON-Sicherung,
Import (mehrere Dateien) mit Zusammenführen pro Tag. Das Format der Importdateien steht in `FORMAT.md` (liegt bewusst nicht im Repo).

## Datenschutz
Alle Daten bleiben lokal auf dem Gerät (IndexedDB `tageswerte`). **Dieses Repository enthält nur Code – keine Gesundheitsdaten.**
`.gitignore` schließt Import-/Sicherungsdateien aus. Daten werden nur über „Einstellungen → Import“ aus einer Datei geladen.

Diagramme: [Chart.js](https://www.chartjs.org) 4.5.1 (MIT), lokal eingebunden. Version 2.
