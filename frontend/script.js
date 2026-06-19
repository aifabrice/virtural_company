const API_BASE = location.protocol === "file:" ? "http://localhost:5176" : "";

const fallbackDashboard = {
  owner: {
    name: "张老板",
    phone: "",
    reportTime: "每天上午9点",
  },
  company: {
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
      nextStep: "可交给Claude写出完整微信话术。",
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
  updatedAt: "本地演示",
};

const terminalLines = [
  "> Login portal.",
  "> 正在检查本地AI经营系统...",
  "> 已准备公司 dashboard",
  "> 已连接任务队列",
  "> 等待老板进入",
];

const modalCopy = {
  about: ["这是干什么的", "这是一个AI公司经营系统。老板只要确认关键事项，AI员工会持续整理客户、写材料、生成任务、准备官网和提醒下一步。"],
  doctrine: ["使用原则", "简单说三条：小事让AI先做；重要事老板确认；每天只看最该处理的几件事。"],
  faq: ["常见问题", "它不会替老板乱发消息、乱扣钱、乱改公司资料。涉及对外发送和收款，都需要老板确认。"],
  health: ["系统自检", "正在检查前端页面、本地后端和 Claude Code 连接状态。"],
};

const els = {
  terminalLines: document.querySelector("#terminalLines"),
  loginView: document.querySelector("#loginView"),
  productView: document.querySelector("#productView"),
  loginForm: document.querySelector("#loginForm"),
  demoLoginTop: document.querySelector("#demoLoginTop"),
  ownerName: document.querySelector("#ownerName"),
  ownerPhone: document.querySelector("#ownerPhone"),
  ownerCode: document.querySelector("#ownerCode"),
  companySlug: document.querySelector("#companySlug"),
  companyName: document.querySelector("#companyName"),
  companyMood: document.querySelector("#companyMood"),
  updatedAt: document.querySelector("#updatedAt"),
  metricGrid: document.querySelector("#metricGrid"),
  focusList: document.querySelector("#focusList"),
  agentList: document.querySelector("#agentList"),
  taskList: document.querySelector("#taskList"),
  docList: document.querySelector("#docList"),
  channelList: document.querySelector("#channelList"),
  socialDraft: document.querySelector("#socialDraft"),
  activityList: document.querySelector("#activityList"),
  inboxCard: document.querySelector("#inboxCard"),
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
  claudeStatus: document.querySelector("#claudeStatus"),
  claudeResult: document.querySelector("#claudeResult"),
  bridgeLink: document.querySelector("#bridgeLink"),
  imageInput: document.querySelector("#imageInput"),
  modalBackdrop: document.querySelector("#modalBackdrop"),
  modalTitle: document.querySelector("#modalTitle"),
  modalBody: document.querySelector("#modalBody"),
  modalClose: document.querySelector("#modalClose"),
  toastRegion: document.querySelector("#toastRegion"),
  logoutButton: document.querySelector("#logoutButton"),
};

let dashboardState = fallbackDashboard;
let claudeBusy = false;
let claudeConnected = false;
let passiveTimer = null;
let modalCopyText = "";
const compactViewport = window.matchMedia("(max-width: 980px)");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
        redirectToLogin("登录已过期，请重新输入口令。");
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

function showLogin() {
  els.loginView.classList.remove("hidden");
  els.productView.classList.add("hidden");
  els.loginView.hidden = false;
  els.productView.hidden = true;
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

function renderDashboard(data) {
  dashboardState = data || fallbackDashboard;
  const { company, metrics, agents, tasks, documents, channels, activity, inbox, socialDraft, updatedAt } = dashboardState;

  els.companySlug.textContent = `/dashboard/${company.slug || "fitscope"}`;
  els.companyName.textContent = company.name || "顺达机械";
  els.companyMood.textContent = company.mood || "AI员工正在替公司推进今天的经营任务";
  els.updatedAt.textContent = `更新：${updatedAt || "刚刚"}`;

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
          <button type="button" data-task-choice="claude" data-task-id="${escapeHtml(task.id)}">发给Claude</button>
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

  els.inboxCard.innerHTML = `<p><strong>${escapeHtml(inbox.title)}</strong></p><p>${escapeHtml(inbox.body)}</p>`;
}

async function loadDashboard({ quiet = false } = {}) {
  try {
    const data = await fetchJson("/api/dashboard");
    renderDashboard(data.dashboard);
    if (!quiet) toast("经营看板已更新");
    pushLog("> 已从本地后端刷新 dashboard");
  } catch (error) {
    renderDashboard(fallbackDashboard);
    if (!quiet) toast("后端暂时不可用，已显示本地演示数据");
    pushLog("> 后端未连接，显示本地演示数据");
  }
}

async function login(ownerName, ownerPhone, ownerCode) {
  const code = String(ownerCode || "").trim();
  if (!code) {
    toast("请输入登录口令");
    els.ownerCode.focus();
    return;
  }
  const submitButton = els.loginForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    const data = await fetchJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ name: ownerName, phone: ownerPhone, code }),
    });
    showProduct();
    renderDashboard(data.dashboard);
    history.replaceState(null, "", data.redirectTo || "/dashboard/fitscope");
    pushLog("> 老板已通过口令进入公司看板");
    toast("登录成功");
    await checkClaudeBridge();
    startPassiveLogs();
  } catch (error) {
    redirectToLogin(error.message || "登录失败，请检查口令。");
  } finally {
    submitButton.disabled = false;
  }
}

function moneyMetric() {
  return dashboardState.metrics?.find((item) => item.label === "本月预算")?.value || "¥0";
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
    <label>公司名称<input name="name" value="${escapeHtml(isNew ? "" : company.name || "")}" placeholder="例如：顺达机械" required /></label>
    <label>主营业务<input name="industry" value="${escapeHtml(isNew ? "" : company.industry || "")}" placeholder="例如：设备维修、门店零售、贸易批发" required /></label>
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
  if (doc.id.includes("leads")) {
    return `${company.name}客户开发名单\n1. 附近工业园设备负责人\n2. 老客户采购负责人\n3. 同行业转介绍客户\n建议话术：先问设备最近运行是否稳定，再介绍巡检服务。`;
  }
  if (doc.id.includes("website") || doc.id.includes("site")) {
    return `${company.name}官网资料\n主营业务：${company.industry}\n一句话介绍：${company.slogan || "帮客户把重要经营事项处理好"}\n下一步：确认联系电话、服务范围和案例。`;
  }
  if (doc.id.includes("pay")) {
    return "收款开通清单\n1. 营业执照\n2. 法人或经办人信息\n3. 对公账户\n4. 微信/支付宝商户资料\n注意：正式开通前需要老板确认。";
  }
  return `${company.name}今日经营简报\n今日待确认：${dashboardState.tasks?.slice(0, 3).map((task) => task.title).join("、") || "暂无"}\nAI建议：先确认报价，再推进老客户回访和收款准备。`;
}

function openModal(key, detail) {
  modalCopyText = "";
  if (key === "manageTasks") {
    const tasks = dashboardState.tasks || [];
    setModal(
      "查看全部",
      `<p>这些事项都保留在看板里。老板只需要决定：同意、交给Claude、还是先不做。</p>
      <div class="modal-list">
        ${tasks
          .map(
            (task) => `<article class="modal-item">
              <strong>${escapeHtml(task.title)}</strong>
              <p>${escapeHtml(task.body)}</p>
              <span class="meta">${escapeHtml(task.owner)} · ${escapeHtml(task.status)}</span>
              <div class="task-actions">
                <button type="button" data-task-choice="confirm" data-task-id="${escapeHtml(task.id)}">同意</button>
                <button type="button" data-task-choice="claude" data-task-id="${escapeHtml(task.id)}">发给Claude</button>
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
    setModal(
      "我的公司",
      `<div class="modal-list">
        <article class="modal-item">
          <strong>${escapeHtml(company.name)}</strong>
          <p>${escapeHtml(company.industry)}</p>
          <span class="meta">当前正在使用</span>
        </article>
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
        <button class="bevel" type="button" data-doc-claude="${escapeHtml(detail.doc.id)}">让Claude再优化</button>
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

function setClaudeStatus(message, state = "") {
  els.claudeStatus.textContent = message;
  els.claudeStatus.className = `bridge-status ${state}`.trim();
}

function setClaudeBusy(isBusy) {
  claudeBusy = isBusy;
  els.quickActionButtons.forEach((button) => {
    button.disabled = isBusy;
  });
  els.sendButton.disabled = isBusy || els.chatInput.value.trim().length === 0;
}

function cliSummary(data) {
  const claude = data.claude || data.providers?.claude || {};
  const claudeModel = claude.model ? `，模型 ${claude.model}` : "";
  const claudeText = claude.ok
    ? `Claude Code：已连接（${claude.version || "可用"}${claudeModel}）`
    : claude.version
      ? "Claude Code：已安装，但还没有配置可用密钥"
      : "Claude Code：未安装或服务未启动";
  return { claude, claudeText };
}

async function checkClaudeBridge() {
  try {
    const data = await fetchJson("/api/health", { headers: { "x-qxb-local": "1" } });
    const { claude, claudeText } = cliSummary(data);
    claudeConnected = Boolean(claude.ok);
    setClaudeStatus(claude.ok ? "Claude Code：已连接" : "Claude Code：需要配置", claude.ok ? "ready" : "error");
    els.claudeResult.textContent = `${claudeText}\n点击快捷按钮或输入指令后，Claude Code 会用 MiniMax-M3 返回结果。`;
    els.bridgeLink.textContent = "当前连接正常";
    els.bridgeLink.href = `${API_BASE || ""}/dashboard/fitscope`;
  } catch {
    claudeConnected = false;
    setClaudeStatus("Claude Code：未连接，请运行 npm start", "error");
    els.claudeResult.textContent = "页面仍可操作；如需真正调用 Claude Code，请在项目目录运行 npm start，然后刷新或等待自动重连。";
    els.bridgeLink.textContent = "打开连接版页面";
    els.bridgeLink.href = "http://localhost:5176/dashboard/fitscope";
  }
}

async function runClaudeCli(message) {
  if (claudeBusy) {
    toast("Claude Code 正在处理上一条指令");
    return;
  }
  setClaudeBusy(true);
  setClaudeStatus("Claude Code：正在处理老板指令...", "busy");
  els.claudeResult.textContent = "正在让 Claude Code 处理，请稍等。第一次可能会慢一点。";

  try {
    const started = await fetchJson("/api/claude/jobs", {
      method: "POST",
      body: JSON.stringify({ message }),
    });
    const data = await waitForClaudeJob(started.jobId);
    const output = data.output || "Claude Code 已完成，但没有返回文字。";
    els.claudeResult.textContent = output;
    if (data.dashboard) renderDashboard(data.dashboard);
    pushLog("> Claude Code 已返回结果");
    setClaudeStatus(`Claude Code：已完成（${Math.max(1, Math.round(data.durationMs / 1000))}秒）`, "ready");
    toast("Claude Code 已完成");
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    els.claudeResult.textContent = `调用 Claude Code 失败：${messageText}`;
    setClaudeStatus("Claude Code：调用失败", "error");
    pushLog("> Claude Code 调用失败");
    toast("Claude Code 调用失败");
  } finally {
    setClaudeBusy(false);
  }
}

async function waitForClaudeJob(jobId) {
  if (!jobId) throw new Error("Claude Code 任务没有启动成功。");
  for (let attempt = 0; attempt < 80; attempt += 1) {
    await delay(attempt === 0 ? 700 : 1500);
    const data = await fetchJson(`/api/claude/jobs/${encodeURIComponent(jobId)}`);
    if (data.status === "done") return data;
    if (data.status === "error") throw new Error(data.error || "Claude Code 执行失败。");
    const seconds = Math.max(1, Math.round((data.durationMs || 0) / 1000));
    setClaudeStatus(`Claude Code：正在处理老板指令...${seconds}秒`, "busy");
  }
  throw new Error("Claude Code 处理时间太久，请稍后再试。");
}

async function updateTask(taskId, action) {
  const task = dashboardState.tasks.find((item) => item.id === taskId);
  if (!task) return;
  if (action === "claude" || action === "codex") {
    await runClaudeCli(`请处理这件经营任务：${task.title}。${task.body}`);
  }
  try {
    const data = await fetchJson(`/api/tasks/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      body: JSON.stringify({ action }),
    });
    renderDashboard(data.dashboard);
    if (els.modalBackdrop.dataset.current === "manageTasks") openModal("manageTasks");
    toast(action === "pause" ? "已暂缓" : "已记录，AI会继续推进");
    pushLog(action === "pause" ? `> 老板暂缓：${task.title}` : `> 老板确认：${task.title}`);
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
    dashboardState.tasks.unshift({
      id: `local_${Date.now()}`,
      title: "给老板准备一个新方案",
      body: "AI建议先做一场老客户回访活动：不推销，先问设备是否有问题，再顺手介绍巡检服务。",
      owner: "总经理AI",
      status: "AI新建议",
      priority: "今天",
      nextStep: "老板确认后，AI继续写话术和名单。",
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
    history.replaceState(null, "", data.dashboard?.company?.slug ? `/dashboard/${data.dashboard.company.slug}` : "/dashboard/fitscope");
    closeModal();
    toast(form.dataset.mode === "new" ? "新公司已建好" : "公司资料已保存");
    pushLog(form.dataset.mode === "new" ? "> 已新建公司看板" : "> 已更新公司资料");
  } catch (error) {
    toast(error.message || "保存失败");
  } finally {
    button.disabled = false;
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
  runClaudeCli(clean);
}

async function runHealthCheck() {
  openModal("health", "正在检查前端页面、本地后端和 Claude Code 连接状态。");
  try {
    const data = await fetchJson("/api/health");
    const { claude, claudeText } = cliSummary(data);
    els.modalBody.innerHTML = `<p>前端：正常</p><p>后端：正常</p><p>${escapeHtml(claudeText)}</p><p>密钥：${claude.authConfigured ? "已配置" : "待配置"}</p><p>入口：/dashboard/fitscope</p>`;
    setClaudeStatus(claude.ok ? "Claude Code：已连接" : "Claude Code：需要配置", claude.ok ? "ready" : "error");
    toast("系统自检通过");
  } catch (error) {
    els.modalBody.innerHTML = `<p>前端：正常</p><p>后端或 AI CLI：需要检查</p><p>${escapeHtml(error.message || String(error))}</p>`;
    toast("系统自检发现问题");
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
  els.loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    login(els.ownerName.value.trim() || "张老板", els.ownerPhone.value.trim(), els.ownerCode.value.trim());
  });

  els.demoLoginTop.addEventListener("click", () => {
    els.ownerCode.focus();
    els.loginForm.requestSubmit();
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

    const docClaudeNode = target.closest("[data-doc-claude]");
    if (docClaudeNode) {
      const doc = dashboardState.documents.find((item) => item.id === docClaudeNode.dataset.docClaude);
      const text = modalCopyText;
      closeModal();
      runClaudeCli(`请帮我把这份资料优化得更适合传统企业老板直接使用：${doc ? doc.title : "公司资料"}。${text}`);
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
    els.sendButton.disabled = claudeBusy || els.chatInput.value.trim().length === 0;
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
      toast("图片已上传");
    }
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
  initEvents();
  try {
    const session = await fetchJson("/api/auth/session");
    if (session.loggedIn) {
      if (session.owner?.name) els.ownerName.value = session.owner.name;
      if (session.owner?.phone) els.ownerPhone.value = session.owner.phone;
      showProduct();
      renderDashboard(fallbackDashboard);
      await loadDashboard({ quiet: true });
      if (location.pathname === "/login") {
        history.replaceState(null, "", `/dashboard/${session.company?.slug || "fitscope"}`);
      }
      await checkClaudeBridge();
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
    if (!claudeConnected && !claudeBusy) checkClaudeBridge();
  }, 5000);
}

init();
