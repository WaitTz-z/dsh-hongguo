export class TaskRegistry {
  sessions = new Map()
  previous = new Map()

  get(session) {
    return this.sessions.get(session)
  }

  update(session, turn, event) {
    if (![session, turn].every(value => typeof value === 'string' && /^[\w.:-]{1,160}$/.test(value))) throw Error('Invalid session or turn')
    if (!['start', 'finish', 'waiting', 'resume'].includes(event)) throw Error('Invalid event')
    const current = this.get(session)
    if (current?.turn !== turn) {
      if (event !== 'start' || this.previous.get(session)?.has(turn)) return
      const seen = this.previous.get(session) ?? new Set()
      if (current) seen.add(current.turn)
      if (seen.size > 256) seen.delete(seen.values().next().value)
      this.previous.set(session, seen)
      this.sessions.set(session, { turn, phase: 'running', since: Date.now() })
      return
    }
    if (event === 'start' || current.phase === 'finished') return
    const phase = { finish: 'finished', waiting: 'waiting', resume: 'running' }[event]
    if (current.phase !== phase) this.sessions.set(session, { turn, phase, since: Date.now() })
  }
}
