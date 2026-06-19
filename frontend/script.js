const API_BASE = location.protocol === "file:" ? "http://localhost:5176" : "";

const fallbackDashboard = {
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
  credits: ["充值", "这里用于给AI员工增加可用次数。当前是本地演示版，不会产生真实扣费。"],
  newCompany: ["新建公司", "正式版可以为另一家公司新建看板，例如门店、工厂、贸易公司或服务公司。"],
  companies: ["我的公司", "当前公司：顺达机械。正式版可以在多家公司之间切换。"],
  upgrade: ["升级套餐", "升级后可以让AI做更多客户开发、写更多资料、跑更多经营任务。当前只做演示。"],
  companySettings: ["公司设置", "这里可以修改公司名称、主营业务、联系方式、官网域名和收款方式。"],
  profileSettings: ["老板资料", "这里可以设置老板姓名、接收提醒方式，以及每天汇报时间。"],
  about: ["这是干什么的", "这是一个AI公司经营系统。老板只要确认关键事项，AI员工会持续整理客户、写材料、生成任务、准备官网和提醒下一步。"],
  doctrine: ["使用原则", "简单说三条：小事让AI先做；重要事老板确认；每天只看最该处理的几件事。"],
  faq: ["常见问题", "它不会替老板乱发消息、乱扣钱、乱改公司资料。涉及对外发送和收款，都需要老板确认。"],
  manageTasks: ["查看全部", "这里可以查看所有待办事项，决定哪些让AI继续做、哪些交给员工做、哪些先放一放。"],
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
    headers: {
      "content-type": "application/json",
      "x-qxb-local": "1",
      ...(options.headers || {}),
    },
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
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
}

function showProduct() {
  els.loginView.classList.add("hidden");
  els.productView.classList.remove("hidden");
  els.loginView.hidden = true;
  els.productView.hidden = false;
  els.appShell.classList.toggle("chat-open", !compactViewport.matches);
  document.body.classList.add("dashboard-ready");
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

async function login(ownerName, ownerPhone) {
  localStorage.setItem("qxb_logged_in", "1");
  showProduct();
  pushLog("> 老板已进入公司看板");
  try {
    const data = await fetchJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ name: ownerName, phone: ownerPhone }),
    });
    renderDashboard(data.dashboard);
    history.replaceState(null, "", data.redirectTo || "/dashboard/fitscope");
  } catch {
    renderDashboard(fallbackDashboard);
    history.replaceState(null, "", "/dashboard/fitscope");
  }
  await checkClaudeBridge();
  startPassiveLogs();
}

function openModal(key, detail) {
  const [title, body] = modalCopy[key] || ["提示", "这个按钮已经接好，正式版会继续完成对应操作。"];
  els.modalTitle.textContent = title;
  els.modalBody.innerHTML = `<p>${escapeHtml(detail || body)}</p>`;
  els.modalBackdrop.hidden = false;
  els.menuPopover.classList.remove("open");
  els.menuButton.setAttribute("aria-expanded", "false");
}

function closeModal() {
  els.modalBackdrop.hidden = true;
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
    login(els.ownerName.value.trim() || "张老板", els.ownerPhone.value.trim());
  });

  els.demoLoginTop.addEventListener("click", () => {
    login(els.ownerName.value.trim() || "张老板", els.ownerPhone.value.trim());
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
      if (doc) openModal("doc", `${doc.title}已经准备好。老板可以直接看、改、发给员工或客户。`);
      return;
    }

    const channelNode = target.closest("[data-channel-action]");
    if (channelNode) {
      openModal("channel", "正式版会连接对应渠道。当前先让AI生成草稿，老板确认后再对外发送或开通。");
      return;
    }

    const actionNode = target.closest("[data-action]");
    if (actionNode?.dataset.action === "tweet") {
      pushLog("> 已准备对外发布草稿，等待老板最终确认");
      toast("发布草稿已准备好");
    }
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

  els.logoutButton.addEventListener("click", () => {
    localStorage.removeItem("qxb_logged_in");
    history.replaceState(null, "", "/login");
    showLogin();
    pushLog("> 已退出到老板入口");
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
  const loggedIn = localStorage.getItem("qxb_logged_in") === "1";
  if (location.pathname === "/login") {
    showLogin();
  } else if (loggedIn || location.pathname.startsWith("/dashboard")) {
    localStorage.setItem("qxb_logged_in", "1");
    showProduct();
    renderDashboard(fallbackDashboard);
    await loadDashboard({ quiet: true });
    await checkClaudeBridge();
    startPassiveLogs();
  } else {
    showLogin();
  }
  window.setInterval(() => {
    if (!claudeConnected && !claudeBusy) checkClaudeBridge();
  }, 5000);
}

init();
