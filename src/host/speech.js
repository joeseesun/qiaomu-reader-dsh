import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const exec = promisify(execFile);
let voices;
export async function speechVoices() {
  if (process.platform !== 'darwin') return { voices: [], available: false };
  if (!voices) {
    const { stdout } = await exec('/usr/bin/say', ['-v', '?'], { timeout: 10000, maxBuffer: 1024 * 1024 });
    voices = stdout.split('\n').map(line => /^(.*?)\s+([a-z]{2,3}_[A-Z]{2})\s+#/.exec(line)).filter(Boolean).map(m => ({ id: m[1].trim(), lang: m[2] }));
  }
  return { voices, available: true };
}
let active = 0;
export async function speechAudio(input) {
  if (process.platform !== 'darwin') throw new Error('macOS 系统语音只适用于 Mac 宿主');
  const text = String(input?.text || '').trim();
  if (!text || text.length > 1000) throw new Error('朗读文本须为 1–1000 个字符');
  const options = await speechVoices();
  const voice = input.voice ? options.voices.find(v => v.id === input.voice) : null;
  if (input.voice && !voice) throw new Error('系统音色不存在，请重新选择');
  if (active >= 2) throw new Error('系统语音正忙，请稍后重试');
  active++;
  let folder;
  try {
    folder = await mkdtemp(path.join(tmpdir(), 'qmr-speech-'));
    const file = path.join(folder, 'speech.wav');
    const rate = Math.round(180 * Math.max(0.5, Math.min(2, Number(input.rate) || 1)));
    // Text is a separate argument after --, never shell source.
    await exec('/usr/bin/say', [...(voice ? ['-v', voice.id] : []), '-r', String(rate), '-o', file, '--file-format=WAVE', '--data-format=LEI16@22050', '--', text], { timeout: 45000, maxBuffer: 1024 * 1024 });
    const bytes = await readFile(file);
    if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF') throw new Error('系统未生成有效音频');
    return { base64: bytes.toString('base64') };
  } finally { active--; if (folder) await rm(folder, { recursive: true, force: true }); }
}
