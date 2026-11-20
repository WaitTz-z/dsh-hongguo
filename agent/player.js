const el = id => document.getElementById(id)
const video = document.querySelector('video')
const session = el('session')
let key = ''
let objectURL
let engine
let enabled = false
let transition = ''
let manualPause = false
let programPause = false
let lastSaved = -1
const say = message => { el('status').textContent = message }

function save() {
  if (key && Number.isFinite(video.duration)) localStorage.setItem('position:' + key, String(video.currentTime))
}
function pause() {
  if (!video.paused) { programPause = true; video.pause() }
}
function setSource(url, type, identity) {
  save()
  pause()
  engine?.destroy()
  engine = undefined
  if (objectURL) URL.revokeObjectURL(objectURL)
  objectURL = url.startsWith('blob:') ? url : undefined
  key = identity
  lastSaved = -1
  transition = ''
  manualPause = false
  video.removeAttribute('src')
  video.load()
  el('external').hidden = type !== 'page'
  if (type === 'page') {
    el('external').href = url
    enabled = false
    el('follow').textContent = '启用跟随'
    say('普通网页使用网站自己的播放器。请点击“打开来源网页”手动播放。')
  } else if (type === 'hls' && !video.canPlayType('application/vnd.apple.mpegurl') && window.Hls?.isSupported()) {
    engine = new window.Hls()
    engine.loadSource(url)
    engine.attachMedia(video)
    engine.on(window.Hls.Events.ERROR, (_, data) => { if (data.fatal) say('无法加载 HLS，请检查地址、跨域许可和格式。') })
  } else video.src = url
  if (type !== 'page') say('来源已选，可预览或跟随会话。')
}
function useURL() {
  const url = new URL(el('url').value)
  if (!['http:', 'https:'].includes(url.protocol)) throw Error('请输入 HTTP 或 HTTPS 地址')
  let type = el('kind').value
  if (type === 'auto') type = /\.m3u8$/i.test(url.pathname) ? 'hls' : /\.(mp4|webm|m4v|ogg)$/i.test(url.pathname) ? 'video' : 'page'
  setSource(url.href, type, url.href)
  localStorage.setItem('source', JSON.stringify([url.href, el('kind').value]))
}
el('source').onsubmit = event => {
  event.preventDefault()
  try { useURL() } catch (error) { say(error.message) }
}
el('file').onchange = () => {
  const file = el('file').files[0]
  if (!file) return
  localStorage.removeItem('source')
  setSource(URL.createObjectURL(file), 'video', [file.name, file.size, file.lastModified].join(':'))
}
video.onloadedmetadata = () => {
  const position = Number(localStorage.getItem('position:' + key))
  if (position > 0 && position < video.duration - 1) video.currentTime = position
}
video.ontimeupdate = () => {
  const second = Math.floor(video.currentTime)
  if (second !== lastSaved) { save(); lastSaved = second }
}
video.onpause = () => {
  if (enabled && !programPause) manualPause = true
  programPause = false
  save()
}
video.onerror = () => say('浏览器无法播放该来源，请检查格式或换用视频直链。')
session.onchange = () => {
  pause()
  transition = ''
  localStorage.setItem('session', session.value)
}
el('follow').onclick = async () => {
  if (!key || !el('external').hidden || !session.value) return say('请先选视频和已上报的会话。')
  enabled = !enabled
  el('follow').textContent = enabled ? '关闭跟随' : '启用跟随'
  if (enabled) {
    try { await video.play() } catch { say('请先点击视频播放按钮授权播放。') }
  }
  pause()
  manualPause = false
  transition = ''
}
async function poll() {
  try {
    const response = await fetch('/sessions', { signal: AbortSignal.timeout(1800) })
    if (!response.ok) throw Error()
    const states = await response.json()
    for (const name of Object.keys(states)) {
      if (!Array.from(session.options).some(option => option.value === name)) session.add(new Option(name, name))
    }
    if (!session.value) session.value = localStorage.getItem('session') || ''
    const state = states[session.value]
    if (enabled) {
      const id = JSON.stringify([session.value, state?.turn, state?.phase, state?.since])
      if (id !== transition && (state?.phase !== 'running' || Date.now() - state.since >= 3000)) {
        transition = id
        if (state?.phase === 'running' && !manualPause) {
          try { await video.play() } catch { say('请点击视频播放按钮授权播放。') }
        } else pause()
      }
    }
  } catch { if (enabled) { pause(); transition = ''; say('服务已断开，等待重连。') } }
  setTimeout(poll, 400)
}
try {
  const saved = JSON.parse(localStorage.getItem('source'))
  if (saved) { [el('url').value, el('kind').value] = saved; useURL() }
} catch {}
poll()
