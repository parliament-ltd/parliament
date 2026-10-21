import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import CitationLink from './CitationLink'
import { safeUrl } from '../../lib/safeUrl'

// The one way text from outside is read as Markdown (refactor-plan.md,
// stage 4; security audit, item 10 and T8). Model output, restored text and
// previews all come through here, with one fixed policy:
// - Raw HTML in the text is shown as text, never run (the library's own
//   behaviour; nothing here turns it on).
// - Links go only to web and mail addresses. Anything else, a relative
//   address into the app included, is left as plain text. Every link opens
//   in a new tab with no opener and no referrer (CitationLink).
// - Images are never loaded: an image becomes a link to it, named by its
//   alt text, so nothing is fetched from a host the person did not choose.
// A caller may draw other elements its own way (headings with anchors,
// highlighted passages, charts in code blocks), but not links or images.

function ImageAsLink({ src, alt }) {
  const href = safeUrl(src)
  const label = alt || src || ''
  return href ? <CitationLink href={href}>{label}</CitationLink> : <span>{label}</span>
}

const PLUGINS = [remarkGfm]
const FIXED = { a: CitationLink, img: ImageAsLink }

/**
 * @param {{ children: string, components?: object }} props
 *   components: how to draw other elements; links and images stay fixed
 */
export default function Markdown({ children, components = null }) {
  return (
    <ReactMarkdown remarkPlugins={PLUGINS} urlTransform={safeUrl} components={components ? { ...components, ...FIXED } : FIXED}>
      {children}
    </ReactMarkdown>
  )
}
