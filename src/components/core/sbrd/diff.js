// Word-level diff helpers for the document-canvas tracked-changes
// surface. Lifted verbatim from V1 secretarybird ChatLayout.jsx —
// no behavior change, just relocated for the PR-11b decomposition.
//
// wordDiff: tokenises by words + whitespace, runs LCS, returns
// an array of { type: 'unchanged'|'deleted'|'inserted', text }.

export function wordDiff(original, current) {
  const tokenise = str => str.match(/\S+|\s+/g) || []
  const orig = tokenise(original)
  const curr = tokenise(current)
  const m = orig.length
  const n = curr.length

  const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = orig[i] === curr[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const parts = []
  let i = 0, j = 0
  while (i < m || j < n) {
    if (i < m && j < n && orig[i] === curr[j]) {
      parts.push({ type: 'unchanged', text: curr[j] }); i++; j++
    } else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
      parts.push({ type: 'inserted', text: curr[j] }); j++
    } else {
      parts.push({ type: 'deleted', text: orig[i] }); i++
    }
  }
  return parts
}

// DOM cursor helpers used by DocumentParagraph's contentEditable
// row to preserve the caret position across React re-renders that
// rewrite textContent.

export function getTextOffset(container, node, offset) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let total = 0, cur
  while ((cur = walker.nextNode())) {
    if (cur === node) return total + offset
    total += cur.length
  }
  return total
}

export function setCursorAt(container, targetOffset) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let remaining = targetOffset, cur
  while ((cur = walker.nextNode())) {
    if (remaining <= cur.length) {
      const range = document.createRange()
      range.setStart(cur, remaining)
      range.collapse(true)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
      return
    }
    remaining -= cur.length
  }
  const range = document.createRange()
  range.selectNodeContents(container)
  range.collapse(false)
  window.getSelection().removeAllRanges()
  window.getSelection().addRange(range)
}
