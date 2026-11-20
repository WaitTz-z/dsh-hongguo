# dsh-hongguo

## 在 Codex 或其他本地 Agent 中播放

需要 Node.js 20 或更高版本。在仓库目录运行 `npm run player`，浏览器会打开本机播放器。让终端保持运行，按 Ctrl+C 退出。仅启动服务可用 `node agent/cli.js serve`。浏览器地址固定为 `http://127.0.0.1:47831`，便于下次沿用同一份播放记录。

选择本地视频，或粘贴 MP4、WebM、HLS 地址。普通网页会提供原站入口，原站自行播放。直链需要可用的视频编码，HLS 还取决于来源允许浏览器跨域读取。本地文件重新打开页面后须重新选择同一文件，可恢复进度。独立短剧列表位于“内置剧库”，使用原来的播放页面。任务跟随目前用于自选媒体页。

在要接入的受信任项目根目录运行 `node "<本仓库绝对路径>/agent/cli.js" install-hooks`，再到 Codex 的 Settings → Hooks 审核。安装器遇到已有 hooks.json 会停止；可用 `hook-config` 输出配置，按事件合并到已有 hooks 列表。安装生成的配置包含本机绝对路径。请在新聊天发送一次消息，让会话出现在播放器里，选中它并点“启用跟随”。超过三秒的任务会触发播放，批准请求、停止和中断会触发暂停，工具完成后可恢复。手动暂停后，重新启用跟随即可恢复自动播放。Hook 离线时静默返回，仅上报会话、轮次和状态。

其他 Agent 可以在自己的事件回调中调用同一命令，或用包装脚本在任务开始和 finally 分支调用。使用不同宿主前缀的会话名，并为每轮分配新 ID：

```sh
node agent/cli.js event start --session myagent:chat1 --turn task1
node agent/cli.js event waiting --session myagent:chat1 --turn task1
node agent/cli.js event resume --session myagent:chat1 --turn task1
node agent/cli.js event finish --session myagent:chat1 --turn task1
```

服务和适配器使用同一用户目录中的随机控制令牌，可通过 `AGENT_PLAYER_HOME` 同时指定私有数据目录。任务状态保存在服务内存中。网页端 ChatGPT 需要宿主另行提供任务事件。运行 `npm test` 执行离线测试。

摸鱼短剧：一个 DSH 插件，在右侧边栏里播一部短剧，Agent 干活的时候提示你把它调出来。

数据来自 [openhongguo](https://github.com/beilunyang/openhongguo)（第三方短剧平台的非官方 SDK，匿名设备、无需登录）。请仅用于个人学习与研究，内容版权归权利人所有。

## 安装

npm 上的 `dsh-hongguo` 不是本插件，请从 GitHub 安装：

```sh
dsh plugin add github:frostming/dsh-hongguo
```

`openhongguo` 随插件放在 `sdk/openhongguo/`：npm 上的 0.2.0 还没有 11 月 10 日后播放所需的签名修复，这里用的是上游 main 的构建（来源见 `sdk/openhongguo/UPSTREAM`）。

> 本仓库是个人 fork：新增浏览器播放页、倍速选择、滚轮调音量与画中画。上游项目见 [frostming/dsh-hongguo](https://github.com/frostming/dsh-hongguo)。

## 在浏览器里播放

右侧边栏的标签页属于**当前这个对话**：切到别的对话，标签页会卸载，正在播的那一集也就停了。想让它一直播，就把播放交给浏览器里的播放页（Host 用 `/api/hongguo/window` 提供这个页面），它有自己的文档，切对话、换侧栏布局、刷新 DSH 都不受影响。

打开方式：点播放器标题栏右侧的 ↗（列表页是 `默认浏览器打开`）。DSH 桌面外壳会拦掉页面里的 `window.open`，所以由 **Host 调用系统默认浏览器**（`POST /api/hongguo/open`，URL 由 Host 自己拼，只接受剧集 id 和播放秒数）；Host 和浏览器不在同一台机器时退回页面自己的 `window.open`。

播放页具备：剧集列表、搜索、`换一批`、分集（50 集一段）、原生控件、画质切换、倍速、画中画、滚轮调音量、**一集放完自动接下一集并自己接着播**、续播（与边栏共用同一份播放记录）、以及「Agent 停下时自动暂停」。
## 截图

**剧集列表**：顶部推荐一部没看过的热门剧，下面每页 12 部，`换一批` 翻页；`观看历史` 点开才显示。

![剧集列表](docs/home.png)

**播放器**：画面按视频比例自适应，画面内控制条（进度拖动、下一集、倍速、静音、全屏），选集按 50 集分段。

![播放器](docs/player.png)

**等待提示**：Agent 运行时在输入框上方出现，点剧名直接开播，`更多…` 打开播放器。

![等待提示](docs/prompt.png)

## 功能

| 位置 | 内容 |
|---|---|
| 右侧边栏 | `摸鱼短剧` 标签页：推荐卡片 + 剧集列表（带封面、服务端搜索、可翻页）→ 分集 → 播放器 |
| 搜索 | 走红果接口而不是过滤已加载的列表；首屏自动补到 12 部，`换一批` 沿游标继续取，结果按 id 去重 |
| 剧集列表 | 按面板宽度自适应：每行 6 / 4 / 3 / 2 部，每页 12 部，`换一批` 翻到下一页 |
| 播放历史 | 记住每部剧看到第几集、第几秒；`观看历史` 按钮点开后一键续播，可单条移除 |
| 左侧栏底部 | `短剧` 按钮，一键打开播放器 |
| 输入框上方 | Agent 运行时出现浮框：3 部剧可直接点开，`更多…` 打开播放器；当前页面已显示播放器时不出现 |
| 任务完成 | Agent 从运行变为空闲时自动暂停正在播放的短剧，并在画面上提示 |
| 侧边栏引导页 | 一个 `摸鱼短剧` 入口卡片 |
| 播放器 | 画面内控制条、倍速选择（0.5–2×）、画中画、全屏、自动连播下一集、续播提示 |
| 音量 | 鼠标滚轮在画面上调音量，调的时候画面里显示当前音量与进度条，数值记在浏览器里（边栏与播放页共用） |
| 自动连播 | 一集播完自动接下一集，并且**下一集自己开播**，不用再点一下 |
| 播放页 | 在浏览器里打开完整播放器（同样的路由与播放记录），切换对话不会打断 |
| 画中画 | 视频级 PiP；边栏播放器和播放页里各有一个按钮 |

## 结构

- **Host 半（`index.js`）**：加载 openhongguo SDK、维护匿名设备档案，提供同源路由 `/api/hongguo/{feed,series,play,search,media,stream,hghub-manifest,config,open,running}`、`/api/hongguo/cover`、`/api/hongguo/vendor` 与 `/api/hongguo/window`（浏览器里的播放页）。启动时预先拉取剧集列表。CDN 只提供 HEIC 封面，Host 用 `sips`（macOS）或 `ffmpeg`（其他平台）转成 JPEG 并缓存。
- **备用片源（`sdk/hghub/`）**：一份不依赖第三方包的客户端，见 [`sdk/hghub/README.md`](sdk/hghub/README.md)。它按 [Minireel/HGhub](https://github.com/Minireel/HGhub) 的做法对接「单一信封接口」：站点把全部 `/api/**` 收敛成一个 `POST /api/edge/request`，客户端只往里填 `path`——不签名、不登录、也不建任何设备档案。默认片源仍是红果，`source: hghub` 才切过去。
- **Client 半（`client.js`）**：注册侧边栏标签页类型 `hongguo`、侧栏底部按钮、`conversation.input.dock` 里的等待提示，以及把播放交给浏览器的 ↗ 按钮。
- **播放页（`standalone/`）**：一个不依赖 DSH React 运行时的页面（`index.html` + `app.js` + `app.css`），只调用上面那些同源路由；播放位置与音量写在与边栏相同的 localStorage 记录里，两边互通。

## 播放与解密

视频是 CENC（cenc-aes-ctr）加密的 HEVC，浏览器无法直接解码（这是 `hongguo` 片源）。Host 用 SDK 解析出的内容密钥调用本机 `ffmpeg` 解密并重封装为普通 MP4（`-c copy`，不重编码），缓存在插件数据目录 `media/`（保留最近 40 集）。页面只拿到同源 `/api/hongguo/media` 地址，密钥不出 Host。

需要安装 ffmpeg：macOS `brew install ffmpeg`，Windows `winget install Gyan.FFmpeg`，其他平台用系统包管理器安装。封面转换复用同一个 ffmpeg，所以在 Windows / Linux 上没有 ffmpeg 时海报会显示占位图。

`hghub` 片源走的是另一条路：标准 HLS + AES-128，`#EXT-X-KEY` 指向 CDN 上的 16 字节密钥。
Host 只改写 m3u8（把分片与 key 指向同源 `/api/hongguo/stream`），**不解密**——
hls.js 自己向 CDN 取密钥并解密。所以这条路不需要 ffmpeg，也不占 `media/` 缓存；
封面是 AES-128-CBC 密文，Host 直接解密，同样不需要 ffmpeg。

## 配置

`cordis.patch.yml` 中 `hongguo` 行的 `config`：

| 字段 | 默认 | 说明 |
|---|---|---|
| `autoPrompt` | `true` | Agent 运行时是否显示提示 |
| `panelWidth` | `480` | 播放器标签页的默认宽度（px） |
| `source` | `hongguo` | 默认片源：`hongguo`（红果）或 `hghub`（备用）。单条请求可用 `?source=` 覆盖 |
| `profilePath` | 插件数据目录 | 匿名设备档案文件；删除即更换设备 |
| `searchTerms` | `总裁/重生/逆袭` | 推荐不足时补充列表用的搜索词 |

## 许可证

[MIT](LICENSE)。`vendor/` 下的第三方播放库沿用各自的许可证（见同目录的 LICENSE 文件）；短剧内容版权归权利人所有。
