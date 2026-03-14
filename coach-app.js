const STORAGE_KEY = "running-coach-app-state-v1";

const defaultState = {
  profile: {},
  coaching: {
    currentPhase: "構築期",
    cycleWeek: "1",
    currentFocus: "LT1.5",
    jogHrCap: "75%HRmax (~150bpm)",
    refreshMileage: "通常週の75-80%",
    refreshLongRun: "100-120分 -> 75-85分",
    weeklyStructure: `月 ジョグ
火 LT1 or LT1.5
水 ジョグ + スプリント
木 ジョグ
金 LT1 or LT1.5
土 ロング
日 オフ or 軽いジョグ`,
    lt1MenuLibrary: `5分×7 (r60s) / 基準 150-156bpm / cap 160bpm / レスト 130-140bpm
6分×5-6 (r60s) / 基準 150-156bpm / cap 160bpm / レスト 130-140bpm
30-40分モデレート / 基準 150-156bpm / cap 160bpm`,
    lt15MenuLibrary: `3分×8-10 (r50-60s) / 基準 164-168bpm / cap 170bpm / レスト 144-156bpm
5分×4-5 (r60-75s) / 基準 164-169bpm / cap 170bpm
15-20分×2 (r2-3分) / 基準 164-168bpm / cap 169-170bpm`,
    longRunLibrary: `ベースロング 100-110分 / 前半 ~150bpm / 後半もLT1未満中心
ビルドアップロング 100-120分 / 後半だけLT1付近まで
マラソン耐性ロング 100-120分 / 動きを保ったまま後半の粘り確認
30km超はレース前に1-2回のみ`,
    collaborationStyle: "メニューは固定ではなく、期分けと4週サイクルを前提にAIと一緒に考える。提案は新規作成よりも既存メニューの微修正を基本とする。",
  },
  weekPlans: [],
  races: [],
  logs: [],
  latestFeedback: null,
};

const state = loadState();

const profileForm = document.getElementById("profile-form");
const coachingForm = document.getElementById("coaching-form");
const weekPlanForm = document.getElementById("week-plan-form");
const raceForm = document.getElementById("race-form");
const logForm = document.getElementById("log-form");
const runOcrButton = document.getElementById("run-ocr");
const summaryCount = document.getElementById("summary-count");
const graphCount = document.getElementById("graph-count");
const lapsCount = document.getElementById("laps-count");
const plannedSessionTitle = document.getElementById("planned-session-title");
const plannedSessionNote = document.getElementById("planned-session-note");
const plannedSessionDetails = document.getElementById("planned-session-details");
const environmentField = logForm?.elements?.namedItem("environment");
const temperatureField = logForm?.elements?.namedItem("temperatureC");

const profileStatus = document.getElementById("profile-status");
const coachingStatus = document.getElementById("coaching-status");
const weekPlanStatus = document.getElementById("week-plan-status");
const raceStatus = document.getElementById("race-status");
const logStatus = document.getElementById("log-status");
const ocrStatus = document.getElementById("ocr-status");

const raceList = document.getElementById("race-list");
const weekPlanList = document.getElementById("week-plan-list");
const logList = document.getElementById("log-list");
const feedbackOutput = document.getElementById("feedback-output");
const aiHandoff = document.getElementById("ai-handoff");
const feedbackSection = document.getElementById("today-feedback");

const fatigueBadge = document.getElementById("fatigue-badge");
const fatigueNote = document.getElementById("fatigue-note");
const fitnessBadge = document.getElementById("fitness-badge");
const fitnessNote = document.getElementById("fitness-note");
const goalBadge = document.getElementById("goal-badge");
const goalNote = document.getElementById("goal-note");
const phaseBadge = document.getElementById("phase-badge");
const phaseNote = document.getElementById("phase-note");
const focusBadge = document.getElementById("focus-badge");
const focusNote = document.getElementById("focus-note");
const weeklyPlan = document.getElementById("weekly-plan");
const blockPlan = document.getElementById("block-plan");
const roadmapPlan = document.getElementById("roadmap-plan");

hydrateForms();
seedDefaultDate();
seedDefaultWeekStart();
bindFileCountLabels();
bindPlannedSessionPreview();
bindEnvironmentField();
renderAll();

profileForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(profileForm);
  state.profile = Object.fromEntries(formData.entries());
  saveState();
  profileStatus.textContent = "プロフィールを保存しました。";
  renderAll();
});

coachingForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(coachingForm);
  state.coaching = {
    ...state.coaching,
    ...Object.fromEntries(formData.entries()),
  };
  saveState();
  coachingStatus.textContent = "コーチ設計を保存しました。";
  renderAll();
});

weekPlanForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(weekPlanForm);
  const weekPlan = {
    id: crypto.randomUUID(),
    weekStart: formData.get("weekStart")?.toString() || today(),
    theme: formData.get("theme")?.toString().trim() || "",
    notes: formData.get("notes")?.toString().trim() || "",
    days: {
      monday: formData.get("monday")?.toString().trim() || "",
      tuesday: formData.get("tuesday")?.toString().trim() || "",
      wednesday: formData.get("wednesday")?.toString().trim() || "",
      thursday: formData.get("thursday")?.toString().trim() || "",
      friday: formData.get("friday")?.toString().trim() || "",
      saturday: formData.get("saturday")?.toString().trim() || "",
      sunday: formData.get("sunday")?.toString().trim() || "",
    },
  };

  state.weekPlans = state.weekPlans.filter((item) => item.weekStart !== weekPlan.weekStart);
  state.weekPlans.push(weekPlan);
  state.weekPlans.sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));
  saveState();
  weekPlanStatus.textContent = "週の予定メニューを保存しました。";
  weekPlanForm.reset();
  seedDefaultWeekStart();
  updatePlannedSessionPreview();
  renderAll();
});

raceForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(raceForm);
  const race = {
    id: crypto.randomUUID(),
    name: formData.get("name")?.toString().trim() || "",
    date: formData.get("date")?.toString() || "",
    distance: formData.get("distance")?.toString() || "",
    targetTime: formData.get("targetTime")?.toString().trim() || "",
    priority: formData.get("priority")?.toString() || "sub",
    notes: formData.get("notes")?.toString().trim() || "",
  };

  if (race.priority === "main") {
    state.races = state.races.map((item) => ({ ...item, priority: "sub" }));
  }

  state.races.push(race);
  state.races.sort((a, b) => new Date(a.date) - new Date(b.date));
  saveState();
  raceStatus.textContent = "大会を追加しました。";
  raceForm.reset();
  renderAll();
});

logForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(logForm);
  const log = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    date: formData.get("date")?.toString() || "",
    environment: formData.get("environment")?.toString() || "outdoor",
    temperatureC: formData.get("environment")?.toString() === "treadmill" ? null : nullableNumberValue(formData.get("temperatureC")),
    rpe: numberValue(formData.get("rpe")),
    pain: formData.get("pain")?.toString() || "なし",
    sleepHours: numberValue(formData.get("sleepHours")),
    sessionType: formData.get("sessionType")?.toString() || "未分類",
    notes: formData.get("notes")?.toString().trim() || "",
    metrics: {
      distanceKm: numberValue(formData.get("distanceKm")),
      duration: formData.get("duration")?.toString().trim() || "",
      avgPace: formData.get("avgPace")?.toString().trim() || "",
      avgHr: numberValue(formData.get("avgHr")),
      maxHr: numberValue(formData.get("maxHr")),
      lapsSummary: formData.get("lapsSummary")?.toString().trim() || "",
    },
  };

  state.logs.push(log);
  state.logs.sort((a, b) => new Date(b.date) - new Date(a.date));
  state.latestFeedback = buildFeedback(log, state);
  saveState();
  logStatus.textContent = "保存しました。固定フィードバックへ移動します。";
  logForm.reset();
  seedDefaultDate();
  syncEnvironmentField();
  updateFileCountLabels();
  updatePlannedSessionPreview();
  renderAll();
  feedbackSection?.scrollIntoView({ behavior: "smooth", block: "start" });
});

runOcrButton?.addEventListener("click", async () => {
  const summaryFile = logForm.elements.summaryImage.files[0];
  const graphFile = logForm.elements.graphImage.files[0];
  const lapsFiles = Array.from(logForm.elements.lapsImage.files || []);
  const files = [summaryFile, graphFile, ...lapsFiles].filter(Boolean);

  if (!files.length) {
    ocrStatus.textContent = "先にGarmin画像を1枚以上選択してください。";
    return;
  }

  if (!window.Tesseract) {
    ocrStatus.textContent = "OCRライブラリの読み込みを待っています。数秒後に再実行してください。";
    return;
  }

  ocrStatus.textContent = `画像を読み取っています。${files.length}枚のため少し時間がかかることがあります。`;

  try {
    const texts = [];
    for (const file of files) {
      const result = await window.Tesseract.recognize(file, "eng+jpn");
      texts.push(result.data.text || "");
    }

    const parsed = parseGarminText(texts.join("\n"));
    applyMetricsToForm(parsed);
    ocrStatus.textContent = "OCRを反映しました。必要に応じて数値を補正してください。";
  } catch (error) {
    console.error(error);
    ocrStatus.textContent = "OCRに失敗しました。画像の解像度や表示倍率を確認してください。";
  }
});

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      coaching: {
        ...structuredClone(defaultState).coaching,
        ...(parsed.coaching || {}),
      },
    };
  } catch (error) {
    console.error(error);
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function hydrateForms() {
  for (const [key, value] of Object.entries(state.profile || {})) {
    const field = profileForm?.elements?.namedItem(key);
    if (field) field.value = value;
  }

  for (const [key, value] of Object.entries(state.coaching || {})) {
    const field = coachingForm?.elements?.namedItem(key);
    if (field) field.value = value;
  }
}

function seedDefaultDate() {
  const dateField = logForm?.elements?.namedItem("date");
  if (dateField && !dateField.value) {
    dateField.value = today();
  }
}

function bindEnvironmentField() {
  environmentField?.addEventListener("change", syncEnvironmentField);
  syncEnvironmentField();
}

function syncEnvironmentField() {
  if (!environmentField || !temperatureField) return;
  const isTreadmill = environmentField.value === "treadmill";
  temperatureField.disabled = isTreadmill;
  temperatureField.placeholder = isTreadmill ? "不要" : "12";
  if (isTreadmill) {
    temperatureField.value = "";
  }
}

function seedDefaultWeekStart() {
  const weekStartField = weekPlanForm?.elements?.namedItem("weekStart");
  if (weekStartField && !weekStartField.value) {
    weekStartField.value = getWeekStart(today());
  }
}

function bindFileCountLabels() {
  const fields = [
    { input: logForm?.elements?.summaryImage, target: summaryCount, multiple: false },
    { input: logForm?.elements?.graphImage, target: graphCount, multiple: false },
    { input: logForm?.elements?.lapsImage, target: lapsCount, multiple: true },
  ];

  fields.forEach(({ input }) => {
    input?.addEventListener("change", updateFileCountLabels);
  });

  updateFileCountLabels();
}

function bindPlannedSessionPreview() {
  logForm?.elements?.date?.addEventListener("change", updatePlannedSessionPreview);
  updatePlannedSessionPreview();
}

function updatePlannedSessionPreview() {
  if (!logForm || !plannedSessionTitle || !plannedSessionNote || !plannedSessionDetails) return;
  const dateField = logForm?.elements?.namedItem("date");
  const plannedSession = getPlannedSessionForDate(state.weekPlans, dateField?.value || today());

  if (!plannedSession?.planned) {
    plannedSessionTitle.textContent = "未登録";
    plannedSessionNote.textContent = "週次予定メニューを登録すると、ここに自動表示されます。";
    plannedSessionDetails.innerHTML = "";
    autoSelectSessionType("");
    seedNotesFromPlan(null);
    return;
  }

  plannedSessionTitle.textContent = plannedSession.planned;
  plannedSessionNote.textContent = `${plannedSession.weekStart}週 / ${plannedSession.theme || "テーマ未設定"}${plannedSession.notes ? ` / ${plannedSession.notes}` : ""}`;
  plannedSessionDetails.innerHTML = renderPlannedSessionDetails(plannedSession.planned, state.coaching);
  autoSelectSessionType(plannedSession.planned);
  seedNotesFromPlan(plannedSession);
}

function updateFileCountLabels() {
  setFileCountLabel(logForm?.elements?.summaryImage, summaryCount, false);
  setFileCountLabel(logForm?.elements?.graphImage, graphCount, false);
  setFileCountLabel(logForm?.elements?.lapsImage, lapsCount, true);
}

function setFileCountLabel(input, target, multiple) {
  if (!input || !target) return;
  const count = input.files?.length || 0;

  if (!count) {
    target.textContent = "未選択";
    return;
  }

  target.textContent = multiple ? `${count}枚を選択中` : "1枚を選択中";
}

function renderAll() {
  renderWeekPlans();
  renderRaces();
  renderDashboard();
  renderLogs();
  renderFeedback();
  renderAiHandoff();
}

function renderWeekPlans() {
  if (!weekPlanList) return;
  if (!state.weekPlans.length) {
    weekPlanList.innerHTML = `<div class="list-item"><p class="list-note">まだ週次の予定メニューは登録されていません。</p></div>`;
    return;
  }

  weekPlanList.innerHTML = state.weekPlans
    .slice(0, 4)
    .map((plan) => {
      const dayLines = [
        ["月", plan.days.monday],
        ["火", plan.days.tuesday],
        ["水", plan.days.wednesday],
        ["木", plan.days.thursday],
        ["金", plan.days.friday],
        ["土", plan.days.saturday],
        ["日", plan.days.sunday],
      ]
        .filter(([, value]) => value)
        .map(([label, value]) => `${label}: ${escapeHtml(value)}`)
        .join("<br />");

      return `
        <article class="list-item">
          <div class="list-item__head">
            <strong>${escapeHtml(plan.weekStart)} 週</strong>
            ${plan.theme ? `<span class="pill">${escapeHtml(plan.theme)}</span>` : ""}
          </div>
          <p class="list-note">${dayLines || "曜日メニュー未入力"}</p>
          ${plan.notes ? `<p class="list-note">${escapeHtml(plan.notes)}</p>` : ""}
        </article>
      `;
    })
    .join("");
}

function renderRaces() {
  if (!raceList) return;
  if (!state.races.length) {
    raceList.innerHTML = `<div class="list-item"><p class="list-note">まだ大会は登録されていません。</p></div>`;
    return;
  }

  raceList.innerHTML = state.races
    .map((race) => {
      const days = daysUntil(race.date);
      const priorityClass = race.priority === "main" ? "pill pill--main" : "pill";
      const priorityLabel = race.priority === "main" ? "主目標" : "サブ目標";
      return `
        <article class="list-item">
          <div class="list-item__head">
            <strong>${escapeHtml(race.name)}</strong>
            <span class="${priorityClass}">${priorityLabel}</span>
          </div>
          <p>${escapeHtml(race.distance)} / ${escapeHtml(race.date)} / 目標 ${escapeHtml(race.targetTime)}</p>
          <p class="list-note">${days >= 0 ? `本番まであと${days}日` : "開催済みの大会です。"}</p>
          ${race.notes ? `<p class="list-note">${escapeHtml(race.notes)}</p>` : ""}
        </article>
      `;
    })
    .join("");
}

function renderDashboard() {
  if (!fatigueBadge || !fatigueNote || !fitnessBadge || !fitnessNote || !goalBadge || !goalNote || !weeklyPlan || !blockPlan || !roadmapPlan) return;
  const latestLog = state.logs[0];
  const dashboard = buildDashboard(state, latestLog);

  fatigueBadge.textContent = dashboard.fatigue.label;
  fatigueBadge.className = `metric-card__value ${dashboard.fatigue.tone}`;
  fatigueNote.textContent = dashboard.fatigue.note;

  fitnessBadge.textContent = dashboard.fitness.label;
  fitnessBadge.className = `metric-card__value ${dashboard.fitness.tone}`;
  fitnessNote.textContent = dashboard.fitness.note;

  goalBadge.textContent = dashboard.goal.label;
  goalBadge.className = "metric-card__value";
  goalNote.textContent = dashboard.goal.note;

  phaseBadge.textContent = dashboard.phase.label;
  phaseBadge.className = "metric-card__value snapshot-tile__value--small";
  phaseNote.textContent = dashboard.phase.note;

  focusBadge.textContent = dashboard.focus.label;
  focusBadge.className = "metric-card__value snapshot-tile__value--small";
  focusNote.textContent = dashboard.focus.note;

  weeklyPlan.innerHTML = renderPlanList(dashboard.plans.weekly);
  blockPlan.innerHTML = renderPlanList(dashboard.plans.block);
  roadmapPlan.innerHTML = renderPlanList(dashboard.plans.roadmap);
}

function renderLogs() {
  if (!logList) return;
  if (!state.logs.length) {
    logList.innerHTML = `<div class="list-item"><p class="list-note">まだログはありません。</p></div>`;
    return;
  }

  logList.innerHTML = state.logs
    .slice(0, 8)
    .map((log) => {
      const feedback = buildFeedback(log, state);
      return `
        <article class="list-item">
          <div class="list-item__head">
            <strong>${escapeHtml(log.date)} / ${escapeHtml(log.sessionType)}</strong>
            <span class="pill">${feedback.fatigueBadge}</span>
          </div>
          <p>RPE ${log.rpe || "-"} / 痛み ${escapeHtml(log.pain)} / 睡眠 ${displayNumber(log.sleepHours)}時間 / ${formatEnvironment(log.environment, log.temperatureC)}</p>
          <p class="list-note">
            ${displayNumber(log.metrics.distanceKm)}km / ${escapeHtml(log.metrics.duration || "-")} / ${escapeHtml(log.metrics.avgPace || "-")} / 平均HR ${displayNumber(log.metrics.avgHr)}
          </p>
        </article>
      `;
    })
    .join("");
}

function renderFeedback() {
  if (!feedbackOutput) return;
  const source = state.latestFeedback || (state.logs[0] ? buildFeedback(state.logs[0], state) : null);
  if (!source) return;

  feedbackOutput.innerHTML = `
    ${renderFeedbackBlock("今日の練習評価", `<p>${escapeHtml(source.todayEvaluation)}</p>`)}
    ${renderFeedbackBlock("良かった点", renderList(source.goodPoints))}
    ${renderFeedbackBlock("改善点", renderList(source.improvementPoints))}
    ${renderFeedbackBlock("疲労度評価", `<p>${escapeHtml(source.fatigueAssessment)}</p>`)}
    ${renderFeedbackBlock("走力への意味づけ", `<p>${escapeHtml(source.fitnessMeaning)}</p>`)}
    ${renderFeedbackBlock("目標に対する現在値", `<p>${escapeHtml(source.currentStatus)}</p>`)}
    ${renderFeedbackBlock("次回練習の提案（確認）", `<p>${escapeHtml(source.nextProposal)}</p>`)}
    ${renderFeedbackBlock("補足コメント", `<p>${escapeHtml(source.supplement)}</p>`)}
  `;
}

function renderAiHandoff() {
  if (!aiHandoff) return;
  const latestLog = state.logs[0];
  if (!latestLog) {
    aiHandoff.value = "ログ登録後にAIへ渡す要約が生成されます。";
    return;
  }

  const feedback = buildFeedback(latestLog, state);
  const mainRace = getMainRace(state.races);
  const coaching = state.coaching || {};
  const plannedSession = getPlannedSessionForDate(state.weekPlans, latestLog.date);

  aiHandoff.value = [
    "以下はAIランニングコーチ向けの構造化メモです。",
    `選手名: ${state.profile.name || "未設定"}`,
    `主目標レース: ${mainRace ? `${mainRace.name} / ${mainRace.date} / ${mainRace.targetTime}` : "未設定"}`,
    `現在の期: ${coaching.currentPhase || "未設定"} / 4週サイクル ${coaching.cycleWeek || "-"}週目 / 今週の主役 ${coaching.currentFocus || "未設定"}`,
    `週間骨格: ${coaching.weeklyStructure || "未設定"}`,
    `LT1辞書: ${coaching.lt1MenuLibrary || "未設定"}`,
    `LT1.5辞書: ${coaching.lt15MenuLibrary || "未設定"}`,
    `ロング辞書: ${coaching.longRunLibrary || "未設定"}`,
    `AIとの進め方: ${coaching.collaborationStyle || "未設定"}`,
    `最新ログ: ${latestLog.date} / ${latestLog.sessionType}`,
    `当日の予定メニュー: ${plannedSession?.planned || "未登録"}`,
    `主観データ: RPE ${latestLog.rpe}, 痛み ${latestLog.pain}, 睡眠 ${latestLog.sleepHours}h, 環境 ${formatEnvironment(latestLog.environment, latestLog.temperatureC)}`,
    `Garmin指標: 距離 ${displayNumber(latestLog.metrics.distanceKm)}km, 時間 ${latestLog.metrics.duration || "-"}, 平均ペース ${latestLog.metrics.avgPace || "-"}, 平均HR ${displayNumber(latestLog.metrics.avgHr)}, 最大HR ${displayNumber(latestLog.metrics.maxHr)}`,
    `ラップ要約: ${latestLog.metrics.lapsSummary || "なし"}`,
    `コーチメモ: ${latestLog.notes || "なし"}`,
    "",
    "固定フォーマット出力:",
    `今日の練習評価: ${feedback.todayEvaluation}`,
    `良かった点: ${feedback.goodPoints.join(" / ")}`,
    `改善点: ${feedback.improvementPoints.join(" / ")}`,
    `疲労度評価: ${feedback.fatigueAssessment}`,
    `走力への意味づけ: ${feedback.fitnessMeaning}`,
    `目標に対する現在値: ${feedback.currentStatus}`,
    `次回練習の提案: ${feedback.nextProposal}`,
    `補足コメント: ${feedback.supplement}`,
  ].join("\n");
}

function renderPlanList(items) {
  if (!items.length) {
    return `<p class="empty-state">必要データが足りないため、提案はまだ生成できません。</p>`;
  }

  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderFeedbackBlock(title, body) {
  return `<article class="feedback-card"><h3>${title}</h3>${body}</article>`;
}

function renderList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function buildDashboard(appState, latestLog) {
  const mainRace = getMainRace(appState.races);
  const coaching = appState.coaching || {};
  const phase = coaching.currentPhase || getRacePhase(mainRace);
  const focus = coaching.currentFocus || defaultFocusByPhase(phase);
  const cycleWeek = coaching.cycleWeek || "1";

  if (!latestLog) {
    return {
      fatigue: {
        label: "未計算",
        tone: "",
        note: "練習ログ登録後に疲労度を判定します。",
      },
      fitness: evaluateFitness(appState.profile, appState.logs, mainRace),
      goal: mainRace
        ? {
            label: `${mainRace.name}`,
            note: `${mainRace.date} / ${mainRace.targetTime} / あと${Math.max(daysUntil(mainRace.date), 0)}日`,
          }
        : {
            label: "未設定",
            note: "大会を登録すると、4週間計画とロードマップを表示します。",
          },
      phase: {
        label: phase,
        note: `4週サイクル${cycleWeek}週目として扱います。`,
      },
      focus: {
        label: focus,
        note: "今週の主役メニューとして評価と提案の重み付けに使います。",
      },
      plans: buildPlans(appState, mainRace, { label: "未計算" }),
    };
  }

  const fatigue = calculateFatigue(appState.logs, latestLog);
  const fitness = evaluateFitness(appState.profile, appState.logs, mainRace);
  const plans = buildPlans(appState, mainRace, fatigue);

  return {
    fatigue,
    fitness,
    goal: mainRace
      ? {
          label: `${mainRace.name}`,
          note: `${mainRace.date} / ${mainRace.targetTime} / あと${Math.max(daysUntil(mainRace.date), 0)}日`,
        }
      : {
          label: "未設定",
          note: "大会を登録すると、4週間計画とロードマップを表示します。",
        },
    phase: {
      label: phase,
      note: `4週サイクル${cycleWeek}週目。主役は${focus}です。`,
    },
    focus: {
      label: focus,
      note: "AI提案はこの主役メニューを優先して微修正します。",
    },
    plans,
  };
}

function buildFeedback(log, appState) {
  const fatigue = calculateFatigue(appState.logs, log);
  const mainRace = getMainRace(appState.races);
  const fitness = evaluateFitness(appState.profile, appState.logs, mainRace);
  const plans = buildPlans(appState, mainRace, fatigue);
  const intensityLabel = getSessionIntensity(log);
  const painComment = getPainComment(log.pain);
  const latestDistance = numberOrZero(log.metrics.distanceKm);
  const sessionMode = getEvaluationMode(log.sessionType);
  const intervalContext = summarizeIntervalContext(log);
  const coaching = appState.coaching || {};
  const phase = coaching.currentPhase || getRacePhase(mainRace);
  const focus = coaching.currentFocus || defaultFocusByPhase(phase);
  const plannedSession = getPlannedSessionForDate(appState.weekPlans, log.date);

  const goodPoints = [
    sessionMode === "interval"
      ? `${intervalContext.qualityComment} 走区間の再現性を確認できるログです。`
      : log.rpe <= 6
        ? "主観的負荷が極端に上がりすぎず、継続しやすい範囲に収まっています。"
        : "高い刺激を入れる日に必要な負荷水準まで持っていけています。",
    sessionMode === "interval"
      ? "インターバルでは全体平均ではなく、走区間とレスト区間を分けて評価できる材料が揃っています。"
      : log.metrics.avgHr && log.rpe <= 7
        ? "心拍と主観的負荷の乖離が大きくなく、コントロールされた実施です。"
        : "主観と生理指標のズレを確認できるログが残せています。",
    latestDistance >= 15
      ? "距離を踏みながら練習意図を評価できる材料が揃っています。"
      : "短いログでも疲労と反応を見極める材料が取れています。",
  ];

  const improvementPoints = [
    log.sleepHours < 6 ? "睡眠が不足気味です。次回は回復を優先し、質の高いポイント練習を無理に重ねないでください。" : "睡眠は確保できていますが、次回も主観疲労とのズレを確認してください。",
    log.pain !== "なし" ? `${painComment} 痛み部位と出現タイミングを次回ログに追記してください。` : "痛みがないうちに、翌日の張りや違和感も合わせて記録してください。",
    sessionMode === "interval"
      ? intervalContext.improvementComment
      : log.metrics.lapsSummary
        ? "ラップの乱れがある場合は、どの区間で崩れたかを次回メモで明確にしてください。"
        : "ラップ画像のOCR精度を上げるため、次回は文字が大きい状態で撮影してください。",
  ];

  return {
    fatigueBadge: fatigue.label,
    todayEvaluation:
      sessionMode === "interval"
        ? `${log.sessionType}としては${intensityLabel}の負荷です。${painComment} インターバル系のため、全体平均ペース ${log.metrics.avgPace || "-"} と平均心拍 ${displayNumber(log.metrics.avgHr)} は補助扱いにし、${intervalContext.primaryFocus} を主評価に使います。`
        : `${log.sessionType}としては${intensityLabel}の負荷です。${painComment} 直近7日間の流れを踏まえると、全体評価は${fatigue.label}寄りです。`,
    goodPoints,
    improvementPoints,
    fatigueAssessment:
      sessionMode === "interval"
        ? `${fatigue.note} ただしインターバル系では平均心拍の絶対値より、グラフ上の心拍の漸増とレストでの落ち方を優先して確認します。優先順位は「主観的きつさ > 心拍推移 > 直近7日間の走行量 > 痛み > 睡眠」です。`
        : `${fatigue.note} 優先順位は「主観的きつさ > 心拍 > 直近7日間の走行量 > 痛み > 睡眠」で判定しています。`,
    fitnessMeaning: `${fitness.note} 今回のログは、${phase}における主役 ${focus} の文脈で見ると、${getFitnessMeaning(log, fitness, sessionMode, intervalContext)}。`,
    currentStatus: mainRace
      ? `${mainRace.name}まであと${Math.max(daysUntil(mainRace.date), 0)}日。現在値は${fitness.label}で、目標${mainRace.targetTime}に対して${fitness.gapNote}。`
      : `${fitness.note} 目標大会を主目標に設定すると、現在値の評価がより具体化されます。`,
    nextProposal: `${plannedSession ? `当日の予定は「${plannedSession.planned}」でした。` : "当日の予定メニューは未登録です。"} ${plans.weekly[1] || "次回練習案を出すには、主目標大会または直近ログを増やしてください。"}`,
    supplement: `${buildEnvironmentComment(log)} ${buildSupplement(log, fatigue, mainRace)} ${plannedSession ? `この日は予定メニュー「${plannedSession.planned}」との比較前提で評価しています。` : "週次予定メニューを登録すると、予定との差分で提案できます。"} 必ず本人と協議のうえで最終決定してください。`,
  };
}

function calculateFatigue(logs, targetLog) {
  const recentLogs = logs.filter((log) => daysBetween(log.date, targetLog?.date || today()) <= 6);
  const recentDistance = recentLogs.reduce((sum, log) => sum + numberOrZero(log.metrics.distanceKm), 0);
  const avgHr = numberOrZero(targetLog?.metrics.avgHr);
  const score =
    numberOrZero(targetLog?.rpe) * 3 +
    (avgHr >= 160 ? 8 : avgHr >= 145 ? 5 : avgHr > 0 ? 2 : 0) +
    (recentDistance >= 100 ? 8 : recentDistance >= 70 ? 5 : recentDistance >= 40 ? 2 : 0) +
    painScore(targetLog?.pain) +
    (numberOrZero(targetLog?.sleepHours) < 6 ? 1 : 0);

  if (score >= 26) {
    return {
      label: "高め",
      tone: "tone-high",
      note: `RPE ${targetLog?.rpe || "-"} と平均心拍 ${avgHr || "-"} を中心に見ると疲労は高めです。直近7日間の走行量は${recentDistance.toFixed(1)}kmです。`,
    };
  }

  if (score >= 17) {
    return {
      label: "中程度",
      tone: "tone-mid",
      note: `大きな破綻はない一方で、疲労は蓄積方向です。直近7日間の走行量は${recentDistance.toFixed(1)}kmです。`,
    };
  }

  return {
    label: "低め",
    tone: "tone-low",
    note: `回復余地を残しながら積み上げられています。直近7日間の走行量は${recentDistance.toFixed(1)}kmです。`,
  };
}

function evaluateFitness(profile, logs, mainRace) {
  const targetDistanceKm = distanceLabelToKm(mainRace?.distance || "フル");
  const raceBased = bestEquivalentSeconds(profile, targetDistanceKm);
  const recentQuality = logs
    .filter((log) => ["T", "I", "M", "L", "R"].includes(log.sessionType))
    .slice(0, 4);
  const qualityCount = recentQuality.length;
  const averageRpe = qualityCount ? recentQuality.reduce((sum, log) => sum + numberOrZero(log.rpe), 0) / qualityCount : 0;
  const targetSeconds = mainRace ? parseTimeToSeconds(mainRace.targetTime) : 0;
  const currentEstimate = Math.max(raceBased - qualityCount * 20 + (averageRpe >= 8 ? 15 : 0), 0);

  if (!raceBased) {
    return {
      label: "判断保留",
      tone: "tone-mid",
      note: "レース結果の登録がまだ少ないため、現在値評価は暫定です。",
      gapNote: "差分算出にはPBまたはレース結果が必要です",
    };
  }

  const delta = targetSeconds ? currentEstimate - targetSeconds : 0;
  const gapNote =
    targetSeconds > 0
      ? delta <= 0
        ? "目標達成圏内に近い水準です"
        : `${formatSeconds(Math.abs(delta))}ほどの上積みが必要です`
      : "主目標を設定すると差分を表示します";

  if (targetSeconds && delta <= 180) {
    return {
      label: "高水準",
      tone: "tone-low",
      note: "レース結果を基準にすると、目標に近い走力帯にいます。",
      gapNote,
    };
  }

  if (targetSeconds && delta <= 600) {
    return {
      label: "積み上げ段階",
      tone: "tone-mid",
      note: "レース結果を軸に見ると、目標には届く可能性があるが閾値帯とロング走の精度向上が必要です。",
      gapNote,
    };
  }

  return {
    label: "土台形成中",
    tone: "tone-high",
    note: "現状は目標とのギャップが大きく、まずは再現性の高い積み上げが必要です。",
    gapNote,
  };
}

function buildPlans(appState, mainRace, fatigue) {
  const latestLog = appState.logs[0];
  const weeklyMileage = numberOrZero(appState.profile.weeklyMileage);
  const coaching = appState.coaching || {};
  const phase = coaching.currentPhase || getRacePhase(mainRace);
  const focus = coaching.currentFocus || defaultFocusByPhase(phase);
  const cycleWeek = coaching.cycleWeek || "1";
  const nextSession = suggestNextSession(latestLog, fatigue, phase, focus, coaching);
  const adjustmentTone = fatigue.label === "高め" ? "負荷を落とす方向" : "予定の範囲で微修正する方向";
  const skeleton = summarizeWeeklyStructure(coaching.weeklyStructure);

  const weekly = [
    `今週は${phase}の${cycleWeek}週目として扱い、主役は${focus}です。基本骨格は「${skeleton}」です。`,
    nextSession,
    fatigue.label === "高め"
      ? "週間メニューの骨格は変えず、次の48時間だけ回復寄りに微修正する前提で確認してください。"
      : "週間メニューの骨格は維持し、つなぎの日の強度や距離を小さく調整する前提で確認してください。",
    phase === "構築期"
      ? `今週は構築期として、既存のポイント練習を活かしつつ持続時間や本数を小さく上下させる程度の調整が基本です。現在は${adjustmentTone}です。`
      : `今週は期分けの流れを崩さず、既に組んでいるメニューの並びを保ったまま微修正するのが基本です。現在は${adjustmentTone}です。`,
    recommendMenuLibraryLine(focus, coaching),
    weeklyMileage
      ? `週間走行距離は計画値を大きく変えず、目安として ${Math.round(weeklyMileage * fatigueMultiplier(fatigue.label))}km 前後へ微調整する想定です。`
      : "プロフィールに週間走行距離の目安を入れると、計画値に対する微修正幅を数値で提案できます。",
  ];

  const block = buildFourWeekBlock(phase, fatigue.label, coaching);
  const roadmap = buildRoadmap(mainRace, coaching);

  return { weekly, block, roadmap };
}

function suggestNextSession(latestLog, fatigue, phase, focus, coaching) {
  if (!latestLog) return "最新ログがないため、次回提案はまだありません。";
  if (latestLog.pain === "強い") return "既存の次回メニューは維持せず、休養または補助運動へ差し替える方向で確認してください。";
  if (fatigue.label === "高め") return "既に組んでいる次回メニューをベースに、距離短縮・本数削減・Eラン化のどれで微修正するか確認してください。";
  if (phase === "調整期") return "調整期なので、既存メニューの量だけ抑えて切れを保つ方向で微修正してください。";
  if (focus === "LT1.5") return `今週の主役はLT1.5です。${pickFirstLibraryLine(coaching.lt15MenuLibrary)} を起点に、本数やレストを少し触る方向でAIと確認してください。`;
  if (focus === "LT1") return `今週の主役はLT1です。${pickFirstLibraryLine(coaching.lt1MenuLibrary)} を基準に、持続時間や本数の微修正をAIと詰めてください。`;
  if (focus === "ロング") return `今週の主役はロングです。${pickFirstLibraryLine(coaching.longRunLibrary)} を土台に、後半の上げ幅や時間だけ調整する方向で確認してください。`;
  if (focus === "回復") return "今週は回復優先です。既存スケジュールを崩さず、量・本数・距離を軽く落とす方向でAIと確認してください。";
  if (latestLog.sessionType === "I") return "刺激翌日の予定メニューをベースに、Eランの距離短縮や補強比重アップなど回復寄りの微修正を確認してください。";
  if (["T", "R"].includes(latestLog.sessionType)) return "次回は既存のつなぎメニューを基本にし、強度を上げずに回復度合いだけ微修正してください。";
  if (latestLog.sessionType === "E") return "次のポイント練習は既存メニューを基本に、疲労度次第で本数や設定ペースを少し触る程度で確認してください。";
  if (latestLog.sessionType === "L") return "ロング走後は既存の回復日をベースに、距離短縮や完全休養への変更が必要か確認してください。";
  return "次回は既存スケジュールをベースに、距離・本数・設定ペースのどこを微修正するか相談して決定してください。";
}

function buildFourWeekBlock(phase, fatigueLabel, coaching) {
  const refreshMileage = coaching.refreshMileage || "通常週の75-80%";
  const refreshLongRun = coaching.refreshLongRun || "100-120分 -> 75-85分";
  if (phase === "導入期") {
    return [
      "1週目: 既存の導入メニューを維持し、Eランの距離や補強量だけ小さく調整する。",
      "2週目: ボリューム増の週でも、上げ幅は計画の範囲内に留める。",
      "3週目: 閾値刺激の時間や本数は、反応を見て微増に留める。",
      `4週目: 回復週。走行距離は${refreshMileage}、ロングは${refreshLongRun}を目安に落とす。`,
    ];
  }

  if (phase === "構築期") {
    return [
      "1週目: 既存ポイントの配置はそのままに、持続時間や本数を少し触る程度で調整する。",
      "2週目: 目標レース寄りの刺激も、計画済みメニューの設定変更で対応する。",
      "3週目: 攻める週でも、調整はペースか本数のどちらか一方に絞る。",
      `4週目: ${fatigueLabel === "高め" ? `既存の回復週をやや強めに回復寄りへ寄せる。距離は${refreshMileage}。` : `既存の吸収週の枠内で量を少し落とす。ロングは${refreshLongRun}を目安にする。`} `,
    ];
  }

  if (phase === "仕上げ期") {
    return [
      "1週目: 既存の目標ペース確認メニューを崩さず、余裕度だけ再点検する。",
      "2週目: ロング系は計画内で短縮するかどうかを微修正する。",
      "3週目: 刺激維持、量抑制の流れを既存計画のまま進める。",
      "4週目: レース週の調整は、張りや疲労に応じて最終微修正する。",
    ];
  }

  return [
    "1週目: 量を抑える方向で既存メニューを微修正する。",
    "2週目: 回復度を確認し、変更は最小限に留める。",
    "3週目: 切れを保つ短い刺激へ寄せる。",
    "4週目: 本番へ向けて最終調整。",
  ];
}

function buildRoadmap(mainRace, coaching) {
  if (!mainRace) {
    return [];
  }

  const days = Math.max(daysUntil(mainRace.date), 0);
  const weeks = Math.ceil(days / 7);

  if (weeks > 16) {
    return [
      `今は${coaching.currentPhase || "導入期"}。週間の再現性を上げ、Eランと基礎筋力を安定化する。`,
      "レース16-10週前で構築期へ。閾値走とロング走の軸を明確にする。",
      "レース9-4週前で仕上げ期へ。目標ペースでの持続力を確認する。",
      "レース3週前以降は調整期。量を落として質を保つ。",
    ];
  }

  if (weeks > 8) {
    return [
      `現在は${coaching.currentPhase || "構築期"}。閾値帯とロング走の質を両輪で高める。`,
      "レース6-4週前で目標ペースの確認を増やす。",
      "レース3週前からは調整期に移行し、疲労を抜く。",
    ];
  }

  if (weeks > 3) {
    return [
      "現在は仕上げ期。今ある走力をレースに変換する段階。",
      "過剰な積み上げより、狙った刺激を確実に入れる。",
      "レース2週前から量を落とし、張りを残さない。",
    ];
  }

  return [
    "現在は調整期。疲労を抜きながら動きの切れを保つ。",
    "新しい負荷は入れず、主観の軽さを優先する。",
  ];
}

function getRacePhase(mainRace) {
  if (!mainRace) return "導入期";
  const days = Math.max(daysUntil(mainRace.date), 0);
  if (days > 112) return "導入期";
  if (days > 42) return "構築期";
  if (days > 21) return "仕上げ期";
  return "調整期";
}

function bestEquivalentSeconds(profile, targetDistanceKm) {
  const candidates = [
    { time: parseTimeToSeconds(profile.pb5k), distanceKm: 5 },
    { time: parseTimeToSeconds(profile.pb10k), distanceKm: 10 },
    { time: parseTimeToSeconds(profile.pbHalf), distanceKm: 21.0975 },
    { time: parseTimeToSeconds(profile.pbFull), distanceKm: 42.195 },
  ].filter((item) => item.time);

  if (!candidates.length || !targetDistanceKm) return 0;

  return Math.min(...candidates.map((item) => riegelEquivalent(item.time, item.distanceKm, targetDistanceKm)));
}

function getMainRace(races) {
  return races.find((race) => race.priority === "main") || races[0] || null;
}

function parseGarminText(text) {
  const normalized = text.replace(/,/g, ".").replace(/[Oo]/g, "0");
  const distanceMatch = normalized.match(/(\d{1,3}\.\d{1,2})\s?(km|KM)/);
  const timeMatch = normalized.match(/(\d{1,2}:\d{2}:\d{2}|\d{1,2}:\d{2})/);
  const paceMatch = normalized.match(/(\d{1,2}:\d{2})\s?\/?\s?(km|KM)/);
  const hrMatches = [...normalized.matchAll(/(\d{2,3})\s?(bpm|BPM)?/g)].map((match) => Number(match[1]));
  const laps = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /\d/.test(line))
    .slice(0, 12)
    .join(" / ");

  return {
    distanceKm: distanceMatch ? Number(distanceMatch[1]) : "",
    duration: timeMatch ? timeMatch[1] : "",
    avgPace: paceMatch ? `${paceMatch[1]}/km` : "",
    avgHr: hrMatches[0] || "",
    maxHr: hrMatches[1] || "",
    lapsSummary: laps,
  };
}

function applyMetricsToForm(parsed) {
  for (const [key, value] of Object.entries(parsed)) {
    const field = logForm.elements.namedItem(key);
    if (field && value !== "") field.value = value;
  }
}

function getSessionIntensity(log) {
  if (log.rpe >= 9) return "かなり高い";
  if (log.rpe >= 7) return "高め";
  if (log.rpe >= 5) return "中程度";
  return "低め";
}

function getPainComment(pain) {
  switch (pain) {
    case "軽度":
      return "軽い痛みがあるため、次回は再現性の確認が必要です。";
    case "中等度":
      return "痛みが練習選択に影響するレベルです。";
    case "強い":
      return "強い痛みがあるため、安全側への修正を優先してください。";
    default:
      return "痛みの情報は落ち着いています。";
  }
}

function getFitnessMeaning(log, fitness, sessionMode, intervalContext) {
  if (log.sessionType === "R") return "レース結果の更新が最も強い判断材料になります";
  if (sessionMode === "interval") return `${intervalContext.fitnessComment} 全体平均値ではなく区間再現性の確認が主目的です`;
  if (["T", "M"].includes(log.sessionType)) return "目標ペースへの変換度を測る材料になります";
  if (log.sessionType === "L") return "後半の耐久性を測る材料になります";
  return `${fitness.label}を補強する補助データです`;
}

function buildSupplement(log, fatigue, mainRace) {
  const raceText = mainRace ? `主目標は${mainRace.name}です。` : "主目標大会は未設定です。";
  return `${raceText} 今回の提案は「目標達成 > 継続性 > 攻めたメニュー > 故障回避」の優先順位をベースにしつつ、既存の週間・4週間計画を崩さない微修正を基本方針にしています。AIと一緒に相談しながら決める前提で、疲労度は${fatigue.label}です。`;
}

function getEvaluationMode(sessionType) {
  if (["I", "T"].includes(sessionType)) return "interval";
  if (sessionType === "L") return "long";
  if (sessionType === "E") return "easy";
  return "steady";
}

function summarizeIntervalContext(log) {
  const text = log.metrics.lapsSummary || "";
  const splitRuns = text
    .split("/")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => /ラン|run/i.test(item));

  const runCount = splitRuns.length;
  const hasLaps = Boolean(text);

  return {
    primaryFocus: hasLaps ? "走区間ラップの再現性とグラフ上の心拍推移" : "グラフ上の波形と手入力ラップ要約",
    qualityComment: hasLaps ? `ラップ要約があり、少なくとも${runCount || "複数"}本の走区間を分けて確認できます。` : "ラップ詳細は不足していますが、インターバルであることは把握できます。",
    improvementComment: hasLaps
      ? "インターバルでは全体平均ではなく、最後の数本の落ち幅とレスト後の戻りを次回も確認してください。"
      : "インターバル評価の精度を上げるため、次回もラップ画像とグラフ画像を必ず残してください。",
    fitnessComment: hasLaps ? "有酸素的な再現性と設定強度の適合性を見る材料になります。" : "インターバル反応の傾向を見る補助材料になります。",
  };
}

function defaultFocusByPhase(phase) {
  switch (phase) {
    case "導入期":
      return "LT1";
    case "構築期":
      return "LT1.5";
    case "特異期":
      return "ロング";
    case "調整期":
      return "回復";
    default:
      return "LT1";
  }
}

function summarizeWeeklyStructure(text) {
  return text ? text.split("\n").slice(0, 3).join(" / ") : "未設定";
}

function pickFirstLibraryLine(text) {
  return text?.split("\n").map((line) => line.trim()).find(Boolean) || "登録済みメニュー";
}

function recommendMenuLibraryLine(focus, coaching) {
  if (focus === "LT1.5") return `候補メニュー: ${pickFirstLibraryLine(coaching.lt15MenuLibrary)}`;
  if (focus === "LT1") return `候補メニュー: ${pickFirstLibraryLine(coaching.lt1MenuLibrary)}`;
  if (focus === "ロング") return `候補メニュー: ${pickFirstLibraryLine(coaching.longRunLibrary)}`;
  return `リフレッシュ指針: 距離 ${coaching.refreshMileage || "通常週の75-80%"} / ロング ${coaching.refreshLongRun || "100-120分 -> 75-85分"}`;
}

function getPlannedSessionForDate(weekPlans, dateString) {
  if (!dateString || !weekPlans?.length) return null;
  const weekStart = getWeekStart(dateString);
  const plan = weekPlans.find((item) => item.weekStart === weekStart);
  if (!plan) return null;

  const key = weekdayKey(dateString);
  return {
    weekStart,
    planned: plan.days?.[key] || "",
    theme: plan.theme || "",
    notes: plan.notes || "",
  };
}

function autoSelectSessionType(plannedText) {
  const sessionField = logForm?.elements?.namedItem("sessionType");
  if (!sessionField) return;

  const currentValue = sessionField.value;
  const inferred = inferSessionTypeFromPlan(plannedText);

  if (!plannedText) {
    if (currentValue !== "未分類") sessionField.value = "未分類";
    return;
  }

  if (currentValue === "未分類" || currentValue === "" || currentValue === inferSessionTypeFromPlan(plannedSessionTitle.textContent)) {
    sessionField.value = inferred;
  }
}

function inferSessionTypeFromPlan(text) {
  const normalized = (text || "").toLowerCase();
  if (!normalized) return "未分類";
  if (normalized.includes("オフ") || normalized.includes("休養")) return "休養";
  if (normalized.includes("ロング")) return "L";
  if (normalized.includes("lt1.5")) return "I";
  if (normalized.includes("lt1")) return "T";
  if (normalized.includes("インターバル")) return "I";
  if (normalized.includes("閾値")) return "T";
  if (normalized.includes("マラソン")) return "M";
  if (normalized.includes("ジョグ")) return "E";
  if (normalized.includes("レース")) return "R";
  return "未分類";
}

function seedNotesFromPlan(plannedSession) {
  const notesField = logForm?.elements?.namedItem("notes");
  if (!notesField) return;

  const currentValue = (notesField.value || "").trim();
  const previousSeed = notesField.dataset.seededPlan === "true";

  if (!plannedSession?.planned) {
    if (previousSeed && !currentValue) {
      notesField.value = "";
    }
    notesField.dataset.seededPlan = "false";
    return;
  }

  const seededText = buildPlannedNotesDraft(plannedSession);
  if (!currentValue || previousSeed) {
    notesField.value = seededText;
    notesField.dataset.seededPlan = "true";
  }
}

function buildPlannedNotesDraft(plannedSession) {
  const lines = [
    `予定メニュー: ${plannedSession.planned}`,
  ];

  if (plannedSession.theme) {
    lines.push(`週テーマ: ${plannedSession.theme}`);
  }

  if (plannedSession.notes) {
    lines.push(`週補足: ${plannedSession.notes}`);
  }

  return lines.join("\n");
}

function renderPlannedSessionDetails(plannedText, coaching) {
  const details = extractPlanDetails(plannedText, coaching);
  if (!details.length) return "";
  return details.map((item) => `<div class="planned-session-detail">${escapeHtml(item)}</div>`).join("");
}

function buildEnvironmentComment(log) {
  if (log.environment === "treadmill") {
    return "トレッドミル実施のため、外気温の影響は評価から外しています。";
  }
  if (log.temperatureC == null || Number.isNaN(log.temperatureC)) {
    return "屋外実施ですが気温未入力のため、暑熱・寒冷の影響は限定的に扱っています。";
  }
  if (log.temperatureC >= 20) {
    return `気温 ${log.temperatureC}°C のため、暑熱による心拍上昇を考慮して評価しています。`;
  }
  if (log.temperatureC <= 5) {
    return `気温 ${log.temperatureC}°C のため、寒冷による動き出しの影響を考慮して評価しています。`;
  }
  return `気温 ${log.temperatureC}°C を踏まえて評価しています。`;
}

function extractPlanDetails(text, coaching) {
  const normalized = text || "";
  const details = [];

  const repeatMatch = normalized.match(/(\d+\s*分)\s*[×x]\s*(\d+)/);
  if (repeatMatch) {
    details.push(`反復設定: ${repeatMatch[1].replace(/\s+/g, "")} × ${repeatMatch[2]}本`);
  }

  const restMatch = normalized.match(/r\s*(\d+\s*(?:s|sec|秒|分))/i);
  if (restMatch) {
    details.push(`レスト: ${restMatch[1].replace(/\s+/g, "")}`);
  }

  const durationRangeMatch = normalized.match(/(\d+\s*[-〜~]\s*\d+\s*分)/);
  if (durationRangeMatch) {
    details.push(`時間目安: ${durationRangeMatch[1].replace(/\s+/g, "")}`);
  }

  const singleDurationMatch = normalized.match(/(\d+\s*分)/);
  if (!repeatMatch && singleDurationMatch) {
    details.push(`時間目安: ${singleDurationMatch[1].replace(/\s+/g, "")}`);
  }

  const hrRangeMatch = normalized.match(/(\d{2,3}\s*-\s*\d{2,3}\s*bpm|\d{2,3}\s*[〜~]\s*\d{2,3}\s*bpm)/i);
  if (hrRangeMatch) {
    details.push(`心拍目安: ${hrRangeMatch[1].replace(/\s+/g, "")}`);
  }

  if (/lt1\.5/i.test(normalized)) {
    details.push("強度帯: LT1.5");
  } else if (/lt1/i.test(normalized)) {
    details.push("強度帯: LT1");
  } else if (/ロング/.test(normalized)) {
    details.push("強度帯: ロング");
  } else if (/ジョグ/.test(normalized)) {
    details.push("強度帯: ジョグ");
  }

  const libraryHint = extractLibraryHint(normalized, coaching);
  if (libraryHint) {
    details.push(libraryHint);
  }

  return [...new Set(details)];
}

function extractLibraryHint(normalizedText, coaching) {
  if (!coaching) return "";

  if (/lt1\.5/i.test(normalizedText)) {
    return buildLibraryHintFromText(coaching.lt15MenuLibrary, "LT1.5");
  }

  if (/lt1/i.test(normalizedText)) {
    return buildLibraryHintFromText(coaching.lt1MenuLibrary, "LT1");
  }

  if (/ロング/.test(normalizedText)) {
    return buildLibraryHintFromText(coaching.longRunLibrary, "ロング");
  }

  if (/ジョグ/.test(normalizedText)) {
    return coaching.jogHrCap ? `心拍目安: ${coaching.jogHrCap}` : "";
  }

  return "";
}

function buildLibraryHintFromText(text, label) {
  if (!text) return "";
  const line = text
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item && item.toLowerCase().includes(label.toLowerCase())) || text.split("\n").map((item) => item.trim()).find(Boolean);

  if (!line) return "";

  const bpmMatches = [...line.matchAll(/(\d{2,3}\s*[-〜~]\s*\d{2,3}\s*bpm|\d{2,3}\s*bpm)/gi)].map((match) =>
    match[1].replace(/\s+/g, "")
  );
  if (!bpmMatches.length) return `辞書参照: ${line}`;

  return `心拍目安: ${bpmMatches.join(" / ")}`;
}

function getWeekStart(dateString) {
  const date = new Date(dateString);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

function weekdayKey(dateString) {
  const day = new Date(dateString).getDay();
  switch (day) {
    case 1:
      return "monday";
    case 2:
      return "tuesday";
    case 3:
      return "wednesday";
    case 4:
      return "thursday";
    case 5:
      return "friday";
    case 6:
      return "saturday";
    default:
      return "sunday";
  }
}

function painScore(pain) {
  switch (pain) {
    case "強い":
      return 4;
    case "中等度":
      return 3;
    case "軽度":
      return 1;
    default:
      return 0;
  }
}

function fatigueMultiplier(label) {
  switch (label) {
    case "高め":
      return 0.85;
    case "中程度":
      return 0.95;
    default:
      return 1;
  }
}

function distanceLabelToKm(label) {
  switch (label) {
    case "5km":
      return 5;
    case "10km":
      return 10;
    case "ハーフ":
      return 21.0975;
    case "フル":
      return 42.195;
    default:
      return 0;
  }
}

function riegelEquivalent(timeSeconds, fromDistanceKm, toDistanceKm) {
  if (!timeSeconds || !fromDistanceKm || !toDistanceKm) return 0;
  return Math.round(timeSeconds * (toDistanceKm / fromDistanceKm) ** 1.06);
}

function parseTimeToSeconds(value) {
  if (!value) return 0;
  const parts = value.split(":").map((part) => Number(part));
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function formatSeconds(value) {
  const total = Math.round(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((unit) => String(unit).padStart(2, "0")).join(":");
}

function daysUntil(dateString) {
  return daysBetween(today(), dateString);
}

function daysBetween(baseDate, targetDate) {
  if (!baseDate || !targetDate) return Number.POSITIVE_INFINITY;
  const base = new Date(baseDate);
  const target = new Date(targetDate);
  const diff = target.setHours(0, 0, 0, 0) - base.setHours(0, 0, 0, 0);
  return Math.round(diff / 86400000);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numberOrZero(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function displayNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) !== 0 ? Number(value) : "-";
}

function nullableNumberValue(value) {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatEnvironment(environment, temperatureC) {
  if (environment === "treadmill") return "トレッドミル";
  if (temperatureC == null || Number.isNaN(Number(temperatureC))) return "屋外 / 気温未入力";
  return `屋外 / ${temperatureC}°C`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
