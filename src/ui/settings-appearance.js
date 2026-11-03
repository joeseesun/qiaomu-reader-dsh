import * as React from 'react';
const h=React.createElement;
export function AppearanceOptions({ui,settings,update}) {
  const en=ui.t('prompts.language','zh')==='en',tx=(zh,enText)=>en?enText:zh;
  const select=(key,label,options)=>h('label',{className:'qmr-appearance-option'},h('span',null,label),h('select',{className:'qmr-select',value:settings[key],'aria-label':label,onChange:event=>update({[key]:event.target.value,...(key==='textAlign'?{justify:event.target.value==='justify'}:{})})},options.map(([value,title])=>h('option',{key:value,value},title))));
  const toggle=(key,label)=>h('label',{className:'qmr-switch'},h('input',{type:'checkbox',checked:settings[key],'aria-label':label,onChange:event=>update({[key]:event.target.checked})}),label);
  return h('details',{className:'qmr-appearance-advanced'},h('summary',null,tx('更多外观选项','More appearance options')),
    h('div',{className:'qmr-appearance-options'},
      select('textAlign',tx('文字对齐','Text alignment'),[['left',tx('左对齐','Left')],['justify',tx('两端对齐','Justified')],['center',tx('居中','Center')],['right',tx('右对齐','Right')]]),
      h('label',{className:'qmr-appearance-option'},h('span',null,tx('每行宽度','Line width')),h('input',{className:'qmr-range',type:'range',min:0,max:120,step:4,value:settings.maxLineCh,'aria-label':tx('每行宽度','Line width'),onChange:event=>update({maxLineCh:Number(event.target.value)})}),h('span',null,settings.maxLineCh?`${settings.maxLineCh} ch`:tx('自动','Auto'))),
      select('vAlign',tx('短页垂直对齐','Short page alignment'),[['top',tx('顶部','Top')],['center',tx('居中','Center')],['bottom',tx('底部','Bottom')]]),
      h('p',{className:'qmr-muted qmr-small'},tx('垂直对齐仅应用于分页模式的短页。','Vertical alignment applies to short paginated pages.')),
      toggle('immersive',tx('自动隐藏阅读工具栏','Auto-hide reading controls')),
      toggle('einkMode',tx('电子墨水模式','E-ink mode')),
      h('p',{className:'qmr-muted qmr-small'},tx('黑白高对比、关闭动效并保持工具栏可见。','Black and white, no animation, with reading controls kept visible.')),
      select('navMode',tx('翻页操作','Page navigation'),[['buttons',tx('按钮与键盘','Buttons and keyboard')],['click',tx('点击书页左右侧','Click the left or right side')]]),
      select('pageButtonsVisibility',tx('页侧翻页按钮','Page side buttons'),[['hover',tx('悬停时显示','On hover')],['always',tx('始终显示','Always')],['hidden',tx('隐藏','Hidden')]]),
      toggle('pageTurnAnimation',tx('翻页动画','Page turn animation'))));
}
