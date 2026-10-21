// Retired with R32, approved by Stefan on 21 October 2026.
//
// The three requests made silently after a chat's first answer, one each
// for its title, its summary and its tags (request-path audit, item 5).
// C62 replaced them with one request, named on the Enter line
// (generateMetadata in src/providers/anthropic.js). Nothing imports this
// file and it is not built into the app. It keeps the code word for word,
// so it can be restored:
// - the three prompts go back above "One request after a chat's first
//   answer" in src/providers/anthropic.js;
// - the three methods go back into AnthropicProvider, before
//   generateMetadata (they use its _lightweightCall, _prepareMessages and
//   _stripPrefixes, which stay);
// - the interface notes at the end go back into src/providers/base.js,
//   before generateMetadata.

const TITLE_SYSTEM_PROMPT = `Generate a short title (2-6 words) for this conversation. Rules:
- No quotes, no periods, no special characters
- Capture the core topic or intent
- Be specific, not generic (e.g. "React Router Migration" not "Coding Help")
- Title case
- Do NOT prefix with "Title:" or "Summary:" or any label
- Respond with ONLY the title, nothing else`

const SUMMARY_SYSTEM_PROMPT = `Summarize this conversation in one concise sentence. Rules:
- Maximum 120 characters
- Describe what was discussed or accomplished
- Use past tense (e.g. "Designed a chat interface with branching and context metering")
- Be specific, not generic
- Do NOT prefix with "Summary:" or any label
- Respond with ONLY the summary sentence, nothing else`

const TAGS_SYSTEM_PROMPT = `Generate 1-3 topic tags for this conversation. Rules:
- Each tag is a single lowercase word (e.g. "design", "api", "architecture")
- Tags should capture the main topics or domains discussed
- Return ONLY the tags as a comma-separated list, nothing else
- Example: "design, api, performance"`

export const RETIRED_ANTHROPIC_METHODS = {
  async generateTitle(apiKey, messages) {
    const titleMessages = this._prepareMessages(messages, 2, 500)

    titleMessages.push({
      role: 'user',
      content: 'Based on our exchange above, generate a short title for this conversation.',
    })

    const rawTitle = await this._lightweightCall(apiKey, TITLE_SYSTEM_PROMPT, titleMessages, 30)
    const cleanTitle = this._stripPrefixes(rawTitle)

    if (cleanTitle.length === 0 || cleanTitle.length > 60) {
      throw new Error('Generated title was empty or too long')
    }

    return cleanTitle
  },

  async generateSummary(apiKey, messages) {
    const summaryMessages = this._prepareMessages(messages, 6, 400)

    summaryMessages.push({
      role: 'user',
      content: 'Based on the conversation above, write a one-sentence summary of what was discussed.',
    })

    const rawSummary = await this._lightweightCall(apiKey, SUMMARY_SYSTEM_PROMPT, summaryMessages, 80)
    const cleanSummary = this._stripPrefixes(rawSummary)

    if (cleanSummary.length === 0 || cleanSummary.length > 200) {
      throw new Error('Generated summary was empty or too long')
    }

    return cleanSummary
  },

  async generateTags(apiKey, messages) {
    const tagMessages = this._prepareMessages(messages, 4, 400)

    tagMessages.push({
      role: 'user',
      content: 'Based on the conversation above, generate topic tags.',
    })

    const rawTags = await this._lightweightCall(apiKey, TAGS_SYSTEM_PROMPT, tagMessages, 40)
    const cleanTags = this._stripPrefixes(rawTags)

    // Parse comma-separated tags, clean each one
    const tags = cleanTags
      .split(',')
      .map(t => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))
      .filter(t => t.length > 0 && t.length <= 20)
      .slice(0, 3)

    if (tags.length === 0) {
      throw new Error('No valid tags generated')
    }

    return tags
  },
}

/* From src/providers/base.js, the interface notes:

  // Generate a short conversation title from the first exchange.
  // Uses a lightweight non-streaming call to the cheapest available model.
  // Returns a short title string (2-6 words).
  // Callers should catch errors and handle silently (conversation keeps default title).
  async generateTitle(apiKey, messages) {
    throw new Error('Not implemented')
  }

  // Generate a one-line AI summary of the conversation so far.
  // Uses a lightweight non-streaming call to the cheapest available model.
  // Returns a summary string (one sentence, max ~120 characters).
  // Callers should catch errors and handle silently (conversation keeps no summary).
  async generateSummary(apiKey, messages) {
    throw new Error('Not implemented')
  }

  // Generate topic tags for a conversation based on its content.
  // Uses a lightweight non-streaming call to the cheapest available model.
  // Returns an array of 1-3 lowercase tag strings.
  // Callers should catch errors and handle silently (conversation keeps no tags).
  async generateTags(apiKey, messages) {
    throw new Error('Not implemented')
  }
*/
