// BuildStepper — small horizontal progress strip across the wizard.
// Past steps are clickable to jump back; future steps are disabled.

export default function BuildStepper({ steps, current, onJump }) {
  return (
    <div className="flex items-center gap-1.5 justify-center">
      {steps.map((s, i) => {
        const past = i < current
        const isCurrent = i === current
        const reachable = i <= current
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => reachable && onJump?.(i)}
            disabled={!reachable}
            className={`group flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
              reachable ? 'cursor-pointer' : 'cursor-not-allowed'
            }`}
            aria-current={isCurrent ? 'step' : undefined}
            title={s.label}
          >
            <span
              className={`block w-2 h-2 rounded-full transition-colors ${
                isCurrent
                  ? 'bg-[var(--p-gold-light)]'
                  : past
                    ? 'bg-[var(--p-gold-muted)]'
                    : 'bg-[var(--p-border)]'
              }`}
            />
            <span
              className={`text-[10.5px] uppercase tracking-wider font-medium transition-colors ${
                isCurrent
                  ? 'text-[var(--p-text-primary)]'
                  : past
                    ? 'text-[var(--p-text-secondary)] group-hover:text-[var(--p-gold-light)]'
                    : 'text-[var(--p-text-muted)]'
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span className="block w-4 h-px bg-[var(--p-border)] ml-1" />
            )}
          </button>
        )
      })}
    </div>
  )
}
