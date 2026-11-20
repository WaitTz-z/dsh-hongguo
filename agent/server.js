import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createMediaRoutes } from '../index.js'
import { TaskRegistry } from './tasks.js'

export const origin = 'http://127.0.0.1:47831'
export const dataDir = process.env.AGENT_PLAYER_HOME || join(homedir(), '.agent-player')
export const tokenPath = join(dataDir, 'control-token')

export async function serve() {
  const token = randomBytes(32).toString('hex')
  const tasks = new TaskRegistry()
  const routes = createMediaRoutes()
  const assets = new Map([['/', ['player.html', 'text/html']], ['/player.js', ['player.js', 'text/javascript']]])
  const server = createServer(async (req, res) => {
    const fail = code => { res.writeHead(code); res.end() }
    try {
      if (req.headers.host !== new URL(origin).host ||
          (req.headers.origin && req.headers.origin !== origin) ||
          (req.headers['sec-fetch-site'] === 'cross-site' && req.headers['sec-fetch-mode'] !== 'navigate')) return fail(403)
      res.setHeader('Referrer-Policy', 'no-referrer')
      res.setHeader('X-Frame-Options', 'DENY')
      const url = new URL(req.url, origin)
      if (url.pathname === '/event') {
        if (req.method !== 'POST' || req.headers.authorization !== 'Bearer ' + token) return fail(403)
        let payload = ''
        for await (const chunk of req) {
          payload += chunk
          if (payload.length > 2048) return fail(413)
        }
        const { session, turn, event } = JSON.parse(payload)
        tasks.update(session, turn, event)
        res.writeHead(204).end()
        return
      }
      if (req.method !== 'GET') return fail(405)
      if (url.pathname === '/sessions') {
        res.setHeader('Cache-Control', 'no-store')
        res.setHeader('Content-Type', 'application/json')
        return res.end(JSON.stringify(Object.fromEntries(tasks.sessions)))
      }
      const asset = assets.get(url.pathname)
      if (asset) {
        res.setHeader('Content-Type', asset[1] + '; charset=utf-8')
        return res.end(await readFile(new URL(asset[0], import.meta.url)))
      }
      const route = routes.find(({ path }) => url.pathname === path || url.pathname.startsWith(path + '/'))
      if (route) return await route.handler(req, res)
      fail(404)
    } catch {
      if (!res.headersSent) res.writeHead(400)
      res.end()
    }
  })
  await new Promise((resolve, reject) => server.once('error', reject).listen(47831, '127.0.0.1', resolve))
  try {
    await mkdir(dataDir, { recursive: true, mode: 0o700 })
    await writeFile(tokenPath, token, { mode: 0o600 })
  } catch (error) {
    server.close()
    throw error
  }
  console.log('Agent 播放器 ' + origin)
  return server
}
