import {icons,createElement as svgElement} from 'lucide';
export function setIcon(el,name){const key=name.replace(/(^|-)(\w)/g,(_,dash,c)=>c.toUpperCase());el.replaceChildren();if(icons[key])el.append(svgElement(icons[key],{class:'svg-icon',width:18,height:18,'aria-hidden':'true'}));}
// Native DOM boundary for the original Reader dialogs. Never patches global prototypes.
export const Platform={isDesktopApp:true,isDesktop:true,isMacOS:false};
const surfaces=new Set();
export function enhance(el){if(el.createDiv)return el;return Object.assign(el,{
 createEl(tag,options={}){const child=enhance(el.ownerDocument.createElement(tag));if(typeof options==='string')options={cls:options};if(options.cls)child.className=options.cls;for(const key of ['type','value','placeholder','href'])if(options[key]!=null)child.setAttribute(key,String(options[key]));if(options.text!=null)child.textContent=options.text;for(const [key,value] of Object.entries(options.attr||{}))child.setAttribute(key,String(value));el.append(child);return child;},
 createDiv(options){return el.createEl('div',options);},createSpan(options){return el.createEl('span',options);},
 setAttr(key,value){el.setAttribute(key,value);},appendText(text){el.append(el.ownerDocument.createTextNode(text));},toggleClass(name,on){el.classList.toggle(name,on);},empty(){el.replaceChildren();},addClass(...names){el.classList.add(...names);},removeClass(...names){el.classList.remove(...names);},setText(value){el.textContent=value;},
 });}
export class Notice{
 constructor(content,duration=4500){this.el=enhance(document.createElement('div'));this.el.className='qmr-native-surface qmr-native-notice';this.el.setAttribute('role','status');if(typeof content==='string')this.el.textContent=content;else this.el.append(content);document.body.append(this.el);surfaces.add(this);if(duration)this.timer=setTimeout(()=>this.hide(),duration);}
 hide(){clearTimeout(this.timer);this.el.remove();surfaces.delete(this);}close(){this.hide();}
}
export class Modal{
 constructor(app){this.app=app;this.containerEl=enhance(document.createElement('div'));this.containerEl.className='qmr-native-surface qmr-native-overlay';this.modalEl=this.containerEl.createDiv({cls:'modal',attr:{role:'dialog','aria-modal':'true',tabindex:'-1'}});this.titleEl=this.modalEl.createDiv({cls:'modal-title',attr:{id:'qmr-dialog-'+crypto.randomUUID()}});this.modalEl.setAttribute('aria-labelledby',this.titleEl.id);this.contentEl=this.modalEl.createDiv({cls:'modal-content'});}
 setTitle(title){this.titleEl.textContent=title;}
 onKey=e=>{if([...surfaces].filter(s=>s instanceof Modal||s instanceof Menu).at(-1)!==this)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();this.close();}if(e.key==='Tab'){const nodes=[...this.modalEl.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(n=>n.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===this.modalEl)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||!nodes.length)){e.preventDefault();first?.focus();}}};
 open(){if(this.opened)return;this.opened=true;this.previous=document.activeElement;document.body.append(this.containerEl);surfaces.add(this);document.addEventListener('keydown',this.onKey,true);try{this.onOpen();this.modalEl.focus();}catch(error){this.close();throw error;}}
 close(){if(!this.opened)return;this.opened=false;this.onClose?.();document.removeEventListener('keydown',this.onKey,true);this.containerEl.remove();surfaces.delete(this);if(this.previous?.isConnected)this.previous.focus();}
}
export const disposeNativeSurfaces=()=>{for(const surface of [...surfaces])surface.close();};
class Control{
 constructor(el){this.el=this.inputEl=this.buttonEl=this.selectEl=this.toggleEl=el;}
 setIcon(name){setIcon(this.el,name);return this;}
 addOption(value,label){const option=this.el.ownerDocument.createElement('option');option.value=value;option.textContent=label;this.el.append(option);return this;}getValue(){return this.el.type==='checkbox'?this.el.checked:this.el.value;}setCta(){this.el.classList.add('mod-cta');return this;}setValue(value){if(this.el.type==='checkbox')this.el.checked=!!value;else this.el.value=value;return this;}setPlaceholder(value){this.el.placeholder=value;return this;}setButtonText(value){this.el.textContent=value;return this;}setDisabled(value){this.el.disabled=value;return this;}
 invoke(fn,value){try{Promise.resolve(fn(value)).catch(error=>new Notice(error?.message||String(error)));}catch(error){new Notice(error?.message||String(error));}}
 onChange(fn){this.el.addEventListener('change',()=>this.invoke(fn,this.getValue()));return this;}onClick(fn){this.el.addEventListener('click',event=>this.invoke(fn,event));return this;}
}
export class Setting{
 constructor(parent){this.settingEl=enhance(parent).createDiv({cls:'setting-item'});this.infoEl=this.settingEl.createDiv({cls:'setting-item-info'});this.nameEl=this.infoEl.createDiv({cls:'setting-item-name',attr:{id:'qmr-setting-'+crypto.randomUUID()}});this.descEl=this.infoEl.createDiv({cls:'setting-item-description'});this.controlEl=this.settingEl.createDiv({cls:'setting-item-control'});}
 setName(text){this.nameEl.textContent=text;return this;}setDesc(text){this.descEl.textContent=text;return this;}
 addSlider(fn){const el=this.controlEl.createEl('input',{attr:{type:'range','aria-labelledby':this.nameEl.id}}),control=new Control(el);control.setLimits=(min,max,step)=>{el.min=min;el.max=max;el.step=step;return control;};fn(control);return this;}
 addTextArea(fn){const el=this.controlEl.createEl('textarea',{attr:{'aria-labelledby':this.nameEl.id}});fn(new Control(el));return this;}
 addText(fn){const el=this.controlEl.createEl('input',{attr:{type:'text','aria-labelledby':this.nameEl.id}});fn(new Control(el));return this;}
 addToggle(fn){fn(new Control(this.controlEl.createEl('input',{attr:{type:'checkbox','aria-labelledby':this.nameEl.id}})));return this;}
 addDropdown(fn){fn(new Control(this.controlEl.createEl('select',{attr:{'aria-labelledby':this.nameEl.id}})));return this;}
 addButton(fn){fn(new Control(this.controlEl.createEl('button',{attr:{type:'button'}})));return this;}
}

export class Scope {
 constructor(){this.handlers=[];}
 register(modifiers,key,callback){this.handlers.push({modifiers,key,callback});}
}
export function createKeymap(){const scopes=[];const keydown=event=>{for(const entry of [...(scopes.at(-1)?.handlers||[])])if(entry.key===event.key){if(entry.callback(event)===false){event.preventDefault();event.stopPropagation();}return;}};document.addEventListener('keydown',keydown);return{pushScope(scope){scopes.push(scope);},popScope(scope){const i=scopes.indexOf(scope);if(i>=0)scopes.splice(i,1);},dispose(){document.removeEventListener('keydown',keydown);scopes.length=0;}};}
// Host menu boundary for original Reader popovers; product rows are defined by the original modules.
export class Menu{
 constructor(){this.items=[];}
 addSeparator(){return this;}
 showAtMouseEvent(event){return this.showAtPosition({x:event.clientX,y:event.clientY});}
 setUseNativeMenu(){return this;}
 addItem(fn){const item={};for(const key of ['Title','Icon','Disabled','Checked'])item['set'+key]=value=>{item[key.toLowerCase()]=value;return item;};item.onClick=fn=>{item.run=fn;return item;};fn(item);this.items.push(item);return this;}
 showAtPosition({x,y},doc=document){this.close();this.previous=doc.activeElement;const menu=this.menu=enhance(doc.createElement('div'));menu.className='qmr-native-surface qmr-native-menu';menu.setAttribute('role','menu');menu.style.cssText=`position:fixed;z-index:1901;left:${Math.max(8,Math.min(x,doc.defaultView.innerWidth-260))}px;top:${y}px;`;for(const item of this.items){const button=menu.createEl('button',{text:item.title,attr:{type:'button',role:item.checked===undefined?'menuitem':'menuitemradio',...(item.checked!==undefined?{'aria-checked':String(item.checked)}:{})}});button.disabled=!!item.disabled;button.addEventListener('click',()=>{this.close();item.run?.();});}doc.body.append(menu);const rect=menu.getBoundingClientRect();if(rect.bottom>doc.defaultView.innerHeight-8)menu.style.top=Math.max(8,doc.defaultView.innerHeight-rect.height-8)+'px';this.outside=e=>{if(!menu.contains(e.target))this.close();};this.key=e=>{const buttons=[...menu.querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(doc.activeElement);if(e.key==='Escape'){e.preventDefault();e.stopPropagation();this.close();}else if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();buttons[(index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}};this.doc=doc;doc.addEventListener('pointerdown',this.outside,true);doc.addEventListener('keydown',this.key,true);surfaces.add(this);menu.querySelector('button:not(:disabled)')?.focus();return this;}
 close(){this.menu?.remove();this.doc?.removeEventListener('pointerdown',this.outside,true);this.doc?.removeEventListener('keydown',this.key,true);surfaces.delete(this);if(this.previous?.isConnected)this.previous.focus();}
}

// Obsidian's standard searchable chooser boundary; item preview is original product code.
export class FuzzySuggestModal extends Modal{
 renderSuggestion({item},element){element.setText(this.getItemText(item));}
 setPlaceholder(text){this.placeholder=text;}
 onOpen(){this.setTitle(this.placeholder||'');this.input=this.contentEl.createEl('input',{attr:{type:'search','aria-label':this.placeholder||''},placeholder:this.placeholder});this.results=this.contentEl.createDiv('suggestion-container');const render=()=>{this.results.empty();const query=this.input.value.trim().toLocaleLowerCase();for(const item of this.getItems().filter(item=>this.getItemText(item).toLocaleLowerCase().includes(query)).slice(0,200)){const row=this.results.createEl('button',{cls:'suggestion-item',attr:{type:'button'}});this.renderSuggestion({item},row);row.addEventListener('click',()=>{this.close();this.onChooseItem(item);});}};this.input.addEventListener('input',render);render();queueMicrotask(()=>this.input.isConnected&&this.input.focus());}
}
