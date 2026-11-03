import * as React from 'react';
import {READER_FONTS,FONT_FILE_ACCEPT,MAX_FONT_BYTES,readerFontStack} from '../core/reader-fonts.js';
import {validateFontFile,fontBase64} from '../client/reader-fonts.js';
const h=React.createElement;
export function ReaderFontOptions({ui,bookId,settings,update,scope='book'}){
 const host=ui.props().data?.getHost(),english=ui.t('prompts.language','zh')==='en',tx=(zh,en)=>english?en:zh;
 const [fonts,setFonts]=React.useState([]),[families,setFamilies]=React.useState([]),[family,setFamily]=React.useState(''),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
 const fileRef=React.useRef(null),alive=React.useRef(true);
 const status=ui.useSel(state=>state.fontStatuses?.[settings.fontFamily]);
 const fontLabel=scope==='companion'?tx('伴读字体','Companion font'):tx('字体','Font');
 React.useEffect(()=>{let active=true;alive.current=true;host?.fontAction({kind:'list'}).then(result=>{if(active)setFonts(result.fonts||[]);},cause=>{if(active)setError(cause.message);});return()=>{active=false;alive.current=false;};},[host,bookId]);
 const run=async fn=>{if(busy)return;setBusy(true);setError('');try{await fn();}catch(cause){if(alive.current)setError(cause.message);}finally{if(alive.current)setBusy(false);}};
 const importFile=async file=>{if(!file)return;await run(async()=>{if(!host?.fontAction)throw Error(tx('字体服务尚未就绪','The font service is not ready'));if(file.size>MAX_FONT_BYTES)throw Error(tx('字体不能超过64MB','Fonts must be within 64MB'));const bytes=await validateFontFile(file),result=await host.fontAction({kind:'import',filename:file.name,base64:fontBase64(bytes)});if(!alive.current)return;setFonts(result.fonts);if(ui.store.get().bookId===bookId&&(scope!=='companion'||ui.store.get().companionAppearance)){update({fontFamily:'imported:'+result.font.id});ui.store.set({fontRetry:(ui.store.get().fontRetry||0)+1});}});};
 const known=new Set(['serif','sans-serif','mono',...Object.keys(READER_FONTS),...fonts.map(font=>'imported:'+font.id),...families.map(name=>'system:'+name)]);
 return h('div',{className:'qmr-font-options','data-qmr-font-scope':scope,role:'group','aria-label':fontLabel+tx('设置',' settings')},
  h('label',{className:'qmr-appearance-option'},h('span',null,fontLabel),h('select',{className:'qmr-select','aria-label':fontLabel,value:settings.fontFamily,disabled:busy,onChange:event=>update({fontFamily:event.target.value})},
   [['serif',tx('衬线','Serif')],['sans-serif',tx('无衬线','Sans serif')],['mono',tx('等宽','Monospace')]].map(([value,label])=>h('option',{key:value,value},label)),
   Object.values(READER_FONTS).filter(font=>font.id!=='custom').map(font=>h('option',{key:font.id,value:font.id},font.labels[english?'en':'zh']+(font.id==='zhuque'?tx(' · 离线内置',' · bundled'):''))),
   fonts.map(font=>h('option',{key:font.id,value:'imported:'+font.id},font.name+' · '+font.format.toUpperCase()+tx(' · 已导入',' · imported'))),
   families.map(name=>h('option',{key:name,value:'system:'+name},name)),
   !known.has(settings.fontFamily)?h('option',{value:settings.fontFamily},settings.fontFamily.startsWith('imported:')?tx('已保存的导入字体','Saved imported font'):settings.fontFamily.replace(/^(system|custom):/,'')):null)),
  status?.loading?h('p',{role:'status',className:'qmr-muted qmr-small'},tx('正在加载字体…','Loading font…')):null,
  status?.error?h('p',{role:'alert'},status.error,h('button',{type:'button',className:'qmr-btn qmr-btn-sm',onClick:()=>ui.store.set({fontRetry:(ui.store.get().fontRetry||0)+1})},tx('重试','Retry'))):null,
  h('details',null,h('summary',null,tx('自定义与导入字体','Custom and imported fonts')),
   h('div',{className:'qmr-font-custom'},h('p',{className:'qmr-muted qmr-small'},tx('朱雀仿宋可离线使用，其余命名字体需当前设备已安装。宿主字体列表用于本机阅读；远程阅读请导入文件以保证各端一致。','Zhuque is bundled. Other named fonts must be installed on this device. The Host list suits local reading; import a file for consistent remote reading.')),
    h('button',{type:'button',className:'qmr-btn',disabled:busy,onClick:()=>void run(async()=>{if(!host?.fontAction)throw Error('字体服务尚未就绪');const result=await host.fontAction({kind:'system'});if(alive.current)setFamilies(result.families);})},busy?tx('处理中…','Working…'):tx('读取宿主系统字体','Read Host system fonts')),
    families.length?h('p',{role:'status',className:'qmr-muted qmr-small'},`${families.length} `+tx('个字体族已加入上方列表','font families added above')):null,
    h('label',{className:'qmr-appearance-option'},h('span',null,tx('当前设备字体名称或字体栈','Font family or stack installed on this device')),h('input',{className:'qmr-input',value:family,disabled:busy,maxLength:512,onChange:event=>setFamily(event.target.value)})),
    h('button',{type:'button',className:'qmr-btn',disabled:busy||!readerFontStack(family),onClick:()=>update({fontFamily:'custom:'+family.trim()})},tx('使用这个字体','Use this font')),
    h('input',{ref:fileRef,type:'file',hidden:true,accept:FONT_FILE_ACCEPT,onChange:event=>{const file=event.target.files?.[0];event.target.value='';void importFile(file);}}),
    h('button',{type:'button',className:'qmr-btn',disabled:busy,onClick:()=>fileRef.current?.click()},tx('导入字体文件','Import font file')),
    h('p',{className:'qmr-muted qmr-small'},'TTF · OTF · WOFF · WOFF2 · ≤64MB'))),
  error?h('p',{role:'alert'},error):null);
}
