import * as React from 'react';
import { createSpeechController, browserSpeechProvider, hostSpeechProvider, speechSegments } from '../client/tts.js';
import { IconClose } from './icons.js';
const h = React.createElement;

export function useSpeech(ui, bookId, engine) {
  const [snapshot, setSnapshot] = React.useState({ status: 'idle' });
  const [voices, setVoices] = React.useState([]);
  const [macVoices, setMacVoices] = React.useState([]);
  const [options, setOptions] = React.useState({ provider: 'browser', rate: 1, voice: '', follow: true });
  const optionsRef = React.useRef(options); optionsRef.current = options;
  const controller = React.useRef(null);
  const generation = React.useRef(0);
  const [focus, setFocus] = React.useState(null);
  const readOptions = () => optionsRef.current;
  const jump = point => {
    if (!point?.text) return;
    if (ui.store.get().chapterIndex !== point.chapterIndex) ui.goChapter(point.chapterIndex);
    ui.store.set({ speechFocus: { ...point, token: Date.now() } });
  };
  React.useEffect(() => {
    let cancelled = false;
    const refresh = () => setVoices(globalThis.speechSynthesis?.getVoices() || []);
    refresh(); globalThis.speechSynthesis?.addEventListener('voiceschanged', refresh);
    const host = ui.props().data?.getHost();
    host?.speechVoices?.().then(result => {
      if (!cancelled) {
        setMacVoices(result.voices || []);
        if (result.available && !ui.stateOr(bookId).speechSettings) {
          setOptions(previous => ({ ...previous, provider: 'macos', voice: '' }));
        }
      }
    }).catch(() => {});
    return () => { cancelled = true; globalThis.speechSynthesis?.removeEventListener('voiceschanged', refresh); };
  }, [ui, bookId]);
  React.useEffect(() => {
    if (!engine) return;
    const token = ++generation.current;
    ui.loadState(bookId).then(state => {
      if (generation.current !== token) return;
      if (state.speechSettings) setOptions(previous => ({ ...previous, ...state.speechSettings }));
      const browser = browserSpeechProvider({ getOptions: readOptions });
      const host = hostSpeechProvider({ host: () => ui.props().data?.getHost(), getOptions: readOptions });
      controller.current = createSpeechController({ engine, position: state.speech,
        provider: { speak: text => (readOptions().provider === 'macos' ? host : browser).speak(text), cancel() { browser.cancel(); host.cancel(); } },
        onChange: setSnapshot,
        onPosition(point) {
          ui.patchState(bookId, { speech: point });
          void ui.flushState(bookId);
          if (point.text) { setFocus(point); if (readOptions().follow) jump(point); }
        },
      });
      setSnapshot(controller.current.snapshot());
    });
    return () => { generation.current++; controller.current?.dispose(); controller.current = null; void ui.flushState(bookId); };
  }, [ui, bookId, engine]);
  const update = patch => {
    controller.current?.pause();
    const next = { ...optionsRef.current, ...patch };
    optionsRef.current = next; setOptions(next);
    ui.patchState(bookId, { speechSettings: next });
  };
  return { snapshot, voices, macVoices, options, update,
    pause: () => controller.current?.pause(),
    resume: () => controller.current?.play(snapshot.status === 'ended' ? { chapterIndex: 0, segment: 0 } : undefined),
    async fromHere() {
      const chapter = ui.store.get().chapterIndex || 0;
      const text = await engine.plainTextOf(chapter);
      const parts = speechSegments(text);
      const fraction = ui.stateOr(bookId).locator?.scroll || 0;
      const at = Math.round(text.length * fraction);
      const index = parts.findIndex(part => part.offset >= at);
      controller.current?.play({ chapterIndex: chapter, segment: index < 0 ? Math.max(0, parts.length - 1) : index });
    },
    back: () => jump(focus),
  };
}

export function SpeechPanel({ ui, speech }) {
  const { snapshot, options } = speech;
  const t = (key, fallback) => ui.t(`speech.${key}`, fallback);
  const active = ['playing', 'loading'].includes(snapshot.status);
  const voices = options.provider === 'macos' ? speech.macVoices.map(v => ({ id: v.id, label: `${v.id} · ${v.lang}` }))
    : speech.voices.map(v => ({ id: v.voiceURI, label: `${v.name} · ${v.lang}` }));
  return h('div', { className: 'qmr-panel-content' },
    h('div', { className: 'qmr-panel-head' }, h('strong', { className: 'qmr-panel-title' }, t('title', '连续朗读')),
      h('button', { className: 'qmr-icon-btn', 'aria-label': t('close', '关闭面板'), onClick: () => ui.setPanel(null) }, h(IconClose))),
    h('div', { className: 'qmr-panel-body qmr-feature-panel' },
      h('label', null, t('provider', '语音来源'), h('select', { value: options.provider, onChange: e => speech.update({ provider: e.target.value, voice: '' }) },
        h('option', { value: 'browser' }, t('browser', '浏览器系统语音')),
        speech.macVoices.length ? h('option', { value: 'macos' }, t('macos', 'macOS 系统语音')) : null)),
      h('label', null, t('voice', '音色'), h('select', { value: options.voice, onChange: e => speech.update({ voice: e.target.value }) },
        h('option', { value: '' }, t('default', '系统默认')), voices.map(v => h('option', { key: v.id, value: v.id }, v.label)))),
      h('label', null, `${t('rate', '语速')} · ${options.rate}×`, h('input', { type: 'range', min: 0.5, max: 2, step: 0.1, value: options.rate, onChange: e => speech.update({ rate: Number(e.target.value) }) })),
      h('label', null, h('input', { type: 'checkbox', checked: options.follow, onChange: e => speech.update({ follow: e.target.checked }) }), t('follow', '跟随朗读翻页')),
      h('div', { className: 'qmr-feature-actions' },
        h('button', { className: 'qmr-btn', onClick: active ? speech.pause : speech.resume }, active ? t('pause', '暂停') : t('resume', '继续朗读')),
        h('button', { className: 'qmr-btn', onClick: speech.fromHere }, t('here', '从当前页朗读')),
        h('button', { className: 'qmr-btn', onClick: speech.back }, t('back', '回到朗读处'))),
      h('p', { role: 'status' }, t(snapshot.status, ({ idle: '准备就绪', loading: '正在准备语音…', playing: '正在朗读', paused: '已暂停', ended: '已读完', error: '朗读失败' })[snapshot.status] || snapshot.status)),
      snapshot.text ? h('blockquote', null, snapshot.text) : null,
      snapshot.error ? h('p', { role: 'alert' }, snapshot.error) : null));
}
