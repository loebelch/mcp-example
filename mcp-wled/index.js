#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WLEDMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'wled-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.config = null;
    this.setupHandlers();
  }

  async loadConfig() {
    try {
      const configPath = path.join(__dirname, 'config.json');
      const configData = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(configData);
    } catch (error) {
      console.error('Fehler beim Laden der Konfiguration:', error.message);
      throw new Error('Konfigurationsdatei config.json konnte nicht geladen werden');
    }
  }

  async makeWLEDRequest(endpoint, data = null) {
    if (!this.config) {
      await this.loadConfig();
    }

    const url = `http://${this.config.wled.host}:${this.config.wled.port}${endpoint}`;
    
    try {
      const options = {
        method: data ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: this.config.wled.timeout,
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error(`WLED-Gerät unter ${this.config.wled.host}:${this.config.wled.port} nicht erreichbar`);
      } else if (error.type === 'request-timeout') {
        throw new Error(`Timeout beim Verbinden zu WLED-Gerät (${this.config.wled.timeout}ms)`);
      }
      throw new Error(`WLED-API Fehler: ${error.message}`);
    }
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'wled_toggle_power',
            description: 'Schaltet das WLED-Gerät ein oder aus',
            inputSchema: {
              type: 'object',
              properties: {
                state: {
                  type: 'boolean',
                  description: 'true für ein, false für aus. Wenn nicht angegeben, wird der Zustand umgeschaltet',
                },
              },
            },
          },
          {
            name: 'wled_set_brightness',
            description: 'Setzt die Helligkeit des WLED-Geräts',
            inputSchema: {
              type: 'object',
              properties: {
                brightness: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 255,
                  description: 'Helligkeit von 0 (aus) bis 255 (maximal hell)',
                },
              },
              required: ['brightness'],
            },
          },
          {
            name: 'wled_set_color',
            description: 'Setzt die Farbe des WLED-Geräts',
            inputSchema: {
              type: 'object',
              properties: {
                red: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 255,
                  description: 'Rot-Wert (0-255)',
                },
                green: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 255,
                  description: 'Grün-Wert (0-255)',
                },
                blue: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 255,
                  description: 'Blau-Wert (0-255)',
                },
                hex: {
                  type: 'string',
                  pattern: '^#[0-9A-Fa-f]{6}$',
                  description: 'Hex-Farbcode (z.B. #FF0000 für rot)',
                },
              },
              oneOf: [
                { required: ['red', 'green', 'blue'] },
                { required: ['hex'] }
              ],
            },
          },
          {
            name: 'wled_get_status',
            description: 'Ruft den aktuellen Status des WLED-Geräts ab',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'wled_toggle_power':
            return await this.handleTogglePower(args);
          
          case 'wled_set_brightness':
            return await this.handleSetBrightness(args);
          
          case 'wled_set_color':
            return await this.handleSetColor(args);
          
          case 'wled_get_status':
            return await this.handleGetStatus();
          
          default:
            throw new Error(`Unbekanntes Tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Fehler: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async handleTogglePower(args) {
    const { state } = args;
    
    let payload;
    if (state !== undefined) {
      payload = { on: state };
    } else {
      // Status abrufen und umschalten
      const status = await this.makeWLEDRequest('/json/state');
      payload = { on: !status.on };
    }

    await this.makeWLEDRequest('/json/state', payload);
    
    const newState = payload.on ? 'eingeschaltet' : 'ausgeschaltet';
    return {
      content: [
        {
          type: 'text',
          text: `WLED-Gerät wurde ${newState}`,
        },
      ],
    };
  }

  async handleSetBrightness(args) {
    const { brightness } = args;
    
    await this.makeWLEDRequest('/json/state', { bri: brightness });
    
    return {
      content: [
        {
          type: 'text',
          text: `Helligkeit auf ${brightness} gesetzt (${Math.round((brightness / 255) * 100)}%)`,
        },
      ],
    };
  }

  async handleSetColor(args) {
    let color;
    
    if (args.hex) {
      // Hex zu RGB konvertieren
      const hex = args.hex.replace('#', '');
      const red = parseInt(hex.substr(0, 2), 16);
      const green = parseInt(hex.substr(2, 2), 16);
      const blue = parseInt(hex.substr(4, 2), 16);
      color = [red, green, blue];
    } else {
      color = [args.red, args.green, args.blue];
    }

    await this.makeWLEDRequest('/json/state', { seg: [{ col: [color] }] });
    
    const colorText = args.hex ? args.hex : `RGB(${color[0]}, ${color[1]}, ${color[2]})`;
    return {
      content: [
        {
          type: 'text',
          text: `Farbe auf ${colorText} gesetzt`,
        },
      ],
    };
  }

  async handleGetStatus() {
    const status = await this.makeWLEDRequest('/json');
    
    const state = status.state;
    const info = status.info;
    
    const statusText = `
WLED-Status:
- Zustand: ${state.on ? 'Ein' : 'Aus'}
- Helligkeit: ${state.bri} (${Math.round((state.bri / 255) * 100)}%)
- Farbe: RGB(${state.seg[0].col[0].join(', ')})
- Effekt: ${info.fxn || 'Unbekannt'}
- Version: ${info.ver}
- LED-Anzahl: ${info.leds.count}
- Stromverbrauch: ${info.leds.pwr}mA
    `.trim();

    return {
      content: [
        {
          type: 'text',
          text: statusText,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('WLED MCP Server gestartet');
  }
}

// Server starten
const server = new WLEDMCPServer();
server.run().catch((error) => {
  console.error('Fehler beim Starten des Servers:', error);
  process.exit(1);
});
