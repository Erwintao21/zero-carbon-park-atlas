(() => {
  "use strict";

  const REPOSITORY = "Erwintao21/zero-carbon-park-atlas";
  const SYSTEM_TYPE = "C55P_STATUS";
  const STATUS_PRIORITY = {
    UNKNOWN: 0,
    PLANNED: 1,
    PILOT: 2,
    SELECTED_FOR_CONSTRUCTION: 3,
    DESIGNATED: 4,
  };
  const VERIFIED_LEVELS = new Set(["E3_OFFICIAL_SECONDARY", "E4_OFFICIAL_PRIMARY"]);
  const LABELS = {
    NEW_STATUS: "新增状态",
    UPDATE: "状态更新",
    CORRECTION: "信息纠错",
    SOURCE_SUPPLEMENT: "补充证据",
    DESIGNATED: "正式认定",
    SELECTED_FOR_CONSTRUCTION: "入选建设名单",
    PILOT: "试点",
    PLANNED: "规划建设",
    OTHER: "其他",
    UNKNOWN: "不确定",
    NATIONAL: "国家级",
    PROVINCIAL: "省级",
    MUNICIPAL: "市级",
  };
  const model = { catalog: [], history: [], submissionLog: [], profiles: [] };

  const $ = (selector, root = document) => root.querySelector(selector);
  const text = value => String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim();
  const safeUrl = value => {
    try {
      const parsed = new URL(text(value));
      return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
    } catch (_) {
      return "";
    }
  };
  const field = (form, name) => text(new FormData(form).get(name));
  const randomCode = () => {
    const bytes = new Uint8Array(2);
    crypto.getRandomValues(bytes);
    return [...bytes].map(value => value.toString(16).padStart(2, "0")).join("").toUpperCase();
  };
  function generateSubmissionId(parkId, now = new Date()) {
    const date = [now.getUTCFullYear(), String(now.getUTCMonth() + 1).padStart(2, "0"), String(now.getUTCDate()).padStart(2, "0")].join("");
    const park = text(parkId).replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 12) || "OUTOFLIST";
    return `C55P-${date}-${park}-${randomCode()}`;
  }
  function evidenceAssessment(data) {
    const url = safeUrl(data.Source_URL);
    const host = url ? new URL(url).hostname.toLowerCase() : "";
    const publisher = text(data.Publisher);
    const primaryPublisher = /(发展和改革|工业和信息化|生态环境|人民政府|管理委员会|厅|部|委)/.test(publisher);
    if ((host.endsWith("gov.cn") || host.includes("ndrc.gov.cn") || host.includes("miit.gov.cn")) && primaryPublisher) {
      return { Evidence_Level: "E4_OFFICIAL_PRIMARY", Evidence_Quality: "HIGH" };
    }
    if (host.endsWith("gov.cn") || primaryPublisher) {
      return { Evidence_Level: "E3_OFFICIAL_SECONDARY", Evidence_Quality: "HIGH" };
    }
    if (/(园区|开发区|集团|公司|研究院|协会)/.test(publisher)) {
      return { Evidence_Level: "E2_INSTITUTIONAL", Evidence_Quality: "LOW" };
    }
    if (url) return { Evidence_Level: "E1_MEDIA", Evidence_Quality: "LOW" };
    return { Evidence_Level: "E0_UNVERIFIED", Evidence_Quality: "LOW" };
  }
  function validateSubmission(data, catalog = model.catalog) {
    const errors = [];
    const parkExists = catalog.some(park => park.park_id === data.Park_ID);
    if (!parkExists && data.Park_ID !== "OUT_OF_CATALOG") errors.push("Park_ID 不在67园区目录中。");
    if (data.Park_ID === "OUT_OF_CATALOG" && !data.Park_Name) errors.push("请填写不在列表中的园区名称。");
    if (!data.Proposed_Status) errors.push("请选择建议建设状态。");
    if (!data.Recognition_Name) errors.push("请填写状态名称。");
    if (!data.Source_Title) errors.push("请填写文件或公告名称。");
    if (!data.Publisher) errors.push("请填写发布机构。");
    if (!/^\d{4}(?:-\d{2}-\d{2})?$/.test(data.Publication_Date || "")) errors.push("发布时间应为 YYYY 或 YYYY-MM-DD。");
    if (/^\d{4}-\d{2}-\d{2}$/.test(data.Publication_Date || "") && Number.isNaN(Date.parse(`${data.Publication_Date}T00:00:00Z`))) errors.push("发布时间不是有效日期。");
    const year = Number(data.Status_Year);
    if (!/^\d{4}$/.test(data.Status_Year || "") || year < 1900 || year > new Date().getUTCFullYear() + 1) errors.push("状态生效年份不合理。");
    if (!safeUrl(data.Source_URL)) errors.push("来源URL必须是有效的 http:// 或 https:// 地址。");
    if (!data.Evidence_Text) errors.push("请填写直接支持状态判断的简短证据原文。");
    if (data.Proposed_Status === "PILOT" && !/(试点|示范试点)/.test([data.Recognition_Name, data.Source_Title, data.Evidence_Text].join(" "))) errors.push("试点状态的证据必须包含“试点”或“示范试点”等正式措辞。");
    if (data.Proposed_Status === "DESIGNATED" && (!data.Source_Title || !data.Publisher || !safeUrl(data.Source_URL))) errors.push("正式认定必须具备文件名称、发布机构和有效来源URL。");
    return errors;
  }
  function computeCurrentStatus(rows) {
    const verified = rows.filter(row => row.Reviewed_Status === "ACCEPTED" && VERIFIED_LEVELS.has(row.Evidence_Level));
    if (!verified.length) return null;
    return verified.slice().sort((a, b) => {
      const priority = (STATUS_PRIORITY[b.Recognition_Status] ?? -1) - (STATUS_PRIORITY[a.Recognition_Status] ?? -1);
      return priority || Number(b.Year || 0) - Number(a.Year || 0);
    })[0];
  }
  function buildIssueBody(data) {
    const ordered = [
      "Submission_Type_System", "Park_ID", "Park_Name", "Submission_Type", "Proposed_Status",
      "Recognition_Level", "Recognition_Name", "Status_Year", "Publisher", "Source_Title",
      "Publication_Date", "Source_URL", "Evidence_Text", "Evidence_Location", "Notes",
      "Supersedes_Evidence_ID", "Corrects_Record_ID", "Contributor", "Evidence_Level",
      "Evidence_Quality", "Review_Status", "Submission_ID",
    ];
    const lines = ["## C55-P Status Submission", ""];
    ordered.forEach(key => {
      lines.push(`${key}:`);
      lines.push(text(data[key]) || "—");
      lines.push("");
    });
    lines.push("提交来源:", "Zero-Carbon Park Data Atlas", "", "> 本Issue默认进入待审核队列，不会直接修改正式数据库。");
    return lines.join("\n");
  }
  function buildIssueUrl(data) {
    const title = `[C55-P Submission] ${data.Park_ID} | ${data.Proposed_Status} | ${data.Recognition_Name}`;
    const url = new URL(`https://github.com/${REPOSITORY}/issues/new`);
    url.searchParams.set("title", title);
    url.searchParams.set("body", buildIssueBody(data));
    url.searchParams.set("labels", "data-submission,c55p,needs-review");
    return url.href;
  }
  function formData(form) {
    const parkId = field(form, "Park_ID");
    const selected = model.catalog.find(park => park.park_id === parkId);
    const data = {
      Submission_Type_System: SYSTEM_TYPE,
      Park_ID: parkId,
      Park_Name: selected?.park_name || field(form, "Other_Park_Name"),
      Submission_Type: field(form, "Submission_Type"),
      Proposed_Status: field(form, "Proposed_Status"),
      Recognition_Level: field(form, "Recognition_Level"),
      Recognition_Name: field(form, "Recognition_Name"),
      Status_Year: field(form, "Status_Year"),
      Publisher: field(form, "Publisher"),
      Source_Title: field(form, "Source_Title"),
      Publication_Date: field(form, "Publication_Date"),
      Source_URL: field(form, "Source_URL"),
      Evidence_Text: field(form, "Evidence_Text"),
      Evidence_Location: field(form, "Evidence_Location"),
      Notes: field(form, "Notes"),
      Supersedes_Evidence_ID: field(form, "Supersedes_Evidence_ID"),
      Corrects_Record_ID: field(form, "Corrects_Record_ID"),
      Contributor: field(form, "Contributor_Name"),
      Review_Status: "PENDING",
    };
    Object.assign(data, evidenceAssessment(data));
    data.Submission_ID = generateSubmissionId(data.Park_ID);
    return data;
  }
  function renderErrors(errors) {
    const box = $("#formErrors");
    box.replaceChildren();
    if (!errors.length) {
      box.hidden = true;
      return;
    }
    const title = document.createElement("strong");
    title.textContent = "请修正以下问题：";
    const list = document.createElement("ul");
    errors.forEach(error => {
      const item = document.createElement("li");
      item.textContent = error;
      list.append(item);
    });
    box.append(title, list);
    box.hidden = false;
  }
  function renderPreview(data) {
    const labels = [
      ["Submission ID", "Submission_ID"], ["园区", "Park_Name"], ["Park ID", "Park_ID"],
      ["提交类型", "Submission_Type"], ["建议状态", "Proposed_Status"], ["认定层级", "Recognition_Level"],
      ["认定 / 状态名称", "Recognition_Name"], ["状态年份", "Status_Year"], ["发布机构", "Publisher"],
      ["来源", "Source_Title"], ["发布时间", "Publication_Date"], ["来源 URL", "Source_URL"],
      ["证据", "Evidence_Text"], ["证据位置", "Evidence_Location"], ["证据等级", "Evidence_Level"],
      ["审核状态", "Review_Status"], ["备注", "Notes"], ["替代证据", "Supersedes_Evidence_ID"],
      ["纠正记录", "Corrects_Record_ID"], ["提交人", "Contributor"],
    ];
    const list = $("#previewFields");
    list.replaceChildren();
    labels.forEach(([label, key]) => {
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = LABELS[data[key]] || data[key] || "—";
      list.append(dt, dd);
    });
    const confirm = $("#confirmSubmission");
    confirm.href = buildIssueUrl(data);
    confirm.dataset.submissionId = data.Submission_ID;
    $("#submissionPreview").hidden = false;
    $("#submissionThanks").hidden = true;
    $("#contributionForm").hidden = true;
    $("#submissionPreview").scrollIntoView({ block: "start" });
  }
  function populateParks() {
    const select = $("#contributionPark");
    select.replaceChildren();
    model.catalog.forEach(park => {
      const option = document.createElement("option");
      option.value = park.park_id;
      option.textContent = `${park.park_name}（${park.park_id}）`;
      select.append(option);
    });
    const other = document.createElement("option");
    other.value = "OUT_OF_CATALOG";
    other.textContent = "园区不在列表中（单独人工复核）";
    select.append(other);
  }
  function updateParkField() {
    const value = $("#contributionPark").value;
    $("#otherParkWrap").hidden = value !== "OUT_OF_CATALOG";
    $("#selectedParkId").textContent = value === "OUT_OF_CATALOG" ? "Park_ID：OUT_OF_CATALOG · 进入人工复核" : `Park_ID：${value}`;
  }
  function openContribution(parkId = "", submissionType = "NEW_STATUS") {
    if (!model.catalog.length) {
      document.addEventListener("atlas:data-ready", () => openContribution(parkId, submissionType), { once: true });
      return;
    }
    const form = $("#contributionForm");
    form.reset();
    form.hidden = false;
    $("#submissionPreview").hidden = true;
    renderErrors([]);
    const parkSelect = $("#contributionPark");
    parkSelect.value = model.catalog.some(park => park.park_id === parkId) ? parkId : model.catalog[0]?.park_id || "OUT_OF_CATALOG";
    form.elements.Submission_Type.value = submissionType;
    updateParkField();
    const drawer = $("#contributionDrawer");
    if (!drawer.open) drawer.showModal();
  }
  function openHistory(parkId) {
    const park = model.catalog.find(item => item.park_id === parkId);
    const rows = model.history.filter(row => row.Park_ID === parkId).sort((a, b) => Number(a.Year) - Number(b.Year));
    $("#historyTitle").textContent = `${park?.park_name || parkId} · 建设状态历史`;
    const timeline = $("#parkHistoryTimeline");
    timeline.replaceChildren();
    rows.forEach(row => {
      const item = document.createElement("article");
      const year = document.createElement("strong");
      const title = document.createElement("h3");
      const meta = document.createElement("p");
      year.textContent = row.Year || "年份待核实";
      title.textContent = `${LABELS[row.Recognition_Status] || row.Recognition_Status} · ${row.Recognition_Name || row.Source_Title}`;
      const verification = VERIFIED_LEVELS.has(row.Evidence_Level) ? row.Reviewed_Status : "待进一步验证";
      meta.textContent = `${row.Publisher} · ${row.Evidence_Level} · ${verification}`;
      item.append(year, title, meta);
      const url = safeUrl(row.URL);
      if (url) {
        const link = document.createElement("a");
        link.className = "source-link";
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = `${row.Evidence_ID} · 查看证据 ↗`;
        item.append(link);
      }
      timeline.append(item);
    });
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.textContent = "暂无已审核历史记录。";
      timeline.append(empty);
    }
    $("#historyDrawer").showModal();
  }
  function renderSubmissionLog() {
    const root = $("#submissionLog");
    root.replaceChildren();
    if (!model.submissionLog.length) {
      const empty = document.createElement("p");
      empty.className = "sub";
      empty.textContent = "当前公开日志尚无登记记录。GitHub Issue 中的提交均保持待审核，只有管理员登记后才会出现在这里。";
      root.append(empty);
      return;
    }
    model.submissionLog.slice().sort((a, b) => text(b.Submitted_Date).localeCompare(text(a.Submitted_Date))).forEach(row => {
      const item = document.createElement("article");
      const title = document.createElement("strong");
      const meta = document.createElement("span");
      title.textContent = `${row.Submitted_Date} · ${row.Park_Name}`;
      meta.textContent = `${LABELS[row.Submission_Type] || row.Submission_Type} · ${row.Review_Status}`;
      item.append(title, meta);
      root.append(item);
    });
  }
  function bindEvents() {
    document.addEventListener("click", event => {
      const contribution = event.target.closest("[data-open-contribution]");
      if (contribution) openContribution(contribution.dataset.contributePark || "", contribution.dataset.openContribution || "NEW_STATUS");
      const history = event.target.closest("[data-history-park]");
      if (history) openHistory(history.dataset.historyPark);
    });
    $("#contributionPark").addEventListener("change", updateParkField);
    $("#contributionForm").addEventListener("submit", event => {
      event.preventDefault();
      const data = formData(event.currentTarget);
      const errors = validateSubmission(data);
      renderErrors(errors);
      if (!errors.length) renderPreview(data);
    });
    $("#backToEdit").addEventListener("click", () => {
      $("#submissionPreview").hidden = true;
      $("#contributionForm").hidden = false;
    });
    $("#confirmSubmission").addEventListener("click", () => {
      $("#submissionThanks").hidden = false;
    });
    $("[data-close-drawer]").addEventListener("click", () => $("#contributionDrawer").close());
    $("[data-close-history]").addEventListener("click", () => $("#historyDrawer").close());
  }
  document.addEventListener("atlas:data-ready", event => {
    Object.assign(model, event.detail);
    populateParks();
    updateParkField();
    renderSubmissionLog();
  });
  bindEvents();

  window.AtlasContribution = Object.freeze({ open: openContribution, history: openHistory });
  window.AtlasContributionTestAPI = Object.freeze({
    generateSubmissionId,
    validateSubmission,
    buildIssueBody,
    buildIssueUrl,
    computeCurrentStatus,
    safeUrl,
  });
})();
