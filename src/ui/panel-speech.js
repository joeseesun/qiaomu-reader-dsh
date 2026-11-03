import * as React from 'react';
import { createSpeechController, browserSpeechProvider, hostSpeechProvider, speechSegments } from '../client/tts.js';
import { TTS_MODELS, voiceChoices, modelKey, changeSpeechModel, canLoadVoiceCatalog } from '../core/tts-choices.js';
import { macVoiceChoices } from '../core/tts-mac-voices.js';
import { localVoiceChoices } from '../core/tts-local-choices.js';
import { speechServiceLinks } from '../core/tts-service-links.js';
import { IconClose } from './icons.js';
const h = React.createElement;
export function useSpeech(ui, bookId, engine) {
  const [snapshot,setSnapshot]=React.useState({status:'idle'}),[voices,setVoices]=React.useState([]),[macVoices,setMacVoices]=React.useState([]);
  const [config,setConfig]=React.useState({providers:[],profiles:{},localModels:[]}),[catalog,setCatalog]=React.useState({}),[preview,setPreview]=React.useState({status:'idle'});
  const [options,setOptions]=React.useState({provider:'browser',rate:1,voice:'',follow:true});
  const optionsRef=React.useRef(options);optionsRef.current=options;
  const controller=React.useRef(null),audition=React.useRef(null),generation=React.useRef(0),previewGeneration=React.useRef(0),focus=React.useRef(null),ownChapter=React.useRef(null),saved=React.useRef(false);
  const t=(key,fallback)=>ui.t(`speech.${key}`,fallback);
  const errorText=error=>{
    if(error?.status===429&&error.retryAt>Date.now())return t('rateLimitUntil','语音服务暂时限流，{0} 后可重试').replace('{0}',new Date(error.retryAt).toLocaleTimeString());
    const key=error?.status===429?'error-rateLimit':optionsRef.current.provider==='edge'&&error?.status===403?'error-edge403':error?.code==='configuration'?'configuration':`error-${error?.code||'network'}`;
    return t(key,t('error-network','语音服务连接失败，请重试')).replace('{0}',error?.status||'');
  };
  const action=async input=>{const api=ui.props().data?.getHost();if(!api?.speechAction)throw Error(t('noHost','请连接宿主'));const value=await api.speechAction(input);if(value.error)throw Error(errorText(value.error));return value;};
  const jump=point=>{if(!point?.text)return;if(ui.store.get().chapterIndex!==point.chapterIndex){ownChapter.current=point.chapterIndex;ui.goChapter(point.chapterIndex);}ui.store.set({speechFocus:{...point,token:Date.now()}});};
  const update=patch=>{previewGeneration.current++;controller.current?.pause();audition.current?.cancel();setPreview({status:'idle'});const next={...optionsRef.current,...patch};optionsRef.current=next;setOptions(next);ui.patchState(bookId,{speechSettings:next});};
  const browse=()=>{if(['playing','loading'].includes(controller.current?.snapshot().status)&&optionsRef.current.follow){const next={...optionsRef.current,follow:false};optionsRef.current=next;setOptions(next);ui.patchState(bookId,{speechSettings:next});}};
  React.useEffect(()=>{
    let cancelled=false;const refresh=()=>setVoices(globalThis.speechSynthesis?.getVoices()||[]);refresh();globalThis.speechSynthesis?.addEventListener('voiceschanged',refresh);
    const api=ui.props().data?.getHost();
    api?.speechVoices?.().then(value=>{if(!cancelled){setMacVoices(value.voices||[]);if(value.available&&!ui.stateOr(bookId).speechSettings)setOptions(old=>({...old,provider:'macos',voice:''}));}}).catch(()=>{});
    void action({action:'config'}).then(value=>{if(!cancelled)setConfig(value);}).catch(()=>{});
    return()=>{cancelled=true;globalThis.speechSynthesis?.removeEventListener('voiceschanged',refresh);};
  },[ui,bookId]);
  React.useEffect(()=>{
    if(!engine)return;const ticket=++generation.current;
    ui.loadState(bookId).then(state=>{
      if(ticket!==generation.current)return;if(state.speechSettings)setOptions(old=>({...old,...state.speechSettings}));
      const valid=state.speech&&(!state.speech.fingerprint||state.speech.fingerprint===engine.contentFingerprint);saved.current=!!valid;
      const readOptions=()=>optionsRef.current, browser=browserSpeechProvider({getOptions:readOptions}),host=hostSpeechProvider({host:()=>ui.props().data?.getHost(),getOptions:readOptions,errorText});
      const makeProvider=()=>({speak:(text,onStart)=>(readOptions().provider==='browser'?browser:host).speak(text,onStart),cancel(){browser.cancel();host.cancel();}});
      audition.current=makeProvider();
      controller.current=createSpeechController({engine,position:valid?state.speech:undefined,follow:()=>readOptions().follow,provider:makeProvider(),onChange:setSnapshot,
        onPosition(point){saved.current=true;ui.patchState(bookId,{speech:{...point,fingerprint:engine.contentFingerprint}});void ui.flushState(bookId);if(point.text){focus.current=point;if(readOptions().follow)jump(point);}}
      });setSnapshot(controller.current.snapshot());
    });
    let previousPanel=ui.store.get().panel;
    const unsubscribe=ui.store.subscribe(state=>{if(previousPanel==='speech'&&state.panel!=='speech'){controller.current?.pause();stopPreview();}previousPanel=state.panel;const chapter=state.chapterIndex;if(chapter===ownChapter.current){ownChapter.current=null;return;}if(chapter!=null&&chapter!==controller.current?.snapshot().chapterIndex)browse();});
    return()=>{generation.current++;previewGeneration.current++;unsubscribe();controller.current?.dispose();audition.current?.cancel();controller.current=null;void ui.flushState(bookId);};
  },[ui,bookId,engine]);
  const fromHere=async()=>{stopPreview();const ticket=generation.current,current=controller.current;if(!current||!engine)return;const chapter=ui.store.get().chapterIndex||0,text=await engine.plainTextOf(chapter);if(ticket!==generation.current||current!==controller.current)return;const parts=speechSegments(text),fraction=ui.stateOr(bookId).locator?.scroll||0,at=Math.round(text.length*fraction),index=parts.findIndex(part=>part.offset>=at);void current.play({chapterIndex:chapter,segment:index<0?Math.max(0,parts.length-1):index});};
  const test=async(text,selection=false)=>{
    if(!audition.current)return;controller.current?.pause();audition.current?.cancel();const ticket=++previewGeneration.current;setPreview({status:'loading',selection});
    try{for(const part of speechSegments(text)){if(ticket!==previewGeneration.current)return;await audition.current?.speak(part.text,()=>{if(ticket===previewGeneration.current)setPreview({status:'playing',selection});});}if(ticket===previewGeneration.current)setPreview({status:'verified',selection});}
    catch(cause){if(ticket===previewGeneration.current)setPreview({status:'error',error:cause.message,selection});}
  };
  const stopPreview=()=>{previewGeneration.current++;audition.current?.cancel();setPreview({status:'idle'});};
  return {snapshot,voices,macVoices,options,config,catalog,preview,errorText,t,action,update,browse,stopPreview,test,
    async saveProfile(profile,key,clearKey=false){const value=await action({action:'save',provider:profile.id,profile,key,clearKey});setConfig(value);if(optionsRef.current.provider===profile.id)update({voice:profile.voice||''});return value;},
    async loadCatalog(){const provider=optionsRef.current.provider,value=await action({action:'catalog',provider});setCatalog(old=>({...old,[provider]:value}));return value;},
    pause:()=>controller.current?.pause(),
    resume:()=>{stopPreview();if(!saved.current)return void fromHere();if(snapshot.boundary){ownChapter.current=snapshot.chapterIndex;ui.goChapter(snapshot.chapterIndex);}void controller.current?.play(snapshot.status==='ended'?{chapterIndex:0,segment:0}:undefined);},
    previous:()=>{stopPreview();void controller.current?.skip(-1);},next:()=>{stopPreview();void controller.current?.skip(1);},fromHere,back:()=>jump(focus.current),
  };
}
function SpeechConfiguration({speech}) {
  const {t,options,config}=speech,id=options.provider;
  const providerRef=React.useRef(id);providerRef.current=id;
  const [draft,setDraft]=React.useState(config.profiles[id]||{id}),[key,setKey]=React.useState(''),[busy,setBusy]=React.useState(false),[message,setMessage]=React.useState(''),[sample,setSample]=React.useState(t('sample','你好，这是乔木阅读器的语音朗读测试。'));
  React.useEffect(()=>{setDraft(config.profiles[id]||{id});setKey('');setMessage('');setBusy(false);},[id,config]);
  const run=async fn=>{const provider=id,isCurrent=()=>providerRef.current===provider;setBusy(true);setMessage('');try{await fn(isCurrent);}catch(cause){if(isCurrent())setMessage(cause.message);}finally{if(isCurrent())setBusy(false);}};
  const models=id==='doubao'?TTS_MODELS.doubao:[...(TTS_MODELS[id]||[]),...(speech.catalog[id]?.models||[])],keyName=modelKey(draft),links=speechServiceLinks(draft);
  const field=(name,label,list,type='text')=>h('label',{key:name},label,h('input',{type,value:draft[name]||'',list:list?'qmr-speech-'+name:undefined,autoComplete:'off',onChange:e=>setDraft(old=>name===keyName?changeSpeechModel(old,e.target.value,speech.catalog[id]):({...old,[name]:e.target.value}))}),list?h('datalist',{id:'qmr-speech-'+name},list.map(value=>h('option',{key:value.id,value:value.id},value.label))):null);
  return h('details',{className:'qmr-speech-settings'},h('summary',null,t('voiceSettings','语音设置')),
    !['browser','macos','edge','localModel'].includes(id)?h('form',{onSubmit:e=>{e.preventDefault();void run(async isCurrent=>{await speech.saveProfile(draft,key);if(isCurrent()){setKey('');setMessage(t('savedConfig','配置已保存；试听可验证服务'));}});}},
      field(keyName,id==='doubao'?t('resource','语音资源 ID'):t('model','模型'),models),field('voice',t('customVoice','填写音色 ID'),voiceChoices(draft,speech.catalog[id])),id==='azure'?field('region',t('region','Azure 区域')):field('baseUrl',t('baseUrl','服务地址')),
      h('label',null,t('apiKey','API 密钥'),h('input',{type:'password',value:key,autoComplete:'off',placeholder:config.profiles[id]?.hasKey?t('keySaved','已保存密钥；留空保留'):'',onChange:e=>setKey(e.target.value)})),
      h('div',{className:'qmr-feature-actions'},h('button',{className:'qmr-btn',disabled:busy},t('saveConfig','保存配置')),config.profiles[id]?.hasKey?h('button',{type:'button',className:'qmr-btn',disabled:busy,onClick:()=>void run(()=>speech.saveProfile(draft,undefined,true))},t('clearKey','移除密钥')):null,canLoadVoiceCatalog(id)?h('button',{type:'button',className:'qmr-btn',disabled:busy,onClick:()=>void run(async isCurrent=>{await speech.loadCatalog();if(isCurrent())setMessage(t('catalogReady','音色列表已更新'));})},t('refreshVoices','更新音色列表')):null),
      h('p',null,t('requestPrivacy','密钥仅保存在Host私有文件中。')),links?h('div',{className:'qmr-speech-help'},h('a',{href:links[0],target:'_blank',rel:'noopener noreferrer'},t('keyConsole','获取密钥')),h('a',{href:links[1],target:'_blank',rel:'noopener noreferrer'},t('docs','服务文档'))):null):null,
    h('label',null,t('sampleText','试听文字'),h('textarea',{rows:3,maxLength:1000,value:sample,onChange:e=>setSample(e.target.value)})),h('p',null,t('profileHelp','试听不改变阅读进度。')),
    h('button',{type:'button',className:'qmr-btn',disabled:busy||!sample.trim(),onClick:()=>['playing','loading'].includes(speech.preview.status)?speech.stopPreview():void speech.test(sample)},['playing','loading'].includes(speech.preview.status)?t('previewStop','停止试听'):t('preview','试听')),
    message?h('p',{role:'status'},message):null);
}
function LocalModelSetup({speech}) {
  const {config,t,options}=speech,profile=config.profiles.localModel||{id:'localModel',model:'kokoro',voice:'zf_001'};
  const [state,setState]=React.useState({phase:'unknown'}),[message,setMessage]=React.useState(''),[checkToken,setCheckToken]=React.useState(0);
  React.useEffect(()=>{let closed=false,timer;const poll=async()=>{try{const value=await speech.action({action:'localStatus',model:profile.model});if(closed)return;setState(value);timer=setTimeout(poll,['ready','missing','cancelled','error'].includes(value.phase)?5000:700);}catch(cause){if(!closed)setMessage(cause.message);}};void poll();return()=>{closed=true;clearTimeout(timer);};},[profile.model,checkToken]);
  const busy=['runtime','download','downloaded','environment','extract','installed','verify','cancelling'].includes(state.phase),model=config.localModels.find(m=>m.id===profile.model);
  const run=async action=>{try{setMessage('');await speech.action({action,model:profile.model});if(action==='install')setState({phase:'runtime'});setCheckToken(value=>value+1);}catch(cause){setMessage(cause.message);}};
  return h('div',{className:'qmr-speech-local'},h('label',null,t('localModelSelect','本地模型'),h('select',{value:profile.model,onChange:e=>{const model=e.target.value,voice=localVoiceChoices(model)[0]?.id||'';void speech.saveProfile({...profile,model,voice}).catch(cause=>setMessage(cause.message));}},config.localModels.map(m=>h('option',{key:m.id,value:m.id},m.label)))),
    h('p',null,`${t('modelDownloadSize','模型下载约')} ${Math.ceil((model?.bytes||0)/1024**2)} MB · ${model?.license||''}`),h('p',{role:'status'},state.error?speech.errorText(state.error):t('localPhase-'+state.phase,state.phase)),
    busy?h('progress',{max:state.total||undefined,value:state.total?state.bytes:undefined,'aria-label':t('localPhase-'+state.phase,state.phase)}):null,
    h('button',{type:'button',className:'qmr-btn',disabled:state.phase==='cancelling',onClick:()=>void run(busy?'cancelInstall':'install')},busy?t('cancelDownload','取消下载'):t('downloadUse','下载并使用')),
    message?h('p',{role:'alert'},message):null,model?h('a',{href:model.source,target:'_blank',rel:'noopener noreferrer'},t('localDetails','存储与音色来源')):null);
}
export function SpeechPanel({ui,speech}) {
  const {snapshot,options,config,t}=speech,active=['playing','loading'].includes(snapshot.status);
  const [voiceFilter,setVoiceFilter]=React.useState('');
  const selected=ui.useSel(state=>state.selection?.text||'');
  const profile={...(config.profiles[options.provider]||{}),id:options.provider,voice:options.voice};
  const allVoices=options.provider==='macos'?macVoiceChoices(speech.macVoices,t,ui.t('prompts.language','zh')==='zh'):options.provider==='browser'?speech.voices.map(v=>({id:v.voiceURI,label:`${v.name} · ${v.lang}`})):options.provider==='localModel'?localVoiceChoices(profile.model):voiceChoices(profile,speech.catalog[options.provider]);
  const voices=allVoices.filter(v=>(v.label+' '+v.id).toLowerCase().includes(voiceFilter.trim().toLowerCase()));if(options.voice&&!voices.some(v=>v.id===options.voice))voices.unshift(allVoices.find(v=>v.id===options.voice)||{id:options.voice,label:options.voice});
  return h('div',{className:'qmr-panel-content'},h('style',null,'.qmr-speech-settings{border-top:1px solid var(--qmr-border);padding-top:14px}.qmr-speech-settings summary{cursor:pointer;font-weight:600;margin-bottom:14px}.qmr-speech-settings form,.qmr-speech-local{display:flex;flex-direction:column;gap:12px}.qmr-speech-settings textarea{min-height:74px;resize:vertical}.qmr-speech-settings p,.qmr-speech-local p{font-size:12px;line-height:1.6;color:var(--qmr-muted);margin:6px 0}.qmr-speech-settings .qmr-feature-actions{flex-wrap:wrap}.qmr-speech-help a,.qmr-speech-local a{color:var(--qmr-ink);text-decoration:underline;text-underline-offset:3px}.qmr-speech-help{display:flex;gap:16px;flex-wrap:wrap}.qmr-speech-local progress{width:100%}.qmr-speech-settings>a{font-size:12px}'),
    h('div',{className:'qmr-panel-head'},h('strong',{className:'qmr-panel-title'},t('title','连续朗读')),h('button',{className:'qmr-icon-btn','aria-label':t('close','关闭面板'),onClick:()=>{speech.pause();speech.stopPreview();ui.setPanel(null);}},h(IconClose))),
    h('div',{className:'qmr-panel-body qmr-feature-panel'},
      h('label',null,t('provider','语音来源'),h('select',{value:options.provider,onChange:e=>{setVoiceFilter('');const provider=e.target.value;speech.update({provider,voice:config.profiles[provider]?.voice||''});}},h('option',{value:'browser'},t('browser','浏览器系统语音')),speech.macVoices.length?h('option',{value:'macos'},t('macos','Mac本地语音')):null,config.providers.map(p=>h('option',{key:p.id,value:p.id},p.id==='localModel'?t('localModel','本地模型'):p.label)))),
      options.provider==='localModel'?h(LocalModelSetup,{speech}):null,
      h('label',null,t('voiceFilter','筛选音色'),h('input',{type:'search',value:voiceFilter,onChange:e=>setVoiceFilter(e.target.value),placeholder:t('voiceSearch','搜索音色')})),
      h('label',null,t('voice','音色'),h('select',{value:options.voice,onChange:e=>speech.update({voice:e.target.value})},h('option',{value:''},t('default','自动选择')),voices.map(v=>h('option',{key:v.id,value:v.id},v.label)))),
      h('label',null,`${t('rate','语速')} · ${options.rate}×`,h('input',{type:'range',min:.5,max:2,step:.1,value:options.rate,onChange:e=>speech.update({rate:Number(e.target.value)})})),
      h('label',null,h('input',{type:'checkbox',checked:options.follow,onChange:e=>speech.update({follow:e.target.checked})}),t('follow','跟随朗读翻页')),
      h('div',{className:'qmr-feature-actions'},h('button',{className:'qmr-btn',onClick:speech.previous},t('previous','上一段')),h('button',{className:'qmr-btn',onClick:active?speech.pause:speech.resume},active?t('pause','暂停'):t('resume','继续')),h('button',{className:'qmr-btn',onClick:speech.next},t('next','下一段'))),
      h('div',{className:'qmr-feature-actions'},h('button',{className:'qmr-btn',onClick:speech.fromHere},t('here','从当前页朗读')),h('button',{className:'qmr-btn',onClick:speech.back},t('back','回到朗读处')),h('button',{className:'qmr-btn',disabled:!selected,onClick:()=>void speech.test(selected,true)},t('selected','朗读选中内容'))),
      h('p',{role:'status'},snapshot.boundary?t('browseEnd','本章已读完。继续会打开下一章。'):t(snapshot.status,snapshot.status)),snapshot.text?h('blockquote',null,snapshot.text):null,snapshot.error?h('p',{role:'alert'},snapshot.error):null,
      speech.preview.status!=='idle'?h('div',null,h('p',{role:'status'},speech.preview.selection&&speech.preview.status==='playing'?t('selectedPlaying','正在朗读选文'):t(speech.preview.status,speech.preview.status)),['loading','playing'].includes(speech.preview.status)?h('button',{className:'qmr-btn',onClick:speech.stopPreview},t('previewStop','停止试听')):null,speech.preview.error?h('p',{role:'alert'},speech.preview.error):null):null,
      !['browser','macos','localModel'].includes(options.provider)?h('p',null,t('cloud','在线合成会发送文字到所选服务。')):null,
      h(SpeechConfiguration,{speech})));
}
