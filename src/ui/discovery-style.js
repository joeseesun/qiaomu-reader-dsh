/** Original Reader discovery anatomy, adapted to Harness tokens; no shared control selectors. */
export const DISCOVERY_CSS = `
.qmr-discovery-backdrop{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;padding:28px;background:rgba(0,0,0,.32);box-sizing:border-box}
.qmr-discovery-dialog{--qd-bg:var(--dsw-alias-bg-base,#fff);--qd-ink:var(--dsw-alias-label-primary,#252629);--qd-muted:var(--dsw-alias-label-secondary,#686b70);--qd-line:color-mix(in srgb,var(--qd-ink) 12%,transparent);--qd-tint:color-mix(in srgb,var(--qd-ink) 5%,var(--qd-bg));--qd-danger:var(--dsw-alias-status-danger,#b44134);position:relative;box-sizing:border-box;display:flex;flex-direction:column;width:min(800px,100%);height:86dvh;min-height:0;overflow:hidden;border:1px solid var(--qd-line);border-radius:16px;background:var(--qd-bg);color:var(--qd-ink);box-shadow:0 18px 70px rgba(0,0,0,.17);font:13px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;text-align:left;color-scheme:inherit}
.qmr-discovery-dialog *{box-sizing:border-box}
.qmr-discovery-dialog :is(h1,h2,h3,p,blockquote){margin:0}
.qmr-discovery-header{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:36px 28px 18px;flex:none}
.qmr-discovery-header h1{font-size:24px;line-height:1.4;font-weight:600;letter-spacing:-.02em}
.qmr-discovery-header p{margin-top:3px;color:var(--qd-muted);font-size:12px}
.qmr-discovery-dialog button,.qmr-discovery-dialog input,.qmr-discovery-dialog select{font:inherit;color:inherit}
.qmr-discovery-dialog button{cursor:pointer}
.qmr-discovery-dialog button:disabled{cursor:default;opacity:.5}
.qmr-discovery-dialog :is(button,a,input,select):focus-visible{outline:1px solid var(--qd-muted);outline-offset:3px}
.qmr-discovery-icon{display:grid;place-items:center;flex:none;width:36px;height:36px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--qd-muted)}
.qmr-discovery-icon:hover{background:var(--qd-tint)}
.qmr-discovery-header>.qmr-discovery-icon{position:absolute;right:10px;top:10px}
.qmr-discovery-source-nav{display:flex;gap:8px;margin-left:auto;flex-wrap:wrap;justify-content:flex-end}
.qmr-discovery-source-nav button{border:0;padding:8px 12px;border-radius:7px;background:none;color:var(--qd-muted);font-weight:500;white-space:nowrap}
.qmr-discovery-source-nav button[aria-pressed=true]{background:var(--qd-tint);color:var(--qd-ink);font-weight:600}
.qmr-discovery-scroll{overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;flex:1;min-height:0;padding:22px 28px 28px}
.qmr-discovery-footer{flex:none;border-top:1px solid var(--qd-line);padding:12px 28px;color:var(--qd-muted);font-size:11px;background:var(--qd-bg)}
.qmr-discovery-search{display:flex;gap:10px;margin-bottom:20px;align-items:flex-end}
.qmr-discovery-search-label{display:flex;flex-direction:column;flex:1;min-width:0;gap:6px;font-weight:600}
.qmr-discovery-search>.qmr-discovery-button{min-height:44px;padding:8px 18px}
.qmr-discovery-search-field{font-weight:400;display:flex;align-items:center;gap:10px;flex:1;min-width:0;height:44px;padding:0 13px;border:1px solid var(--qd-line);border-radius:8px;background:var(--qd-bg);color:var(--qd-muted)}
.qmr-discovery-search-field:focus-within{border-color:var(--qd-muted);box-shadow:none}
.qmr-discovery-search-field input{width:100%;min-width:0;border:0;background:transparent;outline:none!important;padding:0;height:100%;box-shadow:none}
.qmr-discovery-search-field input::placeholder{color:var(--qd-muted)}
.qmr-discovery-views{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
.qmr-discovery-tabs{display:flex;flex-wrap:wrap;gap:2px;padding:3px;background:var(--qd-tint);border-radius:9px;max-width:100%}
.qmr-discovery-tabs button{height:32px;padding:0 12px;border:0;border-radius:6px;background:transparent;color:var(--qd-muted);white-space:nowrap}
.qmr-discovery-tabs button[aria-pressed=true]{background:var(--qd-bg);color:var(--qd-ink);font-weight:600;box-shadow:0 0 0 1px var(--qd-line),0 1px 2px rgba(0,0,0,.04)}
.qmr-discovery-dialog select{height:36px;max-width:100%;padding:0 28px 0 10px;border:1px solid var(--qd-line);border-radius:6px;background:var(--qd-bg);font-size:12px}
.qmr-discovery-view-hint{margin:10px 0 18px!important;color:var(--qd-muted);font-size:12px}
.qmr-discovery-button{display:inline-flex;justify-content:center;align-items:center;gap:6px;min-height:34px;padding:6px 12px;border:1px solid var(--qd-line);border-radius:7px;background:var(--qd-bg);text-decoration:none!important;color:var(--qd-ink)!important;line-height:1.4;text-align:center}
.qmr-discovery-button:hover{background:var(--qd-tint)}
.qmr-discovery-button:is([aria-pressed=true],.is-primary){background:var(--qd-ink);color:var(--qd-bg)!important;border-color:var(--qd-ink)}
.qmr-discovery-text-button{display:inline-flex;align-items:center;gap:6px;border:0;background:none;color:var(--qd-muted)!important;padding:4px 0;min-height:30px}
.qmr-discovery-text-button:hover{color:var(--qd-ink)!important}
.qmr-discovery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr));gap:10px}
.qmr-discovery-card{display:flex;align-items:flex-start;gap:12px;min-width:0;width:100%;padding:10px;text-align:left;border:1px solid var(--qd-line);border-radius:10px;background:var(--qd-bg);box-shadow:none}
.qmr-discovery-card:hover{background:var(--qd-tint)}
.qmr-discovery-card:active{background:color-mix(in srgb,var(--qd-ink) 9%,var(--qd-bg))}
.qmr-discovery-cover{display:block;flex:none;width:60px;aspect-ratio:2/3;overflow:hidden;border-radius:4px;background:var(--qd-tint);box-shadow:0 0 0 1px var(--qd-line)}
.qmr-discovery-cover img{display:block;width:100%;height:100%;object-fit:cover}
.qmr-discovery-cover.is-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:6px;text-align:center;color:var(--qd-muted)}
.qmr-discovery-cover.is-empty span{font-size:9px;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow-wrap:anywhere}
.qmr-discovery-card-info{display:flex;flex:1;flex-direction:column;gap:4px;min-width:0}
.qmr-discovery-card-title{font-size:13px;font-weight:600;line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere}
.qmr-discovery-meta{font-size:11px;line-height:1.6;color:var(--qd-muted);overflow-wrap:anywhere}
.qmr-discovery-card .qmr-discovery-meta{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.qmr-discovery-stats{display:flex;flex-wrap:wrap;align-items:center;gap:6px;color:var(--qd-muted);font-size:11px;line-height:1.6;font-variant-numeric:tabular-nums}
.qmr-discovery-score{padding:0 5px;border-radius:4px;background:var(--qd-tint);border:1px solid var(--qd-line);color:var(--qd-ink);font-size:10px;font-weight:600;line-height:17px}
.qmr-discovery-badge{align-self:flex-start;width:fit-content;max-width:100%;padding:0 6px;border-radius:4px;background:var(--qd-ink);color:var(--qd-bg);font-size:10px;font-weight:600;line-height:18px}
.qmr-discovery-card-blurb{color:var(--qd-muted);font-size:12px;line-height:1.6;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.qmr-discovery-more{text-align:center;margin-top:22px}
.qmr-discovery-mine{display:flex;gap:8px;margin:16px 0}
.qmr-discovery-mine button{border-radius:999px;min-height:30px;font-size:12px}
.qmr-discovery-state{padding:44px 20px;text-align:center;color:var(--qd-muted);line-height:1.8}
.qmr-discovery-state h3{font-size:16px;font-weight:600;color:var(--qd-ink);margin:8px 0}
.qmr-discovery-state.is-error{margin-bottom:16px;border:1px solid var(--qd-line);border-radius:8px;padding:16px;text-align:left;color:var(--qd-danger)}
.qmr-discovery-state.is-error .qmr-discovery-button{margin-top:10px}
.qmr-discovery-state.is-compact{padding:12px}
.qmr-discovery-detail-top{display:flex;align-items:flex-start;gap:20px;margin:14px 0 24px}
.qmr-discovery-detail-top .qmr-discovery-cover{width:116px;border-radius:6px}
.qmr-discovery-detail-top .qmr-discovery-cover.is-empty span{font-size:12px}
.qmr-discovery-detail-info{display:flex;flex-direction:column;gap:7px;min-width:0;flex:1}
.qmr-discovery-detail-info h2{font-size:19px;line-height:1.35;letter-spacing:-.01em;font-weight:600;overflow-wrap:anywhere}
.qmr-discovery-original{color:var(--qd-muted);font-size:13px;overflow-wrap:anywhere}
.qmr-discovery-chips,.qmr-discovery-links,.qmr-discovery-marks{display:flex;align-items:center;flex-wrap:wrap;gap:8px}
.qmr-discovery-chips span{padding:1px 8px;border-radius:999px;background:var(--qd-tint);font-size:11px;color:var(--qd-muted)}
.qmr-discovery-detail-blurb{font-size:14px;line-height:1.7;margin-top:4px!important}
.qmr-discovery-marks{margin-top:8px}
.qmr-discovery-section{margin-top:26px}
.qmr-discovery-section h3{font-size:14px;font-weight:600;line-height:1.6;margin:0 0 12px}
.qmr-discovery-section>p,.qmr-discovery-section li{font-size:14px;line-height:1.8;overflow-wrap:anywhere}
.qmr-discovery-section>p+p{margin-top:10px}
.qmr-discovery-section ul{padding-left:20px;margin:0 0 12px}
.qmr-discovery-comment{padding:16px 0;border-bottom:1px solid var(--qd-line)}
.qmr-discovery-comment-head{display:flex;align-items:center;flex-wrap:wrap;gap:8px;font-size:11px;color:var(--qd-muted);margin-bottom:8px}
.qmr-discovery-comment-head .qmr-discovery-button{margin-left:auto;border:0;padding:0;min-height:24px;font-size:11px;color:var(--qd-muted)!important;background:none}
.qmr-discovery-comment p{font-size:14px;line-height:1.8;overflow-wrap:anywhere}
.qmr-discovery-tag{font-size:10px;padding:0 6px;border-radius:4px;border:1px solid var(--qd-line)}
.qmr-discovery-stance{display:flex;gap:2px;height:6px;overflow:hidden;border-radius:999px;margin-bottom:8px}
.qmr-discovery-stance span.is-r,.qmr-discovery-legend i.is-r{background:var(--qd-ink)}
.qmr-discovery-stance span.is-n,.qmr-discovery-legend i.is-n{background:color-mix(in srgb,var(--qd-ink) 30%,var(--qd-bg))}
.qmr-discovery-stance span.is-c,.qmr-discovery-legend i.is-c{background:color-mix(in srgb,var(--qd-ink) 62%,var(--qd-bg))}
.qmr-discovery-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:var(--qd-muted)}
.qmr-discovery-legend span{display:flex;gap:5px;align-items:center}
.qmr-discovery-legend i{display:block;width:6px;height:6px;border-radius:50%}
.qmr-discovery-result{display:flex;align-items:center;gap:16px;padding:16px 0;border-bottom:1px solid var(--qd-line);min-width:0}
.qmr-discovery-result-info{flex:1;min-width:0}
.qmr-discovery-result-info h3{font-size:14px;font-weight:600;line-height:1.5;overflow-wrap:anywhere}
.qmr-discovery-result-info a{color:var(--qd-ink);text-decoration:none}
.qmr-discovery-result-info a:hover{text-decoration:underline}
.qmr-discovery-result-info p{margin-top:5px}
.qmr-discovery-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:620px){.qmr-discovery-backdrop{padding:12px}.qmr-discovery-dialog{height:calc(100dvh - 24px);border-radius:10px}.qmr-discovery-header{padding:34px 18px 12px;flex-wrap:wrap;gap:12px}.qmr-discovery-source-nav{margin:0;gap:2px}.qmr-discovery-source-nav button{padding:8px;font-size:12px}.qmr-discovery-scroll{padding:18px}.qmr-discovery-footer{padding:10px 18px}.qmr-discovery-grid{grid-template-columns:1fr}.qmr-discovery-tabs button{min-height:40px;padding:0 10px}.qmr-discovery-detail-top{gap:16px}.qmr-discovery-detail-top .qmr-discovery-cover{width:84px}.qmr-discovery-detail-info h2{font-size:19px}.qmr-discovery-button{min-height:40px}.qmr-discovery-result{flex-wrap:wrap;gap:12px}.qmr-discovery-result-info{flex-basis:calc(100% - 76px)}.qmr-discovery-result>.qmr-discovery-button{margin-left:76px}.qmr-discovery-icon{width:40px;height:40px}}
@media(prefers-reduced-motion:reduce){.qmr-discovery-dialog *{scroll-behavior:auto}}
`;
