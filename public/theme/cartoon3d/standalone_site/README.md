# Fantastic Standalone Site (Frontend Only)

这是一个完全独立的静态前端（不依赖 Laravel Blade、不引用 `../assets`），可单独部署到任意静态服务器，通过配置后端地址连接 V2Board 后端。

## 快速开始

1. 编辑 `config.js`，填写你的后端地址：
   - `api_base: "https://panel.example.com"`
2. 将整个 `standalone_site` 目录作为静态站点发布（站点根目录 = `standalone_site`）。
3. 访问 `index.html`。

## 注意事项

- 前后端分离部署时，需要先在后台 `配置 -> 安全` 中开启 `Allow Frontend-Backend Separation (CORS)`。
- 开启后请配置 `CORS Allowed Origins` 白名单（每行一个 Origin，例如 `https://frontend.example.com`），仅白名单域名可跨域访问。
- 默认情况下该开关关闭，跨域请求不会被允许。
- Telegram/SSO 等跳转流程通常还依赖后端的 `v2board.app_url` 配置（需要与你实际前端域名匹配）。
