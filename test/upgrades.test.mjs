/**
 * 乔木阅读 · 本轮原版同步单测（对照原版 4.5.10 / 4.5.12 / 4.5.13 / 4.2.4）
 *
 * 运行：node --test test/upgrades.test.mjs
 *
 * - companion-appearance / pdf-resources 零宿主依赖，直接 import；
 * - readerPageDirection 所在的 src/ui/reader.js 依赖 react（本仓库 node_modules
 *   不含），按 client-activation.test.mjs 的做法从源码提取函数体在 vm 里求值。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

import {
  COMPANION_APPEARANCE_DEFAULTS,
  normalizeCompanionAppearance,
  readCompanionAppearance,
  saveCompanionAppearance,
} from '../src/ui/companion-appearance.js';
import {
  EmbeddedPdfBinaryDataFactory,
  PDF_EMBEDDED_RESOURCE_OPTIONS,
} from '../src/client/pdf-resources.js';

/* ------------------------------------------------------------------ *
 * 4.5.10 伴读独立外观：归一化
 * ------------------------------------------------------------------ */

test('normalizeCompanionAppearance: 非对象输入返回 null（跟随正文）', () => {
  for (const value of [null, undefined, 42, 'paper', [], true]) {
    assert.equal(normalizeCompanionAppearance(value), null, String(value));
  }
});

test('normalizeCompanionAppearance: 字段不全时用默认值补齐', () => {
  const merged = normalizeCompanionAppearance({ theme: 'night' });
  assert.deepEqual(merged, {
    theme: 'night',
    fontFamily: COMPANION_APPEARANCE_DEFAULTS.fontFamily,
    fontSize: COMPANION_APPEARANCE_DEFAULTS.fontSize,
    lineHeight: COMPANION_APPEARANCE_DEFAULTS.lineHeight,
  });
});

test('normalizeCompanionAppearance: 字号四舍五入并夹 12–32，行高夹 1.4–2.2', () => {
  assert.equal(normalizeCompanionAppearance({ fontSize: 15.6, lineHeight: 9 }).fontSize, 16);
  assert.equal(normalizeCompanionAppearance({ fontSize: 5 }).fontSize, 12);
  assert.equal(normalizeCompanionAppearance({ fontSize: 99 }).fontSize, 32);
  assert.equal(normalizeCompanionAppearance({ fontSize: 'abc' }).fontSize, COMPANION_APPEARANCE_DEFAULTS.fontSize);
  assert.equal(normalizeCompanionAppearance({ lineHeight: 1 }).lineHeight, 1.4);
  assert.equal(normalizeCompanionAppearance({ lineHeight: 3 }).lineHeight, 2.2);
  assert.equal(normalizeCompanionAppearance({ lineHeight: 'x' }).lineHeight, COMPANION_APPEARANCE_DEFAULTS.lineHeight);
});

/** 每个 webstorage 用例独立存储，互不串扰 */
function withLocalStorage(fn) {
  const backing = new Map();
  const storage = {
    getItem: (key) => (backing.has(key) ? backing.get(key) : null),
    setItem: (key, value) => backing.set(key, String(value)),
    removeItem: (key) => backing.delete(key),
  };
  const previous = globalThis.localStorage;
  globalThis.localStorage = storage;
  try {
    fn(() => backing.get('qmr.companionAppearance'));
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
}

test('read/saveCompanionAppearance: 持久化、清除与容错', () => {
  withLocalStorage((raw) => {
    // 未保存时读 → null（跟随正文）
    assert.equal(readCompanionAppearance(), null);

    // 保存归一化后的值，读回一致
    const saved = saveCompanionAppearance({ theme: 'warm', fontSize: 20, lineHeight: 1.8 });
    assert.equal(saved.theme, 'warm');
    assert.equal(raw(), JSON.stringify(saved));
    assert.deepEqual(readCompanionAppearance(), saved);

    // 畸形存储内容 → 容错返回 null
    saveCompanionAppearance(null);
    assert.equal(raw(), undefined);
    assert.equal(readCompanionAppearance(), null);
    saveCompanionAppearance({ theme: 'celadon' });
    globalThis.localStorage.setItem('qmr.companionAppearance', '{oops');
    assert.equal(readCompanionAppearance(), null);
  });
});

test('readCompanionAppearance: localStorage 抛错时静默返回 null', () => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem() {
      throw new Error('denied');
    },
  };
  try {
    assert.equal(readCompanionAppearance(), null);
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});

/* ------------------------------------------------------------------ *
 * 4.5.12 翻页键盘防误触（从 reader.js 源码提取纯函数）
 * ------------------------------------------------------------------ */

/** 从 src/ui/reader.js 提取 readerPageDirection（react 缺失，无法整模块 import） */
async function loadReaderPageDirection() {
  const source = await readFile(new URL('../src/ui/reader.js', import.meta.url), 'utf8');
  const matched = source.match(/export function readerPageDirection\(event\) \{[\s\S]*?\n\}/);
  if (!matched) throw new Error('未在 src/ui/reader.js 中找到 readerPageDirection');
  const script = new vm.Script(`${matched[0].replace(/^export /, '')}\nreaderPageDirection`);
  return script.runInNewContext({});
}

const readerPageDirection = await loadReaderPageDirection();

/** 最小 DOM 元素 mock：支持 readerPageDirection 用到的选择器子集 */
function mockEl(props = {}) {
  return {
    ...props,
    matches(selector) {
      return selector.split(',').some((raw) => {
        const sel = raw.trim();
        if (sel === '[contenteditable=true]') return props.isContentEditable === true;
        const role = sel.match(/^\[role=([\w-]+)\]$/);
        if (role) return props.role === role[1];
        const tag = sel.replace(/\[[^\]]*\]$/, '').toLowerCase();
        if (tag === 'a') return props.tagName === 'A' && props.href != null;
        return props.tagName != null && props.tagName.toLowerCase() === tag;
      });
    },
    closest(selector) {
      return this.matches(selector) ? this : null;
    },
  };
}

/** 构造键盘事件假对象；focusTarget 为焦点所在控件（null = 不在任何控件里） */
function keyEvent(key, { focusTarget = null, editable = false, composed = false, ...rest } = {}) {
  const inner = {
    isContentEditable: editable,
    closest: (selector) => (focusTarget && focusTarget.matches(selector) ? focusTarget : null),
  };
  return {
    key,
    keyCode: 0,
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    isComposing: false,
    defaultPrevented: false,
    ...rest,
    ...(composed ? { composedPath: () => [inner], target: null } : { target: inner }),
  };
}

test('readerPageDirection: 方向键 / 空格 / PageUp-Down 映射翻页方向', () => {
  assert.equal(readerPageDirection(keyEvent('ArrowRight')), 'next');
  assert.equal(readerPageDirection(keyEvent('ArrowDown')), 'next');
  assert.equal(readerPageDirection(keyEvent(' ')), 'next');
  assert.equal(readerPageDirection(keyEvent('Spacebar')), 'next');
  assert.equal(readerPageDirection(keyEvent('PageDown')), 'next');
  assert.equal(readerPageDirection(keyEvent('ArrowLeft')), 'prev');
  assert.equal(readerPageDirection(keyEvent('ArrowUp')), 'prev');
  assert.equal(readerPageDirection(keyEvent('PageUp')), 'prev');
  assert.equal(readerPageDirection(keyEvent('a')), null);
  assert.equal(readerPageDirection(keyEvent('Home')), null);
});

test('readerPageDirection: 修饰键、输入法与已处理事件不触发翻页', () => {
  assert.equal(readerPageDirection(keyEvent('ArrowRight', { metaKey: true })), null);
  assert.equal(readerPageDirection(keyEvent('ArrowRight', { ctrlKey: true })), null);
  assert.equal(readerPageDirection(keyEvent('ArrowRight', { altKey: true })), null);
  assert.equal(readerPageDirection(keyEvent(' ', { isComposing: true })), null);
  assert.equal(readerPageDirection(keyEvent(' ', { keyCode: 229 })), null);
  assert.equal(readerPageDirection(keyEvent('ArrowRight', { defaultPrevented: true })), null);
});

test('readerPageDirection: 焦点在输入框 / 滑杆 / 菜单 / 标签组时不翻页', () => {
  for (const role of ['slider', 'menu', 'tablist']) {
    assert.equal(readerPageDirection(keyEvent('ArrowRight', { focusTarget: mockEl({ role }) })), null, role);
  }
  assert.equal(readerPageDirection(keyEvent(' ', { focusTarget: mockEl({ tagName: 'INPUT' }) })), null);
  assert.equal(readerPageDirection(keyEvent(' ', { focusTarget: mockEl({ tagName: 'TEXTAREA' }) })), null);
  assert.equal(readerPageDirection(keyEvent('ArrowRight', { editable: true })), null);
});

test('readerPageDirection: 空格落在按钮/链接上不翻页，方向键不受影响', () => {
  const button = mockEl({ role: 'button' });
  assert.equal(readerPageDirection(keyEvent(' ', { focusTarget: button })), null);
  assert.equal(readerPageDirection(keyEvent('Spacebar', { focusTarget: button })), null);
  assert.equal(readerPageDirection(keyEvent('ArrowRight', { focusTarget: button })), 'next');
  const link = mockEl({ tagName: 'A', href: '#x' });
  assert.equal(readerPageDirection(keyEvent(' ', { focusTarget: link })), null);
  assert.equal(readerPageDirection(keyEvent(' ', { focusTarget: mockEl({ tagName: 'BUTTON' }) })), null);
  // composedPath 优先于 target（shadow DOM 场景）
  assert.equal(readerPageDirection(keyEvent('ArrowRight', { composed: true })), 'next');
});

/* ------------------------------------------------------------------ *
 * 4.5.13 扫描版 PDF 离线解码资源
 * ------------------------------------------------------------------ */

test('PDF 资源数据：44 个繁中 CMap 且含 UCS2 总表', async () => {
  const { EMBEDDED_PDF_CMAPS, EMBEDDED_PDF_WASM_ARCHIVE } = await import(
    '../src/client/pdf-resources-data.js'
  );
  const names = Object.keys(EMBEDDED_PDF_CMAPS);
  assert.ok(names.length >= 40, `CMap 数量异常：${names.length}`);
  assert.ok(names.every((name) => name.endsWith('.bcmap')));
  assert.ok(names.includes('Adobe-CNS1-UCS2.bcmap'));
  assert.equal(typeof EMBEDDED_PDF_WASM_ARCHIVE, 'string');
});

test('PDF 资源工厂：CMap 解码为全新字节，未知资源抛可读错误', async () => {
  const { EmbeddedPdfBinaryDataFactory } = await import('../src/client/pdf-resources.js');
  const factory = new EmbeddedPdfBinaryDataFactory();

  const first = await factory.fetch({ kind: 'cMapUrl', filename: 'B5-H.bcmap' });
  assert.ok(first instanceof Uint8Array);
  assert.ok(first.length > 0);
  // 每次调用返回全新缓冲区（pdf.js 可能把缓冲区 transfer 给 worker）
  const second = await factory.fetch({ kind: 'cMapUrl', filename: 'B5-H.bcmap' });
  assert.notEqual(second.buffer, first.buffer);
  assert.deepEqual([...second], [...first]);

  await assert.rejects(
    factory.fetch({ kind: 'cMapUrl', filename: 'Nope-H.bcmap' }),
    /内嵌 PDF CMap 不可用/,
  );
  await assert.rejects(
    factory.fetch({ kind: 'standardFontDataUrl', filename: 'foo.ttf' }),
    /不支持的内嵌 PDF 资源类型/,
  );
});

test('PDF 资源工厂：wasm 解码器可从内嵌 zip 解出且带 \\0asm 魔数', async () => {
  const { EmbeddedPdfBinaryDataFactory } = await import('../src/client/pdf-resources.js');
  const factory = new EmbeddedPdfBinaryDataFactory();
  for (const name of ['jbig2.wasm', 'openjpeg.wasm', 'qcms_bg.wasm']) {
    const bytes = await factory.fetch({ kind: 'wasmUrl', filename: name });
    assert.ok(bytes instanceof Uint8Array, name);
    assert.equal(bytes[0], 0x00, `${name} 魔数字节 0`);
    assert.equal(bytes[1], 0x61, `${name} 魔数字节 1 (a)`);
    assert.equal(bytes[2], 0x73, `${name} 魔数字节 2 (s)`);
    assert.equal(bytes[3], 0x6d, `${name} 魔数字节 3 (m)`);
  }
  await assert.rejects(
    factory.fetch({ kind: 'wasmUrl', filename: 'missing.wasm' }),
    /内嵌 PDF 资源不可用/,
  );
});

test('PDF_EMBEDDED_RESOURCE_OPTIONS：useWorkerFetch 关闭且 URL 带尾斜杠', () => {
  assert.equal(PDF_EMBEDDED_RESOURCE_OPTIONS.useWorkerFetch, false);
  assert.equal(PDF_EMBEDDED_RESOURCE_OPTIONS.cMapPacked, true);
  assert.ok(PDF_EMBEDDED_RESOURCE_OPTIONS.cMapUrl.endsWith('/'));
  assert.ok(PDF_EMBEDDED_RESOURCE_OPTIONS.wasmUrl.endsWith('/'));
  assert.equal(PDF_EMBEDDED_RESOURCE_OPTIONS.BinaryDataFactory, EmbeddedPdfBinaryDataFactory);
});
