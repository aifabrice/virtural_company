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
    { label: "今日待确认", value: "3件", hint: "只看要老板拍板的事" },
    { label: "AI已完成", value: "7件", hint: "客户、文案、官网、简报" },
    { label: "潜在客户", value: "10家", hint: "附近工业园优先" },
    { label: "本月预算", value: "¥480", hint: "可随时暂停" },
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
  openInbox: document.querySelector("#openInbox"),
  surpriseButton: document.querySelector("#surpriseButton"),
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
  toastRegion: document.querySelector("#toastRegion"),
  logoutButton: document.querySelector("#logoutButton"),
};

let dashboardState = fallbackDashboard;
let agentBusy = false;
let agentConnected = false;
let passiveTimer = null;
let modalCopyText = "";
let currentView = "today";
let conversationMessages = [];
let conversationCompanyId = "";
let authMode = "login";
const compactViewport = window.matchMedia("(max-width: 980px)");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderInlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*\*/g, "")
    .replace(/__/g, "");
}

function renderMessageText(value) {
  const lines = String(value || "").replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let listType = "";
  let inCodeBlock = false;
  let codeLines = [];

  function closeList() {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = "";
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
    const bullet = line.match(/^[-*•]\s+(.+)$/);
    const numbered = line.match(/^\d+[.、)]\s+(.+)$/);
    const quote = line.match(/^>\s+(.+)$/);

    if (heading) {
      closeList();
      html.push(`<p class="message-heading">${renderInlineMarkdown(heading[1])}</p>`);
    } else if (boldHeading) {
      closeList();
      html.push(`<p class="message-heading">${renderInlineMarkdown(boldHeading[1])}</p>`);
    } else if (bullet) {
      openList("ul");
      html.push(`<li>${renderInlineMarkdown(bullet[1])}</li>`);
    } else if (numbered) {
      openList("ol");
      html.push(`<li>${renderInlineMarkdown(numbered[1])}</li>`);
    } else if (quote) {
      closeList();
      html.push(`<blockquote>${renderInlineMarkdown(quote[1])}</blockquote>`);
    } else {
      closeList();
      html.push(`<p>${renderInlineMarkdown(line)}</p>`);
    }
  }

  closeList();
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
  const company = dashboardState.company || fallbackDashboard.company;
  const tasks = dashboardState.tasks || [];
  const firstTask = tasks[0]?.title ? `今天建议先看：${tasks[0].title}。` : "今天我会先整理最要紧的经营事项。";
  const kind = companyKind(company);
  const examples =
    kind === "investment"
      ? "找项目源、写项目跟进、做投资方案或整理尽调安排"
      : kind === "trade"
        ? "找采购客户、写询价回复、做报价单或整理发货回款"
        : "找客户、写跟进话术、做方案报价或整理员工安排";
  return `我在这里帮${company.name || "公司"}推进经营任务。${firstTask}你可以直接吩咐我${examples}。`;
}

function renderConversation() {
  els.agentMessages.innerHTML = conversationMessages
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
  els.agentMessages.scrollTop = els.agentMessages.scrollHeight;
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
  renderConversation();
  return message.id;
}

function updateConversationMessage(messageId, patch) {
  conversationMessages = conversationMessages.map((item) => (item.id === messageId ? { ...item, ...patch } : item));
  renderConversation();
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
  dashboardState = data || fallbackDashboard;
  const { company, metrics, agents, tasks, documents, channels, activity, socialDraft, updatedAt } = dashboardState;
  if (company?.id && conversationCompanyId !== company.id) {
    conversationCompanyId = company.id;
    conversationMessages = [];
  }

  els.companySlug.textContent = `/dashboard/${company.slug || "fitscope"}`;
  const topbarBrand = document.querySelector(".topbar .brand");
  if (topbarBrand) {
    topbarBrand.href = `/dashboard/${company.slug || "fitscope"}`;
    topbarBrand.setAttribute("aria-label", `${company.name || "公司"}经营看板`);
  }
  document.querySelector(".brand > span").textContent = company.name || "顺达机械";
  els.companyName.textContent = company.name || "顺达机械";
  els.companyMood.textContent = company.mood || "AI员工正在替公司推进今天的经营任务";
  els.updatedAt.textContent = `更新：${updatedAt || "刚刚"}`;
  updateQuickActions(company);

  els.metricGrid.innerHTML = metrics
    .map(
      (item) => `<article class="metric-card">
        <span>${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.value)}</strong>
        <small>${escapeHtml(item.hint)}</small>
      </article>`,
    )
    .join("");

  els.focusList.innerHTML = tasks
    .slice(0, 3)
    .map((task) => `<li><strong>${escapeHtml(task.title)}</strong><span>${escapeHtml(task.nextStep || task.body)}</span></li>`)
    .join("");

  els.agentList.innerHTML = agents
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
    .join("");

  els.taskList.innerHTML = tasks
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

  els.docList.innerHTML = documents
    .map(
      (doc) => `<button class="doc-button" type="button" data-doc="${escapeHtml(doc.id)}">
        <span class="doc-icon">${escapeHtml(doc.type.slice(0, 2))}</span>
        <span>${escapeHtml(doc.title)}</span>
        <span class="meta">${escapeHtml(doc.age)}</span>
      </button>`,
    )
    .join("");

  els.channelList.innerHTML = channels
    .map(
      (channel) => `<article class="channel-card">
        <strong>${escapeHtml(channel.name)}</strong>
        <span>${escapeHtml(channel.status)}</span>
        <button class="bevel" type="button" data-channel-action="${escapeHtml(channel.id)}">${escapeHtml(channel.action)}</button>
      </article>`,
    )
    .join("");

  els.socialDraft.innerHTML = `<p><strong>${escapeHtml(socialDraft.title)}</strong></p>
    <p>${escapeHtml(socialDraft.body)}</p>
    <p class="meta">${escapeHtml(socialDraft.status)}</p>
    <button class="bevel" type="button" data-action="tweet">准备发布</button>`;

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
  els.authHint.textContent =
    authMode === "register"
      ? "注册后会自动进入当前公司，之后可在菜单里新建或切换公司。"
      : "登录后才能访问公司看板。所有公司资料都会跟当前账号绑定。";
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
    toast(authMode === "register" ? "注册成功" : "登录成功");
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
  return dashboardState.metrics?.find((item) => item.label === "本月预算")?.value || "¥0";
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
  const kind = companyKind(company);
  if (kind === "investment") {
    return [
      ["找项目源", "帮我找20个可能适合投资或合作的项目来源渠道"],
      ["写跟进消息", "帮我写一条发给项目方或合作伙伴的跟进消息"],
      ["做投资方案", "帮我做一份投资合作介绍和筛选标准"],
      ["安排尽调", "帮我把今天项目筛选、尽调和跟进工作列出来"],
    ];
  }
  if (kind === "trade") {
    return [
      ["找采购客户", "帮我找16个可能采购公司产品的客户"],
      ["写询价回复", "帮我写一条发给采购客户的报价跟进消息"],
      ["做报价单", "帮我做一份产品报价和交付说明"],
      ["安排发货", "帮我把今天报价、发货和回款工作列出来"],
    ];
  }
  return [
    ["找10个客户", "帮我找10个适合公司业务的潜在客户"],
    ["写跟进消息", "帮我写一条客户跟进消息"],
    ["做方案报价", "帮我做一份服务方案和报价"],
    ["安排员工", "帮我把今天员工要做的事列出来"],
  ];
}

function updateQuickActions(company) {
  quickActionsForCompany(company).forEach(([label, prompt], index) => {
    const button = els.quickActionButtons[index];
    if (!button) return;
    button.textContent = label;
    button.dataset.quick = prompt;
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
  const company = dashboardState.company || fallbackDashboard.company;
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
  const company = dashboardState.company || fallbackDashboard.company;
  const kind = companyKind(company);
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
  const advice =
    kind === "investment"
      ? "先确认投资方向，再推进项目来源和对外介绍。"
      : kind === "trade"
        ? "先确认报价口径，再推进采购客户和回款准备。"
        : "先确认关键事项，再推进客户、资料和收款准备。";
  return `${company.name}今日经营简报\n今日待确认：${dashboardState.tasks?.slice(0, 3).map((task) => task.title).join("、") || "暂无"}\nAI建议：${advice}`;
}

function openModal(key, detail) {
  modalCopyText = "";
  if (key === "manageTasks") {
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
    const company = dashboardState.company || fallbackDashboard.company;
    const companies = dashboardState.companies?.length
      ? dashboardState.companies
      : [{ ...company, isActive: true }];
    setModal(
      "我的公司",
      `<div class="modal-list">
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
      </div>
      <div class="modal-actions">
        <button class="bevel" type="button" data-modal="companySettings">修改当前公司</button>
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

function setAIStatus(message, state = "") {
  els.agentStatus.textContent = message;
  els.agentStatus.className = `agent-status ${state}`.trim();
}

function setAIBusy(isBusy) {
  agentBusy = isBusy;
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
    return;
  }
  setAIBusy(true);
  setAIStatus("处理中", "busy");
  addConversationMessage("user", message);
  const pendingMessageId = addConversationMessage("agent", "收到，我正在整理结果。", "pending");

  try {
    const started = await fetchJson("/api/agent/jobs", {
      method: "POST",
      body: JSON.stringify({ message }),
    });
    const data = await waitForAIJob(started.jobId);
    const output = data.output || "已处理完成，但没有新的文字结果。";
    updateConversationMessage(pendingMessageId, { text: output, state: "" });
    if (data.dashboard) renderDashboard(data.dashboard);
    pushLog("> AI员工已返回结果");
    setAIStatus("在线", "ready");
    toast("AI员工已完成");
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    updateConversationMessage(pendingMessageId, { text: `这次没有处理成功：${messageText}`, state: "error" });
    setAIStatus("待检查", "error");
    pushLog("> AI员工处理失败");
    toast("AI员工处理失败");
  } finally {
    setAIBusy(false);
  }
}

async function waitForAIJob(jobId) {
  if (!jobId) throw new Error("任务没有启动成功。");
  for (let attempt = 0; attempt < 80; attempt += 1) {
    await delay(attempt === 0 ? 700 : 1500);
    const data = await fetchJson(`/api/agent/jobs/${encodeURIComponent(jobId)}`);
    if (data.status === "done") return data;
    if (data.status === "error") throw new Error(data.error || "AI员工执行失败。");
    const seconds = Math.max(1, Math.round((data.durationMs || 0) / 1000));
    setAIStatus(`处理中 ${seconds}秒`, "busy");
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
  els.runCycleButton.disabled = true;
  pushLog("> AI员工开始跑一轮经营检查");
  try {
    const data = await fetchJson("/api/agents/run-cycle", { method: "POST", body: "{}" });
    renderDashboard(data.dashboard);
    toast("AI已经继续推进一轮");
    pushLog("> AI员工已完成一轮检查");
  } catch {
    toast("后端暂时不可用，已新增本地建议");
    const company = dashboardState.company || fallbackDashboard.company;
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

async function saveCompany(form) {
  const values = Object.fromEntries(new FormData(form).entries());
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
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
    renderDashboard(data.dashboard);
    history.replaceState(null, "", data.redirectTo || (data.dashboard?.company?.slug ? `/dashboard/${data.dashboard.company.slug}` : "/dashboard/fitscope"));
    setDashboardView("today");
    closeModal();
    toast(form.dataset.mode === "new" ? "新公司已建好" : "公司资料已保存");
    pushLog(form.dataset.mode === "new" ? "> 已新建公司看板" : "> 已更新公司资料");
  } catch (error) {
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
      if (doc) openModal("doc", { doc });
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

  els.surpriseButton.addEventListener("click", runCycle);
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
    button.addEventListener("click", () => sendMessage(button.dataset.quick));
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

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
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
      renderDashboard(fallbackDashboard);
      await loadDashboard({ quiet: true });
      if (location.pathname === "/login") {
        history.replaceState(null, "", `/dashboard/${session.company?.slug || "fitscope"}`);
      }
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
