/* Configuration and constants. */

export const KEY = 'skipdinner.v1';
/* Supabase project (Project Settings → API). The publishable/anon key is meant
   to ship in the page: row level security keeps each user's data private.
   Leave both empty to turn cloud sync off. Never put the secret/service_role key here. */
export const CLOUD = { url:'https://acfamivfwkpihgqrmfui.supabase.co', key:'sb_publishable__yvE3Bg8EwsYPxoDbKGpZQ_vf-N7k0W' };
export const SYNC_KEY = 'skipdinner.sync';
export const XP_VAL = { ok:50, light:20, miss:5 };
export const WAVE_MS = 10*60*1000;
export const RING_C = 2*Math.PI*104, LV_C = 2*Math.PI*39, CD_C = 2*Math.PI*146;
export const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const HAS_GSAP = !!window.gsap && !REDUCE;
