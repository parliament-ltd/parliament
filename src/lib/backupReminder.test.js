import { describe, it, expect } from 'vitest'
import { backupReminderDue } from './backupReminder'

const base = { chatCount: 0, roomCount: 0, accountAgeDays: 0, daysSinceLast: null, daysSinceDismissed: null, storageKept: true }

describe('the backup reminder', () => {
  it('waits for some work, then for thirty days without a backup, when the data is kept', () => {
    expect(backupReminderDue({ ...base, chatCount: 1 }).show).toBe(false)
    expect(backupReminderDue({ ...base, chatCount: 5 }).show).toBe(true)
    expect(backupReminderDue({ ...base, chatCount: 5, daysSinceLast: 10 }).show).toBe(false)
    expect(backupReminderDue({ ...base, chatCount: 5, daysSinceDismissed: 3 }).show).toBe(false)
  })

  it('pushes harder when the browser has not agreed to keep the data', () => {
    const atRisk = { ...base, storageKept: false }
    expect(backupReminderDue({ ...atRisk, chatCount: 1 })).toEqual({ show: true, atRisk: true })
    expect(backupReminderDue({ ...atRisk, chatCount: 1, daysSinceLast: 0 }).show).toBe(false)
    expect(backupReminderDue({ ...atRisk, chatCount: 1, daysSinceLast: 1 }).show).toBe(true)
    expect(backupReminderDue({ ...atRisk, chatCount: 1, daysSinceDismissed: 2 }).show).toBe(true)
    expect(backupReminderDue({ ...atRisk, chatCount: 0 }).show).toBe(false)
  })

  it('treats a browser that cannot say as one that keeps the data', () => {
    expect(backupReminderDue({ ...base, storageKept: null, chatCount: 1 })).toEqual({ show: false, atRisk: false })
  })
})
