/** Small cancellable speech loop. A provider owns audio; this controller owns position. */
export function speechSegments(text, max = 220) {
  const segments = [];
  const source = String(text || '');
  const re = /[^。！？.!?\n]+[。！？.!?\n]*|[。！？.!?\n]+/g;
  for (const match of source.matchAll(re)) {
    for (let i = 0; i < match[0].length; i += max) {
      const raw = match[0].slice(i, i + max);
      if (raw.trim()) segments.push({ text: raw.trim(), offset: match.index + i + raw.indexOf(raw.trim()) });
    }
  }
  return segments;
}

export function createSpeechController({ engine, provider, position, onChange = () => {}, onPosition = () => {} }) {
  let generation = 0;
  let disposed = false;
  let state = { status: position?.ended ? 'ended' : 'idle', chapterIndex: Math.max(0, Math.min(engine.chapterCount() - 1, Number(position?.chapterIndex) || 0)),
    segment: Math.max(0, Number(position?.segment) || 0), text: '', offset: 0, error: '' };
  const publish = patch => { state = { ...state, ...patch }; onChange(state); };
  const stop = (status = 'paused') => { generation++; provider.cancel(); publish({ status }); };
  async function play(start) {
    if (disposed) return;
    stop();
    if (start) publish({ chapterIndex: Math.max(0, Math.min(engine.chapterCount() - 1, Number(start.chapterIndex) || 0)), segment: Math.max(0, Number(start.segment) || 0) });
    const token = generation;
    publish({ status: 'loading', error: '' });
    try {
      while (!disposed && token === generation && state.chapterIndex < engine.chapterCount()) {
        const chapter = state.chapterIndex;
        const text = await engine.plainTextOf(chapter);
        if (token !== generation || disposed) return;
        const parts = speechSegments(text);
        for (let i = state.segment; i < parts.length; i++) {
          if (token !== generation || disposed) return;
          publish({ status: 'playing', segment: i, ...parts[i] });
          onPosition({ chapterIndex: chapter, segment: i, ...parts[i] });
          await provider.speak(parts[i].text);
          if (token !== generation || disposed) return;
          // Persist the next sentence, so a restart doesn't skip unsaid text.
          publish({ segment: i + 1 });
          onPosition({ chapterIndex: chapter, segment: i + 1 });
        }
        publish({ chapterIndex: chapter + 1, segment: 0 });
      }
      if (token === generation && !disposed) {
        publish({ status: 'ended' });
        onPosition({ chapterIndex: Math.max(0, engine.chapterCount() - 1), segment: state.segment, ended: true });
      }
    } catch (error) {
      if (token === generation && !disposed) publish({ status: 'error', error: error?.message || String(error) });
    }
  }
  return { play, pause: () => stop(), snapshot: () => state, dispose() { disposed = true; stop('idle'); } };
}

export function browserSpeechProvider({ getOptions = () => ({}) } = {}) {
  let cancelCurrent = () => {};
  return {
    cancel() { cancelCurrent(); },
    speak(text) {
      return new Promise((resolve, reject) => {
        if (!globalThis.speechSynthesis || !globalThis.SpeechSynthesisUtterance) { reject(new Error('此运行环境没有系统朗读，请选择 macOS 系统语音')); return; }
        const options = getOptions();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options.rate || 1;
        utterance.voice = speechSynthesis.getVoices().find(v => v.voiceURI === options.voice) || null;
        let settled = false;
        const done = (error) => { if (settled) return; settled = true; clearTimeout(timeout); cancelCurrent = () => {}; error ? reject(error) : resolve(); };
        const timeout = setTimeout(() => { speechSynthesis.cancel(); done(new Error('系统朗读超时，请切换语音后重试')); }, 90000);
        utterance.onend = () => done();
        utterance.onerror = event => done(new Error(`朗读失败：${event.error}`));
        cancelCurrent = () => { speechSynthesis.cancel(); done(); };
        speechSynthesis.speak(utterance);
      });
    },
  };
}

export function hostSpeechProvider({ host, getOptions = () => ({}) }) {
  let generation = 0; let cleanup = () => {};
  return {
    cancel() { generation++; cleanup(); },
    async speak(text) {
      const token = generation;
      const result = await host().speechAudio({ text, ...getOptions() });
      if (token !== generation) return;
      const bytes = Uint8Array.from(atob(result.base64), c => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
      await new Promise((resolve, reject) => {
        const audio = new Audio(url);
        let done = false;
        const finish = error => {
          if (done) return; done = true; clearTimeout(timeout); audio.pause(); audio.removeAttribute('src'); URL.revokeObjectURL(url);
          cleanup = () => {}; error ? reject(error) : resolve();
        };
        const timeout = setTimeout(() => finish(new Error('播放超时')), 90000);
        cleanup = () => finish();
        audio.onended = () => finish();
        audio.onerror = () => finish(new Error('无法播放系统语音'));
        audio.play().catch(finish);
      });
    },
  };
}
