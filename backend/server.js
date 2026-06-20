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
    const normalizeUsers = (users) =>
      Object.fromEntries(
        Object.entries(users || {}).map(([account, user]) => [
          account,
          {
            ...user,
            account: user?.account || account,
            companyId: user?.companyId || companyIdsForUser(user)[0] || "",
            companyIds: companyIdsForUser(user),
          },
        ]),
      );
    if (parsed?.users && typeof parsed.users === "object" && !Array.isArray(parsed.users)) {
      return normalizeUsers(parsed.users);
    }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return normalizeUsers(parsed);
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
  const ownedCompanyIds = companyIdsForUser(user);
  sessions[token] = {
    userId: user.id || "",
    userAccount: user.account || "",
    ownerName: user.name || "老板",
    ownerPhone: user.phone || "",
    ownerReportTime: user.reportTime || "",
    companyId: companyId || "",
    companyIds: ownedCompanyIds,
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
  if (session.userAccount) {
    const users = await loadUsers();
    const user = users[session.userAccount];
    if (user) {
      const ownedCompanyIds = companyIdsForUser(user);
      const companyId = ownedCompanyIds.includes(session.companyId)
        ? session.companyId
        : ownedCompanyIds.includes(user.companyId)
          ? user.companyId
          : ownedCompanyIds[0] || "";
      return {
        token,
        ...session,
        userId: user.id || session.userId || "",
        ownerName: user.name || session.ownerName || "老板",
        ownerPhone: user.phone || session.ownerPhone || "",
        ownerReportTime: user.reportTime || session.ownerReportTime || "",
        companyId,
        companyIds: ownedCompanyIds,
      };
    }
  }
  return {
    token,
    ...session,
    companyId: session.companyId || "",
    companyIds: companyIdsForSession(session),
  };
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

function uniqueCompanyIds(values) {
  const ids = [];
  for (const value of values || []) {
    const idValue = String(value || "").trim();
    if (idValue && !ids.includes(idValue)) ids.push(idValue);
  }
  return ids;
}

function companyIdsForUser(user) {
  return uniqueCompanyIds([...(Array.isArray(user?.companyIds) ? user.companyIds : []), user?.companyId]);
}

function companyIdsForSession(session) {
  return uniqueCompanyIds([...(Array.isArray(session?.companyIds) ? session.companyIds : []), session?.companyId]);
}

function chooseCompanyId(state, preferredCompanyId, allowedCompanyIds) {
  const allowed = uniqueCompanyIds(allowedCompanyIds);
  if (!allowed.length) return "";
  const preferred = String(preferredCompanyId || "").trim();
  if (preferred && allowed.includes(preferred) && state.companies.some((workspace) => workspace.company.id === preferred)) {
    return preferred;
  }
  return allowed.find((companyId) => state.companies.some((workspace) => workspace.company.id === companyId)) || "";
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
        ["doc_competitor_watch", "竞争对手动向报告", "竞品报告", "刚刚"],
        ["doc_industry_opportunity", "行业机会报告", "机会报告", "刚刚"],
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
        ["doc_competitor_watch", "竞争对手动向报告", "竞品报告", "刚刚"],
        ["doc_industry_opportunity", "行业机会报告", "机会报告", "刚刚"],
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
      ["doc_competitor_watch", "竞争对手动向报告", "竞品报告", "刚刚"],
      ["doc_industry_opportunity", "行业机会报告", "机会报告", "刚刚"],
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
  return ensureStrategicReportDocuments({
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
  });
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

const strategicReportDocuments = [
  ["doc_competitor_watch", "竞争对手动向报告", "竞品报告", "刚刚"],
  ["doc_industry_opportunity", "行业机会报告", "机会报告", "刚刚"],
];

function ensureStrategicReportDocuments(workspace) {
  if (!workspace?.company) return workspace;
  const current = Array.isArray(workspace.documents) ? workspace.documents : [];
  const missing = strategicReportDocuments
    .filter(([suffix]) => !current.some((doc) => String(doc.id || "").includes(suffix)))
    .map(([suffix, title, type, age]) => ({
      id: `${workspace.company.id}_${suffix}`,
      title,
      type,
      age,
    }));
  if (!missing.length) {
    workspace.documents = current;
    return workspace;
  }
  const [first, ...rest] = current;
  workspace.documents = first ? [first, ...missing, ...rest].slice(0, 10) : [...missing].slice(0, 10);
  return workspace;
}

function extractJsonObject(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  if (!candidate || !candidate.startsWith("{")) return null;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function defaultResearchPack(workspace, aiNotes = "") {
  const company = workspace.company;
  const kind = businessKind(company);
  const researchThemes =
    kind === "investment"
      ? ["项目来源", "投资方向", "尽调标准", "资金安排", "对外合作介绍"]
      : kind === "trade"
        ? ["采购客户", "货源稳定性", "报价体系", "交付周期", "回款风险"]
        : kind === "retail"
          ? ["门店客流", "复购产品", "员工排班", "会员转化", "收款与库存"]
          : ["客户画像", "获客渠道", "对外资料", "交付流程", "收款准备"];
  const competitors =
    kind === "investment"
      ? ["本地财务顾问机构", "产业基金平台", "券商投行团队"]
      : kind === "trade"
        ? ["同城批发商", "区域代理商", "线上供应链平台"]
        : kind === "industrial"
          ? ["本地维修服务商", "设备原厂售后", "备件经销商"]
          : ["同城同行商家", "线上平台服务商", "老客户转介绍团队"];
  const customerSegments =
    kind === "investment"
      ? [
          ["项目方", "需要融资、并购或产业资源的企业", "先确认阶段、金额、资料完整度"],
          ["资金方", "有明确行业偏好或配置需求的机构", "先说明项目质量和风险边界"],
          ["中介渠道", "FA、律所、会计师、园区服务机构", "先建立稳定项目来源机制"],
        ]
      : kind === "trade"
        ? [
            ["稳定采购客户", "有持续采购和补货需求", "先给清楚报价、交期和售后"],
            ["渠道商", "能带来批量订单或区域分销", "先确认价格体系和账期"],
            ["老客户", "曾经成交或询价过", "先回访近期采购计划"],
          ]
        : [
            ["老客户", "已经信任公司但缺少持续跟进", "先做回访和复购提醒"],
            ["本地潜在客户", "有需求但还不了解公司", "先给简单可信的一页介绍"],
            ["合作渠道", "能转介绍客户的同行或服务商", "先建立合作话术和分成规则"],
          ];
  const managerDecisions = [
    "老板是否确认主推业务和客户优先级",
    "是否允许AI继续补充外部资料和客户名单",
    "是否确认对外介绍和第一版销售话术",
    "是否需要设置收款方式、报价口径或预算上限",
  ];
  const competitorMoves = competitors.map((name, index) => ({
    competitor: name,
    recentMove: index === 0 ? "重点观察它最近怎么获客、怎么报价、怎么承诺交付。" : index === 1 ? "重点观察它是否在扩大渠道、打包服务或降低价格。" : "重点观察它是否用线上内容、标准套餐或合作伙伴抢客户。",
    impact: index === 0 ? "可能抢走本地关系客户和着急成交的客户。" : index === 1 ? "可能把客户预期拉到更低价格或更全服务。" : "可能让客户先在线上比价，再压低我们的成交空间。",
    ownerAction: "本周先把我们的客户画像、报价口径、交付承诺和跟进节奏写清楚，销售对外只讲能兑现的三件事。",
    watchSignal: "如果客户频繁问价格、交期、案例或是否能马上响应，说明竞品压力已经传到一线。",
  }));
  const industryOpportunities = researchThemes.slice(0, 4).map((theme, index) => ({
    opportunity: `${theme}带来的经营机会`,
    whyNow: index === 0 ? "新公司刚建立，越早定清楚方向，后面获客和资料越不会乱。" : "客户越来越希望供应商/服务商给出清楚方案、价格、周期和结果承诺。",
    fitForCompany: `${company.name}可以先把“${theme}”做成一张清单、一页介绍或一套话术，降低老板和员工的沟通成本。`,
    actionThisWeek: index === 0 ? "老板先确认优先级，AI当天整理成可执行清单。" : "安排AI补资料、销售试跟进、老板看结果后决定是否扩大投入。",
    resourcesNeeded: "需要老板确认主推业务、客户类型、预算上限和是否允许员工对外试沟通。",
    risk: "不要同时铺太多方向，先用一周验证最容易成交或最能带来资源的一条线。",
  }));
  return {
    generatedBy: aiNotes ? "ai_agent_with_research_prompt" : "internal_manager_framework",
    rawNotes: aiNotes,
    sources: aiNotes
      ? [{ title: "AI经营研究输出", url: "", type: "agent_notes", summary: "AI已返回经营启动研究，具体来源以输出内容为准。" }]
      : [{ title: "AI初步研究框架", url: "", type: "internal_framework", summary: "尚未取得可核验外部来源，已先按行业经营框架生成第一版。" }],
    marketInsights: researchThemes.map((theme, index) => ({
      theme,
      insight: `${company.name}需要先把“${theme}”拆成可执行清单，避免老板只看到概念、看不到下一步动作。`,
      action: index === 0 ? "今天先确认优先级" : "本周内补充资料并形成清单",
    })),
    competitors: competitors.map((name, index) => ({
      name,
      pressure: index === 0 ? "本地关系和响应速度" : index === 1 ? "资源覆盖和价格体系" : "线上获客和标准化服务",
      counterMove: "用更清楚的客户画像、报价口径和跟进节奏提高成交确定性。",
    })),
    competitorMoves,
    industryOpportunities,
    customerSegments: customerSegments.map(([name, profile, firstMove]) => ({ name, profile, firstMove })),
    operatingPlan90d: [
      { phase: "第1-7天", goal: "建档和验证方向", actions: ["确认主营业务", "整理客户画像", "生成对外介绍", "列出第一批可跟进名单"] },
      { phase: "第8-30天", goal: "跑通获客和成交动作", actions: ["每天跟进客户", "每周复盘报价/话术", "沉淀成交案例", "建立收款和交付清单"] },
      { phase: "第31-90天", goal: "形成稳定经营节奏", actions: ["固定周报", "扩展渠道", "优化部门职责", "把高频工作自动化"] },
    ],
    salesPlaybook: {
      opening: `先用一句话说清${company.name}能帮客户解决什么问题。`,
      qualification: ["客户是谁", "现在最急的问题是什么", "预算或合作周期是否明确", "谁能拍板"],
      followUp: ["当天记录客户情况", "24小时内发送资料", "3天内二次跟进", "一周内给老板复盘结果"],
    },
    managerDecisions,
  };
}

function researchPack(workspace, aiNotes = "") {
  const parsed = extractJsonObject(aiNotes);
  const fallback = defaultResearchPack(workspace, aiNotes);
  if (!parsed) return fallback;
  return {
    ...fallback,
    generatedBy: "ai_agent_web_research",
    rawNotes: aiNotes,
    sources: asArray(parsed.sources).length ? parsed.sources : fallback.sources,
    marketInsights: asArray(parsed.marketInsights).length ? parsed.marketInsights : fallback.marketInsights,
    competitors: asArray(parsed.competitors).length ? parsed.competitors : fallback.competitors,
    competitorMoves: asArray(parsed.competitorMoves).length
      ? parsed.competitorMoves
      : asArray(parsed.competitorReports).length
        ? parsed.competitorReports
        : fallback.competitorMoves,
    industryOpportunities: asArray(parsed.industryOpportunities).length
      ? parsed.industryOpportunities
      : asArray(parsed.opportunityReports).length
        ? parsed.opportunityReports
        : fallback.industryOpportunities,
    customerSegments: asArray(parsed.customerSegments).length ? parsed.customerSegments : fallback.customerSegments,
    operatingPlan90d: asArray(parsed.operatingPlan90d).length ? parsed.operatingPlan90d : fallback.operatingPlan90d,
    salesPlaybook: parsed.salesPlaybook || fallback.salesPlaybook,
    managerDecisions: asArray(parsed.managerDecisions).length ? parsed.managerDecisions : fallback.managerDecisions,
  };
}

function marketResearchMarkdown(workspace, pack) {
  return [
    `# ${workspace.company.name}市场与经营研究`,
    "",
    `主营业务：${workspace.company.industry}`,
    `研究方式：${pack.generatedBy}`,
    "",
    "## 关键判断",
    ...pack.marketInsights.map((item, index) => `${index + 1}. ${item.theme || item.title || "经营重点"}：${item.insight || item.summary || ""}\n   - 下一步：${item.action || item.nextStep || "形成可执行清单"}`),
    "",
    "## 资料来源",
    ...pack.sources.map((item, index) => `${index + 1}. ${item.title || "来源"}${item.url ? ` - ${item.url}` : ""}\n   - ${item.summary || item.type || "待核验"}`),
    "",
    pack.rawNotes ? `## AI研究原文\n${pack.rawNotes}` : "",
    "",
  ].join("\n");
}

function competitorWatchReportMarkdown(workspace, pack) {
  const company = workspace.company;
  const moves = asArray(pack.competitorMoves).length
    ? pack.competitorMoves
    : asArray(pack.competitors).map((item) => ({
        competitor: item.name,
        recentMove: item.pressure,
        impact: item.pressure,
        ownerAction: item.counterMove,
        watchSignal: "让销售在客户沟通中记录价格、交付、案例和响应速度四类问题。",
      }));
  return [
    `# ${company.name}竞争对手动向报告`,
    "",
    "## 给老板的结论",
    `${company.name}现在不需要盲目跟竞品打价格战，先把“客户为什么选我们、我们能保证什么、销售下一步怎么跟”讲清楚。竞品监控的目的不是看热闹，而是指导本周获客、报价和交付动作。`,
    "",
    "## 本周重点观察",
    ...moves.map((item, index) => [
      `${index + 1}. ${item.competitor || item.name || "竞品/替代方案"}`,
      `   - 可能动作：${item.recentMove || item.move || "观察它的获客、报价、交付和案例变化。"}`,
      `   - 对我们的影响：${item.impact || item.pressure || "可能影响客户预期和成交速度。"}`,
      `   - 老板本周动作：${item.ownerAction || item.counterMove || "确认我们自己的客户优先级、报价边界和跟进节奏。"}`,
      `   - 一线观察信号：${item.watchSignal || "客户是否反复询价、要求案例、比较交期或压缩付款条件。"}`,
    ].join("\n")),
    "",
    "## 可以立刻安排员工做的事",
    "1. 销售每次跟进客户时记录：客户提到的竞品、价格、交付周期、顾虑。",
    "2. 资料负责人把公司优势写成一页纸，只写客户能听懂、公司能做到的内容。",
    "3. 老板每周看一次竞品压力，决定是调整报价、补案例，还是换一批更合适的客户。",
    "",
  ].join("\n");
}

function industryOpportunityReportMarkdown(workspace, pack) {
  const company = workspace.company;
  const opportunities = asArray(pack.industryOpportunities).length
    ? pack.industryOpportunities
    : asArray(pack.marketInsights).map((item) => ({
        opportunity: item.theme || item.title,
        whyNow: item.insight || item.summary,
        fitForCompany: item.insight || item.summary,
        actionThisWeek: item.action || item.nextStep,
        resourcesNeeded: "老板确认优先级、预算和负责人。",
        risk: "先小范围验证，不要一次铺太多方向。",
      }));
  return [
    `# ${company.name}行业机会报告`,
    "",
    "## 给老板的结论",
    `行业机会要落到${company.name}本周能做的经营动作上：先找最容易验证的一条线，明确客户是谁、先讲什么、谁负责、几天看结果。`,
    "",
    "## 值得抓的机会",
    ...opportunities.map((item, index) => [
      `${index + 1}. ${item.opportunity || item.theme || "经营机会"}`,
      `   - 为什么现在值得看：${item.whyNow || item.insight || "客户需求正在变化，需要更清楚的方案和响应。"}`,
      `   - 跟公司怎么结合：${item.fitForCompany || "先结合主营业务做成可销售、可交付、可复盘的小动作。"}`,
      `   - 本周动作：${item.actionThisWeek || item.action || "先整理清单，找3到5个客户验证。"}`,
      `   - 需要资源：${item.resourcesNeeded || "老板确认负责人、预算和优先级。"}`,
      `   - 风险提醒：${item.risk || "不要只看概念，必须用客户反馈验证。"}`,
    ].join("\n")),
    "",
    "## 老板今天要拍板",
    "1. 先选一个机会做一周验证。",
    "2. 指定一个员工或AI角色负责整理资料和跟进记录。",
    "3. 约定复盘标准：有多少客户回复、多少客户愿意继续聊、卡点是什么。",
    "",
  ].join("\n");
}

function operatingPlanMarkdown(workspace, pack) {
  return [
    `# ${workspace.company.name}90天经营计划`,
    "",
    ...pack.operatingPlan90d.map((phase) => [
      `## ${phase.phase || phase.name || "阶段"}`,
      `目标：${phase.goal || ""}`,
      "",
      ...(asArray(phase.actions).map((action, index) => `${index + 1}. ${action}`)),
      "",
    ].join("\n")),
  ].join("\n");
}

function salesPlaybookMarkdown(workspace, pack) {
  const playbook = pack.salesPlaybook || {};
  return [
    `# ${workspace.company.name}销售打法`,
    "",
    `开场方式：${playbook.opening || `先介绍${workspace.company.name}能解决的具体问题。`}`,
    "",
    "## 先问清楚",
    ...asArray(playbook.qualification).map((item, index) => `${index + 1}. ${item}`),
    "",
    "## 跟进节奏",
    ...asArray(playbook.followUp).map((item, index) => `${index + 1}. ${item}`),
    "",
  ].join("\n");
}

async function materializeAgentWorkspace(workspace, owner, options = {}) {
  const root = agentWorkspaceRoot(workspace.company.id);
  const departments = departmentBlueprints(workspace);
  const backlog = operatingBacklog(workspace);
  const pack = options.researchPack || researchPack(workspace, options.aiNotes || "");
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
  await writeAgentWorkspaceFile(root, "sources.json", jsonBlock({ version: 1, generatedAt, sources: pack.sources }));
  await writeAgentWorkspaceFile(root, "research/market_research.md", marketResearchMarkdown(workspace, pack));
  await writeAgentWorkspaceFile(root, "research/competitors.json", jsonBlock({ version: 1, generatedAt, competitors: pack.competitors }));
  await writeAgentWorkspaceFile(root, "research/competitor_moves.json", jsonBlock({ version: 1, generatedAt, competitorMoves: pack.competitorMoves }));
  await writeAgentWorkspaceFile(root, "research/industry_opportunities.json", jsonBlock({ version: 1, generatedAt, industryOpportunities: pack.industryOpportunities }));
  await writeAgentWorkspaceFile(root, "research/customer_segments.json", jsonBlock({ version: 1, generatedAt, customerSegments: pack.customerSegments }));
  await writeAgentWorkspaceFile(root, "reports/competitor_watch_report.md", competitorWatchReportMarkdown(workspace, pack));
  await writeAgentWorkspaceFile(root, "reports/industry_opportunity_report.md", industryOpportunityReportMarkdown(workspace, pack));
  await writeAgentWorkspaceFile(root, "departments/departments.json", jsonBlock({ version: 1, generatedAt, departments }));
  await writeAgentWorkspaceFile(root, "tasks/operating_backlog.json", jsonBlock({ version: 1, generatedAt, tasks: backlog }));
  await writeAgentWorkspaceFile(root, "plans/operating_plan_90d.md", operatingPlanMarkdown(workspace, pack));
  await writeAgentWorkspaceFile(root, "playbooks/sales_playbook.md", salesPlaybookMarkdown(workspace, pack));
  await writeAgentWorkspaceFile(root, "decisions/manager_decisions.json", jsonBlock({ version: 1, generatedAt, decisions: pack.managerDecisions }));
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
      "- `sources.json`：外部资料和研究来源存证",
      "- `research/industry_brief.md`：经营研究底稿",
      "- `research/market_research.md`：市场与经营研究",
      "- `research/competitors.json`：竞品和替代方案",
      "- `research/competitor_moves.json`：竞争对手动向结构化记录",
      "- `research/industry_opportunities.json`：行业机会结构化记录",
      "- `reports/competitor_watch_report.md`：给老板看的竞争对手动向报告",
      "- `reports/industry_opportunity_report.md`：给老板看的行业机会报告",
      "- `research/customer_segments.json`：客户画像",
      "- `departments/departments.json`：AI部门和职责",
      "- `tasks/operating_backlog.json`：经营任务队列",
      "- `plans/operating_plan_90d.md`：90天经营计划",
      "- `playbooks/sales_playbook.md`：销售打法",
      "- `decisions/manager_decisions.json`：需要老板拍板的事项",
      "- `documents/today_brief.md`：今日简报草稿",
      "",
    ].join("\n"),
  );
  workspace.meta = {
    ...(workspace.meta || {}),
    agentWorkspaceId: workspace.company.id,
    agentWorkspaceVersion: 2,
    researchMode: pack.generatedBy,
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
  return ensureStrategicReportDocuments(normalized);
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
  const allowedCompanyIds = companyIdsForSession(session);
  if (!allowedCompanyIds.length) return null;
  const companyId = chooseCompanyId(state, session?.companyId, allowedCompanyIds);
  if (!companyId) return null;
  return state.companies.find((workspace) => workspace.company.id === companyId) || null;
}

function companyList(state, activeCompanyId, session) {
  const allowedCompanyIds = companyIdsForSession(session);
  return state.companies
    .filter((workspace) => allowedCompanyIds.includes(workspace.company.id))
    .map((workspace) => ({
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
    reportTime: session?.ownerReportTime || state.owner.reportTime || "每天上午9点",
    account: session?.userAccount || "",
  };
}

async function updateSessionCompany(session, companyId) {
  const sessions = await loadSessions();
  if (sessions[session.token]) {
    sessions[session.token].companyId = companyId;
    sessions[session.token].companyIds = uniqueCompanyIds([...(sessions[session.token].companyIds || []), ...companyIdsForSession(session), companyId]);
    sessions[session.token].expiresAt = Date.now() + SESSION_TTL_MS;
    await saveSessions(sessions);
  }
  if (session.userAccount) {
    const users = await loadUsers();
    if (users[session.userAccount]) {
      users[session.userAccount].companyId = companyId;
      users[session.userAccount].companyIds = uniqueCompanyIds([...(users[session.userAccount].companyIds || []), companyId]);
      users[session.userAccount].updatedAt = Date.now();
      await saveUsers(users);
    }
  }
}

function publicDashboard(state, session) {
  const workspace = workspaceForSession(state, session);
  if (!workspace) {
    return {
      requiresCompany: true,
      needsCompany: true,
      company: null,
      companies: [],
      owner: ownerForSession(state, session),
      metrics: [
        { label: "企业档案", value: "待创建", hint: "先建立第一家公司" },
        { label: "AI员工", value: "待组建", hint: "创建后自动安排" },
        { label: "经营任务", value: "待生成", hint: "按企业业务重新生成" },
        { label: "资料目录", value: "待建立", hint: "每家公司独立保存" },
      ],
      agents: [],
      tasks: [
        {
          id: "setup_company",
          title: "创建自己的企业",
          body: "新账号不会看到别人的公司。先填公司名称、主营业务和联系方式，AI会为这家公司单独建立经营看板。",
          owner: "AI经营助手",
          status: "待老板填写",
          priority: "今天",
          nextStep: "点顶部“新建公司”，创建后直接进入自己的公司看板。",
        },
      ],
      documents: [],
      channels: [],
      activity: [
        { id: "setup_log", time: nowLabel(), text: "老板账号已准备好，等待创建第一家公司。" },
      ],
      inbox: {
        title: "先创建自己的企业",
        body: "当前账号还没有绑定公司。创建企业后，系统会把资料、任务、AI员工和后续结果都绑定到这个账号下。",
      },
      socialDraft: {
        title: "等待公司资料",
        body: "创建企业后，AI会按主营业务生成对外介绍和客户跟进内容。",
        status: "待创建",
      },
      cycleCount: 0,
      updatedAt: nowLabel(),
    };
  }
  return {
    requiresCompany: false,
    needsCompany: false,
    company: workspace.company,
    companies: companyList(state, workspace.company.id, session),
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

function sendCompanyRequired(res) {
  sendJson(res, 409, { ok: false, needsCompany: true, error: "请先创建自己的企业，再使用这个功能。" });
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
    "4. 不要输出 Markdown 符号，例如 #、**、```；如果需要分层，就用清楚的中文小标题和短句。",
    "5. 回答控制在700字以内，默认按这四段结构输出：老板先看结论、马上行动清单、可直接复制、需要老板确认。",
    "6. 如果老板问竞争对手或行业机会，必须站在经营管理角度回答：影响成交什么、这周做什么、谁负责、观察什么信号、有什么风险。",
    "7. 不要空泛鼓励，不要讲大趋势套话；每一条建议都要能指导老板安排员工、销售、资料、报价、交付或回款。",
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

function runAgentPrompt(prompt, cwd = PROJECT_ROOT) {
  return new Promise((resolve) => {
    const started = Date.now();
    const args = [
      "-p",
      prompt,
      "--model",
      process.env.ANTHROPIC_MODEL || "MiniMax-M3",
      "--output-format",
      "text",
    ];

    let stdout = "";
    let stderr = "";
    let finished = false;
    const child = spawn(CLAUDE_BIN, args, {
      cwd,
      env: claudeEnv(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timer = setTimeout(() => {
      if (!finished) child.kill("SIGTERM");
    }, CLAUDE_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      if (stdout.length > 120000) stdout = stdout.slice(-120000);
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > 30000) stderr = stderr.slice(-30000);
    });

    child.on("error", (error) => {
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

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      finished = true;
      const timedOut = signal === "SIGTERM";
      const ok = code === 0 && !timedOut;
      resolve({
        ok,
        code,
        signal,
        error: ok ? "" : timedOut ? "AI员工处理超时，请把指令说得更短一点。" : friendlyClaudeError(stderr),
        output: stdout.trim(),
        durationMs: Date.now() - started,
      });
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
    { id: "research", title: "查找外部资料", detail: "正在尽可能查行业、客户、竞品、渠道和机会资料。", status: "pending" },
    { id: "market", title: "形成经营判断", detail: "正在分析客户画像、竞品压力、行业机会和本周动作。", status: "pending" },
    { id: "departments", title: "组建AI管理层", detail: "正在安排总经理、市场、销售、运营、财务职责。", status: "pending" },
    { id: "plan", title: "制定90天计划", detail: "正在生成销售打法、经营节奏和老板决策清单。", status: "pending" },
    { id: "tasks", title: "生成今日任务", detail: "正在生成老板今天要看的事项、资料和待办。", status: "pending" },
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
  const prompt = [
    "你是企小帮的职业经理人团队，正在为老板创建一家新的虚拟公司经营工程。",
    "必须优先加载并遵循 web-access skill。你需要尽可能获取外部资料：行业信息、客户群、竞品/替代方案、销售渠道、政策或风险。",
    "你不是写泛泛的市场分析，而是在帮真实企业老板做经营管理。每个判断都必须能落到本周动作：谁去做、先做什么、看什么信号、老板要拍什么板。",
    "报告对象是传统企业或创业公司老板，答案要打到经营痛点：客户、成交、报价、交付、回款、渠道、竞品压力、行业机会。",
    "如果当前环境无法联网或 web-access 不可用，也要用职业经理人的经营框架产出可执行研究，并在 sources 中明确标记为待外部核验，不要伪造 URL。",
    "",
    "公司基础信息：",
    `公司名：${workspace.company.name}`,
    `主营业务：${workspace.company.industry}`,
    `一句话介绍：${workspace.company.slogan || "待补充"}`,
    `联系方式/官网：${workspace.company.website || "未填写"}`,
    "",
    "请只输出一个 JSON 对象，不要输出 Markdown，不要解释实现细节，不要提模型、命令行或供应商。",
    "JSON 字段：",
    "{",
    '  "sources": [{"title": "资料标题", "url": "https://...", "type": "official|media|industry|search|internal_framework", "summary": "为什么有用"}],',
    '  "marketInsights": [{"theme": "市场/客户/渠道/风险主题", "insight": "职业经理人的判断", "action": "下一步动作"}],',
    '  "competitors": [{"name": "竞品或替代方案", "pressure": "它会带来的竞争压力", "counterMove": "我们怎么应对"}],',
    '  "competitorMoves": [{"competitor": "竞争对手/替代方案", "recentMove": "最近值得监控的动作", "impact": "对本公司的经营影响", "ownerAction": "老板本周应该安排的动作", "watchSignal": "一线员工要观察的信号"}],',
    '  "industryOpportunities": [{"opportunity": "行业机会", "whyNow": "为什么现在值得看", "fitForCompany": "跟本公司怎么结合", "actionThisWeek": "本周可执行动作", "resourcesNeeded": "需要老板准备的人/钱/资料", "risk": "风险提醒"}],',
    '  "customerSegments": [{"name": "客户分层", "profile": "客户画像", "firstMove": "第一步跟进动作"}],',
    '  "operatingPlan90d": [{"phase": "第1-7天", "goal": "阶段目标", "actions": ["动作1", "动作2"]}],',
    '  "salesPlaybook": {"opening": "第一句话怎么说", "qualification": ["先问什么"], "followUp": ["怎么跟进"]},',
    '  "managerDecisions": ["需要老板拍板的事项"]',
    "}",
  ].join("\n");
  const result = await runAgentPrompt(prompt, agentWorkspaceRoot(workspace.company.id));
  if (!result.ok) return "";
  return result.output.slice(0, 10000);
}

function startCompanyCreationJob({ companyId, companyName, companySlug, sessionSnapshot }) {
  cleanupCompanyCreationJobs();
  const job = {
    id: id("company_job"),
    status: "running",
    activeStep: "profile",
    companyId,
    userAccount: sessionSnapshot?.userAccount || "",
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
    updateCompanyCreationStep(job, "research", "running", "正在让AI员工尽可能查找外部资料、客户群、竞品、渠道和行业机会。");
    workspace.meta.creationStatus = "researching";
    let aiNotes = "";
    try {
      aiNotes = await runCompanyResearchAgent(workspace);
    } catch {
      aiNotes = "";
    }
    const managerPack = researchPack(workspace, aiNotes);
    workspace.activity.unshift({
      id: id("log"),
      time: nowLabel(),
      text: aiNotes ? "AI已完成外部资料调研、竞品监控和行业机会底稿。" : "AI已按职业经理人框架生成第一版竞品与行业机会底稿。",
    });
    workspace.activity = workspace.activity.slice(0, 12);
    await materializeAgentWorkspace(workspace, owner, { aiNotes, researchPack: managerPack });
    await saveState(state);
    await delay(700);

    updateCompanyCreationStep(job, "research", "done", "外部资料、竞品监控和行业机会底稿已生成。");
    updateCompanyCreationStep(job, "market", "running", "正在分析客户画像、竞品压力、行业机会、销售切入口和经营风险。");
    workspace.meta.creationStatus = "analyzing_market";
    workspace.inbox = {
      title: "经营研究已完成",
      body: `AI已经为${workspace.company.name}整理了资料来源、客户画像、竞争对手动向、行业机会和第一版销售切入口。下一步会组建AI管理层。`,
    };
    await materializeAgentWorkspace(workspace, owner, { aiNotes, researchPack: managerPack });
    await saveState(state);
    await delay(700);

    updateCompanyCreationStep(job, "market", "done", "市场判断和客户画像已整理。");
    updateCompanyCreationStep(job, "departments", "running", "正在组建AI管理层并分配总经理、市场、销售、运营、财务职责。");
    workspace.meta.creationStatus = "building_departments";
    workspace.agents = workspace.agents.map((agent) => ({
      ...agent,
      status: agent.status.replace(/^正在/, "已经开始"),
      progress: Math.min(88, Number(agent.progress || 60) + 8),
    }));
    await materializeAgentWorkspace(workspace, owner, { aiNotes, researchPack: managerPack });
    await saveState(state);
    await delay(700);

    updateCompanyCreationStep(job, "departments", "done", "AI管理层和职责已就绪。");
    updateCompanyCreationStep(job, "plan", "running", "正在制定90天经营计划、销售打法和老板决策清单。");
    workspace.meta.creationStatus = "planning_90d";
    workspace.documents = [
      ...(workspace.documents || []),
      {
        id: `${workspace.company.id}_doc_plan_90d`,
        title: "90天经营计划",
        type: "经营计划",
        age: "刚刚",
      },
      {
        id: `${workspace.company.id}_doc_sales_playbook`,
        title: "销售打法草稿",
        type: "销售打法",
        age: "刚刚",
      },
    ].filter((item, index, arr) => arr.findIndex((doc) => doc.id === item.id) === index);
    await materializeAgentWorkspace(workspace, owner, { aiNotes, researchPack: managerPack });
    await saveState(state);
    await delay(700);

    updateCompanyCreationStep(job, "plan", "done", "90天经营计划和销售打法已生成。");
    updateCompanyCreationStep(job, "tasks", "running", "正在生成今天要看的事项、资料草稿和经营队列。");
    workspace.meta.creationStatus = "creating_tasks";
    workspace.tasks = workspace.tasks.map((task, index) => ({
      ...task,
      status: index === 0 ? "待老板确认" : "AI已生成",
      priority: index === 0 ? "今天" : task.priority,
    }));
    workspace.inbox = {
      title: "新公司经营工程已创建",
      body: `AI已经为${workspace.company.name}建立公司档案、资料来源、竞争对手动向报告、行业机会报告、客户画像、AI管理层、90天计划、经营任务和今日简报。老板现在可以先看三件待确认事项。`,
    };
    await materializeAgentWorkspace(workspace, owner, { aiNotes, researchPack: managerPack });
    await saveState(state);
    await delay(700);

    updateCompanyCreationStep(job, "tasks", "done", "经营任务和资料草稿已生成。");
    updateCompanyCreationStep(job, "finalize", "running", "正在保存并进入新公司经营看板。");
    workspace.meta.creationStatus = "ready";
    workspace.company.mood = `AI管理层已为${workspace.company.name}建好经营工程，今天先推进最关键的三件事。`;
    pushActivity(workspace, `${workspace.company.name}的新公司经营工程已完成。`);
    await materializeAgentWorkspace(workspace, owner, { aiNotes, researchPack: managerPack });
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
      needsCompany: !workspace,
      owner: ownerForSession(state, session),
      company: workspace?.company || null,
      companies: workspace ? companyList(state, workspace.company.id, session) : [],
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
    const passwordData = hashPassword(password);
    const user = {
      id: id("user"),
      account,
      name: cleanText(body.name, "老板", 24),
      phone: cleanText(body.phone, "", 80),
      passwordSalt: passwordData.salt,
      passwordHash: passwordData.hash,
      companyId: "",
      companyIds: [],
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      updatedAt: Date.now(),
    };

    users[account] = user;
    await saveUsers(users);

    const token = await createSession(user, "");
    res.setHeader("Set-Cookie", sessionCookie(token, Math.floor(SESSION_TTL_MS / 1000)));
    sendJson(res, 200, {
      ok: true,
      needsCompany: true,
      redirectTo: "/dashboard/setup",
      dashboard: publicDashboard(state, {
        userAccount: user.account,
        ownerName: user.name,
        ownerPhone: user.phone,
        ownerReportTime: user.reportTime || "",
        companyId: "",
        companyIds: [],
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
      const ownedCompanyIds = companyIdsForUser(user);
      const loginCompanyId = chooseCompanyId(state, user.companyId, ownedCompanyIds);
      const loginWorkspace = loginCompanyId
        ? state.companies.find((workspace) => workspace.company.id === loginCompanyId)
        : null;
      user.companyId = loginWorkspace?.company.id || "";
      user.companyIds = uniqueCompanyIds(ownedCompanyIds.filter((companyId) => state.companies.some((workspace) => workspace.company.id === companyId)));
      user.lastLoginAt = Date.now();
      users[account] = user;
      if (loginWorkspace) {
        pushActivity(loginWorkspace, `${user.name || "老板"}登录了公司经营看板。`);
      }
      await saveUsers(users);
      if (loginWorkspace) await saveState(state);

      const token = await createSession(user, user.companyId);
      res.setHeader("Set-Cookie", sessionCookie(token, Math.floor(SESSION_TTL_MS / 1000)));
      sendJson(res, 200, {
        ok: true,
        needsCompany: !loginWorkspace,
        redirectTo: loginWorkspace ? `/dashboard/${loginWorkspace.company.slug}` : "/dashboard/setup",
        dashboard: publicDashboard(state, {
          userAccount: user.account,
          ownerName: user.name,
          ownerPhone: user.phone,
          ownerReportTime: user.reportTime || "",
          companyId: user.companyId,
          companyIds: user.companyIds,
        }),
      });
      return;
    }

    sendJson(res, 400, { ok: false, error: "请使用账号密码登录，或先注册老板账号。" });
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
    const companyName = cleanText(body.name, workspace?.company?.name || "新公司", 40);
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
      await updateSessionCompany(session, workspace.company.id);
      await materializeAgentWorkspace(workspace, ownerForSession(state, session));
      await saveState(state);
      const ownedCompanyIds = uniqueCompanyIds([...companyIdsForSession(session), workspace.company.id]);
      const sessionSnapshot = {
        ...session,
        companyId: workspace.company.id,
        companyIds: ownedCompanyIds,
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
    if (!workspace) {
      sendJson(res, 409, { ok: false, error: "请先创建自己的企业，再修改公司资料。" });
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
    if (!job || (job.userAccount && job.userAccount !== session.userAccount)) {
      sendJson(res, 404, { ok: false, error: "没有找到这个公司创建任务。" });
      return;
    }
    sendJson(res, 200, serializeCompanyCreationJob(job));
    return;
  }

  if (url.pathname === "/api/company/switch" && req.method === "POST") {
    const body = await readJsonBody(req);
    const state = await loadState();
    const allowedCompanyIds = companyIdsForSession(session);
    if (!allowedCompanyIds.includes(String(body.companyId || ""))) {
      sendJson(res, 404, { ok: false, error: "没有找到这家公司，或它不属于当前账号。" });
      return;
    }
    const workspace = state.companies.find((item) => item.company.id === body.companyId);
    if (!workspace) {
      sendJson(res, 404, { ok: false, error: "没有找到这家公司。" });
      return;
    }
    pushActivity(workspace, `老板切换到公司：${workspace.company.name}。`);
    await updateSessionCompany(session, workspace.company.id);
    await saveState(state);
    const sessionSnapshot = {
      ...session,
      companyId: workspace.company.id,
      companyIds: allowedCompanyIds,
    };
    sendJson(res, 200, {
      ok: true,
      redirectTo: `/dashboard/${workspace.company.slug}`,
      dashboard: publicDashboard(state, sessionSnapshot),
    });
    return;
  }

  if (url.pathname === "/api/owner" && req.method === "PATCH") {
    const body = await readJsonBody(req);
    const state = await loadState();
    const workspace = workspaceForSession(state, session);
    const ownerName = cleanText(body.name, session.ownerName || state.owner.name || "老板", 24);
    const ownerPhone = cleanText(body.phone || body.email, session.ownerPhone || state.owner.phone || "", 80);
    const reportTime = cleanText(body.reportTime, state.owner.reportTime || "每天上午9点", 40);
    if (session.userAccount) {
      const users = await loadUsers();
      if (users[session.userAccount]) {
        users[session.userAccount].name = ownerName;
        users[session.userAccount].phone = ownerPhone;
        users[session.userAccount].reportTime = reportTime;
        users[session.userAccount].updatedAt = Date.now();
        await saveUsers(users);
      }
      const sessions = await loadSessions();
      if (sessions[session.token]) {
        sessions[session.token].ownerName = ownerName;
        sessions[session.token].ownerPhone = ownerPhone;
        sessions[session.token].ownerReportTime = reportTime;
        sessions[session.token].expiresAt = Date.now() + SESSION_TTL_MS;
        await saveSessions(sessions);
      }
    }
    if (workspace) {
      pushActivity(workspace, `${ownerName}更新了老板资料和汇报时间。`);
      await saveState(state);
    }
    sendJson(res, 200, {
      ok: true,
      dashboard: publicDashboard(state, {
        ...session,
        ownerName,
        ownerPhone,
        ownerReportTime: reportTime,
      }),
    });
    return;
  }

  if (url.pathname === "/api/billing/top-up" && req.method === "POST") {
    const body = await readJsonBody(req);
    const state = await loadState();
    const workspace = workspaceForSession(state, session);
    if (!workspace) {
      sendCompanyRequired(res);
      return;
    }
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
    if (!workspace) {
      sendCompanyRequired(res);
      return;
    }
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
    if (!workspace) {
      sendCompanyRequired(res);
      return;
    }
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
    if (!workspace) {
      sendCompanyRequired(res);
      return;
    }
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
    if (!workspace) {
      sendCompanyRequired(res);
      return;
    }
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
    if (!workspace) {
      sendCompanyRequired(res);
      return;
    }
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
      const state = await loadState();
      const workspace = workspaceForSession(state, session);
      if (!workspace) {
        sendCompanyRequired(res);
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
      const state = await loadState();
      const workspace = workspaceForSession(state, session);
      if (!workspace) {
        sendCompanyRequired(res);
        return;
      }
      if (url.pathname === "/api/claude" && req.headers["x-qxb-sync"] !== "1") {
        const job = startClaudeJob(message, session.companyId);
        sendJson(res, 202, serializeClaudeJob(job));
        return;
      }
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
    if (!workspace) {
      if (requestedSlug !== "setup") {
        res.writeHead(302, {
          location: "/dashboard/setup",
          "cache-control": "no-store",
        });
        res.end();
        return;
      }
    } else if (requestedSlug === "setup") {
      res.writeHead(302, {
        location: `/dashboard/${workspace.company.slug || "fitscope"}`,
        "cache-control": "no-store",
      });
      res.end();
      return;
    }
    if (workspace && requestedSlug && requestedSlug !== workspace.company.slug) {
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
        location: workspace ? `/dashboard/${workspace.company.slug || "fitscope"}` : "/dashboard/setup",
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
