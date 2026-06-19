# 企小帮 Virtual Company

一个面向传统企业老板的中文 AI 公司经营看板原型。

## 目录结构

- `frontend/`：前端页面、交互脚本和样式。
- `backend/`：Node.js 后端 API、Claude Code 调用和本地状态管理。
- `deploy/`：服务器部署用的 systemd 和 nginx 配置。
- `docs/`：设计检查、产品说明和后续文档。

## 本地启动

```bash
npm install
npm start
```

本地开发默认登录口令是 `888888`。生产环境请在 systemd 环境文件里设置：

```bash
QXB_LOGIN_CODE=换成你的登录口令
```

启动后访问：

```text
http://localhost:5176/login
```

## 后端接口

- `GET /api/health`
- `GET /api/auth/session`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/dashboard`
- `PATCH /api/company`
- `PATCH /api/owner`
- `POST /api/billing/top-up`
- `POST /api/plan/upgrade`
- `PATCH /api/channels/:id`
- `POST /api/social/prepare`
- `PATCH /api/tasks/:id`
- `POST /api/agents/run-cycle`
- `POST /api/claude/jobs`
- `GET /api/claude/jobs/:id`

Claude Code 的 API Key 和登录口令都不放在代码仓库里，生产环境通过 systemd 环境文件配置。
