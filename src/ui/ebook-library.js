import * as React from 'react';
import { IconSearch } from './icons.js';
const h=React.createElement;
export function QiaomuLibrary({ ui, onOpen, memory }) {
  const t=(key,fallback)=>ui.t(`ebook.${key}`,fallback);
  const [profile,setProfile]=React.useState(null),[checking,setChecking]=React.useState(true),[code,setCode]=React.useState('');
  const [query,setQuery]=React.useState(memory.current.query||''),[books,setBooks]=React.useState(memory.current.books||[]),[covers,setCovers]=React.useState({});
  const [jobs,setJobs]=React.useState([]),[operation,setOperation]=React.useState(null),[busy,setBusy]=React.useState(''),[error,setError]=React.useState(''),[searched,setSearched]=React.useState(false),[filter,setFilter]=React.useState('');
  const live=React.useRef(true),sequence=React.useRef(0),downloading=React.useRef(false);
  const api=async request=>{const host=ui.props().data?.getHost();if(!host) throw Object.assign(new Error(),{code:'offline'});const value=await host.ebookAction(request);if(value.error&&!value.stage)throw Object.assign(new Error(),{code:value.error});return value;};
  const message=cause=>t(`error-${cause?.code||'service'}`,t('error-service','服务暂不可用，请重试'));
  const loadJobs=async()=>{const value=await api({action:'jobs'});if(live.current)setJobs(value.jobs||[]);};
  const check=async()=>{
    setChecking(true);setError('');
    try{const value=await api({action:'profile'});if(!live.current)return;setProfile(value.profile);if(value.profile)await loadJobs();}
    catch(cause){if(live.current){setError(message(cause));setProfile(null);}}
    finally{if(live.current)setChecking(false);}
  };
  React.useEffect(()=>{live.current=true;void check();return()=>{live.current=false;sequence.current++;if(downloading.current)void api({action:'cancel'}).catch(()=>{});};},[]);
  memory.current={query,books};
  const activate=async event=>{event.preventDefault();setBusy('activate');setError('');try{const value=await api({action:'activate',code});if(live.current){setCode('');setProfile(value.profile);await loadJobs();}}catch(cause){if(live.current)setError(message(cause));}finally{if(live.current)setBusy('');}};
  const search=async event=>{
    event?.preventDefault();if(!query.trim())return;const ticket=++sequence.current;setBusy('search');setError('');setSearched(true);setCovers({});
    try{
      const value=await api({action:'search',query});if(!live.current||ticket!==sequence.current)return;setBooks(value.results);
      // Optional reference covers do not change the selected edition or block search.
      void(async()=>{let pending=value.results.slice(0,20),round=0;try{while(pending.length&&round++<20&&live.current&&ticket===sequence.current){const next=await api({action:'covers',ids:pending.map(b=>b.id)});if(!live.current||ticket!==sequence.current)return;setCovers(previous=>({...previous,...Object.fromEntries(next.results.filter(b=>b.cover).map(b=>[b.id,b.cover]))}));const ids=new Set(next.results.filter(b=>b.pending).map(b=>b.id));pending=pending.filter(b=>ids.has(b.id));if(pending.length)await new Promise(resolve=>setTimeout(resolve,1500));}}catch{/* Reference art is optional. */}})();
    }catch(cause){if(live.current&&ticket===sequence.current)setError(message(cause));}
    finally{if(live.current&&ticket===sequence.current)setBusy('');}
  };
  const runDownload=async input=>{
    if(downloading.current)return;downloading.current=true;setBusy('download');setError('');
    try{
      let value=await api({action:'start',...input});if(live.current)setOperation(value);
      while(value.active&&live.current){await new Promise(resolve=>setTimeout(resolve,650));if(!live.current)return;value=await api({action:'status'});if(live.current)setOperation(value);}
      if(!live.current)return;
      if(value.stage==='imported'){
        await ui.refreshLibrary();if(!live.current)return;
        setBooks(previous=>previous.map(b=>(b.id===input.candidateId || b.sourceId && b.sourceId===value.book?.sourceId)?{...b,ownedId:value.book?.id}:b));
        try{const next=await api({action:'profile'});if(live.current)setProfile(next.profile);}catch{/* A completed import stays successful if quota refresh fails. */}
      }else if(value.error&&!value.stage)throw {code:value.error};
      await loadJobs();
    }catch(cause){if(live.current){setError(message(cause));void loadJobs().catch(()=>{});}}
    finally{downloading.current=false;if(live.current)setBusy('');}
  };
  const logout=async()=>{setBusy('logout');setError('');try{await api({action:'logout'});if(live.current){setProfile(null);setBooks([]);setJobs([]);setOperation(null);}}catch(cause){if(live.current)setError(message(cause));}finally{if(live.current)setBusy('');}};
  const button=(label,onClick,props={})=>h('button',{type:'button',className:'qmr-discovery-button',onClick,...props},label);
  const failure=error?h('div',{role:'alert',className:'qmr-discovery-state is-error'},error,button(t('retry','重试'),()=>void check(),{disabled:!!busy})):null;
  if(checking)return h('div',{role:'status',className:'qmr-discovery-state'},t('connecting','正在验证服务状态…'));
  if(!profile)return h('section',{className:'qmr-ebook'},h('p',{className:'qmr-discovery-view-hint'},t('activationHelp','输入乔木书库激活码，连接后可搜索并下载到本地书库。')),
    h('form',{className:'qmr-ebook-activation',onSubmit:activate},h('label',null,h('span',null,t('code','激活码')),h('div',{className:'qmr-discovery-search-field'},h('input',{type:'password',value:code,autoComplete:'off',spellCheck:false,maxLength:40,'data-autofocus':true,onChange:e=>setCode(e.target.value),placeholder:'QM-…'}))),h('button',{className:'qmr-discovery-button is-primary',disabled:!!busy||!code.trim()},busy==='activate'?t('activating','正在激活…'):t('activate','激活书库'))),failure,
    h('p',{className:'qmr-discovery-view-hint'},t('privacy','激活码不会保存；刷新凭据仅保存在此设备的 Host 私有文件中。')));
  const rows=books.filter(book=>!filter||book.format===filter);
  return h('section',{className:'qmr-ebook','aria-busy':!!busy},
    h('div',{className:'qmr-ebook-account'},h('div',null,h('strong',null,t('connected','已连接乔木书库')),h('p',{className:'qmr-discovery-meta'},t('remaining','今日剩余 {remaining} / {limit} 次').replace('{remaining}',Math.max(0,profile.dailyLimit-profile.usedToday)).replace('{limit}',profile.dailyLimit)+' · '+t('expires','有效期至 {date}').replace('{date}',new Date(profile.expiresAt*1000).toLocaleDateString()))),button(t('logout','退出激活'),()=>void logout(),{disabled:!!busy})),
    h('form',{className:'qmr-discovery-search',onSubmit:search},h('label',{className:'qmr-discovery-search-field'},h(IconSearch,{width:17,height:17}),h('span',{className:'qmr-discovery-sr-only'},t('query','书名或作者')),h('input',{value:query,maxLength:160,'data-autofocus':true,onChange:e=>setQuery(e.target.value),placeholder:t('query','书名或作者'),disabled:busy==='download'})),h('button',{className:'qmr-discovery-button is-primary',disabled:!!busy||!query.trim()},busy==='search'?t('searching','正在搜索…'):t('search','搜索'))),
    failure,
    operation?h('div',{className:'qmr-ebook-progress',role:'status'},h('span',null,t(operation.stage,operation.stage)),operation.active?h('div',{role:'progressbar','aria-label':t(operation.stage,operation.stage)}):null,
      operation.active?button(t('cancel','取消下载'),()=>void api({action:'cancel'}).catch(cause=>setError(message(cause))),{disabled:operation.stage==='importing'}):operation.book?button(t('open','打开阅读'),()=>onOpen(operation.book.id)):null):null,
    jobs.length?h('section',{className:'qmr-ebook-jobs'},h('h3',null,t('pendingJobs','可继续的下载')),jobs.map(job=>h('div',{key:job.id},h('span',null,job.title||t('unfinished','未完成的下载')),button(t('resume','继续下载 / 重试入库'),()=>void runDownload({jobId:job.id}),{disabled:!!busy})))):null,
    books.length?h('div',{className:'qmr-ebook-filters'},h('span',null,t('versions','找到 {count} 个版本').replace('{count}',books.length)),h('select',{'aria-label':t('format','格式'),value:filter,onChange:e=>setFilter(e.target.value)},h('option',{value:''},t('allFormats','全部格式')),[...new Set(books.map(b=>b.format))].map(f=>h('option',{value:f,key:f},f.toUpperCase())))):null,
    h('div',{className:'qmr-discovery-results'},rows.map(book=>{
      const cover=covers[book.id];return h('article',{key:book.id,className:'qmr-discovery-result qmr-ebook-result'},h('div',{className:'qmr-ebook-cover'},cover?h(React.Fragment,null,h('img',{src:cover.url,alt:'',referrerPolicy:'no-referrer',onError:()=>setCovers(previous=>{const next={...previous};delete next[book.id];return next;})}),h('a',{href:cover.sourceUrl,target:'_blank',rel:'noopener noreferrer'},t('referenceCover','作品参考封面'))):h('span',null,t('noCover','暂无封面'))),
        h('div',{className:'qmr-discovery-result-info'},h('h3',null,book.title),h('p',{className:'qmr-discovery-meta'},book.author),h('p',{className:'qmr-discovery-meta'},[book.year,book.language,book.publisher,book.isbn].filter(Boolean).join(' · '))),
        h('div',{className:'qmr-ebook-file'},h('strong',null,book.format.toUpperCase()),h('span',null,book.size_str),book.ownedId?button(t('ownedOpen','已拥有 · 打开阅读'),()=>onOpen(book.ownedId)):button(t('download','下载并加入书库'),()=>void runDownload({candidateId:book.id}),{disabled:!!busy||!book.readable}),!book.readable?h('small',null,t('unsupported','当前阅读器不支持此格式，请选择 EPUB、PDF 或 TXT')):null));
    })),
    searched&&!books.length&&!busy?h('div',{className:'qmr-discovery-state'},t('empty','未找到相关版本，请换个书名或作者')):null,
    !searched&&!books.length?h('p',{className:'qmr-discovery-view-hint'},t('startHint','搜索后选择版本和格式。下载完成会校验文件，再保存到本地书库。')):null);
}
