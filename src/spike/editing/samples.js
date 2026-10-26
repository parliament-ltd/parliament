// Stage 11 spike (C205): the replies the spike edits, held in memory only.
// The first three are parliament-inline-editing-v5.html's own scenario (the
// Murano story, branches 201a, 201b and 201c); the others hold every kind of
// block a reply can have, and a long reply for speed.

export const PROMPT = 'Draft the opening of a short story set in a glassworks on Murano in 1880.'

export const BRANCHES = [
  {
    key: '201a', source: 'Sonnet 4.6', prompt: PROMPT,
    reply: 'The furnace on the Rio dei Vetrai had not gone out in eleven years, and old Ferro meant to keep it that way. Every morning before light he climbed the stairs from the canal with two apprentices at his heels, and every morning he told them the same thing: glass remembers the hand that rushed it.\n\nThat winter a stranger came to the workshop asking for a mirror that would show a face as it would look in ten years.',
  },
  {
    key: '201b', source: 'Wikipedia', keyless: true, prompt: PROMPT,
    reply: 'From the article on Murano glass. Glassmaking on Murano dates to 1291, when the Republic of Venice ordered glassmakers to move their furnaces to the island, partly to protect the city from fire. The island became known for coloured glass, enamelled glass and, later, mirrors.\n\nWikipedia, CC BY-SA 4.0',
  },
  {
    key: '201c', source: 'Opus 4.6', prompt: PROMPT,
    reply: 'Lucia learned to count by the colours of the glass: one was clear, two was the green of bottle ends, three was the red they made only for the church. Her father’s furnace had not gone out in eleven years, and she had never once seen it dark.\n\nBy the time she was nine she could tell a good batch from a bad one by the sound it made cooling, a thin ringing like a spoon against a cup.',
  },
]

// In the shape the chart tool gives and every reply draws (ChartRenderer).
const CHART = JSON.stringify({
  type: 'bar', title: 'Furnaces on Murano, by decade',
  labels: ['1840s', '1850s', '1860s', '1870s', '1880s'],
  datasets: [{ label: 'Furnaces', values: [18, 14, 21, 26, 31] }],
})

export const EVERY_KIND = {
  key: 'blocks', source: 'Sonnet 4.6', prompt: 'Summarise what we know about the glassworks, with a table and a chart.',
  reply: `## The glassworks in 1880

The workshop had **three furnaces**, one of them kept *alight for eleven years*. The figures come from the [Museo del Vetro](https://museovetro.visitmuve.it/) and the island's tax rolls; \`furnace_count\` below is from the rolls.

### What they made

- Coloured glass for the church
- Mirrors, after 1870
- Beads, sold by weight

1. Gather the batch
2. Melt it overnight
3. Blow and shape at first light

- [x] Find the 1880 tax roll
- [ ] Ask about the 1950s renovation

> Glass remembers the hand that rushed it.

| Year | Furnaces | Workers |
| --- | --- | --- |
| 1870 | 26 | 140 |
| 1880 | 31 | 175 |

\`\`\`chart
${CHART}
\`\`\`

\`\`\`
furnace_count = 31
\`\`\`

---

ムラーノ島のガラス工房は、一二九一年から続いています。炉の火は十一年間消えたことがありませんでした。

穆拉诺岛的玻璃工坊自一二九一年起延续至今，炉火十一年未曾熄灭。`,
}

const SENTENCES = [
  'The furnace on the Rio dei Vetrai had not gone out in eleven years.',
  'Every morning before light old Ferro climbed the stairs from the canal.',
  'Glass remembers the hand that rushed it, he told the apprentices.',
  'That winter a stranger came asking for a mirror that would show a face as it would look in ten years.',
  'The batch was gathered at dusk and melted through the night.',
  'By first light the gather glowed the colour of a late afternoon.',
  'Lucia counted by colours: clear, the green of bottle ends, the red for the church.',
  'A good batch made a thin ringing as it cooled, like a spoon against a cup.',
]

/** A reply of about `words` words, in paragraphs of five to eight sentences. */
export function longReply(words = 5000) {
  const paras = []
  let count = 0
  let i = 0
  while (count < words) {
    const n = 5 + (paras.length % 4)
    const para = []
    for (let k = 0; k < n; k++) para.push(SENTENCES[(i++) % SENTENCES.length])
    const text = para.join(' ')
    count += text.split(/\s+/).length
    paras.push(paras.length % 12 === 0 ? `## Part ${paras.length / 12 + 1}\n\n${text}` : text)
  }
  return { key: 'long', source: 'Sonnet 4.6', prompt: 'Write the whole story, at length.', reply: paras.join('\n\n'), words: count }
}
