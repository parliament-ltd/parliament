// The bar's timings for motion run from script, matching the tokens in
// src/styles/tokens.css (--ch-dur-slide, --ch-dur-morph). Slowed by half
// again on Stefan's word (C111, 20 October). Reduced motion is handled where
// each is used.

export const MOTION = Object.freeze({
  wipe: 420, // a mode's fill wipes in
  fade: 240, // pills, glyphs and the Enter line
  slide: 540, // the field folds to a circle (C108)
  morph: 540, // the chevron becomes the moon (C112)
  // Deliberate, so the change is seen (C113): the chevron shows and holds
  // where the > was, then travels; it stays a chevron for the first part of
  // the way and becomes the moon as it reaches the centre.
  hold: 160, // the chevron shows before it sets off
  morphAfter: 300, // into the travel, before the chevron starts to change
})
