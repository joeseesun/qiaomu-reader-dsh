import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import registry from '../src/core/tts-local-models.json' with { type:'json' };
test('local worker rejects unlisted paths, links, checksum failures and invalid resume responses',async()=>{const value=await promisify(execFile)('python3',['test/tts-local-runtime.test.py'],{timeout:15000,maxBuffer:1024*1024});assert.match(value.stderr,/OK/);});
test('local model registry pins complete safe manifests and runtime downloads',()=>{for(const model of Object.values(registry.models)){assert.equal(model.bytes,model.archive.bytes);assert.match(model.archive.url,/^https:\/\/github.com\/k2-fsa\/sherpa-onnx\/releases\/download\//);assert.match(model.archive.sha256,/^[a-f0-9]{64}$/);const names=new Set();for(const file of model.files){assert(!file.path.startsWith('/')&&!file.path.split('/').includes('..'));assert(!names.has(file.path));names.add(file.path);assert.match(file.sha256,/^[a-f0-9]{64}$/);assert(Number.isSafeInteger(file.bytes)&&file.bytes>0);}}});
