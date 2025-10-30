## Telegram 登录流程概述

- Telegram 登录由两个主要接口、一个 Bot Webhook 处理器以及若干缓存键组成，可在独立前后端项目中复用。
- 核心流程：前端提交邮箱 → 后端验证并向绑定用户推送审批消息 → 用户在 Telegram 中批准/拒绝 → Bot Webhook 写回状态 → 前端轮询获批后使用一次性 token 完成登录。

## 系统配置

- 后台「系统配置 → Telegram」新增 `telegram_login_enable` 开关及 Telegram Bot 设置（`telegram_bot_token`、`telegram_bot_enable`）。
- Blade 模板通过 `window.settings.telegram_login_enable` 控制前端是否展示 Telegram 登录入口。

## 后端接口

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/v1/passport/auth/loginWithTelegram` | POST | 请求体 `{"email": "...", "redirect": "dashboard"}`。验证用户、写入缓存、发送 Bot 审批消息，返回 `{"data":{"token":"..."}}` 的登录请求 ID（120 秒有效）。 |
| `/api/v1/passport/auth/checkTelegramLogin?token=...` | GET | 轮询登录进度，返回 `pending`、`approved`（含 `verify_code`/`redirect`）、`rejected`、`expired`。拿到 `verify_code` 后构造 `/#/login?verify=...&redirect=...` 即可进入系统现有 token 登录流程。 |

## Bot Webhook

- 路径 `/api/v1/guest/telegram/webhook`；需携带 `access_token=md5(bot_token)` 作为简单校验。
- 解析 inline button callback `LOGIN_APPROVE:<token>` / `LOGIN_REJECT:<token>`。
- 批准时生成一次性 `verify_code`（`CacheKey::get('TEMP_TOKEN', code)`，有效 120 秒），更新请求状态为 `approved` 并回推确认消息；拒绝则写入 `rejected` 并提示。
- 登录请求缓存键使用 `TELEGRAM_LOGIN_REQUEST` 保存用户 ID、Telegram ID、状态、重定向路径等。

## 前端集成要点

1. 登录页检测 `window.settings.telegram_login_enable === 1` 后展示「使用 Telegram 登录」按钮。
2. 点击按钮触发输入框（示例实现为覆盖层），提交邮箱调用 `loginWithTelegram`，并在 UI 中禁用重复提交。
3. 每 3 秒轮询 `checkTelegramLogin`，最多 40 次（约 2 分钟）：
   - `pending`：继续等待。
   - `approved`：关闭输入层，显示“正在登录…”，执行 `window.location.replace('/#/login?verify='+code+'&redirect=...')` 并调用 `window.location.reload()`。
   - `rejected` / `expired`：提示并恢复输入。
4. 处理异常和超时提示，避免用户无反馈。

## 复用建议

- 保持缓存键 / 过期时间一致，确保 Bot 回调和轮询状态同步。
- 如果前端完全重写，可按上述接口签名实现新的 UI；后端逻辑可直接复用当前控制器和服务。
- 扩展消息文案或审批按钮，只需调整 `AuthController@loginWithTelegram` 中的 `$lines` 与 `reply_markup`。
