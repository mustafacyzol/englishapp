/**
 * Frames and covers added by admins (reward items with an image) arrive in
 * /config. They are kept here so the avatar and cover components can draw them
 * next to the built-in ones without every caller passing the config around.
 */
export interface CustomFrame { label: string; image: string; hole?: number }
export interface CustomBanner { label: string; image: string; pos?: string }

export const customCosmetics: { frames: Record<string, CustomFrame>; banners: Record<string, CustomBanner> } = { frames: {}, banners: {} }

export function registerCosmetics(c?: { frames?: Record<string, CustomFrame> | unknown[]; banners?: Record<string, CustomBanner> | unknown[] }) {
  // PHP sends an empty object as []
  if (c?.frames && !Array.isArray(c.frames)) customCosmetics.frames = c.frames
  if (c?.banners && !Array.isArray(c.banners)) customCosmetics.banners = c.banners
}
