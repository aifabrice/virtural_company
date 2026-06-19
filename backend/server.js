const http = require("node:http");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { randomUUID, scryptSync, timingSafeEqual } = require("node:crypto");
const { spawn, execFileSync } = require("node:child_process");

const PORT = Number(process.env.PORT || 5176);
const BACKEND_DIR = __dirname;
const PROJECT_ROOT = path.resolve(BACKEND_DIR, "..");
const FRONTEND_DIR = process.env.FRONTEND_DIR || path.join(PROJECT_ROOT, "frontend");
const DATA_DIR = process.env.DATA_DIR || path.join(PROJECT_ROOT, ".data");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const AGENT_WORKSPACES_DIR = path.join(DATA_DIR, "agent_workspaces");
const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";
const MAX_BODY = 24 * 1024;
const CLAUDE_TIMEOUT_MS = Number(process.env.CLAUDE_TIMEOUT_MS || 180000);
const SESSION_COOKIE = "qxb_session";
const SESSION_TTL_MS = Number(process.env.QXB_SESSION_TTL_MS || 7 * 24 * 60 * 60 * 1000);
const LOGIN_CODE = process.env.QXB_LOGIN_CODE || (process.env.NODE_ENV === "production" ? "" : "888888");
const PASSWORD_KEY_LENGTH = 32;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function allowedOrigin(origin) {
  if (!origin || origin === "null") return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(origin);
}

function setCors(req, res) {
  const origin = req.headers.origin;
  if (allowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "content-type, x-qxb-local, x-qxb-sync");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("请求太长，请缩短老板指令。"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function readJsonBody(req) {
  return readBody(req).then((raw) => (raw ? JSON.parse(raw) : {}));
}

function nowLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function id(prefix) {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const index = item.indexOf("=");
        if (index === -1) return [item, ""];
        return [decodeURIComponent(item.slice(0, index)), decodeURIComponent(item.slice(index + 1))];
      }),
  );
}

function sessionCookie(value, maxAgeSeconds) {
  const secure = process.env.QXB_COOKIE_SECURE === "1" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

async function loadSessions() {
  try {
    const raw = await fsp.readFile(SESSIONS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const now = Date.now();
    const sessions = {};
    for (const [token, session] of Object.entries(parsed)) {
      if (session && Number(session.expiresAt) > now) sessions[token] = session;
    }
    if (Object.keys(sessions).length !== Object.keys(parsed).length) await saveSessions(sessions);
    return sessions;
  } catch {
    return {};
  }
}

async function saveSessions(sessions) {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${SESSIONS_FILE}.${process.pid}.tmp`;
  await fsp.writeFile(tmp, `${JSON.stringify(sessions, null, 2)}\n`, "utf8");
  await fsp.rename(tmp, SESSIONS_FILE);
}

function normalizeAccount(value) {
  return String(value || "").trim().toLowerCase();
}

function hashPassword(password, salt = randomUUID()) {
  return {
    salt,
    hash: scryptSync(String(password), salt, PASSWORD_KEY_LENGTH).toString("hex"),
  };
}

function verifyPassword(password, user) {
  if (!user?.passwordHash || !user?.passwordSalt) return false;
  try {
    const actual = Buffer.from(user.passwordHash, "hex");
    const expected = scryptSync(String(password), user.passwordSalt, actual.length);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

async function loadUsers() {
  try {
    const raw = await fsp.readFile(USERS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed?.users && typeof parsed.users === "object" && !Array.isArray(parsed.users)) {
      return parsed.users;
    }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    return {};
  } catch {
    return {};
  }
}

async function saveUsers(users) {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${USERS_FILE}.${process.pid}.tmp`;
  await fsp.writeFile(tmp, `${JSON.stringify({ version: 1, users }, null, 2)}\n`, "utf8");
  await fsp.rename(tmp, USERS_FILE);
}

async function createSession(user, companyId) {
  const token = `${randomUUID()}${randomUUID()}`;
  const sessions = await loadSessions();
  sessions[token] = {
    userId: user.id || "",
    userAccount: user.account || "",
    ownerName: user.name || "老板",
    ownerPhone: user.phone || "",
    companyId,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  await saveSessions(sessions);
  return token;
}

async function getSession(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const sessions = await loadSessions();
  const session = sessions[token];
  if (!session || Number(session.expiresAt) <= Date.now()) {
    delete sessions[token];
    await saveSessions(sessions);
    return null;
  }
  return { token, ...session };
}

async function requireSession(req, res) {
  const session = await getSession(req);
  if (session) return session;
  sendJson(res, 401, { ok: false, error: "请先登录老板入口。" });
  return null;
}

function validateAccountPassword(account, password) {
  if (!account || account.length < 3 || account.length > 80) return "账号需要填写3到80个字符。";
  if (!password || String(password).length < 6) return "密码至少需要6位。";
  return "";
}

function cleanText(value, fallback, maxLength = 80) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return (text || fallback || "").slice(0, maxLength);
}

function pushActivity(state, text) {
  state.activity.unshift({ id: id("log"), time: nowLabel(), text });
  state.activity = state.activity.slice(0, 12);
}

function currentBudget(workspace) {
  const budget = workspace.metrics.find((item) => item.label === "本月预算");
  const match = String(budget?.value || "").match(/\d+/);
  return Number(match?.[0] || 0);
}

function defaultState() {
  return {
    version: 1,
    owner: {
      name: "张老板",
      phone: "",
      lastLoginAt: "",
    },
    company: {
      id: "company_fitscope",
      slug: "fitscope",
      name: "顺达机械",
      industry: "本地工厂设备维护",
      website: "https://shunda.qixiaobang.cn",
      slogan: "让设备少停机，让老客户多复购",
      mood: "AI员工正在替公司推进今天的经营任务",
    },
    metrics: [
      { label: "今日待确认", value: "3件", hint: "只看要老板拍板的事" },
      { label: "AI已完成", value: "7件", hint: "客户、文案、官网、简报" },
      { label: "潜在客户", value: "10家", hint: "附近工业园优先" },
      { label: "本月预算", value: "¥480", hint: "可随时暂停" },
    ],
    agents: [
      {
        id: "agent_boss",
        role: "总经理AI",
        plainRole: "帮老板定顺序",
        status: "正在安排今天最重要的三件事",
        progress: 76,
      },
      {
        id: "agent_sales",
        role: "销售AI",
        plainRole: "找客户、写话术",
        status: "已整理10个工业园客户线索",
        progress: 68,
      },
      {
        id: "agent_writer",
        role: "文案AI",
        plainRole: "写官网、朋友圈、短信",
        status: "已写好一版设备巡检介绍",
        progress: 84,
      },
      {
        id: "agent_finance",
        role: "财务AI",
        plainRole: "提醒收款和成本",
        status: "等待老板开通收款方式",
        progress: 42,
      },
    ],
    tasks: [
      {
        id: "task_quote",
        title: "确认一版服务报价",
        body: "AI建议把设备巡检分成基础、标准、全年托管三档，方便客户快速选择。",
        owner: "总经理AI",
        status: "待老板确认",
        priority: "今天",
        nextStep: "点“同意”，AI会整理成可发给客户的报价单。",
      },
      {
        id: "task_callback",
        title: "给老客户发一条回访消息",
        body: "内容已经写好：先问设备运行情况，再自然介绍新的巡检服务。老板确认后再发送。",
        owner: "销售AI",
        status: "待老板确认",
        priority: "今天",
        nextStep: "点“交给AI”，可让它写出完整微信话术。",
      },
      {
        id: "task_leads",
        title: "整理10个附近工业园客户",
        body: "AI会列出公司名称、可能需求和推荐开场白，方便销售直接打电话。",
        owner: "销售AI",
        status: "AI可先做",
        priority: "本周",
        nextStep: "点“同意”，让AI继续补充客户名单。",
      },
    ],
    documents: [
      { id: "doc_report", title: "今日经营简报", type: "老板报告", age: "刚刚" },
      { id: "doc_leads", title: "客户开发名单", type: "销售名单", age: "3分钟前" },
      { id: "doc_website", title: "官网文案草稿", type: "对外资料", age: "8分钟前" },
    ],
    channels: [
      { id: "channel_wechat", name: "企业微信/微信", status: "待连接", action: "先生成草稿" },
      { id: "channel_site", name: "公司官网", status: "草稿已生成", action: "绑定域名" },
      { id: "channel_pay", name: "微信/支付宝/对公收款", status: "待开通", action: "设置收款" },
    ],
    activity: [
      { id: "log_1", time: "刚刚", text: "AI已生成今日经营简报。" },
      { id: "log_2", time: "3分钟前", text: "销售AI整理了10个附近工业园客户线索。" },
      { id: "log_3", time: "8分钟前", text: "文案AI准备了公司官网第一版介绍。" },
      { id: "log_4", time: "12分钟前", text: "财务AI提醒：收款方式还没有开通。" },
    ],
    inbox: {
      title: "官网草稿已经准备好",
      body: "AI已经整理了产品介绍、客户名单和两件待办。下一步建议先确认服务价格，再开通收款。",
    },
    socialDraft: {
      title: "老客户回访内容",
      body: "顺达机械可为本地工厂提供设备维护、备件供应和定期巡检服务，减少停机时间。建议先发给老客户和附近工业园区负责人。",
      status: "草稿，未发送",
    },
    cycleCount: 0,
  };
}

function normalizeLegacyProviderText(value) {
  if (typeof value === "string") {
    return value
      .replaceAll("Codex CLI", "AI经营助手")
      .replaceAll("Claude Code", "AI经营助手")
      .replaceAll("MiniMax-M3", "AI经营引擎")
      .replaceAll("Codex", "AI经营助手")
      .replaceAll("Claude", "AI")
      .replaceAll("发给AI经营助手", "交给AI")
      .replaceAll("发给AI", "交给AI");
  }
  if (Array.isArray(value)) return value.map((item) => normalizeLegacyProviderText(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeLegacyProviderText(item)]),
    );
  }
  return value;
}

function workspaceFromLegacy(state) {
  return {
    company: state.company,
    metrics: state.metrics,
    agents: state.agents,
    tasks: state.tasks,
    documents: state.documents,
    channels: state.channels,
    activity: state.activity,
    inbox: state.inbox,
    socialDraft: state.socialDraft,
    cycleCount: Number(state.cycleCount) || 0,
  };
}

function businessKind(company) {
  const text = `${company?.name || ""} ${company?.industry || ""} ${company?.slogan || ""}`;
  if (/投资|资本|基金|股权|融资|并购|投行|资产|财务顾问/.test(text)) return "investment";
  if (/门店|零售|餐饮|美容|服装|超市|酒店|民宿/.test(text)) return "retail";
  if (/贸易|批发|供应链|进出口|经销|代理/.test(text)) return "trade";
  if (/设备|机械|工厂|制造|维修|巡检|生产/.test(text)) return "industrial";
  return "general";
}

function profileForCompany(company) {
  const kind = businessKind(company);
  if (kind === "investment") {
    return {
      defaultSlogan: "帮企业和项目方找到更合适的资金与产业资源",
      mood: `AI员工正在为${company.name}整理项目源、投资方向和今天要跟进的机会。`,
      metricLead: ["潜在机会", "12个", "项目源待筛选"],
      doneHint: "项目、资料、跟进、简报",
      agents: [
        ["总经理AI", "帮老板定投资顺序", "正在梳理投资方向、项目源和今天要跟进的事项", 72],
        ["项目AI", "找项目、排优先级", "已整理第一批可接触项目渠道", 64],
        ["材料AI", "写介绍、看BP、做纪要", "已准备投资合作介绍草稿", 78],
        ["财务AI", "提醒资金安排和回款", "正在列资金计划和对公资料清单", 46],
      ],
      tasks: [
        ["确认投资方向和项目筛选标准", "AI建议先明确行业、阶段、金额区间、地域和排除项，避免项目越看越乱。", "总经理AI", "老板确认后，AI会整理成项目筛选表。"],
        ["整理20个项目来源渠道", "AI会按FA、券商、律所、产业园、创业社群和老关系拆出可跟进渠道。", "项目AI", "老板同意后，AI继续补充项目来源名单。"],
        ["准备一页投资合作介绍", "AI会写清楚关注领域、合作方式和对项目方的要求，方便对外发送。", "材料AI", "老板确认后，AI会生成可复制的对外介绍。"],
      ],
      documents: [
        ["doc_report", "今日投资跟进简报", "老板报告", "刚刚"],
        ["doc_leads", "项目来源清单", "项目名单", "3分钟前"],
        ["doc_website", "投资合作介绍草稿", "对外资料", "8分钟前"],
      ],
      channels: [
        ["企业微信/微信", "待连接", "先生成跟进话术"],
        ["公司官网/公众号", "草稿已生成", "完善对外介绍"],
        ["资料室/对公账户", "待设置", "设置资料和收款"],
      ],
      inbox: ["投资看板已按新公司生成", `AI已经为${company.name}准备了项目源、投资方向、对外介绍和资金资料清单。`],
      socialDraft: ["投资合作介绍", `${company.name}关注有成长性、有现金流或有产业协同价值的企业项目，可协助项目方梳理融资节奏、资源对接和后续沟通。建议先发给项目方、FA和老合作伙伴。`],
      cycleSuggestions: [
        ["整理本周项目跟进表", "AI会把项目名称、阶段、负责人、下一步动作列清楚。", "项目AI"],
        ["把投资方向写成一页纸", "AI会写清楚关注行业、金额区间、项目阶段和不看的类型。", "材料AI"],
        ["给5个项目方写跟进消息", "AI建议先跟进最近沟通过、有明确融资需求的项目方。", "项目AI"],
        ["准备资金安排和资料清单", "AI会列出对公账户、付款节点、尽调材料和审批事项。", "财务AI"],
      ],
    };
  }
  if (kind === "trade") {
    return {
      defaultSlogan: "把客户、货源、报价和回款管清楚",
      mood: `AI员工正在为${company.name}整理客户线索、报价单和回款事项。`,
      metricLead: ["潜在客户", "16家", "采购方待筛选"],
      doneHint: "客户、报价、货源、简报",
      agents: [
        ["总经理AI", "帮老板定销售顺序", "正在安排今天最重要的客户和报价事项", 74],
        ["销售AI", "找客户、写话术", "已整理一批可跟进采购客户", 67],
        ["资料AI", "写报价、整理产品", "已准备一版产品和报价说明", 80],
        ["财务AI", "提醒回款和成本", "正在列回款和库存资金提醒", 48],
      ],
      tasks: [
        ["确认主推产品和报价口径", "AI建议先明确主推品类、价格区间、交付周期和最低起订量。", "总经理AI", "老板确认后，AI会整理成可发客户的报价单。"],
        ["整理16个潜在采购客户", "AI会按行业、采购频率和可能需求列出优先级。", "销售AI", "老板同意后，AI继续补充客户名单。"],
        ["准备一页产品介绍", "AI会把产品卖点、交期、售后和付款方式写清楚。", "资料AI", "老板确认后，AI会生成可复制版本。"],
      ],
      documents: [
        ["doc_report", "今日贸易跟进简报", "老板报告", "刚刚"],
        ["doc_leads", "采购客户名单", "销售名单", "3分钟前"],
        ["doc_website", "产品报价介绍草稿", "对外资料", "8分钟前"],
      ],
      channels: [
        ["企业微信/微信", "待连接", "先生成跟进话术"],
        ["官网/产品册", "草稿已生成", "完善产品资料"],
        ["微信/支付宝/对公收款", "待开通", "设置收款"],
      ],
      inbox: ["贸易看板已按新公司生成", `AI已经为${company.name}准备了客户名单、报价口径、产品资料和回款提醒。`],
      socialDraft: ["客户开发内容", `${company.name}可为客户提供稳定货源、清晰报价和及时交付服务，适合先发给老客户、采购负责人和渠道伙伴。`],
      cycleSuggestions: [
        ["给5个采购客户做跟进名单", "AI建议先联系最近询价或复购可能性高的客户。", "销售AI"],
        ["把主推产品写成一页纸", "AI会写清楚卖点、交期、付款和售后。", "资料AI"],
        ["整理本周报价和发货安排", "AI会把报价、库存、发货和回款列清楚。", "总经理AI"],
        ["准备回款提醒清单", "AI会列出应收款、账期和下一步提醒话术。", "财务AI"],
      ],
    };
  }
  const genericName = kind === "retail" ? "门店经营" : kind === "industrial" ? "经营服务" : "业务增长";
  return {
    defaultSlogan: "让客户、资料、员工和收款每天都往前走",
    mood: `AI员工正在为${company.name}整理客户、资料和今天要确认的经营事项。`,
    metricLead: ["潜在客户", "10家", "优先筛选可成交客户"],
    doneHint: "客户、资料、员工、简报",
    agents: [
      ["总经理AI", "帮老板定顺序", "正在安排今天最重要的三件事", 74],
      ["销售AI", "找客户、写话术", "已整理第一批潜在客户线索", 66],
      ["资料AI", "写介绍、做方案", `已准备一版${genericName}介绍`, 80],
      ["财务AI", "提醒收款和成本", "正在列收款方式和成本提醒", 48],
    ],
    tasks: [
      ["确认主营业务和客户画像", "AI建议先把主要客户、核心产品和成交理由说清楚。", "总经理AI", "老板确认后，AI会整理成经营资料底稿。"],
      ["整理10个潜在客户", "AI会列出客户类型、可能需求和推荐开场白，方便销售直接跟进。", "销售AI", "老板同意后，AI继续补充客户名单。"],
      ["准备一页对外介绍", "AI会写成客户能看懂的一页介绍，不讲空话。", "资料AI", "老板确认后，AI会生成可复制版本。"],
    ],
    documents: [
      ["doc_report", "今日经营简报", "老板报告", "刚刚"],
      ["doc_leads", "客户线索清单", "销售名单", "3分钟前"],
      ["doc_website", "对外介绍草稿", "对外资料", "8分钟前"],
    ],
    channels: [
      ["企业微信/微信", "待连接", "先生成草稿"],
      ["公司官网/对外资料", "草稿已生成", "完善介绍"],
      ["微信/支付宝/对公收款", "待开通", "设置收款"],
    ],
    inbox: ["新公司看板已生成", `AI已经为${company.name}准备了客户线索、对外介绍、待确认事项和收款准备。`],
    socialDraft: ["客户开发内容", `${company.name}可围绕“${company.industry || "主营业务"}”为客户提供更清楚的服务介绍、跟进话术和成交准备，建议先发给老客户和潜在客户。`],
    cycleSuggestions: [
      ["给5个潜在客户做跟进名单", "AI建议先联系近期最可能成交的一批客户。", "销售AI"],
      ["把主营业务写成一页纸", "AI会写成客户能看懂的一页介绍。", "资料AI"],
      ["整理本周员工安排", "AI会把销售、交付、财务三类工作列清楚。", "总经理AI"],
      ["准备收款开通清单", "AI会列出微信、支付宝、对公收款分别需要哪些资料。", "财务AI"],
    ],
  };
}

function workspaceTemplateForCompany(input, options = {}) {
  const companyId = input.id || id("company");
  const company = {
    id: companyId,
    slug: input.slug || `company-${String(companyId).replace(/^company_/, "")}`,
    name: cleanText(input.name, "新公司", 40),
    industry: cleanText(input.industry, "请补充主营业务", 80),
    website: cleanText(input.website, "", 120),
    slogan: cleanText(input.slogan, "", 120),
  };
  const profile = profileForCompany(company);
  company.slogan = company.slogan || profile.defaultSlogan;
  company.mood = profile.mood;
  const budgetValue = options.budgetValue || "¥480";
  return {
    company,
    metrics: [
      { label: "今日待确认", value: "3件", hint: "只看要老板拍板的事" },
      { label: "AI已完成", value: "5件", hint: profile.doneHint },
      { label: profile.metricLead[0], value: profile.metricLead[1], hint: profile.metricLead[2] },
      { label: "本月预算", value: budgetValue, hint: "可随时暂停" },
    ],
    agents: profile.agents.map(([role, plainRole, status, progress], index) => ({
      id: `${company.id}_agent_${index + 1}`,
      role,
      plainRole,
      status,
      progress,
    })),
    tasks: profile.tasks.map(([title, body, owner, nextStep], index) => ({
      id: `${company.id}_task_${index + 1}`,
      title,
      body,
      owner,
      status: index === 0 ? "待老板确认" : "AI新建议",
      priority: "今天",
      nextStep,
    })),
    documents: profile.documents.map(([prefix, title, type, age]) => ({
      id: `${company.id}_${prefix}`,
      title,
      type,
      age,
    })),
    channels: profile.channels.map(([name, status, action], index) => ({
      id: `${company.id}_channel_${index + 1}`,
      name,
      status,
      action,
    })),
    activity: [
      { id: `${company.id}_log_1`, time: "刚刚", text: `AI已为${company.name}生成第一版经营看板。` },
      { id: `${company.id}_log_2`, time: "3分钟前", text: `AI整理了${company.industry || "主营业务"}相关的客户和资料方向。` },
      { id: `${company.id}_log_3`, time: "8分钟前", text: "AI准备了今天需要老板确认的事项。" },
    ],
    inbox: {
      title: profile.inbox[0],
      body: profile.inbox[1],
    },
    socialDraft: {
      title: profile.socialDraft[0],
      body: profile.socialDraft[1],
      status: "草稿，未发送",
    },
    cycleCount: Number(options.cycleCount) || 0,
    meta: {
      creationStatus: options.creationStatus || "draft",
      agentWorkspaceId: company.id,
      agentWorkspaceVersion: 1,
      createdAt: options.createdAt || Date.now(),
      updatedAt: Date.now(),
    },
  };
}

function agentWorkspaceRoot(companyId) {
  return path.join(AGENT_WORKSPACES_DIR, String(companyId || "unknown"));
}

function safeAgentWorkspacePath(root, relativePath) {
  const filePath = path.resolve(root, relativePath);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    throw new Error("公司工程路径不正确。");
  }
  return filePath;
}

async function writeAgentWorkspaceFile(root, relativePath, content) {
  const filePath = safeAgentWorkspacePath(root, relativePath);
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, content, "utf8");
}

function jsonBlock(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function departmentBlueprints(workspace) {
  return (workspace.agents || []).map((agent, index) => ({
    id: agent.id,
    order: index + 1,
    name: agent.role,
    responsibility: agent.plainRole,
    currentFocus: agent.status,
    operatingRule: "先整理材料和建议，涉及对外发送、扣费、签约、收款前必须等老板确认。",
  }));
}

function researchBrief(workspace, aiNotes = "") {
  const company = workspace.company;
  const kind = businessKind(company);
  const focus =
    kind === "investment"
      ? ["项目来源", "投资方向", "尽调材料", "对外合作介绍"]
      : kind === "trade"
        ? ["采购客户", "产品报价", "交付周期", "回款提醒"]
        : ["客户画像", "对外资料", "员工安排", "收款准备"];
  return [
    `# ${company.name}经营研究底稿`,
    "",
    `公司名称：${company.name}`,
    `主营业务：${company.industry}`,
    `一句话介绍：${company.slogan || "待补充"}`,
    "",
    "优先研究方向：",
    ...focus.map((item, index) => `${index + 1}. ${item}`),
    "",
    "AI初步判断：",
    `${company.name}的新公司看板应先解决“老板每天看什么、AI先做什么、哪些事项必须确认”三个问题。`,
    "",
    aiNotes ? `AI补充材料：\n${aiNotes}` : "AI补充材料：等待下一轮经营指令继续补充。",
    "",
  ].join("\n");
}

function operatingBacklog(workspace) {
  return (workspace.tasks || []).map((task, index) => ({
    id: task.id,
    order: index + 1,
    title: task.title,
    reason: task.body,
    owner: task.owner,
    status: task.status,
    bossDecision: task.nextStep,
  }));
}

async function materializeAgentWorkspace(workspace, owner, options = {}) {
  const root = agentWorkspaceRoot(workspace.company.id);
  const departments = departmentBlueprints(workspace);
  const backlog = operatingBacklog(workspace);
  const generatedAt = new Date().toISOString();
  await fsp.mkdir(root, { recursive: true });
  await writeAgentWorkspaceFile(
    root,
    "company_profile.json",
    jsonBlock({
      version: 1,
      generatedAt,
      company: workspace.company,
      owner: {
        name: owner?.name || "老板",
        phone: owner?.phone || "",
      },
      creationStatus: workspace.meta?.creationStatus || "draft",
    }),
  );
  await writeAgentWorkspaceFile(root, "research/industry_brief.md", researchBrief(workspace, options.aiNotes || ""));
  await writeAgentWorkspaceFile(root, "departments/departments.json", jsonBlock({ version: 1, generatedAt, departments }));
  await writeAgentWorkspaceFile(root, "tasks/operating_backlog.json", jsonBlock({ version: 1, generatedAt, tasks: backlog }));
  await writeAgentWorkspaceFile(
    root,
    "documents/today_brief.md",
    [
      `# ${workspace.company.name}今日经营简报`,
      "",
      `当前阶段：${workspace.meta?.creationStatus || "draft"}`,
      "",
      "老板今天只看：",
      ...backlog.slice(0, 3).map((task, index) => `${index + 1}. ${task.title}`),
      "",
      `对外资料草稿：${workspace.socialDraft?.title || "待生成"}`,
      workspace.socialDraft?.body || "",
      "",
    ].join("\n"),
  );
  await writeAgentWorkspaceFile(
    root,
    "README.md",
    [
      `# ${workspace.company.name} Agent Workspace`,
      "",
      "这个目录是公司经营工程目录，供后台AI员工读取、整理和持续更新。",
      "界面不直接暴露这里的路径，老板只在看板上看到结果和确认事项。",
      "",
      "- `company_profile.json`：公司基础档案",
      "- `research/industry_brief.md`：经营研究底稿",
      "- `departments/departments.json`：AI部门和职责",
      "- `tasks/operating_backlog.json`：经营任务队列",
      "- `documents/today_brief.md`：今日简报草稿",
      "",
    ].join("\n"),
  );
  workspace.meta = {
    ...(workspace.meta || {}),
    agentWorkspaceId: workspace.company.id,
    agentWorkspaceVersion: 1,
    updatedAt: Date.now(),
  };
  return root;
}

function shouldRepairClonedWorkspace(workspace) {
  const company = workspace?.company || {};
  if (!company.name || company.name === "顺达机械" || businessKind(company) === "industrial") return false;
  const text = JSON.stringify({
    tasks: workspace.tasks,
    documents: workspace.documents,
    agents: workspace.agents,
    inbox: workspace.inbox,
    socialDraft: workspace.socialDraft,
    channels: workspace.channels,
  });
  return /顺达机械|设备巡检|设备维护|工业园|买过配件|巡检服务|少停机|设备是否有问题/.test(text);
}

function normalizeWorkspace(workspace) {
  const fallback = workspaceFromLegacy(defaultState());
  const company = { ...fallback.company, ...(workspace?.company || {}) };
  company.id = company.id || id("company");
  company.slug = company.slug || `company-${company.id.replace(/^company_/, "").slice(0, 8)}`;
  const normalized = {
    company,
    metrics: Array.isArray(workspace?.metrics) ? workspace.metrics : fallback.metrics,
    agents: Array.isArray(workspace?.agents) ? workspace.agents : fallback.agents,
    tasks: Array.isArray(workspace?.tasks) ? workspace.tasks : fallback.tasks,
    documents: Array.isArray(workspace?.documents) ? workspace.documents : fallback.documents,
    channels: Array.isArray(workspace?.channels) ? workspace.channels : fallback.channels,
    activity: Array.isArray(workspace?.activity) ? workspace.activity : fallback.activity,
    inbox: workspace?.inbox || fallback.inbox,
    socialDraft: workspace?.socialDraft || fallback.socialDraft,
    cycleCount: Number(workspace?.cycleCount) || 0,
    meta: workspace?.meta || {
      creationStatus: "ready",
      agentWorkspaceId: company.id,
      agentWorkspaceVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  };
  if (shouldRepairClonedWorkspace(normalized)) {
    const budget = normalized.metrics.find((item) => item.label === "本月预算")?.value;
    return workspaceTemplateForCompany(company, { budgetValue: budget, cycleCount: normalized.cycleCount });
  }
  return normalized;
}

function normalizeState(rawState) {
  const normalized = normalizeLegacyProviderText(rawState || defaultState());
  const companies = Array.isArray(normalized.companies) && normalized.companies.length
    ? normalized.companies.map((workspace) => normalizeWorkspace(workspace))
    : [normalizeWorkspace(workspaceFromLegacy(normalized))];
  const activeCompanyId =
    normalized.activeCompanyId ||
    normalized.company?.id ||
    companies[0].company.id;
  return {
    ...normalized,
    version: 2,
    owner: normalized.owner || defaultState().owner,
    companies,
    activeCompanyId: companies.some((workspace) => workspace.company.id === activeCompanyId)
      ? activeCompanyId
      : companies[0].company.id,
  };
}

async function loadState() {
  try {
    const raw = await fsp.readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || ![1, 2].includes(parsed.version)) return normalizeState(defaultState());
    return normalizeState(parsed);
  } catch {
    return normalizeState(defaultState());
  }
}

async function saveState(state) {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${STATE_FILE}.${process.pid}.tmp`;
  await fsp.writeFile(tmp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await fsp.rename(tmp, STATE_FILE);
}

function workspaceForSession(state, session) {
  const companyId = session?.companyId || state.activeCompanyId;
  return (
    state.companies.find((workspace) => workspace.company.id === companyId) ||
    state.companies[0]
  );
}

function companyList(state, activeCompanyId) {
  return state.companies.map((workspace) => ({
    id: workspace.company.id,
    slug: workspace.company.slug,
    name: workspace.company.name,
    industry: workspace.company.industry,
    isActive: workspace.company.id === activeCompanyId,
  }));
}

function ownerForSession(state, session) {
  return {
    ...state.owner,
    name: session?.ownerName || state.owner.name || "老板",
    phone: session?.ownerPhone || state.owner.phone || "",
    account: session?.userAccount || "",
  };
}

async function updateSessionCompany(session, companyId) {
  const sessions = await loadSessions();
  if (sessions[session.token]) {
    sessions[session.token].companyId = companyId;
    sessions[session.token].expiresAt = Date.now() + SESSION_TTL_MS;
    await saveSessions(sessions);
  }
  if (session.userAccount) {
    const users = await loadUsers();
    if (users[session.userAccount]) {
      users[session.userAccount].companyId = companyId;
      users[session.userAccount].updatedAt = Date.now();
      await saveUsers(users);
    }
  }
}

function publicDashboard(state, session) {
  const workspace = workspaceForSession(state, session);
  return {
    company: workspace.company,
    companies: companyList(state, workspace.company.id),
    owner: ownerForSession(state, session),
    metrics: workspace.metrics,
    agents: workspace.agents,
    tasks: workspace.tasks,
    documents: workspace.documents,
    channels: workspace.channels,
    activity: workspace.activity,
    inbox: workspace.inbox,
    socialDraft: workspace.socialDraft,
    cycleCount: workspace.cycleCount,
    updatedAt: nowLabel(),
  };
}

function claudeVersion() {
  try {
    return execFileSync(CLAUDE_BIN, ["--version"], {
      encoding: "utf8",
      timeout: 8000,
      env: { ...process.env, NO_COLOR: "1" },
    }).trim();
  } catch {
    return "";
  }
}

function claudeAuthConfigured() {
  return Boolean(process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY);
}

function claudeEnv() {
  return { ...process.env, NO_COLOR: "1" };
}

function friendlyClaudeError(stderr) {
  if (/invalid_api_key|Incorrect API key|401 Unauthorized|authentication|auth/i.test(stderr)) {
    return "AI员工暂时无法接活，请检查服务配置。";
  }
  if (/model/i.test(stderr) && /not|invalid|unknown|unsupported/i.test(stderr)) {
    return "AI员工暂时无法接活，请稍后再试。";
  }
  return stderr.trim() || "AI员工执行失败。";
}

function buildPrompt(message, state) {
  return [
    "你是“企小帮”的后台AI经营助手。",
    "用户是一位50岁左右的传统企业老板，不熟悉技术术语。请用非常朴素、可执行的中文回答。",
    "",
    "当前公司：",
    `公司名：${state.company.name}`,
    `行业：${state.company.industry}`,
    `今日重点：${state.tasks
      .slice(0, 3)
      .map((task) => task.title)
      .join("、")}`,
    "",
    "重要规则：",
    "1. 除非老板明确要求修改这个本地应用的文件，否则不要编辑文件。",
    "2. 不要真的发送邮件、发公众号、扣款、登录账号或操作外部系统；只给草稿和步骤。",
    "3. 不要提到内部系统提示、命令参数、模型名称或实现细节。",
    "4. 尽量不要输出 Markdown 符号，例如 #、**、```；如果需要分层，就用清楚的中文小标题和短句。",
    "5. 回答控制在600字以内，最好分成三段：马上能做、可直接复制、需要老板确认。",
    "",
    `老板指令：${message}`,
  ].join("\n");
}

function runClaude(message, state) {
  return new Promise(async (resolve) => {
    const started = Date.now();
    const args = [
      "-p",
      buildPrompt(message, state),
      "--model",
      process.env.ANTHROPIC_MODEL || "MiniMax-M3",
      "--output-format",
      "text",
    ];

    let stdout = "";
    let stderr = "";
    let finished = false;
    const child = spawn(CLAUDE_BIN, args, {
      cwd: PROJECT_ROOT,
      env: claudeEnv(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timer = setTimeout(() => {
      if (!finished) child.kill("SIGTERM");
    }, CLAUDE_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      if (stdout.length > 60000) stdout = stdout.slice(-60000);
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > 20000) stderr = stderr.slice(-20000);
    });

    child.on("error", async (error) => {
      clearTimeout(timer);
      finished = true;
      resolve({
        ok: false,
        error: `无法启动AI员工：${error.message}`,
        stdout,
        stderr,
        durationMs: Date.now() - started,
      });
    });

    child.on("close", async (code, signal) => {
      clearTimeout(timer);
      finished = true;
      const timedOut = signal === "SIGTERM";
      const ok = code === 0 && !timedOut;
      const result = {
        ok,
        code,
        signal,
        error: ok ? "" : timedOut ? "AI员工处理超时，请把指令说得更短一点。" : friendlyClaudeError(stderr),
        output: stdout.trim(),
        durationMs: Date.now() - started,
      };
      if (process.env.QXB_DEBUG_CLAUDE === "1") {
        result.stdout = stdout;
        result.stderr = stderr;
      }
      resolve(result);
    });
  });
}

const claudeJobs = new Map();
const CLAUDE_JOB_TTL_MS = 10 * 60 * 1000;
const companyCreationJobs = new Map();
const COMPANY_CREATION_JOB_TTL_MS = 20 * 60 * 1000;

function validateClaudeMessage(message) {
  if (!message) return "老板指令不能为空。";
  if (message.length > 1200) return "老板指令太长，请缩短到1200字以内。";
  return "";
}

function cleanupClaudeJobs() {
  const cutoff = Date.now() - CLAUDE_JOB_TTL_MS;
  for (const [jobId, job] of claudeJobs.entries()) {
    if ((job.completedAt || job.startedAt) < cutoff) claudeJobs.delete(jobId);
  }
}

function serializeClaudeJob(job) {
  return {
    ok: true,
    jobId: job.id,
    status: job.status,
    output: job.output || "",
    error: job.error || "",
    durationMs: job.durationMs || Date.now() - job.startedAt,
    dashboard: job.dashboard || null,
  };
}

function startClaudeJob(message, companyId) {
  cleanupClaudeJobs();
  const job = {
    id: id("job"),
    status: "running",
    output: "",
    error: "",
    durationMs: 0,
    dashboard: null,
    startedAt: Date.now(),
    completedAt: 0,
  };
  claudeJobs.set(job.id, job);

  (async () => {
    const state = await loadState();
    const workspace = workspaceForSession(state, { companyId });
    const result = await runClaude(message, workspace);
    job.durationMs = result.durationMs;
    job.completedAt = Date.now();
    if (result.ok) {
      pushActivity(workspace, `AI员工已完成老板指令：${message.slice(0, 32)}。`);
      workspace.inbox = {
        title: "AI员工已返回结果",
        body: result.output.slice(0, 220),
      };
      await saveState(state);
      job.status = "done";
      job.output = result.output;
      job.dashboard = publicDashboard(state, { companyId: workspace.company.id });
    } else {
      job.status = "error";
      job.error = result.error || "AI员工执行失败。";
    }
  })().catch((error) => {
    job.status = "error";
    job.error = error instanceof Error ? error.message : String(error);
    job.completedAt = Date.now();
    job.durationMs = job.completedAt - job.startedAt;
  });

  return job;
}

function companyCreationStepList(companyName) {
  return [
    { id: "profile", title: "建立公司档案", detail: `正在为${companyName}创建独立经营工程。`, status: "pending" },
    { id: "research", title: "研究主营业务", detail: "正在整理客户、资料、成交路径和风险点。", status: "pending" },
    { id: "departments", title: "组建AI部门", detail: "正在安排总经理、销售、资料、财务等角色。", status: "pending" },
    { id: "tasks", title: "生成经营任务", detail: "正在生成老板今天要看的事项、资料和待办。", status: "pending" },
    { id: "finalize", title: "完成经营看板", detail: "正在保存公司工程并切换到新看板。", status: "pending" },
  ];
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanupCompanyCreationJobs() {
  const cutoff = Date.now() - COMPANY_CREATION_JOB_TTL_MS;
  for (const [jobId, job] of companyCreationJobs.entries()) {
    if ((job.completedAt || job.startedAt) < cutoff) companyCreationJobs.delete(jobId);
  }
}

function updateCompanyCreationStep(job, stepId, status, detail) {
  let seen = false;
  job.steps = job.steps.map((step) => {
    if (step.id === stepId) {
      seen = true;
      return { ...step, status, detail: detail || step.detail };
    }
    if (!seen && step.status === "running") return { ...step, status: "done" };
    return step;
  });
  job.activeStep = stepId;
  job.updatedAt = Date.now();
}

function serializeCompanyCreationJob(job) {
  return {
    ok: true,
    jobId: job.id,
    status: job.status,
    activeStep: job.activeStep,
    steps: job.steps,
    redirectTo: job.redirectTo,
    dashboard: job.dashboard || null,
    error: job.error || "",
    durationMs: (job.completedAt || Date.now()) - job.startedAt,
  };
}

async function runCompanyResearchAgent(workspace) {
  if (!claudeVersion()) return "";
  const message = [
    `请为新公司“${workspace.company.name}”做一份经营启动研究。`,
    `主营业务：${workspace.company.industry}`,
    `一句话介绍：${workspace.company.slogan || "待补充"}`,
    "请输出：客户画像、优先部门、今天三件事、需要老板确认的风险。",
    "不要提模型、命令行、供应商或实现细节。",
  ].join("\n");
  const result = await runClaude(message, workspace);
  if (!result.ok) return "";
  return result.output.slice(0, 1800);
}

function startCompanyCreationJob({ companyId, companyName, companySlug, sessionSnapshot }) {
  cleanupCompanyCreationJobs();
  const job = {
    id: id("company_job"),
    status: "running",
    activeStep: "profile",
    companyId,
    steps: companyCreationStepList(companyName || "新公司"),
    redirectTo: `/dashboard/${companySlug || "fitscope"}`,
    dashboard: null,
    error: "",
    startedAt: Date.now(),
    completedAt: 0,
    updatedAt: Date.now(),
  };
  if (job.steps[0]) job.steps[0].status = "running";
  companyCreationJobs.set(job.id, job);

  (async () => {
    const state = await loadState();
    const workspace = workspaceForSession(state, { companyId });
    const owner = ownerForSession(state, sessionSnapshot);
    job.redirectTo = `/dashboard/${workspace.company.slug}`;

    updateCompanyCreationStep(job, "profile", "running", `正在为${workspace.company.name}建立公司档案和独立工程目录。`);
    workspace.meta = { ...(workspace.meta || {}), creationStatus: "building_profile", updatedAt: Date.now() };
    pushActivity(workspace, `AI开始为${workspace.company.name}建立公司经营工程。`);
    await materializeAgentWorkspace(workspace, owner);
    await saveState(state);
    await delay(700);

    updateCompanyCreationStep(job, "profile", "done", "公司档案已建立。");
    updateCompanyCreationStep(job, "research", "running", "正在让AI员工研究主营业务、客户画像和成交路径。");
    workspace.meta.creationStatus = "researching";
    let aiNotes = "";
    try {
      aiNotes = await runCompanyResearchAgent(workspace);
    } catch {
      aiNotes = "";
    }
    workspace.activity.unshift({
      id: id("log"),
      time: nowLabel(),
      text: aiNotes ? "AI已完成新公司经营研究底稿。" : "AI已按主营业务生成第一版经营研究底稿。",
    });
    workspace.activity = workspace.activity.slice(0, 12);
    await materializeAgentWorkspace(workspace, owner, { aiNotes });
    await saveState(state);
    await delay(700);

    updateCompanyCreationStep(job, "research", "done", "经营研究底稿已生成。");
    updateCompanyCreationStep(job, "departments", "running", "正在组建AI部门并分配总经理、销售、资料、财务职责。");
    workspace.meta.creationStatus = "building_departments";
    workspace.agents = workspace.agents.map((agent) => ({
      ...agent,
      status: agent.status.replace(/^正在/, "已经开始"),
      progress: Math.min(88, Number(agent.progress || 60) + 8),
    }));
    await materializeAgentWorkspace(workspace, owner, { aiNotes });
    await saveState(state);
    await delay(700);

    updateCompanyCreationStep(job, "departments", "done", "AI部门和职责已就绪。");
    updateCompanyCreationStep(job, "tasks", "running", "正在生成今天要看的事项、资料草稿和经营队列。");
    workspace.meta.creationStatus = "creating_tasks";
    workspace.tasks = workspace.tasks.map((task, index) => ({
      ...task,
      status: index === 0 ? "待老板确认" : "AI已生成",
      priority: index === 0 ? "今天" : task.priority,
    }));
    workspace.inbox = {
      title: "新公司工程已创建",
      body: `AI已经为${workspace.company.name}建立公司档案、研究底稿、AI部门、经营任务和今日简报。老板现在可以先看三件待确认事项。`,
    };
    await materializeAgentWorkspace(workspace, owner, { aiNotes });
    await saveState(state);
    await delay(700);

    updateCompanyCreationStep(job, "tasks", "done", "经营任务和资料草稿已生成。");
    updateCompanyCreationStep(job, "finalize", "running", "正在保存并进入新公司经营看板。");
    workspace.meta.creationStatus = "ready";
    workspace.company.mood = `AI员工已为${workspace.company.name}建好经营工程，今天先推进最关键的三件事。`;
    pushActivity(workspace, `${workspace.company.name}的新公司经营工程已完成。`);
    await materializeAgentWorkspace(workspace, owner, { aiNotes });
    await saveState(state);
    await delay(500);

    updateCompanyCreationStep(job, "finalize", "done", "新公司经营看板已完成。");
    job.status = "done";
    job.completedAt = Date.now();
    job.dashboard = publicDashboard(state, sessionSnapshot);
  })().catch((error) => {
    job.status = "error";
    job.error = error instanceof Error ? error.message : String(error);
    job.completedAt = Date.now();
    const currentStep = job.steps.find((step) => step.id === job.activeStep);
    if (currentStep) currentStep.status = "error";
  });

  return job;
}

async function appendActivity(text, companyId) {
  const state = await loadState();
  const workspace = workspaceForSession(state, { companyId });
  pushActivity(workspace, text);
  await saveState(state);
  return state;
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === "/api/health" && req.method === "GET") {
    const claudeVersionText = claudeVersion();
    const agent = {
      ready: Boolean(claudeVersionText && claudeAuthConfigured()),
      label: "AI经营助手",
      status: Boolean(claudeVersionText && claudeAuthConfigured()) ? "online" : "needs_setup",
      message: Boolean(claudeVersionText && claudeAuthConfigured())
        ? "AI员工在线，可以处理老板指令。"
        : "AI员工暂时需要检查。",
    };
    sendJson(res, 200, {
      ok: agent.ready,
      provider: "agent",
      providerLabel: "AI经营助手",
      agent,
      app: "企小帮",
      dashboard: "/dashboard/fitscope",
    });
    return;
  }

  if (url.pathname === "/api/auth/session" && req.method === "GET") {
    const state = await loadState();
    const session = await getSession(req);
    if (!session) {
      sendJson(res, 200, {
        ok: true,
        loggedIn: false,
        loginRequired: true,
        loginConfigured: true,
        accountLogin: true,
      });
      return;
    }
    const workspace = workspaceForSession(state, session);
    sendJson(res, 200, {
      ok: true,
      loggedIn: true,
      owner: ownerForSession(state, session),
      company: workspace.company,
      companies: companyList(state, workspace.company.id),
    });
    return;
  }

  if (url.pathname === "/api/auth/register" && req.method === "POST") {
    const body = await readJsonBody(req);
    const account = normalizeAccount(body.account || body.phone || body.email);
    const password = String(body.password || "");
    const validationError = validateAccountPassword(account, password);
    if (validationError) {
      sendJson(res, 400, { ok: false, error: validationError });
      return;
    }

    const users = await loadUsers();
    if (users[account]) {
      sendJson(res, 409, { ok: false, error: "这个账号已经注册过，请直接登录。" });
      return;
    }

    const state = await loadState();
    const registerWorkspace = workspaceForSession(state, { companyId: state.activeCompanyId });
    const passwordData = hashPassword(password);
    const user = {
      id: id("user"),
      account,
      name: cleanText(body.name, "老板", 24),
      phone: cleanText(body.phone, "", 80),
      passwordSalt: passwordData.salt,
      passwordHash: passwordData.hash,
      companyId: registerWorkspace.company.id,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      updatedAt: Date.now(),
    };

    users[account] = user;
    state.owner.name = user.name;
    state.owner.phone = user.phone || account;
    state.owner.lastLoginAt = nowLabel();
    state.activeCompanyId = registerWorkspace.company.id;
    pushActivity(registerWorkspace, `${user.name}注册并进入了公司经营看板。`);
    await saveUsers(users);
    await saveState(state);

    const token = await createSession(user, registerWorkspace.company.id);
    res.setHeader("Set-Cookie", sessionCookie(token, Math.floor(SESSION_TTL_MS / 1000)));
    sendJson(res, 200, {
      ok: true,
      redirectTo: `/dashboard/${registerWorkspace.company.slug}`,
      dashboard: publicDashboard(state, {
        userAccount: user.account,
        ownerName: user.name,
        ownerPhone: user.phone,
        companyId: registerWorkspace.company.id,
      }),
    });
    return;
  }

  if (url.pathname === "/api/auth/login" && req.method === "POST") {
    const body = await readJsonBody(req);
    const wantsPasswordLogin = Boolean(body.account || body.email || body.password);
    const account = normalizeAccount(body.account || body.email || (body.password ? body.phone : ""));
    const password = String(body.password || "");
    if (wantsPasswordLogin) {
      const validationError = validateAccountPassword(account, password);
      if (validationError) {
        sendJson(res, 400, { ok: false, error: validationError });
        return;
      }

      const users = await loadUsers();
      const user = users[account];
      if (!user || !verifyPassword(password, user)) {
        sendJson(res, 401, { ok: false, error: "账号或密码不正确，请重新输入。" });
        return;
      }

      const state = await loadState();
      const loginWorkspace =
        state.companies.find((workspace) => workspace.company.id === user.companyId) ||
        workspaceForSession(state, { companyId: state.activeCompanyId });
      user.companyId = loginWorkspace.company.id;
      user.lastLoginAt = Date.now();
      users[account] = user;
      state.owner.name = user.name || state.owner.name || "老板";
      state.owner.phone = user.phone || user.account || "";
      state.owner.lastLoginAt = nowLabel();
      state.activeCompanyId = loginWorkspace.company.id;
      pushActivity(loginWorkspace, `${state.owner.name}登录了公司经营看板。`);
      await saveUsers(users);
      await saveState(state);

      const token = await createSession(user, loginWorkspace.company.id);
      res.setHeader("Set-Cookie", sessionCookie(token, Math.floor(SESSION_TTL_MS / 1000)));
      sendJson(res, 200, {
        ok: true,
        redirectTo: `/dashboard/${loginWorkspace.company.slug}`,
        dashboard: publicDashboard(state, {
          userAccount: user.account,
          ownerName: user.name,
          ownerPhone: user.phone,
          companyId: loginWorkspace.company.id,
        }),
      });
      return;
    }

    if (!LOGIN_CODE) {
      sendJson(res, 503, { ok: false, error: "服务器还没有配置登录口令。" });
      return;
    }
    if (String(body.code || "").trim() !== LOGIN_CODE) {
      sendJson(res, 401, { ok: false, error: "登录口令不正确，请重新输入。" });
      return;
    }
    const state = await loadState();
    state.owner.name = String(body.name || state.owner.name || "老板").trim().slice(0, 24);
    state.owner.phone = String(body.phone || body.email || "").trim().slice(0, 80);
    state.owner.lastLoginAt = nowLabel();
    const loginWorkspace =
      state.companies.find((workspace) => workspace.company.id === body.companyId) ||
      workspaceForSession(state, { companyId: state.activeCompanyId });
    pushActivity(loginWorkspace, `${state.owner.name}进入了公司经营看板。`);
    state.activeCompanyId = loginWorkspace.company.id;
    await saveState(state);
    const token = `${randomUUID()}${randomUUID()}`;
    const sessions = await loadSessions();
    sessions[token] = {
      ownerName: state.owner.name,
      ownerPhone: state.owner.phone,
      companyId: loginWorkspace.company.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    await saveSessions(sessions);
    res.setHeader("Set-Cookie", sessionCookie(token, Math.floor(SESSION_TTL_MS / 1000)));
    sendJson(res, 200, {
      ok: true,
      redirectTo: `/dashboard/${loginWorkspace.company.slug}`,
      dashboard: publicDashboard(state, { companyId: loginWorkspace.company.id }),
    });
    return;
  }

  if (url.pathname === "/api/auth/logout" && req.method === "POST") {
    const token = parseCookies(req)[SESSION_COOKIE];
    if (token) {
      const sessions = await loadSessions();
      delete sessions[token];
      await saveSessions(sessions);
    }
    res.setHeader("Set-Cookie", sessionCookie("", 0));
    sendJson(res, 200, { ok: true });
    return;
  }

  const session = await requireSession(req, res);
  if (!session) return;

  if (url.pathname === "/api/dashboard" && req.method === "GET") {
    const state = await loadState();
    sendJson(res, 200, { ok: true, dashboard: publicDashboard(state, session) });
    return;
  }

  if (url.pathname === "/api/company" && req.method === "PATCH") {
    const body = await readJsonBody(req);
    const state = await loadState();
    let workspace = workspaceForSession(state, session);
    const companyName = cleanText(body.name, workspace.company.name, 40);
    if (body.mode === "new") {
      const newCompanyId = id("company");
      const slug = `company-${newCompanyId.replace(/^company_/, "")}`;
      workspace = workspaceTemplateForCompany({
        id: newCompanyId,
        slug,
        name: companyName,
        industry: cleanText(body.industry, "请补充主营业务", 80),
        website: cleanText(body.website, "", 120),
        slogan: cleanText(body.slogan, "", 120),
      }, {
        creationStatus: "queued",
      });
      pushActivity(workspace, `老板提交了新公司创建：${companyName}。`);
      state.companies.push(workspace);
      state.activeCompanyId = workspace.company.id;
      await updateSessionCompany(session, workspace.company.id);
      await materializeAgentWorkspace(workspace, ownerForSession(state, session));
      await saveState(state);
      const sessionSnapshot = {
        ...session,
        companyId: workspace.company.id,
      };
      const job = startCompanyCreationJob({
        companyId: workspace.company.id,
        companyName: workspace.company.name,
        companySlug: workspace.company.slug,
        sessionSnapshot,
      });
      sendJson(res, 202, {
        ok: true,
        status: "running",
        jobId: job.id,
        steps: job.steps,
        redirectTo: `/dashboard/${workspace.company.slug}`,
        dashboard: publicDashboard(state, sessionSnapshot),
      });
      return;
    }
    workspace.company.name = companyName;
    workspace.company.industry = cleanText(body.industry, workspace.company.industry, 80);
    workspace.company.website = cleanText(body.website, workspace.company.website, 120);
    workspace.company.slogan = cleanText(body.slogan, workspace.company.slogan, 120);
    workspace.company.mood =
      body.mode === "new"
      ? `新公司“${workspace.company.name}”已建好，AI员工开始整理经营事项。`
      : `公司资料已更新，AI员工会按新的主营业务继续推进。`;
    pushActivity(workspace, `老板更新了公司资料：${workspace.company.name}。`);
    await saveState(state);
    sendJson(res, 200, { ok: true, dashboard: publicDashboard(state, session) });
    return;
  }

  const companyJobMatch = url.pathname.match(/^\/api\/company\/jobs\/([^/]+)$/);
  if (companyJobMatch && req.method === "GET") {
    cleanupCompanyCreationJobs();
    const job = companyCreationJobs.get(decodeURIComponent(companyJobMatch[1]));
    if (!job) {
      sendJson(res, 404, { ok: false, error: "没有找到这个公司创建任务。" });
      return;
    }
    sendJson(res, 200, serializeCompanyCreationJob(job));
    return;
  }

  if (url.pathname === "/api/company/switch" && req.method === "POST") {
    const body = await readJsonBody(req);
    const state = await loadState();
    const workspace = state.companies.find((item) => item.company.id === body.companyId);
    if (!workspace) {
      sendJson(res, 404, { ok: false, error: "没有找到这家公司。" });
      return;
    }
    state.activeCompanyId = workspace.company.id;
    pushActivity(workspace, `老板切换到公司：${workspace.company.name}。`);
    await updateSessionCompany(session, workspace.company.id);
    await saveState(state);
    sendJson(res, 200, {
      ok: true,
      redirectTo: `/dashboard/${workspace.company.slug}`,
      dashboard: publicDashboard(state, { companyId: workspace.company.id }),
    });
    return;
  }

  if (url.pathname === "/api/owner" && req.method === "PATCH") {
    const body = await readJsonBody(req);
    const state = await loadState();
    const workspace = workspaceForSession(state, session);
    state.owner.name = cleanText(body.name, state.owner.name, 24);
    state.owner.phone = cleanText(body.phone || body.email, state.owner.phone, 80);
    state.owner.reportTime = cleanText(body.reportTime, state.owner.reportTime || "每天上午9点", 40);
    if (session.userAccount) {
      const users = await loadUsers();
      if (users[session.userAccount]) {
        users[session.userAccount].name = state.owner.name;
        users[session.userAccount].phone = state.owner.phone;
        users[session.userAccount].updatedAt = Date.now();
        await saveUsers(users);
      }
      const sessions = await loadSessions();
      if (sessions[session.token]) {
        sessions[session.token].ownerName = state.owner.name;
        sessions[session.token].ownerPhone = state.owner.phone;
        sessions[session.token].expiresAt = Date.now() + SESSION_TTL_MS;
        await saveSessions(sessions);
      }
    }
    pushActivity(workspace, `${state.owner.name}更新了老板资料和汇报时间。`);
    await saveState(state);
    sendJson(res, 200, {
      ok: true,
      dashboard: publicDashboard(state, {
        ...session,
        ownerName: state.owner.name,
        ownerPhone: state.owner.phone,
      }),
    });
    return;
  }

  if (url.pathname === "/api/billing/top-up" && req.method === "POST") {
    const body = await readJsonBody(req);
    const state = await loadState();
    const workspace = workspaceForSession(state, session);
    const amount = Math.max(10, Math.min(9999, Number(body.amount) || 100));
    const budget = workspace.metrics.find((item) => item.label === "本月预算");
    if (budget) {
      budget.value = `¥${currentBudget(workspace) + amount}`;
      budget.hint = "已增加可用次数";
    }
    pushActivity(workspace, `老板给AI员工充值了¥${amount}预算。`);
    workspace.inbox = {
      title: "充值已记录",
      body: `本月AI经营预算已增加¥${amount}。后续可以继续让AI整理客户、文案和报告。`,
    };
    await saveState(state);
    sendJson(res, 200, { ok: true, dashboard: publicDashboard(state, session) });
    return;
  }

  if (url.pathname === "/api/plan/upgrade" && req.method === "POST") {
    const state = await loadState();
    const workspace = workspaceForSession(state, session);
    const budget = workspace.metrics.find((item) => item.label === "本月预算");
    if (budget) budget.hint = "专业版试用中";
    workspace.company.mood = "专业版已开通试用，AI员工可以同时推进客户、资料、官网和收款准备。";
    workspace.inbox = {
      title: "专业版试用已开通",
      body: "现在可以让AI一次性整理更多客户名单、销售话术、官网内容和老板日报。",
    };
    pushActivity(workspace, "老板开通了专业版试用。");
    await saveState(state);
    sendJson(res, 200, { ok: true, dashboard: publicDashboard(state, session) });
    return;
  }

  const channelMatch = url.pathname.match(/^\/api\/channels\/([^/]+)$/);
  if (channelMatch && req.method === "PATCH") {
    const state = await loadState();
    const workspace = workspaceForSession(state, session);
    const channel = workspace.channels.find((item) => item.id === channelMatch[1]);
    if (!channel) {
      sendJson(res, 404, { ok: false, error: "没有找到这个渠道。" });
      return;
    }
    if (channel.id === "channel_wechat") {
      channel.status = "草稿已生成，待老板复制发送";
      channel.action = "重新生成草稿";
      workspace.socialDraft.status = "已准备，等待老板确认发送";
      workspace.inbox = {
        title: "微信草稿已准备好",
        body: "建议先发给最近合作过的老客户，语气以回访为主，不要硬推销。",
      };
    } else if (channel.id === "channel_site") {
      channel.status = "官网绑定资料已列好";
      channel.action = "查看资料";
      workspace.documents.unshift({ id: id("doc_site"), title: "官网绑定资料清单", type: "官网资料", age: "刚刚" });
      workspace.documents = workspace.documents.slice(0, 8);
      workspace.inbox = {
        title: "官网绑定资料已列好",
        body: "需要准备域名、公司介绍、联系电话和服务范围。老板确认后再对外发布。",
      };
    } else if (channel.id === "channel_pay") {
      channel.status = "收款清单已准备";
      channel.action = "查看清单";
      workspace.documents.unshift({ id: id("doc_pay"), title: "收款开通清单", type: "财务资料", age: "刚刚" });
      workspace.documents = workspace.documents.slice(0, 8);
      workspace.inbox = {
        title: "收款开通清单已准备",
        body: "AI已列出微信、支付宝和对公收款分别需要准备的材料。",
      };
    }
    pushActivity(workspace, `老板处理了渠道：${channel.name}。`);
    await saveState(state);
    sendJson(res, 200, { ok: true, dashboard: publicDashboard(state, session), channel });
    return;
  }

  if (url.pathname === "/api/social/prepare" && req.method === "POST") {
    const state = await loadState();
    const workspace = workspaceForSession(state, session);
    workspace.socialDraft.status = "已准备，等待老板确认发送";
    workspace.inbox = {
      title: "对外发布草稿已准备好",
      body: "草稿可以先复制给员工检查，确认无误后再发给客户或朋友圈。",
    };
    pushActivity(workspace, "AI已准备对外发布草稿，等待老板最终确认。");
    await saveState(state);
    sendJson(res, 200, { ok: true, dashboard: publicDashboard(state, session) });
    return;
  }

  const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskMatch && req.method === "PATCH") {
    const body = await readJsonBody(req);
    const state = await loadState();
    const workspace = workspaceForSession(state, session);
    const task = workspace.tasks.find((item) => item.id === taskMatch[1]);
    if (!task) {
      sendJson(res, 404, { ok: false, error: "没有找到这件事。" });
      return;
    }
    const action = String(body.action || "").trim();
    if (action === "confirm") task.status = "老板已同意";
    if (action === "pause") task.status = "已暂缓";
    if (action === "agent" || action === "claude" || action === "codex") task.status = "已交给AI处理";
    pushActivity(
      workspace,
      action === "pause"
        ? `老板决定先不做：${task.title}。`
        : action === "agent" || action === "claude" || action === "codex"
          ? `老板把任务交给AI员工：${task.title}。`
          : `老板同意继续推进：${task.title}。`,
    );
    await saveState(state);
    sendJson(res, 200, { ok: true, dashboard: publicDashboard(state, session), task });
    return;
  }

  if (url.pathname === "/api/agents/run-cycle" && req.method === "POST") {
    const state = await loadState();
    const workspace = workspaceForSession(state, session);
    workspace.cycleCount += 1;
    const rotation = workspace.cycleCount % workspace.agents.length;
    workspace.agents = workspace.agents.map((agent, index) => ({
      ...agent,
      progress: Math.min(96, agent.progress + (index === rotation ? 9 : 3)),
      status:
        index === rotation
          ? "刚刚完成了一步，等待老板看结果"
          : agent.status.replace("正在", "继续"),
    }));
    const suggestions = profileForCompany(workspace.company).cycleSuggestions;
    const [title, body, owner] = suggestions[workspace.cycleCount % suggestions.length];
    workspace.tasks.unshift({
      id: id("task"),
      title,
      body,
      owner,
      status: "AI新建议",
      priority: "今天",
      nextStep: "老板点同意后，AI继续整理成可执行材料。",
    });
    workspace.tasks = workspace.tasks.slice(0, 8);
    pushActivity(workspace, `AI员工完成一轮检查：${title}。`);
    workspace.metrics[1].value = `${7 + workspace.cycleCount}件`;
    await saveState(state);
    sendJson(res, 200, { ok: true, dashboard: publicDashboard(state, session) });
    return;
  }

  if ((url.pathname === "/api/agent/jobs" || url.pathname === "/api/claude/jobs") && req.method === "POST") {
    if (req.headers["x-qxb-local"] !== "1") {
      sendJson(res, 403, { ok: false, error: "缺少本地调用标记。" });
      return;
    }

    try {
      const body = await readJsonBody(req);
      const message = String(body.message || "").trim();
      const validationError = validateClaudeMessage(message);
      if (validationError) {
        sendJson(res, 400, { ok: false, error: validationError });
        return;
      }
      const job = startClaudeJob(message, session.companyId);
      sendJson(res, 202, serializeClaudeJob(job));
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  const claudeJobMatch = url.pathname.match(/^\/api\/(?:agent|claude)\/jobs\/([^/]+)$/);
  if (claudeJobMatch && req.method === "GET") {
    cleanupClaudeJobs();
    const job = claudeJobs.get(claudeJobMatch[1]);
    if (!job) {
      sendJson(res, 404, { ok: false, error: "没有找到这次AI任务。" });
      return;
    }
    sendJson(res, 200, serializeClaudeJob(job));
    return;
  }

  if ((url.pathname === "/api/claude" || url.pathname === "/api/codex") && req.method === "POST") {
    if (req.headers["x-qxb-local"] !== "1") {
      sendJson(res, 403, { ok: false, error: "缺少本地调用标记。" });
      return;
    }

    try {
      const body = await readJsonBody(req);
      const message = String(body.message || "").trim();
      const validationError = validateClaudeMessage(message);
      if (validationError) {
        sendJson(res, 400, { ok: false, error: validationError });
        return;
      }
      if (url.pathname === "/api/claude" && req.headers["x-qxb-sync"] !== "1") {
        const job = startClaudeJob(message, session.companyId);
        sendJson(res, 202, serializeClaudeJob(job));
        return;
      }
      const state = await loadState();
      const workspace = workspaceForSession(state, session);
      const result = await runClaude(message, workspace);
      if (result.ok) {
        pushActivity(workspace, `AI员工已完成老板指令：${message.slice(0, 32)}。`);
        workspace.inbox = {
          title: "AI员工已返回结果",
          body: result.output.slice(0, 220),
        };
        await saveState(state);
        result.dashboard = publicDashboard(state, session);
      }
      sendJson(res, result.ok ? 200 : 500, result);
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  sendJson(res, 404, { ok: false, error: "接口不存在。" });
}

function routeToIndex(pathname) {
  return pathname === "/" || pathname === "/login" || pathname === "/dashboard" || /^\/dashboard\/[^/.]+$/.test(pathname);
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const isDashboardPage = url.pathname === "/dashboard" || /^\/dashboard\/[^/.]+$/.test(url.pathname);
  if (isDashboardPage) {
    const session = await getSession(req);
    if (!session) {
      res.writeHead(302, {
        location: "/login",
        "cache-control": "no-store",
      });
      res.end();
      return;
    }
    const state = await loadState();
    const workspace = workspaceForSession(state, session);
    const requestedSlug = url.pathname === "/dashboard" ? "" : url.pathname.split("/").pop();
    if (requestedSlug && requestedSlug !== workspace.company.slug) {
      res.writeHead(302, {
        location: `/dashboard/${workspace.company.slug || "fitscope"}`,
        "cache-control": "no-store",
      });
      res.end();
      return;
    }
  }
  if (url.pathname === "/login") {
    const session = await getSession(req);
    if (session) {
      const state = await loadState();
      const workspace = workspaceForSession(state, session);
      res.writeHead(302, {
        location: `/dashboard/${workspace.company.slug || "fitscope"}`,
        "cache-control": "no-store",
      });
      res.end();
      return;
    }
  }
  const dashboardAsset = url.pathname.match(/^\/dashboard\/(styles\.css|script\.js)$/);
  const requested = dashboardAsset
    ? `/${dashboardAsset[1]}`
    : routeToIndex(url.pathname)
      ? "/index.html"
      : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(FRONTEND_DIR, requested));
  const relative = path.relative(FRONTEND_DIR, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const file = await fsp.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "content-type": mimeTypes[ext] || "application/octet-stream",
      "cache-control": ext === ".html" ? "no-store" : "no-cache",
    });
    res.end(file);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  setCors(req, res);
  try {
    if (req.url.startsWith("/api/")) {
      await handleApi(req, res);
      return;
    }
    await serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(PORT, () => {
  console.log("企小帮后端已启动");
  console.log(`打开 http://localhost:${PORT}/dashboard/fitscope`);
  console.log(`AI员工命令已配置：${CLAUDE_BIN}`);
});
