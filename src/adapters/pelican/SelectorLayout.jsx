/**
 * Pelican SelectorLayout — delegates to Albatross.
 *
 * The conversation list is mode-agnostic (same flat V6 model, same
 * sort/filter/bulk-action behavior) regardless of which chat layout
 * the user is in. A Pelican-specific selector (data icon, file count
 * badge per row) is deferred to a future iteration.
 */
export { default } from '../albatross/SelectorLayout'
