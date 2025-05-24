# WLED MCP Server

Ein Model Context Protocol (MCP) Server zur Steuerung von WLED-Geräten.

## Installation

1. In das Verzeichnis wechseln:
```bash
cd mcp-server
```

2. Abhängigkeiten installieren:
```bash
npm install
```

3. Konfiguration anpassen:
Bearbeite die `config.json` Datei und setze die IP-Adresse deines WLED-Geräts:
```json
{
  "wled": {
    "host": "192.168.1.100",  // IP-Adresse deines WLED-Geräts
    "port": 80,
    "timeout": 5000
  }
}
```

## Verwendung

### Server starten
```bash
npm start
```

### Entwicklungsmodus (mit Auto-Reload)
```bash
npm run dev
```

## Verfügbare Tools

Der MCP-Server stellt folgende Tools zur Verfügung:

### 1. wled_toggle_power
Schaltet das WLED-Gerät ein oder aus.

**Parameter:**
- `state` (optional, boolean): `true` für ein, `false` für aus. Wenn nicht angegeben, wird der Zustand umgeschaltet.

**Beispiele:**
- Einschalten: `{"state": true}`
- Ausschalten: `{"state": false}`
- Umschalten: `{}` (ohne Parameter)

### 2. wled_set_brightness
Setzt die Helligkeit des WLED-Geräts.

**Parameter:**
- `brightness` (integer, 0-255): Helligkeit von 0 (aus) bis 255 (maximal hell)

**Beispiel:**
- 50% Helligkeit: `{"brightness": 127}`

### 3. wled_set_color
Setzt die Farbe des WLED-Geräts.

**Parameter (eine der beiden Optionen):**
- RGB-Werte: `red`, `green`, `blue` (integer, 0-255)
- Hex-Code: `hex` (string, Format: #RRGGBB)

**Beispiele:**
- Rot mit RGB: `{"red": 255, "green": 0, "blue": 0}`
- Blau mit Hex: `{"hex": "#0000FF"}`

### 4. wled_get_status
Ruft den aktuellen Status des WLED-Geräts ab.

**Parameter:** Keine

## Konfiguration

Die `config.json` Datei enthält folgende Einstellungen:

- `host`: IP-Adresse des WLED-Geräts
- `port`: Port des WLED-Geräts (Standard: 80)
- `timeout`: Timeout für HTTP-Requests in Millisekunden

## Fehlerbehandlung

Der Server behandelt verschiedene Fehlerszenarien:
- WLED-Gerät nicht erreichbar
- Ungültige Konfiguration
- HTTP-Timeouts
- Ungültige Parameter

## WLED-API Kompatibilität

Dieser Server verwendet die WLED JSON API:
- `/json/state` - Zustand setzen/abrufen
- `/json` - Vollständige Statusinformationen

Kompatibel mit WLED Version 0.10+ 

## Lizenz

MIT
