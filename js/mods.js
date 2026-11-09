// Které moduly má uživatel zapnuté. Starý profil (bez seznamu) = všechno kromě nových voleb.
import { profile } from './store.js';
import { MODULES } from './data/defaults.js';

export function mods(p = profile()) {
  if (p && Array.isArray(p.modules)) return p.modules;
  return MODULES.map(m => m.id);
}
export const has = (id, p) => mods(p).includes(id);
export const modInfo = id => MODULES.find(m => m.id === id);
