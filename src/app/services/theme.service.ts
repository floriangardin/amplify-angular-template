// src/app/services/theme.service.ts
import { Injectable } from '@angular/core';
import { Style } from '../models/game';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  applyTheme(style: Style) {
    const root = document.documentElement;
    this.createAllShades(style.primary_color, 'primary', 500);
    this.createAllShades(style.secondary_color, 'secondary', 500);
    root.style.setProperty('--color-font-primary', style.primary_font_color);
    root.style.setProperty('--color-font-secondary', style.secondary_font_color);
    // Save to localStorage for persistence
    localStorage.setItem('theme', JSON.stringify(style));
  }

  hydrateFromStorage() {
    const theme = localStorage.getItem('theme');
    if (theme) {
      const parsedTheme = JSON.parse(theme);
      this.applyTheme(parsedTheme);
    }
  }

  private createAllShades(hex: string, colorName = 'primary', baseValue = 500) {
    const root = document.documentElement;
    root.style.setProperty(`--color-${colorName}`, hex.toLowerCase()); // e.g. "#ff0000"
    let values = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
    let shades: { [key: number]: string } = {};
    const { r, g, b } = this.hexToRgb(hex);
    const lightText = this.preferLightText({ r, g, b });
    values.forEach(v => {
        if(v == 50){
            v = 30;
        }
      const factor = ( baseValue -v) / 1000;
      const adjust = (c: number) => {
        const delta = factor * (factor < 0 ? c : 255 - c);
        return Math.min(255, Math.max(0, Math.round(c + delta)));
      };
      const adjusted = `#${[adjust(r), adjust(g), adjust(b)]
        .map(c => c.toString(16).padStart(2, '0'))
        .join('')}`;
      shades[v] = adjusted;
      root.style.setProperty(`--color-${colorName}-${v}`, adjusted);
    });
    
    return { shades, lightText };
  }

  private hexToRgb(hex: string) {
    const m = hex.replace('#', '');
    const v = m.length === 3
      ? m.split('').map(c => c + c).join('')
      : m.padStart(6, '0');
    const r = parseInt(v.slice(0, 2), 16);
    const g = parseInt(v.slice(2, 4), 16);
    const b = parseInt(v.slice(4, 6), 16);
    return { r, g, b };
  }

  private preferLightText({ r, g, b }: { r: number; g: number; b: number }) {
    // WCAG relative luminance threshold
    const srgb = [r, g, b].map(v => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    const L = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    return L < 0.5; // dark bg -> light text
  }
}
