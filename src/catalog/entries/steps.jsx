// steps@1.0: the step list (stage 10, piece 5; AB §3; Lab v7; C202).
//
// A plan's steps inside a room, following the room's chat, or a plan pinned
// by its number. Reader tier: no model calls, nothing written. The whole
// plan is the Plan board; this block shows a branch's steps beside its
// conversation.

import StepsRender from './steps-render'

const SAMPLE_STEPS = ['What is the tower made of?', 'Who built it, and when?']

export default {
  name: 'steps',
  version: '1.0',
  displayName: 'Step list',
  author: 'parliament',
  description: 'The plan’s steps, following this room’s conversation. The whole plan is a board of its own.',
  icon: 'ListOrdered',
  surfaces: ['room'],
  tier: 'reader',
  slotTargets: [
    { slot: 'right-rail',       primary: true },
    { slot: 'left-rail',        fallbackOk: true },
    { slot: 'right-rail-extra', fallbackOk: true },
    { slot: 'sheet',            fallbackOk: true },
  ],
  capabilityRequirements: ['storage:read'],
  configSchema: {
    show: {
      type: 'enum',
      options: ['this run', 'all runs'],
      default: 'this run',
      label: 'Steps shown',
    },
    follow: {
      type: 'enum',
      options: ['this chat', 'a pinned plan'],
      default: 'this chat',
      label: 'Which plan',
    },
    plan: {
      type: 'number',
      default: 0,
      label: 'The pinned plan’s number',
    },
  },

  render: StepsRender,

  // Sample steps for the dev catalogue, with no plan behind them.
  previewRender: () => (
    <div className="ch-sl">
      <ol className="ch-sl-list">
        {SAMPLE_STEPS.map((text, i) => (
          <li key={text} className="ch-sl-step"><span className="ch-sl-ord">{i + 1}</span><span className="ch-sl-text">{text}</span></li>
        ))}
      </ol>
    </div>
  ),
}
