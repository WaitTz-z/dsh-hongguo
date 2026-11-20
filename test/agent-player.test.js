import test from 'node:test'
import assert from 'node:assert/strict'
import { TaskRegistry } from '../agent/tasks.js'

test('sessions are isolated and finished turns cannot restart', () => {
  const tasks = new TaskRegistry()
  tasks.update('A', 'one', 'start')
  tasks.update('B', 'one', 'start')
  tasks.update('A', 'two', 'start')
  tasks.update('A', 'one', 'finish')
  assert.equal(tasks.get('A').turn, 'two')
  tasks.update('A', 'two', 'waiting')
  tasks.update('A', 'two', 'start')
  assert.equal(tasks.get('A').phase, 'waiting')
  tasks.update('A', 'two', 'resume')
  assert.equal(tasks.get('A').phase, 'running')
  tasks.update('A', 'two', 'finish')
  tasks.update('A', 'two', 'start')
  assert.equal(tasks.get('A').phase, 'finished')
  assert.equal(tasks.get('B').phase, 'running')
})
