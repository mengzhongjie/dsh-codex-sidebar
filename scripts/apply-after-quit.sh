#!/bin/sh
# apply-after-quit.sh — 等桌面 App 退出后再重建 lib/client.js。
#
# 为什么必须等：App 运行中重写仓库里的 lib/client.js 会触发宿主热重载踩空
# （DesktopHostFatalError: cannot create effect on inactive context，
#  栈 app.asar/lib/main.js -> dsh-desktop-host/lib/index.js -> cordis Fiber._reload），
# 已经踩过两次。所以这里只做「等进程消失 -> 构建 -> 退出」，不负责重开 App。
#
# 用法：sh scripts/apply-after-quit.sh &（或交给 launchd，进程退出后仍会继续跑）
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$ROOT/.debug/apply-after-quit.log"
NODE="/opt/homebrew/bin/node"
# 桌面宿主进程的独有命令行片段（Electron 主进程与 dsh 宿主都带这一段）。
APP_MATCH="dsh-desktop-host/lib/index.js"

mkdir -p "$ROOT/.debug"

while pgrep -f "$APP_MATCH" > /dev/null 2>&1; do
  sleep 1
done

# 再等一拍，避免和退出过程里的收尾写入撞上。
sleep 1
printf '%s app exited\n' "$(date '+%F %T')" >> "$LOG"

cd "$ROOT" || exit 1
"$NODE" scripts/build.mjs >> "$LOG" 2>&1
printf '%s build exit=%s\n' "$(date '+%F %T')" "$?" >> "$LOG"
