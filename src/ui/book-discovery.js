import * as React from 'react';
// The original Reader discovery dialog owns local/Gutenberg/Qiaomu source UI.
export function BookDiscovery({ui}){return React.createElement('button',{type:'button',className:'qmr-btn',onClick:()=>void ui.props().features.findBooks().catch(error=>ui.toast(error.message))},ui.t('discover.title','找书'));}
