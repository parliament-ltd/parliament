// The bar's timings for motion run from script, matching the tokens in
// src/styles/tokens.css (--ch-dur-slide, --ch-dur-morph). Slowed by half
// again on Stefan's word (C111, 20 October). Reduced motion is handled where
// each is used.

export const MOTION = Object.freeze({
  wipe: 420, // a mode's fill wipes in
  fade: 240, // pills, glyphs and the Enter line
  slide: 540, // the field folds to a circle (C108)
  morph: 540, // the chevron becomes the moon as it travels, with the fold (C112)
})
