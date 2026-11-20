#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { origin, serve, tokenPath } from './server.js'

async function send(event, session, turn) {
  const token = await readFile(tokenPath, 'utf8')
  const response = await fetch(origin + '/event', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(800),
    headers: { authorization: 'Bearer ' + token },
    body: JSON.stringify({ event, session, turn }),
  })
  if (!response.ok) throw Error('事件提交失败 HTTP ' + response.status)
}

const [command = 'serve', ...args] = process.argv.slice(2)
if (command === 'serve') await serve()
else if (command === 'open') {
  try { await serve() } catch (error) {
    if (error.code !== 'EADDRINUSE') throw error
    const response = await fetch(origin + '/sessions', { redirect: 'error', signal: AbortSignal.timeout(1000) })
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw Error('播放器端口已占用')
  }
  const platform = process.platform
  const child = platform === 'win32' ? spawn('rundll32.exe', ['url.dll,FileProtocolHandler', origin]) :
    spawn(platform === 'darwin' ? 'open' : 'xdg-open', [origin])
  child.on('error', () => console.error('请在浏览器打开 ' + origin))
} else if (command === 'event') {
  const flag = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined
  await send(args[0], flag('--session'), flag('--turn'))
} else if (command === 'hook') {
  try {
    let raw = ''
    for await (const chunk of process.stdin) raw += chunk
    const input = JSON.parse(raw)
    const event = { UserPromptSubmit: 'start', PermissionRequest: 'waiting', PostToolUse: 'resume', Stop: 'finish', Interrupt: 'finish' }[input.hook_event_name]
    if (event && input.session_id && input.turn_id && !input.agent_id) await send(event, 'codex:' + input.session_id, input.turn_id)
  } catch {}
  console.log('{}')
} else if (command === 'hook-config' || command === 'install-hooks') {
  const script = fileURLToPath(import.meta.url).replaceAll('\\', '/')
  const hook = { type: 'command', command: '"' + process.execPath.replaceAll('\\', '/') + '" "' + script + '" hook', timeout: 3 }
  const events = ['UserPromptSubmit', 'PermissionRequest', 'PostToolUse', 'Stop', 'Interrupt']
  const config = JSON.stringify({ hooks: Object.fromEntries(events.map(event => [event, [{ hooks: [hook] }]])) }, null, 2)
  if (command === 'hook-config') console.log(config)
  else {
    const dir = join(process.cwd(), '.codex')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'hooks.json'), config + '\n', { flag: 'wx' })
    console.log('已创建项目 Hooks，请在 Codex 中审核。')
  }
} else throw Error('支持 serve、open、event、hook、hook-config')
