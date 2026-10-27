import {Notice,setIcon} from '../client/native-ui.js';
import {readingStats} from './reading-stats.js';
export function originalReadingUi(t,today){
const qiaomuReaderTranslate=t,svgIcon=setIcon,readerTodayKey=today;
function fmtReadTime(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  if (total < 60) {
    return total > 0 ? qiaomuReaderTranslate("less-than-a-minute") : "—";
  }
  const totalMin = Math.floor(total / 60);
  if (totalMin < 60) return qiaomuReaderTranslate("0-min", totalMin);
  const hours = Math.floor(totalMin / 60), spareMin = totalMin % 60;
  if (hours < 24) {
    return spareMin ? qiaomuReaderTranslate("0-h-1-min", hours, spareMin) : qiaomuReaderTranslate("0-h", hours);
  }
  const days = Math.floor(hours / 24), spareHours = hours % 24;
  return spareHours ? qiaomuReaderTranslate("0-d-1-h", days, spareHours) : qiaomuReaderTranslate("0-d", days);
}
const TIMER_TICK_MS = 1000;
const TIMER_FLUSH_TICKS = 15;
function timerTick(reader) {
  const plugin = reader.plugin;
  if (!plugin.settings.timerEnabled) { pauseTimerSession(reader); return; }
  plugin.bumpReadingTime(1);
  reader._sessionSec = (reader._sessionSec ?? 0) + 1;
  reader._flushAcc = (reader._flushAcc ?? 0) + 1;
  if (reader._flushAcc >= TIMER_FLUSH_TICKS) { reader._flushAcc = 0; plugin.flushReadingTime(); }
  updateTimerBtn(reader);
  updateGoalBar(reader);
  if (!reader._goalNotified && plugin.getTodaySeconds() >= plugin.getGoalSeconds()) {
    reader._goalNotified = true;
    plugin.flushReadingTime();
    const goalHitNotice = qiaomuReaderTranslate("today-s-reading-goal-reached");
    new Notice(goalHitNotice);
  }
}
function startTimerSession(reader) {
  if (reader._timer || !reader.plugin.settings.timerEnabled) return;
  reader._running = true; reader._timerStarted = true; reader._flushAcc = 0;
  reader._timer = window.setInterval(() => timerTick(reader), TIMER_TICK_MS);
  updateTimerBtn(reader);
}
function pauseTimerSession(reader) {
  if (reader._timer) {
    window.clearInterval(reader._timer);
    reader._timer = null;
  }
  reader._running = false;
  reader.plugin?.flushReadingTime();
  updateTimerBtn(reader);
}
function toggleTimerSession(reader) {
  if (!reader.plugin.settings.timerEnabled) {
    new Notice(qiaomuReaderTranslate(
      "timer-is-off-enable-it-in-reading-settings"));
    return;
  }
  if (reader._running) pauseTimerSession(reader);
  else startTimerSession(reader);
}
function stopReadingTimer(reader) {
  pauseTimerSession(reader);
}
function resetTimerSession(reader) {
  if (!reader.plugin.settings.timerEnabled) return;
  pauseTimerSession(reader);
  reader.plugin.resetTodaySeconds();
  reader.plugin.flushReadingTime();
  reader._goalNotified = false;
  updateTimerBtn(reader);
  updateGoalBar(reader);
  const resetNotice = qiaomuReaderTranslate("timer-reset");
  new Notice(resetNotice);
}
function updateTimerBtn(reader) {
  const btn = reader.timerBtnEl;
  if (!btn) return;
  const plugin = reader.plugin;
  const sessionActive = reader._running || reader._timerStarted;
  if (!plugin.settings.timerEnabled || !sessionActive) { btn.addClass("qiaomu-reader-hidden"); return; }
  btn.removeClass("qiaomu-reader-hidden");
  const remain = Math.max(0, plugin.getGoalSeconds() - plugin.getTodaySeconds());
  const goalDone = remain <= 0;
  const mm = Math.floor(remain / 60);
  const ss = remain % 60;
  btn.classList.toggle("qiaomu-reader-timer-run", !!reader._running && !goalDone);
  btn.classList.toggle("qiaomu-reader-timer-done", goalDone);
  if (reader.timerIconEl) svgIcon(reader.timerIconEl, goalDone ? "check" : (reader._running ? "pause" : "play"));
  if (reader.timerLabelEl) reader.timerLabelEl.setText(`${mm}:${String(ss).padStart(2, "0")}`);
}
function updateGoalBar(reader) {
  const wrap = reader.goalWrapEl;
  if (!wrap) return;
  const plugin = reader.plugin;
  if (!plugin.settings.timerEnabled) { wrap.addClass("qiaomu-reader-hidden"); return; }
  wrap.removeClass("qiaomu-reader-hidden");
  const done = plugin.getTodaySeconds();
  const goal = plugin.getGoalSeconds();
  const pct = Math.min(100, Math.round((done / goal) * 100));
  const readMinutes = Math.floor(done / 60);
  reader.goalFillEl.style.width = pct + "%";
  const goalReached = done >= goal;
  wrap.classList.toggle("qiaomu-reader-goal-done", goalReached);
  reader.goalTxtEl.setText(goalReached
    ? qiaomuReaderTranslate("goal-reached-0-min-today", (readMinutes))
    : qiaomuReaderTranslate("0-of-1-min-2", (readMinutes), (plugin.settings.dailyGoalMin || 15), (pct)));
}
function buildReaderTimerButton(tray, view) {
  view.timerBtnEl = tray.createEl("button", { cls: "qiaomu-reader-timerbtn", attr: { type: "button" } });
  view.timerIconEl = view.timerBtnEl.createDiv("qiaomu-reader-timer-ic");
  view.timerLabelEl = view.timerBtnEl.createDiv("qiaomu-reader-timer-label");
  view.timerResetEl = view.timerBtnEl.createDiv("qiaomu-reader-timer-reset");
  svgIcon(view.timerResetEl, "rotate-ccw");
  view.timerResetEl.setAttribute("aria-label", qiaomuReaderTranslate("reset-timer"));
  view.timerResetEl.addEventListener("click", (ev) => {
    ev.stopPropagation();
    resetTimerSession(view);
  });
  view.timerBtnEl.setAttribute("aria-label", qiaomuReaderTranslate("timer-time-left-to-the-goal-start-pause"));
  view.timerBtnEl.addEventListener("click", () => toggleTimerSession(view));
  updateTimerBtn(view);
}

  function statsCard(c, plugin) {
    const st = readingStats(plugin.settings.readingLog, plugin.settings.lifetimeSeconds, readerTodayKey());
    const card = c.createDiv({ cls: "qiaomu-reader-stats" });

    const head = card.createDiv({ cls: "qiaomu-reader-stats-head" });
    const total = head.createDiv({ cls: "qiaomu-reader-stats-total" });
    total.createDiv({ cls: "qiaomu-reader-stats-big", text: fmtReadTime(st.total) });
    total.createDiv({ cls: "qiaomu-reader-stats-cap", text: qiaomuReaderTranslate("all-time-with-books") });
    if (st.streak > 0) {
      const fl = head.createDiv({ cls: "qiaomu-reader-stats-streak" });
      fl.createSpan({ cls: "qiaomu-reader-stats-flame", text: "🔥" });
      fl.createSpan({ text: qiaomuReaderTranslate("0-day-streak", st.streak) });
    }

    const grid = card.createDiv({ cls: "qiaomu-reader-stats-grid" });
    const cell = (label, value) => {
      const d = grid.createDiv({ cls: "qiaomu-reader-stats-cell" });
      d.createDiv({ cls: "qiaomu-reader-stats-val", text: value });
      d.createDiv({ cls: "qiaomu-reader-stats-lab", text: label });
    };
    cell(qiaomuReaderTranslate("today"), fmtReadTime(st.today));
    cell(qiaomuReaderTranslate("days-with-a-book"), st.daysRead ? String(st.daysRead) : "—");
    cell(qiaomuReaderTranslate("daily-average"), fmtReadTime(st.avgPerDay));
    cell(qiaomuReaderTranslate("best-day"), fmtReadTime(st.best));

    const peak = st.recent.reduce((a, r) => Math.max(a, r.sec), 0);
    if (peak > 0) {
      const chart = card.createDiv({ cls: "qiaomu-reader-stats-chart" });
      const bars = chart.createDiv({ cls: "qiaomu-reader-stats-bars" });
      for (const r of st.recent) {
        const col = bars.createDiv({ cls: "qiaomu-reader-stats-bar" + (r.sec > 0 ? " is-read" : "") });
        const fill = col.createDiv({ cls: "qiaomu-reader-stats-fill" });
        fill.style.height = r.sec > 0 ? Math.max(8, Math.round(r.sec / peak * 100)) + "%" : "2px";
        col.setAttr("aria-label", r.key + " — " + fmtReadTime(r.sec));
        col.setAttr("title", r.key + " — " + fmtReadTime(r.sec));
      }
      const legend = chart.createDiv({ cls: "qiaomu-reader-stats-legend" });
      legend.createSpan({ text: qiaomuReaderTranslate("14-days-ago") });
      legend.createSpan({ text: qiaomuReaderTranslate("today") });
    } else {
      card.createDiv({ cls: "qiaomu-reader-stats-empty", text: qiaomuReaderTranslate("open-a-book-and-start-the-timer-your-reading-history-will-appear") });
    }
  }


return{statsCard,buildReaderTimerButton,startTimerSession,pauseTimerSession,updateTimerBtn,toggleTimerSession,resetTimerSession};
}
