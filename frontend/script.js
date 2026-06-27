const API_BASE = location.protocol === "file:" ? "http://localhost:5176" : "";

const fallbackDashboard = {
  owner: {
    name: "张老板",
    phone: "",
    reportTime: "每天上午9点",
  },
  company: {
    id: "company_fitscope",
    slug: "fitscope",
    name: "顺达机械",
    industry: "本地工厂设备维护",
    website: "https://shunda.qixiaobang.cn",
    mood: "AI员工正在替公司推进今天的经营任务",
  },
  metrics: [
    { id: "factory_map", label: "工厂客户地图", value: "先打老客户和周边园区", hint: "按设备停机风险排优先级", tone: "opportunity" },
    { id: "service_offer", label: "巡检报价战场", value: "基础/标准/托管三档", hint: "客户能一眼选方案", tone: "judgement" },
    { id: "callback_assets", label: "回访材料", value: "微信话术+巡检说明", hint: "先问运行情况，再给方案", tone: "asset" },
    { id: "budget_guardrail", label: "试跑预算", value: "¥480可用", hint: "先验证回访和报价转化", tone: "money" },
  ],
  agents: [
    { id: "agent_boss", role: "总经理AI", plainRole: "帮老板定顺序", status: "正在安排今天最重要的三件事", progress: 76 },
    { id: "agent_sales", role: "销售AI", plainRole: "找客户、写话术", status: "已整理10个工业园客户线索", progress: 68 },
    { id: "agent_writer", role: "文案AI", plainRole: "写官网、朋友圈、短信", status: "已写好一版设备巡检介绍", progress: 84 },
    { id: "agent_finance", role: "财务AI", plainRole: "提醒收款和成本", status: "等待老板开通收款方式", progress: 42 },
  ],
  tasks: [
    {
      id: "task_quote",
      title: "确认一版服务报价",
      body: "AI建议把设备巡检分成基础、标准、全年托管三档，方便客户快速选择。",
      owner: "总经理AI",
      status: "待老板确认",
      priority: "今天",
      nextStep: "点同意后，AI会整理成可发给客户的报价单。",
    },
    {
      id: "task_callback",
      title: "给老客户发一条回访消息",
      body: "内容已经写好：先问设备运行情况，再自然介绍新的巡检服务。",
      owner: "销售AI",
      status: "待老板确认",
      priority: "今天",
      nextStep: "可交给AI写出完整微信话术。",
    },
    {
      id: "task_leads",
      title: "整理10个附近工业园客户",
      body: "AI会列出公司名称、可能需求和推荐开场白，方便销售直接打电话。",
      owner: "销售AI",
      status: "AI可先做",
      priority: "本周",
      nextStep: "老板同意后，AI继续补充客户名单。",
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
  ],
  inbox: {
    title: "官网草稿已经准备好",
    body: "AI已经整理了产品介绍、客户名单和两件待办。下一步建议先确认服务价格，再开通收款。",
  },
  socialDraft: {
    title: "老客户回访内容",
    body: "顺达机械可为本地工厂提供设备维护、备件供应和定期巡检服务，减少停机时间。",
    status: "草稿，未发送",
  },
  companies: [
    { id: "company_fitscope", slug: "fitscope", name: "顺达机械", industry: "本地工厂设备维护", isActive: true },
  ],
  updatedAt: "本地演示",
};

const setupDashboard = {
  requiresCompany: true,
  needsCompany: true,
  owner: {
    name: "老板",
    phone: "",
    reportTime: "每天上午9点",
  },
  company: null,
  companies: [],
  metrics: [
    { id: "setup_profile", label: "公司底稿", value: "待启动", hint: "先填名称和主营业务", tone: "asset" },
    { id: "setup_workspace", label: "经营工作区", value: "待生成", hint: "资料、任务、报告分开建", tone: "judgement" },
    { id: "setup_research", label: "第一轮调研", value: "待运行", hint: "创建后先跑客户和竞品资料", tone: "opportunity" },
    { id: "setup_enter", label: "进入看板", value: "自动切换", hint: "完成后直接进新公司", tone: "money" },
  ],
  agents: [],
  tasks: [
    {
      id: "setup_company",
      title: "创建自己的企业",
      body: "先填公司名称和主营业务，AI会为这家公司建立经营看板。",
      owner: "AI经营助手",
      status: "待老板填写",
      priority: "今天",
      nextStep: "点顶部“新建公司”，创建后直接进入自己的公司看板。",
    },
  ],
  documents: [],
  channels: [],
  activity: [
    { id: "setup_log", time: "刚刚", text: "老板账号已准备好，等待创建第一家公司。" },
  ],
  inbox: {
    title: "先创建自己的企业",
    body: "当前账号还没有企业。创建企业后，AI会开始建立公司档案、经营任务和资料目录。",
  },
  socialDraft: {
    title: "等待公司资料",
    body: "创建企业后，AI会按主营业务生成对外介绍和客户跟进内容。",
    status: "待创建",
  },
  updatedAt: "等待创建",
};

const terminalLines = [
  "> 老板经营入口已准备",
  "> 正在检查本地AI经营系统...",
  "> 已准备公司经营台",
  "> 已连接任务队列",
  "> 等待老板进入",
];

const modalCopy = {
  about: ["这是干什么的", "这是一个AI公司经营系统。老板只要确认关键事项，AI员工会持续整理客户、写材料、生成任务、准备官网和提醒下一步。"],
  doctrine: ["使用原则", "简单说三条：小事让AI先做；重要事老板确认；每天只看最该处理的几件事。"],
  faq: ["常见问题", "它不会替老板乱发消息、乱扣钱、乱改公司资料。涉及对外发送和收款，都需要老板确认。"],
  health: ["AI状态", "正在检查AI员工是否可以正常接活。"],
};

const els = {
  terminalLines: document.querySelector("#terminalLines"),
  loginView: document.querySelector("#loginView"),
  productView: document.querySelector("#productView"),
  loginForm: document.querySelector("#loginForm"),
  demoLoginTop: document.querySelector("#demoLoginTop"),
  authTitle: document.querySelector("#authTitle"),
  authName: document.querySelector("#authName"),
  authAccount: document.querySelector("#authAccount"),
  authPhone: document.querySelector("#authPhone"),
  authPassword: document.querySelector("#authPassword"),
  authSubmit: document.querySelector("#authSubmit"),
  authHint: document.querySelector("#authHint"),
  authModeButtons: document.querySelectorAll(".auth-tabs [data-auth-mode]"),
  companySlug: document.querySelector("#companySlug"),
  companyName: document.querySelector("#companyName"),
  companyMood: document.querySelector("#companyMood"),
  dashboard: document.querySelector("#dashboard"),
  updatedAt: document.querySelector("#updatedAt"),
  metricGrid: document.querySelector("#metricGrid"),
  creationPanel: document.querySelector("#creationPanel"),
  focusList: document.querySelector("#focusList"),
  agentList: document.querySelector("#agentList"),
  taskList: document.querySelector("#taskList"),
  docList: document.querySelector("#docList"),
  channelList: document.querySelector("#channelList"),
  socialDraft: document.querySelector("#socialDraft"),
  activityList: document.querySelector("#activityList"),
  runCycleButton: document.querySelector("#runCycleButton"),
  refreshDashboard: document.querySelector("#refreshDashboard"),
  healthButton: document.querySelector("#healthButton"),
  appShell: document.querySelector("#appShell"),
  menuButton: document.querySelector("#menuButton"),
  menuPopover: document.querySelector("#menuPopover"),
  closeChat: document.querySelector("#closeChat"),
  chatPanel: document.querySelector("#chatPanel"),
  agentConsole: document.querySelector(".agent-console"),
  openInbox: document.querySelector("#openInbox"),
  composer: document.querySelector("#composer"),
  chatInput: document.querySelector("#chatInput"),
  sendButton: document.querySelector("#sendButton"),
  quickActionButtons: document.querySelectorAll("[data-quick]"),
  agentStatus: document.querySelector("#agentStatus"),
  agentMessages: document.querySelector("#agentMessages"),
  clearConversation: document.querySelector("#clearConversation"),
  imageInput: document.querySelector("#imageInput"),
  modalBackdrop: document.querySelector("#modalBackdrop"),
  modalTitle: document.querySelector("#modalTitle"),
  modalBody: document.querySelector("#modalBody"),
  modalClose: document.querySelector("#modalClose"),
  documentDrawerBackdrop: document.querySelector("#documentDrawerBackdrop"),
  documentDrawerClose: document.querySelector("#documentDrawerClose"),
  documentDrawerTitle: document.querySelector("#documentDrawerTitle"),
  documentDrawerType: document.querySelector("#documentDrawerType"),
  documentDrawerMeta: document.querySelector("#documentDrawerMeta"),
  documentDrawerBody: document.querySelector("#documentDrawerBody"),
  copyDocumentButton: document.querySelector("#copyDocumentButton"),
  improveDocumentButton: document.querySelector("#improveDocumentButton"),
  toastRegion: document.querySelector("#toastRegion"),
  logoutButton: document.querySelector("#logoutButton"),
};

let dashboardState = fallbackDashboard;
let agentBusy = false;
let agentConnected = false;
let passiveTimer = null;
let modalCopyText = "";
let drawerCopyText = "";
let drawerDocumentId = "";
let currentView = "today";
let conversationMessages = [];
let conversationCompanyId = "";
let authMode = "login";
let companyCreationBusy = false;
let creationMotion = {
  jobId: "",
  companyName: "",
  events: [],
  tick: 0,
  lastEventAt: 0,
  lastStepId: "",
};
const compactViewport = window.matchMedia("(max-width: 980px)");

function needsCompanySetup(data = dashboardState) {
  return Boolean(data?.requiresCompany || data?.needsCompany || !data?.company);
}

function displayCompany(data = dashboardState) {
  if (!needsCompanySetup(data) && data?.company) return data.company;
  return {
    id: "",
    slug: "setup",
    name: "创建企业",
    industry: "还没有绑定企业",
    website: "",
    slogan: "",
    mood: "先创建自己的企业，AI会为这家公司建立独立经营看板。",
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function plainSnippet(value, max = 92) {
  const text = String(value || "")
    .replace(/[#*_`>|-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function documentCardMeta(doc) {
  const type = String(doc?.type || "经营资料").trim();
  const title = String(doc?.title || "");
  const source = `${type} ${title}`;
  const summary =
    plainSnippet(doc?.summary, 96) ||
    (source.includes("竞品") || source.includes("竞争")
      ? "跟踪竞品动作、价格变化和市场机会，便于老板判断下一步打法。"
      : source.includes("客户") || source.includes("销售")
        ? "沉淀客户线索、跟进优先级和可直接执行的销售动作。"
        : source.includes("计划") || source.includes("90")
          ? "把公司近期重点拆成阶段目标、关键任务和负责人安排。"
          : source.includes("简报") || source.includes("报告")
            ? "汇总当前经营判断、风险提醒和需要老板拍板的事项。"
            : "已整理成可打开查看的经营资料，可继续扩写、复制或交给AI更新。");
  const label =
    source.includes("报告") || source.includes("简报")
      ? "报告"
      : source.includes("客户") || source.includes("名单")
        ? "客户"
        : source.includes("方案") || source.includes("报价")
          ? "方案"
          : source.includes("计划")
            ? "计划"
            : type.slice(0, 4) || "资料";
  const tone =
    label === "报告" ? "report" : label === "客户" ? "leads" : label === "方案" ? "proposal" : label === "计划" ? "plan" : "asset";
  return { type, label, summary, tone };
}

function renderInlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/\*/g, "")
    .replace(/(^|\s)#{1,6}\s*/g, "$1");
}

function renderListText(value) {
  const html = renderInlineMarkdown(value);
  const category = html.match(/^(第[一二三四五六七八九十]+类[：:：是]?[^，,。；;：:]{0,18})([，,。；;：:]?)([\s\S]*)$/);
  if (category) return `<strong>${category[1].replace(/[：:是]$/, "")}</strong>${category[2] || "："}${category[3] || ""}`;
  const labeled = html.match(/^([^：:]{2,16})[：:]\s*([\s\S]+)$/);
  if (labeled) return `<strong>${labeled[1]}</strong>：${labeled[2]}`;
  return html;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeMessageStructure(value, sectionNames) {
  let text = String(value || "").replace(/\r\n/g, "\n").trim();
  const headings = [
    ...sectionNames,
    "先看结论",
    "结论",
    "经营判断",
    "现在局面",
    "一句话判断",
    "战情摘要",
    "机会清单",
    "机会和卡点",
    "客户入口",
    "客户切口",
    "成交动作",
    "成交战场",
    "报价和交付",
    "资料弹药",
    "已推进的事",
    "可直接使用的东西",
    "依据和信号",
    "关键依据",
    "执行安排",
    "员工今天做什么",
    "谁来推进",
    "老板确认项",
    "需要您决定",
    "待核验事项",
    "风险边界",
    "别踩的坑",
    "验收信号",
    "本周节奏",
    "本周打法",
    "我查到的情况",
    "关键问题",
    "今天发现的问题",
    "本周动作",
    "本周建议",
    "员工安排",
    "资料和报告",
    "下一步",
    "待老板确认",
    "需要补充",
    "风险和提醒",
    "风险提醒",
  ];
  for (const heading of headings) {
    const pattern = new RegExp(`(^|[\\n。！？!?])\\s*(${escapeRegExp(heading)})[。:：]?\\s*`, "g");
    text = text.replace(pattern, (match, prefix, title) => `${prefix}\n\n${title}\n`);
  }
  text = text
    .replace(/([。！？!?；;])\s*(第[一二三四五六七八九十]+[，、])/g, "$1\n$2")
    .replace(/([。！？!?；;])\s*([一二三四五六七八九十]+[、.]\s*)/g, "$1\n$2")
    .replace(/([。！？!?；;])\s*(\d+[.、)]\s*)/g, "$1\n$2")
    .replace(/(\S[。！？!?；;])\s*(\d+[.、)]\s*)/g, "$1\n$2")
    .replace(/\n{3,}/g, "\n\n");
  return text;
}

function paragraphChunks(line) {
  const sentences = line.match(/[^。！？!?；;]+[。！？!?；;]?/g)?.map((item) => item.trim()).filter(Boolean) || [];
  if (line.length < 120 || sentences.length <= 2) return [line];
  const chunks = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && `${current}${sentence}`.length > 110) {
      chunks.push(current);
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function renderMessageText(value) {
  const sectionNames = [
    "老板先看结论",
    "先看结论",
    "马上行动清单",
    "可直接复制",
    "需要老板确认",
    "待老板确认",
    "下一步动作",
    "下一步",
    "已经整理好的内容",
    "已经放进资料库",
    "建议先做",
    "本次完成",
    "执行过程",
    "竞争对手动向",
    "行业机会",
    "我的判断",
    "经营判断",
    "现在局面",
    "一句话判断",
    "战情摘要",
    "机会清单",
    "机会和卡点",
    "客户入口",
    "客户切口",
    "成交动作",
    "成交战场",
    "报价和交付",
    "资料弹药",
    "已推进的事",
    "可直接使用的东西",
    "依据和信号",
    "关键依据",
    "执行安排",
    "员工今天做什么",
    "谁来推进",
    "老板确认项",
    "需要您决定",
    "待核验事项",
    "风险边界",
    "别踩的坑",
    "验收信号",
    "本周节奏",
    "本周打法",
    "我查到的情况",
    "关键问题",
    "今天发现的问题",
    "具体动作",
    "本周动作",
    "本周建议",
    "员工安排",
    "资料和报告",
    "风险提醒",
    "风险和提醒",
    "需要补充",
  ];
  const lines = normalizeMessageStructure(value, sectionNames).split("\n");
  const html = [];
  let listType = "";
  let inCodeBlock = false;
  let codeLines = [];
  let sectionOpen = false;

  function closeList() {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = "";
  }

  function closeSection() {
    closeList();
    if (!sectionOpen) return;
    html.push("</section>");
    sectionOpen = false;
  }

  function openSection(title) {
    closeSection();
    sectionOpen = true;
    html.push(`<section class="message-section"><p class="message-heading">${renderInlineMarkdown(title)}</p>`);
  }

  function openList(type) {
    if (listType === type) return;
    closeList();
    listType = type;
    html.push(`<${type}>`);
  }

  function flushCode() {
    closeList();
    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    codeLines = [];
    inCodeBlock = false;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (/^```/.test(line)) {
      if (inCodeBlock) flushCode();
      else {
        closeList();
        inCodeBlock = true;
        codeLines = [];
      }
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(rawLine);
      continue;
    }
    if (!line) {
      closeList();
      continue;
    }

    const heading = line.match(/^#{1,4}\s*(\S.+)$/);
    const boldHeading = line.match(/^\*\*(.+)\*\*$/) || line.match(/^__(.+)__$/);
    const sectionHeading = line.match(new RegExp(`^(?:[一二三四五六七八九十]+[、.]|\\d+[、.])?\\s*(${sectionNames.join("|")})\\s*[:：]?$`));
    const sectionWithText = line.match(new RegExp(`^(?:[一二三四五六七八九十]+[、.]|\\d+[、.])?\\s*(${sectionNames.join("|")})\\s*[:：]\\s*(.+)$`));
    const inferredHeading = line.length <= 18 && /判断|结论|问题|动作|建议|安排|资料|报告|风险|确认|机会|执行|复盘|局面|战情|客户|成交|报价|交付|卡点|信号|边界|打法|拍板/.test(line);
    const bullet = line.match(/^[-*•]\s+(.+)$/);
    const numbered = line.match(/^\d+[.、)]\s+(.+)$/);
    const chineseNumbered = line.match(/^[一二三四五六七八九十]+[、.]\s*(.+)$/);
    const quote = line.match(/^>\s+(.+)$/);

    if (sectionWithText) {
      openSection(sectionWithText[1]);
      html.push(`<p>${renderInlineMarkdown(sectionWithText[2])}</p>`);
    } else if (sectionHeading) {
      openSection(sectionHeading[1]);
    } else if (heading) {
      openSection(heading[1]);
    } else if (boldHeading) {
      openSection(boldHeading[1]);
    } else if (bullet) {
      openList("ul");
      html.push(`<li>${renderListText(bullet[1])}</li>`);
    } else if (numbered) {
      openList("ol");
      html.push(`<li>${renderListText(numbered[1])}</li>`);
    } else if (chineseNumbered) {
      openList("ol");
      html.push(`<li>${renderListText(chineseNumbered[1])}</li>`);
    } else if (inferredHeading) {
      openSection(line);
    } else if (quote) {
      closeList();
      html.push(`<blockquote>${renderInlineMarkdown(quote[1])}</blockquote>`);
    } else {
      closeList();
      for (const chunk of paragraphChunks(line)) {
        html.push(`<p>${renderInlineMarkdown(chunk)}</p>`);
      }
    }
  }

  closeSection();
  if (inCodeBlock && codeLines.length) flushCode();
  return html.join("");
}

function fetchJson(path, options = {}) {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-qxb-local": "1",
      ...(options.headers || {}),
    },
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      if (response.status === 401 && !path.startsWith("/api/auth/")) {
        redirectToLogin("登录已过期，请重新输入账号密码。");
      }
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data;
  });
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function renderTerminal() {
  if (!els.terminalLines) return;
  els.terminalLines.innerHTML = terminalLines
    .slice(-9)
    .map((line) => `<div class="terminal-line">${escapeHtml(line)}</div>`)
    .join("");
}

function pushLog(line) {
  terminalLines.push(line);
  renderTerminal();
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  els.toastRegion.appendChild(node);
  window.setTimeout(() => node.remove(), 3200);
}

function conversationGreeting() {
  if (needsCompanySetup()) {
    return "当前账号还没有企业。请先新建公司，填写公司名称和主营业务。系统会为这家公司建立独立经营看板、AI员工和今日任务。";
  }
  const company = displayCompany();
  const tasks = dashboardState.tasks || [];
  const firstTask = tasks[0]?.title ? `今天建议先处理：${tasks[0].title}。` : "今天会先整理最重要的经营事项。";
  const kind = companyKind(company);
  const examples =
    kind === "investment"
      ? "整理项目源、项目跟进、投资方案或尽调安排"
      : kind === "trade"
        ? "整理采购客户、询价回复、报价单或发货回款"
        : "整理客户、跟进话术、方案报价或员工安排";
  return `已进入${company.name || "公司"}经营工作区。${firstTask}可以直接下达任务：${examples}。`;
}

function isNearMessageBottom() {
  const list = els.agentMessages;
  if (!list) return true;
  return list.scrollHeight - list.scrollTop - list.clientHeight < 96;
}

function scrollConversationToBottom() {
  const list = els.agentMessages;
  if (!list) return;
  window.requestAnimationFrame(() => {
    list.scrollTop = list.scrollHeight;
  });
}

function renderConversation({ forceScroll = false } = {}) {
  const list = els.agentMessages;
  if (!list) return;
  const shouldStickToBottom = forceScroll || isNearMessageBottom();
  const previousScrollTop = list.scrollTop;
  list.innerHTML = conversationMessages
    .map(
      (item) => `<article class="message ${item.role} ${item.state || ""}">
        <div class="message-meta">
          <span>${escapeHtml(item.role === "user" ? "老板" : "AI经营助手")}</span>
          <span>${escapeHtml(item.time || "")}</span>
        </div>
        <div class="message-body">${renderMessageText(item.text)}</div>
      </article>`,
    )
    .join("");
  if (shouldStickToBottom) {
    scrollConversationToBottom();
  } else {
    window.requestAnimationFrame(() => {
      list.scrollTop = previousScrollTop;
    });
  }
}

function addConversationMessage(role, text, state = "") {
  const message = {
    id: `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    role,
    text,
    state,
    time: new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()),
  };
  conversationMessages.push(message);
  conversationMessages = conversationMessages.slice(-24);
  renderConversation({ forceScroll: true });
  return message.id;
}

function updateConversationMessage(messageId, patch) {
  const shouldStickToBottom = isNearMessageBottom();
  conversationMessages = conversationMessages.map((item) => (item.id === messageId ? { ...item, ...patch } : item));
  renderConversation({ forceScroll: shouldStickToBottom });
}

function ensureConversationGreeting() {
  if (conversationMessages.length) return;
  addConversationMessage("agent", conversationGreeting());
}

function showLogin() {
  els.loginView.classList.remove("hidden");
  els.productView.classList.add("hidden");
  els.loginView.hidden = false;
  els.productView.hidden = true;
  setAuthMode("login");
  document.body.classList.remove("dashboard-ready");
  if (passiveTimer) {
    window.clearInterval(passiveTimer);
    passiveTimer = null;
  }
}

function showProduct() {
  els.loginView.classList.add("hidden");
  els.productView.classList.remove("hidden");
  els.loginView.hidden = true;
  els.productView.hidden = false;
  els.appShell.classList.toggle("chat-open", !compactViewport.matches);
  document.body.classList.add("dashboard-ready");
}

function redirectToLogin(message) {
  showLogin();
  if (location.pathname !== "/login") history.replaceState(null, "", "/login");
  if (message) toast(message);
}

function setDashboardView(view) {
  currentView = view === "settings" ? "tasks" : view || "today";
  els.dashboard.dataset.view = currentView;
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    const views = String(panel.dataset.viewPanel || "").split(/\s+/);
    panel.hidden = !views.includes(currentView);
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === currentView);
  });
}

function renderDashboard(data) {
  dashboardState = data || setupDashboard;
  const setupMode = needsCompanySetup(dashboardState);
  const company = displayCompany(dashboardState);
  const metrics = dashboardState.metrics || [];
  const agents = dashboardState.agents || [];
  const tasks = dashboardState.tasks || [];
  const documents = dashboardState.documents || [];
  const channels = dashboardState.channels || [];
  const activity = dashboardState.activity || [];
  const socialDraft = dashboardState.socialDraft || setupDashboard.socialDraft;
  const updatedAt = dashboardState.updatedAt;
  const activeConversationId = setupMode ? "setup" : company.id;
  if (activeConversationId && conversationCompanyId !== activeConversationId) {
    conversationCompanyId = activeConversationId;
    conversationMessages = [];
  }

  els.companySlug.textContent = `/dashboard/${company.slug || "fitscope"}`;
  const topbarBrand = document.querySelector(".topbar .brand");
  if (topbarBrand) {
    topbarBrand.href = `/dashboard/${company.slug || "fitscope"}`;
    topbarBrand.setAttribute("aria-label", `${company.name || "公司"}经营看板`);
  }
  document.body.classList.toggle("needs-company", setupMode);
  document.querySelector(".brand > span").textContent = company.name || "创建企业";
  els.companyName.textContent = company.name || "创建企业";
  els.companyMood.textContent = company.mood || "先创建自己的企业，AI会为这家公司建立独立经营看板。";
  if (els.updatedAt) els.updatedAt.textContent = `更新：${updatedAt || "刚刚"}`;
  els.runCycleButton.textContent = setupMode ? "创建企业" : "让AI继续干活";
  updateQuickActions(company);

  if (els.metricGrid) {
    els.metricGrid.innerHTML = metrics
      .map(
        (item) => `<article class="metric-card" data-tone="${escapeHtml(String(item.tone || "work").replace(/[^a-z0-9_-]/gi, ""))}">
        <span class="metric-label">${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.value)}</strong>
        <small>${escapeHtml(item.hint)}</small>
      </article>`,
      )
      .join("");
  }

  if (els.focusList) {
    els.focusList.innerHTML = tasks
      .slice(0, 3)
      .map((task) => `<li><strong>${escapeHtml(task.title)}</strong><span>${escapeHtml(task.nextStep || task.body)}</span></li>`)
      .join("");
  }

  els.agentList.innerHTML = agents.length
    ? agents
      .map(
        (agent) => `<article class="agent-card">
        <div>
          <strong>${escapeHtml(agent.role)}</strong>
          <span>${escapeHtml(agent.plainRole)}</span>
        </div>
        <p>${escapeHtml(agent.status)}</p>
        <div class="progress" aria-label="${escapeHtml(agent.role)}进度">
          <span style="width:${Math.max(0, Math.min(100, Number(agent.progress) || 0))}%"></span>
        </div>
      </article>`,
      )
      .join("")
    : `<article class="agent-card setup-card">
        <div>
          <strong>等待组建AI管理层</strong>
          <span>创建企业后自动生成</span>
        </div>
        <p>系统会按主营业务安排总经理、销售、市场、运营和财务角色。</p>
      </article>`;

  els.taskList.innerHTML = setupMode
    ? `<article class="task-card setup-card" tabindex="0">
        <div class="task-top">
          <strong>创建自己的企业</strong>
          <span class="tag urgent">今天</span>
        </div>
        <p>新账号不会进入别人的公司。填好企业名称和主营业务后，AI会建立独立经营看板。</p>
        <div class="task-actions"><button type="button" data-modal="newCompany">新建公司</button></div>
      </article>`
    : tasks
      .map(
        (task) => `<article class="task-card" data-task="${escapeHtml(task.id)}" tabindex="0">
        <div class="task-top">
          <strong>${escapeHtml(task.title)}</strong>
          <span class="tag ${task.priority === "今天" ? "urgent" : ""}">${escapeHtml(task.priority)}</span>
        </div>
        <p>${escapeHtml(task.body)}</p>
        <div class="task-meta">
          <span>${escapeHtml(task.owner)}</span>
          <span>${escapeHtml(task.status)}</span>
        </div>
        <div class="task-actions" aria-label="处理这个事项">
          <button type="button" data-task-choice="confirm" data-task-id="${escapeHtml(task.id)}">同意</button>
          <button type="button" data-task-choice="agent" data-task-id="${escapeHtml(task.id)}">交给AI</button>
          <button type="button" data-task-choice="pause" data-task-id="${escapeHtml(task.id)}">先不做</button>
        </div>
      </article>`,
      )
      .join("");

  els.docList.innerHTML = documents.length
    ? documents
      .map((doc) => {
        const meta = documentCardMeta(doc);
        const title = doc.title || "未命名资料";
        return `<button class="doc-button" type="button" data-doc="${escapeHtml(doc.id)}" data-tone="${escapeHtml(meta.tone)}" aria-label="打开${escapeHtml(title)}">
        <span class="doc-icon">${escapeHtml(meta.label)}</span>
        <span class="doc-content">
          <span class="doc-type">${escapeHtml(meta.type)}</span>
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(meta.summary)}</small>
        </span>
        <span class="doc-meta">${escapeHtml(doc.age || "刚刚")}</span>
      </button>`;
      })
      .join("")
    : `<article class="soft-card compact"><strong>资料待生成</strong><p>创建企业后，AI会生成公司档案、销售打法、90天计划和今日简报。</p></article>`;

  els.channelList.innerHTML = channels.length
    ? channels
      .map(
        (channel) => `<article class="channel-card">
        <strong>${escapeHtml(channel.name)}</strong>
        <span>${escapeHtml(channel.status)}</span>
        <button class="bevel" type="button" data-channel-action="${escapeHtml(channel.id)}">${escapeHtml(channel.action)}</button>
      </article>`,
      )
      .join("")
    : `<article class="channel-card"><strong>获客渠道待建立</strong><span>创建企业后按业务生成</span><button class="bevel" type="button" data-modal="newCompany">新建公司</button></article>`;

  els.socialDraft.innerHTML = `<p><strong>${escapeHtml(socialDraft.title)}</strong></p>
    <p>${escapeHtml(socialDraft.body)}</p>
    <p class="meta">${escapeHtml(socialDraft.status)}</p>
    <button class="bevel" type="button" ${setupMode ? 'data-modal="newCompany"' : 'data-action="tweet"'}>${setupMode ? "新建公司" : "准备发布"}</button>`;

  els.activityList.innerHTML = activity
    .map((item) => `<article class="activity-item"><span>${escapeHtml(item.time)}</span><p>${escapeHtml(item.text)}</p></article>`)
    .join("");

  setDashboardView(currentView);
  ensureConversationGreeting();
}

async function loadDashboard({ quiet = false } = {}) {
  try {
    const data = await fetchJson("/api/dashboard");
    renderDashboard(data.dashboard);
    if (!quiet) toast("经营看板已更新");
    pushLog("> 已刷新公司经营台");
  } catch (error) {
    renderDashboard(fallbackDashboard);
    if (!quiet) toast("经营服务暂时不可用，已显示本地数据");
    pushLog("> 经营服务暂时不可用，显示本地数据");
  }
}

function setAuthMode(mode) {
  authMode = mode === "register" ? "register" : "login";
  els.loginForm.dataset.authMode = authMode;
  els.authModeButtons.forEach((button) => {
    const active = button.dataset.authMode === authMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  els.authTitle.textContent = authMode === "register" ? "注册老板账号" : "账号登录";
  els.authSubmit.textContent = authMode === "register" ? "注册并进入" : "进入经营台";
  els.authHint.textContent = "";
  els.authPassword.setAttribute("autocomplete", authMode === "register" ? "new-password" : "current-password");
}

async function submitAuth() {
  const account = els.authAccount.value.trim();
  const password = els.authPassword.value.trim();
  if (account.length < 3) {
    toast("账号至少填写3个字符");
    els.authAccount.focus();
    return;
  }
  if (password.length < 6) {
    toast("密码至少填写6位");
    els.authPassword.focus();
    return;
  }
  const submitButton = els.authSubmit;
  const oldText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = authMode === "register" ? "正在注册..." : "正在登录...";
  try {
    const payload = { account, password };
    if (authMode === "register") {
      payload.name = els.authName.value.trim() || "老板";
      payload.phone = els.authPhone.value.trim();
    }
    const data = await fetchJson(authMode === "register" ? "/api/auth/register" : "/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    showProduct();
    renderDashboard(data.dashboard);
    history.replaceState(null, "", data.redirectTo || "/dashboard/fitscope");
    pushLog(authMode === "register" ? "> 老板账号已创建并进入经营台" : "> 老板已登录公司经营台");
    if (needsCompanySetup(data.dashboard)) {
      toast(authMode === "register" ? "注册成功，请创建自己的企业" : "请先创建自己的企业");
      window.setTimeout(() => openModal("newCompany"), 120);
    } else {
      toast(authMode === "register" ? "注册成功" : "登录成功");
    }
    await checkAIBridge();
    startPassiveLogs();
  } catch (error) {
    redirectToLogin(error.message || "登录失败，请检查账号和密码。");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = oldText;
  }
}

function moneyMetric() {
  return dashboardState.metrics?.find((item) => item.id === "budget_guardrail" || item.label === "本月预算" || item.label === "试跑预算" || item.label === "预算边界")?.value || "¥0";
}

function companyKind(company) {
  const text = `${company?.name || ""} ${company?.industry || ""} ${company?.slogan || ""}`;
  if (/投资|资本|基金|股权|融资|并购|投行|资产|财务顾问/.test(text)) return "investment";
  if (/贸易|批发|供应链|进出口|经销|代理/.test(text)) return "trade";
  if (/门店|零售|餐饮|美容|服装|超市|酒店|民宿/.test(text)) return "retail";
  if (/设备|机械|工厂|制造|维修|巡检|生产/.test(text)) return "industrial";
  return "general";
}

function quickActionsForCompany(company) {
  if (needsCompanySetup()) {
    return [
      ["经营检查", "", "cycle"],
      ["填公司资料", "我需要填写公司名称和主营业务"],
      ["看创建流程", "告诉我创建企业后会生成什么"],
      ["准备资料", "我应该先准备哪些企业资料"],
    ];
  }
  const kind = companyKind(company);
  if (kind === "investment") {
    return [
      ["经营检查", "", "cycle"],
      ["找项目源", "帮我整理20个可能适合投资或合作的项目来源渠道。每个渠道要写清楚来源类型、为什么可能有项目、该找什么人、第一句话怎么说、下一步怎么跟进，并给我本周优先级。"],
      ["看竞争", "帮我监控同类投资机构和替代方案的动向，给我一份本周应对报告。报告要说明它们会抢走什么项目或资源、对我们项目源和估值判断有什么影响、我本周该安排谁做什么。"],
      ["看机会", "帮我观察投资行业的发展机会，告诉我这家公司本周应该抓什么。请按机会、为什么现在值得看、适合我们的原因、本周验证动作、风险和需要我拍板的事项来写。"],
    ];
  }
  if (kind === "trade") {
    return [
      ["经营检查", "", "cycle"],
      ["找采购客户", "帮我整理16个可能采购公司产品的客户类型或渠道。每个都要写清楚采购理由、决策人方向、首句开场白、报价或交期要注意什么、本周下一步。"],
      ["看竞争", "帮我监控同行批发商、代理商和线上供应链平台的动向，给我本周应对报告。报告要连接到价格、交期、付款条件、客户预期和我们的反制动作。"],
      ["看机会", "帮我观察贸易和供应链行业的发展机会，告诉我本周该抓什么。请给出客户切口、报价打法、交付风险、回款安排和一周验证方法。"],
    ];
  }
  return [
    ["经营检查", "", "cycle"],
    ["找10个客户", "帮我整理10个适合公司业务的潜在客户类型或来源。每个都要写清楚为什么可能需要我们、谁能拍板、第一句话怎么说、下一步怎么跟进、本周优先级。"],
    ["看竞争", "帮我监控竞争对手和替代方案的动向，给我本周应对报告。报告要说明对获客、报价、交付、客户信任和回款的影响，并给出我本周该安排的动作。"],
    ["看机会", "帮我观察整个行业的发展机会，告诉我这家公司本周应该抓什么。请按客户痛点、为什么现在值得做、最小验证动作、负责人、风险和需要我确认的事项来写。"],
  ];
}

function updateQuickActions(company) {
  quickActionsForCompany(company).forEach(([label, prompt, action], index) => {
    const button = els.quickActionButtons[index];
    if (!button) return;
    button.textContent = label;
    button.dataset.quick = prompt;
    if (action) button.dataset.quickAction = action;
    else delete button.dataset.quickAction;
  });
}

function setModal(title, bodyHtml, key = "") {
  els.modalTitle.textContent = title;
  els.modalBody.innerHTML = bodyHtml;
  els.modalBackdrop.dataset.current = key;
  els.modalBackdrop.hidden = false;
  els.menuPopover.classList.remove("open");
  els.menuButton.setAttribute("aria-expanded", "false");
}

function companyForm(mode) {
  const company = needsCompanySetup() ? displayCompany() : dashboardState.company || fallbackDashboard.company;
  const isNew = mode === "new";
  return `<form class="modal-form" data-form="company" data-mode="${isNew ? "new" : "settings"}">
    <label>公司名称<input name="name" value="${escapeHtml(isNew ? "" : company.name || "")}" placeholder="例如：顺为投资" required /></label>
    <label>主营业务<input name="industry" value="${escapeHtml(isNew ? "" : company.industry || "")}" placeholder="例如：投资管理、设备维修、门店零售、贸易批发" required /></label>
    <label>官网或联系方式<input name="website" value="${escapeHtml(isNew ? "" : company.website || "")}" placeholder="可填网址、电话或微信号" /></label>
    <label>一句话介绍<textarea name="slogan" rows="3" placeholder="用一句话说明公司最能帮客户解决什么问题">${escapeHtml(isNew ? "" : company.slogan || "")}</textarea></label>
    <div class="modal-actions">
      <button class="god-mode" type="submit">${isNew ? "保存并进入新公司" : "保存公司资料"}</button>
    </div>
  </form>`;
}

function ownerForm() {
  const owner = dashboardState.owner || fallbackDashboard.owner;
  return `<form class="modal-form" data-form="owner">
    <label>老板姓名<input name="name" value="${escapeHtml(owner.name || "")}" required /></label>
    <label>手机或邮箱<input name="phone" value="${escapeHtml(owner.phone || "")}" placeholder="用于系统记录，不会自动外发" /></label>
    <label>每天汇报时间<input name="reportTime" value="${escapeHtml(owner.reportTime || "每天上午9点")}" placeholder="例如：每天上午9点" /></label>
    <div class="modal-actions">
      <button class="god-mode" type="submit">保存老板资料</button>
    </div>
  </form>`;
}

function documentText(doc) {
  const company = displayCompany();
  const kind = companyKind(company);
  if (doc.id.includes("competitor_watch")) {
    const targets =
      kind === "investment"
        ? ["本地财务顾问机构", "产业基金平台", "券商投行团队"]
        : kind === "trade"
          ? ["同城批发商", "区域代理商", "线上供应链平台"]
          : kind === "industrial"
            ? ["本地维修服务商", "设备原厂售后", "备件经销商"]
            : ["同城同行商家", "线上平台服务商", "老客户转介绍团队"];
    return `${company.name}竞争对手动向报告

老板先看结论
不要急着跟竞争对手打价格战。先把客户为什么选我们、我们能承诺什么、销售怎么跟进讲清楚。

本周重点观察
1. ${targets[0]}：看它怎么获客、怎么报价、怎么承诺交付。
   我们动作：把自己的报价边界、响应速度和案例准备好。
2. ${targets[1]}：看它是否在扩大渠道、打包服务或压低价格。
   我们动作：把客户分层，不要把好客户和低价客户混在一起跟。
3. ${targets[2]}：看它是否用线上内容或标准套餐抢客户。
   我们动作：准备一页对外介绍，让销售可以当天发给客户。

马上行动清单
1. 销售跟进客户时记录客户提到的竞品、价格、交期、顾虑。
2. 资料负责人把公司优势写成一页纸，只写能做到的内容。
3. 老板每周看一次竞品压力，决定调报价、补案例，还是换客户。`;
  }
  if (doc.id.includes("industry_opportunity")) {
    const opportunity =
      kind === "investment"
        ? "项目方更需要资金、产业资源和融资节奏判断"
        : kind === "trade"
          ? "客户更在意稳定供货、清楚报价和确定交付"
          : kind === "industrial"
            ? "客户更希望减少停机、降低维修不确定性"
            : "客户更愿意选择能把方案、价格、交付说清楚的服务商";
    return `${company.name}行业机会报告

老板先看结论
行业机会不能只看趋势，要落到本周能验证的动作：找哪类客户、讲什么话、谁负责、几天看结果。

值得抓的机会
1. ${opportunity}
   本周动作：选3到5个客户验证需求，记录他们最关心的问题。
2. 把主营业务做成一页清楚介绍
   本周动作：写清服务/产品、适合谁、价格或合作方式、下一步怎么联系。
3. 建立固定复盘
   本周动作：每天记录客户反馈，每周看一次哪些话术、报价、渠道最有效。

需要老板确认
1. 先选一个机会做一周验证。
2. 指定销售或AI负责资料和跟进记录。
3. 约定复盘标准：多少客户回复、多少客户愿意继续聊、卡点是什么。`;
  }
  if (doc.id.includes("leads")) {
    if (kind === "investment") {
      return `${company.name}项目来源清单\n1. FA和财务顾问渠道\n2. 券商、律所、会计师事务所\n3. 产业园和创业服务机构\n4. 老合作伙伴转介绍\n建议话术：先说明关注方向和项目阶段，再约一次简短沟通。`;
    }
    if (kind === "trade") {
      return `${company.name}采购客户名单\n1. 老客户采购负责人\n2. 同行业渠道商\n3. 下游生产或门店客户\n建议话术：先问近期采购计划，再给清楚报价和交付周期。`;
    }
    return `${company.name}客户开发名单\n1. 附近工业园设备负责人\n2. 老客户采购负责人\n3. 同行业转介绍客户\n建议话术：先问设备最近运行是否稳定，再介绍巡检服务。`;
  }
  if (doc.id.includes("website") || doc.id.includes("site")) {
    return `${company.name}官网资料\n主营业务：${company.industry}\n一句话介绍：${company.slogan || "帮客户把重要经营事项处理好"}\n下一步：确认联系电话、服务范围和案例。`;
  }
  if (doc.id.includes("pay")) {
    return "收款开通清单\n1. 营业执照\n2. 法人或经办人信息\n3. 对公账户\n4. 微信/支付宝商户资料\n注意：正式开通前需要老板确认。";
  }
  if (doc.id.includes("plan_90d")) {
    return `${company.name}90天经营计划\n第1-7天：确认主营业务、客户画像、对外介绍和第一批跟进名单。\n第8-30天：跑通获客、报价、跟进、复盘和收款准备。\n第31-90天：形成周报、渠道、案例和固定经营节奏。\n老板先确认：主推业务、客户优先级、预算上限。`;
  }
  if (doc.id.includes("sales_playbook")) {
    return `${company.name}销售打法草稿\n第一句话：我们先帮客户把最急的问题讲清楚，再给一个能落地的方案。\n先问清楚：客户是谁、现在卡在哪里、预算和周期、谁能拍板。\n跟进节奏：当天记录，24小时发资料，3天二次跟进，一周给老板复盘。`;
  }
  const advice =
    kind === "investment"
      ? "先确认投资方向，再推进项目来源和对外介绍。"
      : kind === "trade"
        ? "先确认报价口径，再推进采购客户和回款准备。"
        : "先确认关键事项，再推进客户、资料和收款准备。";
  return `${company.name}今日经营简报\n今日待确认：${dashboardState.tasks?.slice(0, 3).map((task) => task.title).join("、") || "暂无"}\nAI建议：${advice}`;
}

function documentExpansion(doc) {
  const company = displayCompany();
  const tasks = (dashboardState.tasks || []).slice(0, 5);
  const kind = companyKind(company);
  const customerText =
    kind === "investment"
      ? "项目方、财务顾问、产业园、券商律所和老股东转介绍"
      : kind === "trade"
        ? "老客户采购负责人、下游渠道商、区域代理商和稳定采购客户"
        : "现有客户、附近潜在客户、转介绍客户和正在比较方案的客户";
  return `

经营背景
这份资料不是给老板看的摘要，而是给公司本周执行用的工作底稿。当前公司是${company.name}，主营业务是${company.industry || "待补充"}。真正要解决的问题不是“写一份好看的材料”，而是让销售、资料、运营和财务知道今天该往哪里用力，哪些事情可以先做，哪些事情必须等老板确认。

客户和机会判断
优先看的客户范围是：${customerText}。这些对象的共同点是，他们不是被宏大概念打动，而是被清楚的利益、风险边界、交付周期和付款安排打动。资料要讲清楚三件事：我们帮谁解决什么问题，为什么现在值得谈，下一步怎么进入具体沟通。

本周可以安排的动作
${tasks.length ? tasks.map((task, index) => `${index + 1}. ${task.title}：${task.body || task.nextStep || "先拆成可执行动作，再让负责人推进。"}负责人建议为${task.owner || "总经理AI"}，下一步是${task.nextStep || "老板确认后继续推进"}。`).join("\n") : "1. 先确认主营业务和客户画像。\n2. 让AI补一页对外介绍。\n3. 整理第一批客户或项目来源。\n4. 建立本周复盘表。"}

执行标准
1. 每一个动作都要能落到负责人，不能只停留在“关注一下”。
2. 每一份对外资料都要能给客户看，不能只写公司自己听得懂的话。
3. 每一个客户或项目来源都要记录下一步，不要只有名单没有跟进。
4. 每周至少复盘一次：哪些客户愿意继续聊，哪些话术有效，哪些报价或交付承诺需要老板拍板。

需要老板确认
1. 当前主推业务是否准确，如果不准确，先缩窄到一个最容易成交或最容易验证的场景。
2. 哪些内容可以对外承诺，哪些内容只能作为内部判断。
3. 本周允许AI和员工推进到什么程度：只整理资料，还是可以准备报价、联系名单和跟进话术。
4. 是否需要把这份资料继续扩成正式报告、客户名单、报价草稿或员工执行清单。`;
}

function completeDocumentText(doc, text) {
  const clean = String(text || "").trim() || documentText(doc);
  if (clean.length >= 700) return clean;
  return `${clean}${documentExpansion(doc)}`;
}

function renderDocumentContent(text) {
  return `<div class="drawer-report">${renderMessageText(text)}</div>`;
}

async function openDocumentDrawer(doc) {
  drawerDocumentId = doc.id;
  drawerCopyText = "";
  modalCopyText = "";
  els.documentDrawerTitle.textContent = doc.title || "资料和报告";
  els.documentDrawerType.textContent = doc.type || "资料";
  els.documentDrawerMeta.textContent = "正在读取完整报告";
  els.documentDrawerBody.innerHTML = `<div class="drawer-loading"><span></span><p>正在打开完整资料，不再只显示摘要。</p></div>`;
  els.copyDocumentButton.disabled = true;
  els.improveDocumentButton.disabled = true;
  els.documentDrawerBackdrop.hidden = false;
  try {
    const data = await fetchJson(`/api/documents/${encodeURIComponent(doc.id)}`);
    const detail = data.document || doc;
    drawerCopyText = completeDocumentText(detail, detail.content || detail.summary || "");
    modalCopyText = drawerCopyText;
    els.documentDrawerTitle.textContent = detail.title || doc.title || "资料和报告";
    els.documentDrawerType.textContent = detail.type || doc.type || "资料";
    els.documentDrawerMeta.textContent = `${drawerCopyText.length}字 · ${detail.age || doc.age || "刚刚"}`;
    els.documentDrawerBody.innerHTML = renderDocumentContent(drawerCopyText);
  } catch (error) {
    drawerCopyText = completeDocumentText(doc, documentText(doc));
    modalCopyText = drawerCopyText;
    els.documentDrawerMeta.textContent = `${drawerCopyText.length}字 · 已使用本地完整底稿`;
    els.documentDrawerBody.innerHTML = renderDocumentContent(drawerCopyText);
    toast(error.message || "完整资料读取失败，已显示本地底稿");
  } finally {
    els.copyDocumentButton.disabled = false;
    els.improveDocumentButton.disabled = false;
  }
}

function closeDocumentDrawer() {
  els.documentDrawerBackdrop.hidden = true;
  drawerCopyText = "";
  drawerDocumentId = "";
}

async function copyDrawerDocument() {
  if (!drawerCopyText) return;
  try {
    await navigator.clipboard.writeText(drawerCopyText);
    toast("报告全文已复制");
    pushLog("> 已复制资料报告全文");
  } catch {
    toast("复制失败，请手动选中内容复制");
  }
}

function improveDrawerDocument() {
  if (!drawerCopyText) return;
  const doc = dashboardState.documents.find((item) => item.id === drawerDocumentId);
  const title = doc?.title || "公司资料";
  const text = drawerCopyText;
  closeDocumentDrawer();
  runAICli(`请把这份资料继续扩写和优化成老板能直接拿来决策的正式报告，至少1200字，要有结论、依据、行动清单、负责人、时间安排、风险提醒和需要老板确认的事项：${title}\n\n${text}`);
}

function openModal(key, detail) {
  modalCopyText = "";
  if (key === "manageTasks") {
    if (needsCompanySetup()) {
      setModal("先创建企业", `<p>当前账号还没有企业。创建后，AI会自动生成今天要看的事项。</p>${companyForm("new")}`, "newCompany");
      return;
    }
    const tasks = dashboardState.tasks || [];
    setModal(
      "查看全部",
      `<p>这些事项都保留在看板里。老板只需要决定：同意、交给AI、还是先不做。</p>
      <div class="modal-list">
        ${tasks
          .map(
            (task) => `<article class="modal-item">
              <strong>${escapeHtml(task.title)}</strong>
              <p>${escapeHtml(task.body)}</p>
              <span class="meta">${escapeHtml(task.owner)} · ${escapeHtml(task.status)}</span>
              <div class="task-actions">
                <button type="button" data-task-choice="confirm" data-task-id="${escapeHtml(task.id)}">同意</button>
                <button type="button" data-task-choice="agent" data-task-id="${escapeHtml(task.id)}">交给AI</button>
                <button type="button" data-task-choice="pause" data-task-id="${escapeHtml(task.id)}">先不做</button>
              </div>
            </article>`,
          )
          .join("")}
      </div>`,
      key,
    );
    return;
  }
  if (key === "newCompany") {
    setModal("新建公司", `<p>填三项就够了，AI会按新公司重新整理经营任务。</p>${companyForm("new")}`, key);
    return;
  }
  if (key === "companySettings") {
    if (needsCompanySetup()) {
      setModal("先创建企业", `<p>当前账号还没有企业。先创建企业后，才能修改公司设置。</p>${companyForm("new")}`, "newCompany");
      return;
    }
    setModal("公司设置", `<p>改完后，看板、报告和AI提示都会按新资料更新。</p>${companyForm("settings")}`, key);
    return;
  }
  if (key === "profileSettings") {
    setModal("老板资料", `<p>这里决定系统怎么称呼您，以及每天什么时候汇报。</p>${ownerForm()}`, key);
    return;
  }
  if (key === "credits") {
    setModal(
      "充值",
      `<p>当前本月预算：<strong>${escapeHtml(moneyMetric())}</strong></p>
      <p>这里先做系统内记录，不会产生真实扣费。</p>
      <div class="modal-actions">
        <button class="god-mode" type="button" data-server-action="topup" data-amount="100">充值¥100</button>
        <button class="bevel" type="button" data-server-action="topup" data-amount="500">充值¥500</button>
      </div>`,
      key,
    );
    return;
  }
  if (key === "upgrade") {
    setModal(
      "升级套餐",
      `<p>升级后，AI可以同时推进更多客户、资料、官网和收款准备。</p>
      <div class="modal-actions">
        <button class="god-mode" type="button" data-server-action="upgrade">开通专业版试用</button>
      </div>`,
      key,
    );
    return;
  }
  if (key === "companies") {
    const companies = dashboardState.companies?.length
      ? dashboardState.companies
      : [];
    setModal(
      "我的公司",
      `${companies.length
        ? `<div class="modal-list">
          ${companies
            .map(
              (item) => `<article class="modal-item company-switch-item ${item.isActive ? "active-company" : ""}">
              <div>
                <strong>${escapeHtml(item.name)}</strong>
                <p>${escapeHtml(item.industry || "未填写主营业务")}</p>
                <span class="meta">${item.isActive ? "当前正在使用" : "可切换进入"}</span>
              </div>
              <button class="${item.isActive ? "bevel" : "god-mode"}" type="button" data-switch-company="${escapeHtml(item.id)}" ${item.isActive ? "disabled" : ""}>
                ${item.isActive ? "当前公司" : "进入"}
              </button>
            </article>`,
            )
            .join("")}
        </div>`
        : `<article class="modal-item company-switch-item"><div><strong>还没有企业</strong><p>创建第一家公司后，这里会显示当前账号拥有的企业。</p><span class="meta">账号之间相互隔离</span></div></article>`}
      <div class="modal-actions">
        ${needsCompanySetup() ? "" : `<button class="bevel" type="button" data-modal="companySettings">修改当前公司</button>`}
        <button class="god-mode" type="button" data-modal="newCompany">新建公司</button>
      </div>`,
      key,
    );
    return;
  }
  if (key === "doc" && detail?.doc) {
    modalCopyText = documentText(detail.doc);
    setModal(
      detail.doc.title,
      `<p>${escapeHtml(detail.doc.title)}已经准备好，可以复制给员工或客户再确认。</p>
      <pre class="copy-panel">${escapeHtml(modalCopyText)}</pre>
      <div class="modal-actions">
        <button class="god-mode" type="button" data-copy-doc>复制内容</button>
        <button class="bevel" type="button" data-doc-agent="${escapeHtml(detail.doc.id)}">让AI再优化</button>
      </div>`,
      key,
    );
    return;
  }
  const [title, body] = modalCopy[key] || ["提示", detail || "这个按钮已经接好，会在看板里留下结果。"];
  setModal(title, `<p>${escapeHtml(detail || body)}</p>`, key);
}

function closeModal() {
  els.modalBackdrop.hidden = true;
  els.modalBackdrop.dataset.current = "";
  modalCopyText = "";
}

const creationStageMeta = {
  profile: {
    title: "建立公司经营工程",
    detail: "正在写入公司档案、创建独立工作区，并把老板资料和企业资料分开保存。",
    lane: "档案",
  },
  research: {
    title: "查资料与找线索",
    detail: "正在整理行业资料、客户画像、竞品压力和第一批可执行线索。",
    lane: "资料",
  },
  market: {
    title: "形成经营判断",
    detail: "正在把外部资料压缩成客户分层、切入口、风险和下一步动作。",
    lane: "判断",
  },
  departments: {
    title: "组建AI管理层",
    detail: "正在分配总经理、销售、市场、运营和财务角色，让它们各自接手任务。",
    lane: "组织",
  },
  plan: {
    title: "制定90天打法",
    detail: "正在生成经营节奏、销售话术、资料清单和老板需要拍板的事项。",
    lane: "计划",
  },
  tasks: {
    title: "生成今日经营队列",
    detail: "正在把计划拆成今天能看的任务、报告和资料草稿。",
    lane: "任务",
  },
  finalize: {
    title: "保存并进入看板",
    detail: "正在保存企业工作区，准备切换到新公司的经营看板。",
    lane: "上线",
  },
};

const creationEventCopy = {
  profile: ["创建独立工作区", "写入公司基础档案", "绑定当前老板账号", "建立资料目录"],
  research: ["检索行业关键词", "整理客户画像", "筛选可触达渠道", "扫描竞品和替代方案", "提炼资料来源"],
  market: ["压缩经营判断", "标记优先客户", "识别成交阻力", "生成第一批机会点"],
  departments: ["安排总经理AI", "分配销售AI职责", "建立财务提醒", "同步运营节奏"],
  plan: ["生成90天计划", "拆解销售打法", "整理老板决策清单", "准备对外介绍"],
  tasks: ["生成今日待确认事项", "写经营简报", "整理资料草稿", "刷新任务优先级"],
  finalize: ["保存看板数据", "检查账号隔离", "准备进入新公司", "收尾执行记录"],
};

function resetCreationMotion(companyName = "") {
  creationMotion = {
    jobId: "",
    companyName,
    events: [],
    tick: 0,
    lastEventAt: 0,
    lastStepId: "",
  };
}

function creationStepId(job, steps) {
  return job.activeStep || steps.find((step) => step.status === "running")?.id || steps.find((step) => step.status !== "done")?.id || "finalize";
}

function creationMessageFor(stepId, step) {
  const pool = (Array.isArray(step?.events) && step.events.length ? step.events : creationEventCopy[stepId]) || creationEventCopy.profile;
  const text = pool[creationMotion.tick % pool.length];
  creationMotion.tick += 1;
  return text;
}

function updateCreationEvents(job, step) {
  const now = Date.now();
  const jobId = job.jobId || "local-start";
  const stepId = step?.id || "profile";
  if (creationMotion.jobId && creationMotion.jobId !== jobId) {
    resetCreationMotion(creationMotion.companyName);
  }
  creationMotion.jobId = jobId;
  if (stepId !== creationMotion.lastStepId) {
    creationMotion.lastStepId = stepId;
    creationMotion.lastEventAt = 0;
  }
  for (const event of job.events || []) {
    if (!event?.text) continue;
    creationMotion.events.push({
      time: event.time || new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date()),
      text: event.text,
    });
  }
  if (job.status === "done") {
    creationMotion.events.push({ time: "完成", text: "新公司经营看板已生成，准备进入工作台。" });
  } else if (job.status === "error") {
    creationMotion.events.push({ time: "异常", text: job.error || "创建过程中遇到问题。" });
  } else if (!(job.events || []).length && now - creationMotion.lastEventAt > 850) {
    creationMotion.events.push({
      time: new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date()),
      text: creationMessageFor(stepId, step),
    });
    creationMotion.lastEventAt = now;
  }
  const seen = new Set();
  creationMotion.events = creationMotion.events
    .filter((event) => {
      const key = `${event.time}-${event.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(-12);
}

function renderCompanyCreationProgress(job) {
  const steps = job.steps?.length
    ? job.steps
    : [
        { id: "profile", lane: "开局", title: "打开独立经营工作区", detail: "正在创建资料、任务、报告和决策目录。", status: "running" },
        { id: "research", lane: "资料", title: "收集外部资料和客户入口", detail: "等待整理行业、客户、竞品和渠道线索。", status: "pending" },
        { id: "market", lane: "判断", title: "压缩第一版经营判断", detail: "等待形成客户切口、成交动作和风险边界。", status: "pending" },
        { id: "departments", lane: "分工", title: "安排AI经营班底", detail: "等待分配销售、资料、财务和总经理职责。", status: "pending" },
        { id: "plan", lane: "节奏", title: "生成第一轮业务节奏", detail: "等待生成销售打法、资料清单和验证动作。", status: "pending" },
        { id: "tasks", lane: "交付", title: "产出任务、报告和营销动作", detail: "等待写入经营报告、对外介绍和待确认事项。", status: "pending" },
        { id: "finalize", lane: "上线", title: "进入新公司工作台", detail: "等待保存并切换到新公司。", status: "pending" },
      ];
  const doneCount = steps.filter((step) => step.status === "done").length;
  const progress = Math.round((doneCount / Math.max(steps.length, 1)) * 100);
  const activeStepId = creationStepId(job, steps);
  const activeStep = steps.find((step) => step.id === activeStepId) || steps[0] || {};
  const activeMeta = {
    ...(creationStageMeta[activeStepId] || creationStageMeta.profile),
    ...activeStep,
    lane: activeStep.lane || creationStageMeta[activeStepId]?.lane || creationStageMeta.profile.lane,
  };
  updateCreationEvents(job, activeStep);
  const statusText =
    job.status === "done"
      ? "新公司已经建好"
      : job.status === "error"
        ? "创建过程中遇到问题"
        : `${activeMeta.title}中`;
  const lanes = steps.map((step, index) => {
    const meta = creationStageMeta[step.id] || { lane: step.title || "任务", title: step.title || "处理中" };
    const state =
      step.status === "done"
        ? "done"
        : step.id === activeStepId || step.status === "running"
          ? "active"
          : index < doneCount
            ? "done"
            : "pending";
    return {
      ...step,
      lane: step.lane || meta.lane,
      state,
    };
  });
  const html = `<div class="creation-process">
    <div class="creation-live">
      <div class="creation-core" aria-hidden="true">
        <span></span>
        <i></i>
        <b></b>
      </div>
      <div class="creation-copy">
        <span>Agent 工作现场</span>
        <strong>${escapeHtml(statusText)}</strong>
        <p>${escapeHtml(job.status === "done" ? "公司档案、AI管理层、今日任务和资料草稿已经保存完成。" : activeMeta.detail)}</p>
      </div>
      <div class="creation-meter">
        <b>${job.status === "done" ? "100" : String(Math.max(progress, 8))}%</b>
        <span>${job.status === "done" ? "已完成" : "持续运行"}</span>
      </div>
    </div>
    <div class="creation-scan" aria-hidden="true"><span style="width:${job.status === "done" ? 100 : Math.max(progress, 8)}%"></span></div>
    <div class="creation-lanes">
      ${lanes
        .map(
          (step) => `<article class="creation-lane ${escapeHtml(step.state)}">
            <b>${escapeHtml(step.lane)}</b>
            <div>
              <strong>${escapeHtml(step.title || "")}</strong>
              <span>${escapeHtml(step.state === "done" ? "已完成" : step.state === "active" ? (step.detail || "正在处理") : "排队中")}</span>
            </div>
          </article>`,
        )
        .join("")}
    </div>
    <div class="creation-stream">
      <div class="creation-stream-head">
        <strong>实时执行流</strong>
        <span>${escapeHtml(creationMotion.companyName || "新公司")} · ${escapeHtml(activeMeta.lane)}</span>
      </div>
      <div class="creation-log-list">
        ${creationMotion.events
          .map((event) => `<p><time>${escapeHtml(event.time)}</time><span>${escapeHtml(event.text)}</span></p>`)
          .join("")}
      </div>
    </div>
    ${job.error ? `<p class="creation-error">${escapeHtml(job.error)}</p>` : ""}
  </div>`;
  if (els.creationPanel) {
    els.creationPanel.innerHTML = html;
    els.creationPanel.hidden = false;
    els.creationPanel.dataset.status = job.status || "running";
    return;
  }
  els.modalTitle.textContent = "正在创建公司";
  els.modalBackdrop.dataset.current = "creation";
  els.modalBackdrop.hidden = false;
  els.modalBody.innerHTML = html;
}

function hideCompanyCreationProgress(delayMs = 0) {
  if (!els.creationPanel) return;
  window.setTimeout(() => {
    els.creationPanel.hidden = true;
    els.creationPanel.innerHTML = "";
    els.creationPanel.dataset.status = "";
  }, delayMs);
}

function setAIStatus(message, state = "") {
  els.agentStatus.textContent = state === "ready" ? "" : message;
  els.agentStatus.className = `agent-status ${state}`.trim();
}

function setAIBusy(isBusy) {
  agentBusy = isBusy;
  els.chatPanel?.classList.toggle("is-busy", isBusy);
  els.agentConsole?.classList.toggle("is-busy", isBusy);
  els.quickActionButtons.forEach((button) => {
    button.disabled = isBusy;
  });
  els.sendButton.disabled = isBusy || els.chatInput.value.trim().length === 0;
}

function agentSummary(data) {
  const agent = data.agent || {};
  const ok = Boolean(data.ok && agent.ready !== false);
  return {
    ok,
    text: ok ? "AI员工在线，可以处理老板指令。" : "AI员工暂时需要检查，请稍后再试。",
  };
}

async function checkAIBridge() {
  try {
    const data = await fetchJson("/api/health", { headers: { "x-qxb-local": "1" } });
    const summary = agentSummary(data);
    agentConnected = summary.ok;
    setAIStatus(summary.ok ? "在线" : "待检查", summary.ok ? "ready" : "error");
  } catch {
    agentConnected = false;
    setAIStatus("待检查", "error");
  }
}

async function runAICli(message) {
  if (agentBusy) {
    toast("AI员工正在处理上一条指令");
    return false;
  }
  setAIBusy(true);
  setAIStatus("处理中", "busy");
  addConversationMessage("user", message);
  const pendingMessageId = addConversationMessage("agent", "已收到。正在读取公司资料和任务记录。", "pending");

  let ok = false;
  try {
    const started = await fetchJson("/api/agent/jobs", {
      method: "POST",
      body: JSON.stringify({ message }),
    });
    const data = await waitForAIJob(started.jobId, pendingMessageId);
    const output = data.output || "已处理完成，但没有新的文字结果。";
    updateConversationMessage(pendingMessageId, { text: output, state: "" });
    if (data.dashboard) renderDashboard(data.dashboard);
    pushLog("> AI员工已返回结果");
    setAIStatus("在线", "ready");
    toast("AI员工已完成");
    ok = true;
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    updateConversationMessage(pendingMessageId, { text: `这次没有处理成功：${messageText}`, state: "error" });
    setAIStatus("待检查", "error");
    pushLog("> AI员工处理失败");
    toast("AI员工处理失败");
  } finally {
    setAIBusy(false);
  }
  return ok;
}

function formatAgentProgress(data) {
  const events = (data.events || []).slice(-5).map((event) => event.text).filter(Boolean);
  if (!events.length) return "我正在处理，先读取公司档案、任务队列和历史资料。";
  return ["我正在处理，当前进展：", ...events.map((text) => `• ${text}`)].join("\n");
}

async function waitForAIJob(jobId, pendingMessageId = "") {
  if (!jobId) throw new Error("任务没有启动成功。");
  for (let attempt = 0; attempt < 800; attempt += 1) {
    await delay(attempt === 0 ? 700 : 1500);
    const data = await fetchJson(`/api/agent/jobs/${encodeURIComponent(jobId)}`);
    if (data.status === "done") return data;
    if (data.status === "error") throw new Error(data.error || "AI员工执行失败。");
    const seconds = Math.max(1, Math.round((data.durationMs || 0) / 1000));
    setAIStatus(data.activeEvent || `处理中 ${seconds}秒`, "busy");
    if (pendingMessageId) updateConversationMessage(pendingMessageId, { text: formatAgentProgress(data), state: "pending" });
  }
  throw new Error("处理时间太久，请稍后再试。");
}

async function updateTask(taskId, action) {
  const task = dashboardState.tasks.find((item) => item.id === taskId);
  if (!task) return;
  if (action === "agent") {
    await runAICli(`请处理这件经营任务：${task.title}。${task.body}`);
  }
  try {
    const data = await fetchJson(`/api/tasks/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      body: JSON.stringify({ action }),
    });
    renderDashboard(data.dashboard);
    if (els.modalBackdrop.dataset.current === "manageTasks") openModal("manageTasks");
    toast(action === "pause" ? "已暂缓" : "已记录，AI会继续推进");
    pushLog(action === "pause" ? `> 老板暂缓：${task.title}` : action === "agent" ? `> 已交给AI：${task.title}` : `> 老板确认：${task.title}`);
  } catch (error) {
    task.status = action === "pause" ? "已暂缓" : "老板已同意";
    renderDashboard(dashboardState);
    toast("后端未保存，但页面已先记录");
  }
}

async function runCycle() {
  if (needsCompanySetup()) {
    openModal("newCompany");
    toast("请先创建自己的企业");
    return;
  }
  els.runCycleButton.disabled = true;
  pushLog("> AI员工开始跑一轮经营检查");
  try {
    const ok = await runAICli("请主动跑一轮经营检查：先查看公司资料和任务队列，再检查今天最该推进的客户、资料、员工安排、竞品机会和待老板确认事项。请把新增任务和资料写回看板。");
    if (ok) {
      toast("AI已经完成一轮经营检查");
      pushLog("> AI员工已完成一轮检查");
    }
  } catch {
    toast("后端暂时不可用，已新增本地建议");
    const company = displayCompany();
    const kind = companyKind(company);
    const localIdea =
      kind === "investment"
        ? ["整理本周项目跟进表", "AI会把项目名称、阶段、负责人、下一步动作列清楚。", "项目AI"]
        : kind === "trade"
          ? ["整理本周报价和发货安排", "AI会把报价、库存、发货和回款列清楚。", "总经理AI"]
          : ["给老板准备一个新方案", "AI建议先整理客户、资料、报价和员工安排，形成今天可执行的清单。", "总经理AI"];
    dashboardState.tasks.unshift({
      id: `local_${Date.now()}`,
      title: localIdea[0],
      body: localIdea[1],
      owner: localIdea[2],
      status: "AI新建议",
      priority: "今天",
      nextStep: "老板确认后，AI继续整理成可执行材料。",
    });
    renderDashboard(dashboardState);
  } finally {
    els.runCycleButton.disabled = false;
  }
}

async function waitForCompanyCreation(jobId) {
  if (!jobId) throw new Error("公司创建任务没有启动成功。");
  for (let attempt = 0; attempt < 1800; attempt += 1) {
    await delay(attempt === 0 ? 500 : 1200);
    const data = await fetchJson(`/api/company/jobs/${encodeURIComponent(jobId)}`);
    renderCompanyCreationProgress(data);
    if (data.status === "done") return data;
    if (data.status === "error") throw new Error(data.error || "新公司创建失败。");
  }
  throw new Error("新公司创建时间太久，请稍后刷新再看。");
}

async function saveCompany(form) {
  const values = Object.fromEntries(new FormData(form).entries());
  const button = form.querySelector('button[type="submit"]');
  const isNewCompany = form.dataset.mode === "new";
  button.disabled = true;
  try {
    if (isNewCompany) {
      companyCreationBusy = true;
      resetCreationMotion(values.name || "新公司");
      closeModal();
      setDashboardView("today");
      renderCompanyCreationProgress({
        status: "running",
        steps: [
          { id: "profile", lane: "提交", title: "接收公司基础资料", detail: "正在提交公司名称、主营业务和对外介绍。", status: "running" },
          { id: "research", lane: "资料", title: "准备外部资料入口", detail: "等待AI员工查客户、竞品和行业机会。", status: "pending" },
          { id: "market", lane: "判断", title: "压缩第一版经营判断", detail: "等待整理客户切口、成交动作和风险边界。", status: "pending" },
          { id: "departments", lane: "分工", title: "安排AI经营班底", detail: "等待分配销售、资料、财务和总经理职责。", status: "pending" },
          { id: "plan", lane: "节奏", title: "生成第一轮业务节奏", detail: "等待生成销售打法、资料清单和验证动作。", status: "pending" },
          { id: "tasks", lane: "交付", title: "产出任务、报告和营销动作", detail: "等待写入经营报告、对外介绍和待确认事项。", status: "pending" },
          { id: "finalize", lane: "上线", title: "进入新公司工作台", detail: "等待保存并切换到新公司。", status: "pending" },
        ],
      });
    }
    const data = await fetchJson("/api/company", {
      method: "PATCH",
      body: JSON.stringify({
        mode: form.dataset.mode,
        name: values.name,
        industry: values.industry,
        website: values.website,
        slogan: values.slogan,
      }),
    });
    let finalData = data;
    if (isNewCompany && data.jobId) {
      if (data.dashboard) {
        renderDashboard(data.dashboard);
        history.replaceState(null, "", data.redirectTo || (data.dashboard?.company?.slug ? `/dashboard/${data.dashboard.company.slug}` : "/dashboard/fitscope"));
        setDashboardView("today");
      }
      renderCompanyCreationProgress(data);
      finalData = await waitForCompanyCreation(data.jobId);
      await delay(650);
    }
    renderDashboard(finalData.dashboard || data.dashboard);
    history.replaceState(null, "", finalData.redirectTo || data.redirectTo || (finalData.dashboard?.company?.slug ? `/dashboard/${finalData.dashboard.company.slug}` : "/dashboard/fitscope"));
    setDashboardView("today");
    companyCreationBusy = false;
    if (isNewCompany) {
      renderCompanyCreationProgress(finalData);
      hideCompanyCreationProgress(2400);
    } else {
      closeModal();
    }
    toast(isNewCompany ? "新公司工程已建好" : "公司资料已保存");
    pushLog(isNewCompany ? "> AI已完成新公司经营工程" : "> 已更新公司资料");
    if (isNewCompany) addConversationMessage("agent", `${finalData.dashboard?.company?.name || "新公司"}已经建好。我已经整理了公司档案、AI部门、今日任务和资料草稿，老板可以先看“今天”里的三件事。`);
  } catch (error) {
    companyCreationBusy = false;
    if (isNewCompany) {
      renderCompanyCreationProgress({
        status: "error",
        error: error.message || "新公司创建失败。",
        steps: [
          { id: "profile", lane: "异常", title: "公司创建没有完成", detail: error.message || "请稍后重试。", status: "error" },
        ],
      });
    }
    toast(error.message || "保存失败");
  } finally {
    button.disabled = false;
  }
}

async function switchCompany(companyId) {
  if (!companyId) return;
  try {
    const data = await fetchJson("/api/company/switch", {
      method: "POST",
      body: JSON.stringify({ companyId }),
    });
    renderDashboard(data.dashboard);
    history.replaceState(null, "", data.redirectTo || `/dashboard/${data.dashboard?.company?.slug || "fitscope"}`);
    setDashboardView("today");
    closeModal();
    toast(`已进入${data.dashboard?.company?.name || "这家公司"}`);
    pushLog(`> 已切换公司：${data.dashboard?.company?.name || ""}`);
  } catch (error) {
    toast(error.message || "切换公司失败");
  }
}

async function saveOwner(form) {
  const values = Object.fromEntries(new FormData(form).entries());
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const data = await fetchJson("/api/owner", {
      method: "PATCH",
      body: JSON.stringify({
        name: values.name,
        phone: values.phone,
        reportTime: values.reportTime,
      }),
    });
    renderDashboard(data.dashboard);
    closeModal();
    toast("老板资料已保存");
    pushLog("> 已更新老板资料");
  } catch (error) {
    toast(error.message || "保存失败");
  } finally {
    button.disabled = false;
  }
}

async function runServerAction(node) {
  const action = node.dataset.serverAction;
  node.disabled = true;
  try {
    const endpoint = action === "upgrade" ? "/api/plan/upgrade" : "/api/billing/top-up";
    const body = action === "topup" ? { amount: Number(node.dataset.amount) || 100 } : {};
    const data = await fetchJson(endpoint, { method: "POST", body: JSON.stringify(body) });
    renderDashboard(data.dashboard);
    closeModal();
    toast(action === "upgrade" ? "专业版试用已开通" : "充值已记录");
    pushLog(action === "upgrade" ? "> 已开通专业版试用" : "> 已记录充值");
  } catch (error) {
    toast(error.message || "操作失败");
  } finally {
    node.disabled = false;
  }
}

async function updateChannel(channelId) {
  const channel = dashboardState.channels.find((item) => item.id === channelId);
  if (!channel) return;
  try {
    const data = await fetchJson(`/api/channels/${encodeURIComponent(channelId)}`, {
      method: "PATCH",
      body: "{}",
    });
    renderDashboard(data.dashboard);
    toast(`${channel.name}已处理`);
    pushLog(`> 已处理渠道：${channel.name}`);
  } catch (error) {
    toast(error.message || "渠道处理失败");
  }
}

async function prepareSocialDraft() {
  try {
    const data = await fetchJson("/api/social/prepare", { method: "POST", body: "{}" });
    renderDashboard(data.dashboard);
    pushLog("> 已准备对外发布草稿，等待老板最终确认");
    toast("发布草稿已准备好");
  } catch (error) {
    toast(error.message || "准备草稿失败");
  }
}

async function copyModalDocument() {
  if (!modalCopyText) return;
  try {
    await navigator.clipboard.writeText(modalCopyText);
    toast("内容已复制");
    pushLog("> 已复制资料内容");
  } catch {
    toast("复制失败，请手动选中内容复制");
  }
}

function sendMessage(value) {
  const clean = value.trim();
  if (!clean) return;
  if (needsCompanySetup()) {
    openModal("newCompany");
    toast("请先创建自己的企业");
    return;
  }
  pushLog(`> 老板吩咐：${clean}`);
  pushLog("> AI正在整理下一步...");
  toast("已收到，AI开始处理");
  els.chatInput.value = "";
  els.chatInput.style.height = "auto";
  els.sendButton.disabled = true;
  runAICli(clean);
}

async function runHealthCheck() {
  openModal("health", "正在检查AI员工是否可以正常接活。");
  try {
    const data = await fetchJson("/api/health");
    const summary = agentSummary(data);
    els.modalBody.innerHTML = `<p>页面：正常</p><p>经营数据：正常</p><p>AI员工：${summary.ok ? "可以接活" : "需要检查"}</p><p>老板入口：正常</p>`;
    setAIStatus(summary.ok ? "在线" : "待检查", summary.ok ? "ready" : "error");
    toast("AI状态已检查");
  } catch (error) {
    els.modalBody.innerHTML = `<p>页面：正常</p><p>AI员工：需要检查</p><p>${escapeHtml(error.message || String(error))}</p>`;
    toast("AI状态需要检查");
  }
}

function startPassiveLogs() {
  if (passiveTimer) return;
  passiveTimer = window.setInterval(() => {
    const passive = [
      "> AI待命中，等待老板下一步指令",
      "> 正在检查未完成事项",
      "> 今日暂无需要老板立即处理的新风险",
      "> 已保持经营看板最新",
    ];
    pushLog(passive[Math.floor(Math.random() * passive.length)]);
  }, 9000);
}

function initEvents() {
  els.authModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setAuthMode(button.dataset.authMode);
      window.setTimeout(() => els.authAccount.focus(), 0);
    });
  });

  els.loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitAuth();
  });

  els.demoLoginTop.addEventListener("click", () => {
    setAuthMode("login");
    els.authAccount.focus();
  });

  els.menuButton.addEventListener("click", () => {
    const isOpen = els.menuPopover.classList.toggle("open");
    els.menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!els.menuPopover.contains(target) && target !== els.menuButton) {
      els.menuPopover.classList.remove("open");
      els.menuButton.setAttribute("aria-expanded", "false");
    }

    const modalNode = target.closest("[data-modal]");
    if (modalNode) {
      openModal(modalNode.dataset.modal);
      return;
    }

    const viewNode = target.closest("button[data-view]");
    if (viewNode) {
      setDashboardView(viewNode.dataset.view);
      return;
    }

    const switchCompanyNode = target.closest("[data-switch-company]");
    if (switchCompanyNode) {
      switchCompany(switchCompanyNode.dataset.switchCompany);
      return;
    }

    const choiceNode = target.closest("[data-task-choice]");
    if (choiceNode) {
      updateTask(choiceNode.dataset.taskId, choiceNode.dataset.taskChoice);
      return;
    }

    const taskNode = target.closest("[data-task]");
    if (taskNode && !target.closest("button")) {
      const task = dashboardState.tasks.find((item) => item.id === taskNode.dataset.task);
      if (task) openModal("task", `${task.title}。${task.body} 下一步：${task.nextStep}`);
      return;
    }

    const docNode = target.closest("[data-doc]");
    if (docNode) {
      const doc = dashboardState.documents.find((item) => item.id === docNode.dataset.doc);
      if (doc) openDocumentDrawer(doc);
      return;
    }

    const channelNode = target.closest("[data-channel-action]");
    if (channelNode) {
      updateChannel(channelNode.dataset.channelAction);
      return;
    }

    const actionNode = target.closest("[data-action]");
    if (actionNode?.dataset.action === "tweet") {
      prepareSocialDraft();
      return;
    }

    const serverActionNode = target.closest("[data-server-action]");
    if (serverActionNode) {
      runServerAction(serverActionNode);
      return;
    }

    const copyDocNode = target.closest("[data-copy-doc]");
    if (copyDocNode) {
      copyModalDocument();
      return;
    }

    const docAgentNode = target.closest("[data-doc-agent]");
    if (docAgentNode) {
      const doc = dashboardState.documents.find((item) => item.id === docAgentNode.dataset.docAgent);
      const text = modalCopyText;
      closeModal();
      runAICli(`请帮我把这份资料优化得更适合传统企业老板直接使用：${doc ? doc.title : "公司资料"}。${text}`);
    }
  });

  document.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-form]");
    if (!form) return;
    event.preventDefault();
    if (form.dataset.form === "company") saveCompany(form);
    if (form.dataset.form === "owner") saveOwner(form);
  });

  els.closeChat.addEventListener("click", () => {
    els.appShell.classList.remove("chat-open");
    pushLog("> 已收起老板指令框");
  });

  els.openInbox.addEventListener("click", () => {
    els.appShell.classList.add("chat-open");
    pushLog("> 已打开老板指令框");
  });

  els.runCycleButton.addEventListener("click", runCycle);
  els.refreshDashboard.addEventListener("click", () => loadDashboard());
  els.healthButton.addEventListener("click", runHealthCheck);

  els.chatInput.addEventListener("input", () => {
    els.sendButton.disabled = agentBusy || els.chatInput.value.trim().length === 0;
    els.chatInput.style.height = "auto";
    els.chatInput.style.height = `${Math.min(els.chatInput.scrollHeight, 96)}px`;
  });

  els.composer.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage(els.chatInput.value);
  });

  els.quickActionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.quickAction === "cycle") runCycle();
      else sendMessage(button.dataset.quick || "");
    });
  });

  els.imageInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) {
      pushLog(`> 已上传图片：${file.name}`);
      addConversationMessage("user", `上传了一张图片：${file.name}`);
      addConversationMessage("agent", "我已记录这张图片。你可以继续说要我看什么，例如“帮我整理这张图里的客户资料”或“按这张图写一段介绍”。");
      toast("图片已记录");
    }
  });

  els.clearConversation.addEventListener("click", () => {
    conversationMessages = [];
    ensureConversationGreeting();
    toast("对话已清空");
  });

  els.logoutButton.addEventListener("click", async () => {
    try {
      await fetchJson("/api/auth/logout", { method: "POST", body: "{}" });
    } catch {
      // Logout should still return to the login screen if the network is flaky.
    }
    history.replaceState(null, "", "/login");
    showLogin();
    pushLog("> 已退出到老板入口");
    toast("已退出");
  });

  els.modalClose.addEventListener("click", closeModal);
  els.modalBackdrop.addEventListener("click", (event) => {
    if (event.target === els.modalBackdrop) closeModal();
  });
  els.documentDrawerClose.addEventListener("click", closeDocumentDrawer);
  els.documentDrawerBackdrop.addEventListener("click", (event) => {
    if (event.target === els.documentDrawerBackdrop) closeDocumentDrawer();
  });
  els.copyDocumentButton.addEventListener("click", copyDrawerDocument);
  els.improveDocumentButton.addEventListener("click", improveDrawerDocument);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!els.documentDrawerBackdrop.hidden) closeDocumentDrawer();
      else closeModal();
      els.menuPopover.classList.remove("open");
      els.menuButton.setAttribute("aria-expanded", "false");
    }
  });

  window.addEventListener("popstate", () => {
    if (location.pathname === "/login") showLogin();
  });
}

async function init() {
  renderTerminal();
  setAuthMode("login");
  initEvents();
  try {
    const session = await fetchJson("/api/auth/session");
    if (session.loggedIn) {
      if (session.owner?.name) els.authName.value = session.owner.name;
      if (session.owner?.phone) els.authPhone.value = session.owner.phone;
      if (session.owner?.account) els.authAccount.value = session.owner.account;
      showProduct();
      renderDashboard(session.needsCompany ? setupDashboard : {
        ...setupDashboard,
        requiresCompany: false,
        needsCompany: false,
        company: session.company || displayCompany(),
        companies: session.companies || [],
      });
      await loadDashboard({ quiet: true });
      if (location.pathname === "/login") {
        history.replaceState(null, "", session.needsCompany ? "/dashboard/setup" : `/dashboard/${session.company?.slug || "fitscope"}`);
      }
      if (session.needsCompany) window.setTimeout(() => openModal("newCompany"), 150);
      await checkAIBridge();
      startPassiveLogs();
    } else {
      if (location.pathname.startsWith("/dashboard")) history.replaceState(null, "", "/login");
      showLogin();
    }
  } catch {
    if (location.pathname.startsWith("/dashboard")) history.replaceState(null, "", "/login");
    showLogin();
    toast("暂时连不上后端，请稍后刷新");
  }
  window.setInterval(() => {
    if (!agentConnected && !agentBusy) checkAIBridge();
  }, 5000);
}

init();
