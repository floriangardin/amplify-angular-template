
import { signal, WritableSignal } from '@angular/core';
import { Email } from '../../../../models/email';
import { Scenario } from '../../../../models/game-content';

export function changeAndSetEmail(emailToChange: WritableSignal<Email | null>, content: WritableSignal<Scenario>, newText: string, op: 'replace' | 'add' | 'remove', path: string): string | null{

    // Expected path format: /email/<emailName>/<field>[(/nestedField)*]
    if (!path) return null;
    const parts = path.split('/').filter(Boolean); // remove empty due to leading '/'
    if (parts[0] !== 'email' || parts.length < 3) return null; // not an email path we manage
    const emailName = parts[1];
    const fieldPath = parts.slice(2); // remaining path segments

    // Helper to set or delete deep value
    const setDeep = (obj: any, p: string[], value: any, remove = false) => {
      if (!obj || !p.length) return;
      let cur = obj;
      for (let i = 0; i < p.length - 1; i++) {
        const key = p[i];
        if (!(key in cur) || typeof cur[key] !== 'object' || cur[key] === null) {
          cur[key] = {};
        }
        cur = cur[key];
      }
      const last = p[p.length - 1];
      if (remove) {
        if (Array.isArray(cur)) {
          const idx = Number(last);
          if (!isNaN(idx)) cur.splice(idx, 1);
        } else {
          delete cur[last];
        }
      } else {
        cur[last] = value;
      }
    };

    const mail = emailToChange();
    if (mail && mail.name === emailName) {
      // Mutate the selected email (same object reference as in inbox array)
      if (op === 'remove') {
        setDeep(mail as any, fieldPath, undefined, true);
      } else {
        setDeep(mail as any, fieldPath, newText, false);
      }
      // Re-emit to trigger change detection (clone)
      emailToChange.set({ ...mail });
    }

    // Update global content store
    const contentObj = content();
    const targetEmail = contentObj.nodes.find(e => e.name === emailName);
    if (targetEmail) {
      if (op === 'remove') {
        setDeep(targetEmail as any, fieldPath, undefined, true);
      } else {
        setDeep(targetEmail as any, fieldPath, newText, false);
      }
      content.set({ ...contentObj });
    }

    return emailName

  }