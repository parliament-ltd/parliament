// StepHeader — kicker / title / subtitle for each wizard step (PR-13).
//
// Per parliament_wizard_v5.html lines 207–225 (.qlabel / .qmain / .qsub).

export default function StepHeader({ kicker, title, subtitle }) {
  return (
    <>
      {kicker && (
        <div
          className="text-[10px] font-medium uppercase mb-1.5"
          style={{ letterSpacing: '0.08em', color: 'var(--p-text-muted)' }}
        >
          {kicker}
        </div>
      )}
      <div
        className="text-[17px] font-medium leading-tight mb-1"
        style={{ color: 'var(--p-text-primary)' }}
      >
        {title}
      </div>
      {subtitle && (
        <div className="text-[12px] mb-5" style={{ color: 'var(--p-text-muted)' }}>
          {subtitle}
        </div>
      )}
    </>
  )
}
