import {HL_COLOR_SWATCHES} from '../original/highlight-colors.js';
import path from 'node:path';
import {mkdir,lstat,readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {parseDocument,isMap} from 'yaml';
import {mergeManagedNotes} from '../core/markdown-notes.js';
import {highlightLink} from '../core/backlink.js';
import {vocabularyMarkdown} from '../core/vocabulary.js';
import {originalNotePrimitives} from '../original/note-primitives.js';
const words={note:'笔记','comment-on-a-highlight':'批注','p-0-2':'第 {0} 页'};
const primitives=originalNotePrimitives((key,...args)=>(words[key]||key).replace(/\{(\d+)\}/g,(_,i)=>args[i]??''),()=>new Date().toISOString().slice(0,10));
const colors=Object.fromEntries(HL_COLOR_SWATCHES.map(([id,_label,color])=>[id,color]));
const escape=text=>String(text).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
export async function safeNotePath(root,relative,{folder=false}={}){
  relative=String(relative||'').replace(/\\/g,'/');
  if((relative!=='notes'&&!relative.startsWith('notes/'))||relative.split('/').some(v=>!v||v==='.'||v==='..')||(!folder&&!relative.endsWith('.md')))throw Error('Notes must stay within notes/');
  let target=root;
  for(const bit of relative.split('/')){target=path.join(target,bit);try{if((await lstat(target)).isSymbolicLink())throw Error('Notes path contains a symlink');}catch(error){if(error.code!=='ENOENT')throw error;}}
  return target;
}
export function withBookProperties(markdown,book,state,config){
  const text=String(markdown||'');const front=/^---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)(?:\r?\n|$)/.exec(text);
  if(/^---\r?\n/.test(text)&&!front)throw Error('Unclosed note frontmatter; existing note was preserved');
  const doc=parseDocument(front?.[1]||'');if(doc.errors.length||doc.contents&&!isMap(doc.contents))throw Error('Invalid note frontmatter; existing note was preserved');
  doc.set('book',`[[${book.file||book.id}]]`);if(!doc.has('type'))doc.set('type','reading-note');doc.set('book-reader-note',true);
  if(book.isbn)doc.set('isbn',book.isbn);if(book.author)doc.set('authors',book.author);if(book.source==='calibre'&&book.sourceId)doc.set('calibre_uuid',book.sourceId);
  if(config.progressToFrontmatter){const progress=Number.isFinite(state?.locator?.progress)?state.locator.progress:Number.isFinite(state?.locator?.fraction)?state.locator.fraction:((Number(state?.locator?.chapterIndex)||0)+(Number(state?.locator?.scroll)||0))/Math.max(1,book.chapterCount||1);doc.set('reading-progress',Math.round(Math.max(0,Math.min(1,progress))*100));doc.set('reading-updated',new Date(state?.updatedAt||Date.now()).toISOString().slice(0,10));}
  return '---\n'+doc.toString()+'---\n'+(front?text.slice(front[0].length):text);
}
export function createBookNotes({root,bookById,stateOf,settings,updateSettings,serializeFile}){
  let ensureLane=Promise.resolve();const serial=fn=>{const job=ensureLane.then(fn);ensureLane=job.catch(()=>{});return job;};
  const safe=(relative,options)=>safeNotePath(root(),relative,options);
  const read=async file=>{try{if((await lstat(file)).size>4*1024*1024)throw Error('Reading note exceeds 4 MB');return await readFile(file,'utf8');}catch(error){if(error.code==='ENOENT')return null;throw error;}};
  async function write(file,text){const temporary=file+'.'+randomUUID()+'.tmp';try{await writeFile(temporary,text,{flag:'wx',mode:0o600});await rename(temporary,file);}finally{await unlink(temporary).catch(()=>{});}}
  async function ensure(bookId){return serial(async()=>{
    const book=await bookById(bookId);if(!book)throw Error('Book is not in the library');const config=await settings();
    const linked=config.bookNoteLinks?.[bookId];if(linked){const file=await safe(linked);if(await read(file)===null)throw Error('Linked reading note is missing; choose an existing note or create one');return{path:file,relative:linked,book};}
    // Keep the stable 1.1.0 destination if it already exists. New folders never move user files.
    const legacy='notes/'+bookId+'.md',legacyFile=await safe(legacy);if(await read(legacyFile)!==null){await updateSettings(value=>({...value,bookNoteLinks:{...value.bookNoteLinks,[bookId]:legacy}}));return{path:legacyFile,relative:legacy,book};}
    const folder=config.bookNotesFolder||'notes',directory=await safe(folder,{folder:true});await mkdir(directory,{recursive:true});
    const title=primitives.sanitizeNoteTitle(book.title||bookId);const stem=title;
    let initial='';if(config.bookNoteTemplate){const file=await safe(config.bookNoteTemplate),template=await read(file);if(template===null)throw Error('Reading note template is missing');initial=primitives.processTemplateManually(template,title);}
    initial=withBookProperties(initial,book,await stateOf(bookId),config);
    for(let n=1;n<=10000;n++){const relative=folder+'/'+stem+(n===1?'':` (${n})`)+'.md',file=await safe(relative);try{await writeFile(file,initial,{flag:'wx',mode:0o600});}catch(error){if(error.code==='EEXIST')continue;throw error;}
      // Preserve a created file if saving its link fails; returning the exact path makes recovery possible.
      try{await updateSettings(value=>({...value,bookNoteLinks:{...value.bookNoteLinks,[bookId]:relative}}));}catch(error){throw Error(`Reading note created at ${relative}, but linking failed: ${error.message}`);}return{path:file,relative,book};
    }throw Error('Could not find an unused reading note title');
  });}
  function render(book,state,config,marks=state.highlights||[]){const lines=[`# ${book.title||book.id} · 阅读笔记`,''];let chapter;
    if(!marks.length)lines.push('_还没有划线。_');
    for(const item of marks){const next=item.chapter||item.chapterHref||'未定位';if(next!==chapter){lines.push('## '+next,'');chapter=next;}
      const text=config.exportColors===false?item.text:`<mark style="background-color:${colors[item.color]||colors.yellow};color:inherit">${escape(item.text||'')}</mark>`;
      lines.push(primitives.formatQuote(config,book,{...item,text,comment:item.note||item.comment},highlightLink(book.id,item.id)),'');
    }lines.push(vocabularyMarkdown(book.id,state.vocabulary));return lines.join('\n');
  }
  async function exportBook(bookId,{ids,appendOnly=false,metadataOnly=false}={}){
    const destination=await ensure(bookId),config=await settings(),state=await stateOf(bookId);
    return serializeFile(destination.path,async()=>{const existing=await read(await safe(destination.relative));if(existing===null)throw Error('Reading note disappeared; existing link was preserved');let markdown=existing;
      const selected=Array.isArray(ids)?(state.highlights||[]).filter(item=>ids.includes(item.id)):state.highlights||[];
      if(!metadataOnly){if(appendOnly){const fresh=selected.filter(item=>!existing.includes(highlightLink(bookId,item.id)));if(fresh.length)markdown=existing.trimEnd()+'\n\n'+render(destination.book,{...state,vocabulary:[]},config,fresh)+'\n';}else markdown=mergeManagedNotes(existing,render(destination.book,state,config));}
      markdown=withBookProperties(markdown,destination.book,state,config);await write(await safe(destination.relative),markdown);return{path:destination.path,relative:destination.relative,markdown};
    });
  }
  return {ensure,exportBook,async syncProgress(bookId){const config=await settings();if(config.progressToFrontmatter&&config.bookNoteLinks?.[bookId])return exportBook(bookId,{metadataOnly:true});},async operation(input){
    if(input.action==='ensure')return ensure(input.bookId);
    if(input.action==='info'){const config=await settings(),relative=config.bookNoteLinks?.[input.bookId]||'notes/'+input.bookId+'.md';const file=await safe(relative),markdown=await read(file);return{path:file,relative,markdown:markdown||'',exists:markdown!==null};}
    if(input.action==='link'){if(!await bookById(input.bookId))throw Error('Book is not in the library');const file=await safe(input.path);if(await read(file)===null)throw Error('Note is missing');await updateSettings(value=>({...value,bookNoteLinks:{...value.bookNoteLinks,[input.bookId]:input.path}}));return{path:file};}
    if(input.action==='export')return exportBook(input.bookId,{ids:input.ids,appendOnly:true});
    throw Error('Unknown reading note operation');
  }};
}
