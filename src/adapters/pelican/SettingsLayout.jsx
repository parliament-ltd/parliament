/**
 * Pelican SettingsLayout — delegates to Albatross.
 *
 * Settings are global (API key, model, context threshold, appearance, data/backups).
 * Pelican-specific settings (default chart type, auto-analyze on load,
 * sample row limit) are deferred to a future iteration.
 */
export { default } from '../albatross/SettingsLayout'
