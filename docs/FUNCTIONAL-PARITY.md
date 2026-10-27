# Original Reader parity audit

Baseline: Qiaomu Reader 4.9.2, `4a6e6ee1e39966f2af5d831df8b3f4c4fd387ca3`. Updated 2026-10-28, Asia/Shanghai. This is a working branch, not a completed full-migration claim.

Original UI/CSS is retained under `src/original`; adapters replace Obsidian storage, workers, dialogs and native services. The already accepted Harness library and continuous-paper reading surface remain the mounting surfaces. Product dialogs/menus/cards/player/fonts/PDF zoom/timer/statistics/selection controls reuse original code. Host dialog frames emulate the standard Obsidian primitives rather than replacing product layouts.

| Feature | Adaptation | Independent evidence / outstanding work |
|---|---|---|
| EPUB/PDF/TXT/Markdown/HTML, starter books | Existing Harness parser/surface | Previous released runtime evidence; regression tests |
| MOBI/AZW/AZW3/FB2/FBZ/CBZ | Original Foliate formats, bounded archive/resource adapter, isolated Host worker | Real FB2/FBZ/images/backlinks/CBZ and independent AZW3 read tests; new UI runtime pending |
| Kindle KOReader + native receiver, USB pairing, identity, SSH, readback, conversion | Original dialogs/controller/transfer; OS credentials and disposable Node worker | Local SSH and USB fixtures, real EPUB-to-AZW3-to-independent-parser; no physical Kindle test |
| Calibre | Original search/selection/settings; Python SQLite or calibredb, bounded handles, import receipts | Real SQLite catalogue and EPUB import tests; no user catalogue mutation |
| Qiaomu ebook activation/search/download/resume | Original modal/client; OS credential store and cancellable Host jobs | Service fixtures and stale modal cancellation; no real activation or download credentials |
| Public book discovery | Original source modal; Gutenberg Host requests and explicit import | Previous public search runtime; current original modal runtime pending |
| Full original TTS | Original player/controller/voice/local model/settings UI through Audio 0.1.1 Cordis facade | Original/native tests plus real macOS Linfei WAV synthesis and multi-chapter coordination; no actual speaker/paid providers in this branch |
| Translation/lookup | Original Google client/card/language menu; explicit native Harness AI session | Transport/card/settings fixtures; live Google request on 2026-10-28 returned rate-limit error, not successful translation; no paid AI request |
| Vocabulary, Spaced Repetition, Anki | Original Markdown cards, preserved schedules, same original Anki model for one-word/all-word sync | Note preservation and Anki fixtures; real Anki app not exercised |
| Stable locations, printed pages, named bookmarks, exact source links | Original 1500-unit model/modal/bookmark dialogs; text anchors and page-list handling | EPUB anchor and layout-independent calculations, repeated-text/highlight wrapping tests; visual reflow acceptance pending |
| Fonts | Original font choices, installed-font chooser, import controls and integrity-checked store | Original font tests + real embedded WOFF2 Host write/read/negative paths; real FontFace import/list permission pending browser |
| PDF zoom and pan | Original controls/menu/custom percentage/gestures; Harness viewport boundary | DOM size/zoom/keyboard/wheel/disposal test; actual PDF browser re-render and touch pending |
| Timer, daily goal, streak, 14-day chart | Original timer and statistics; additive Host time receipts | Concurrent increments/dedup/reset/local-day/hidden-page timer tests |
| Selection actions | Original toolbar/color dropdown/order/hide/labels; original preferences UI | DOM ordering/hidden More/color/keyboard/reset, source-link round trip tests |
| Theme/e-ink/image lightbox | Original full theme catalogue, e-ink colours/CSS, image viewer | Build passes; dedicated runtime acceptance pending |
| AI accounts and agent permissions | Native Harness conversations; original account secrets not duplicated | Host-managed models/tools/permission surfaces; actual response not tested in this branch |
| Per-device appearance, immersive/nav details | Original device-profile model; immersive toggle, always-visible original edge arrows and click navigation | Device isolation tests pass; original swipe thresholds, selection/pinch/long-press/PDF zoom guards pass DOM event tests; physical touch and full runtime acceptance pending |
| Selection / AI notes, book notes, export variants | Original title/tags/folder dialog, local AI-title extraction, answer action row, quote/template settings, export checklist and book-note chooser; native Harness preview | Unique file creation, duplicate suppression, templates, linked notes, comments/frontmatter preservation, chosen-only exports and native-preview API tests; real native preview pending. Template title/date placeholders follow the original manual fallback; external Obsidian Templater execution is not available in Harness. |
| Reading recovery / history | Verified independent state snapshot before each main write; original history chips and unreadable-store card | Corrupt main file loads backup read-only; writes stay blocked until explicit restore; damaged bytes retained; 30-point exact-anchor history tests; visual acceptance pending |
| Original language coverage | Original locale sources retained; current Harness integration zh/en | Remaining locale/UI coverage audit |

## Publication / installation boundaries

The public stable release remains 1.1.0 until this branch is merged and a new Release is published. This candidate has not replaced the daily Reader. Browser QA is paused at the user's explicit request; do not operate the user's test browser or restart their active Harness as a workaround. Audio 0.1.1 has separately been released and installed on disk; its running daily process was not restarted.

Current local checks: `/tmp/qmr-full-check34.log`, 262 tests passed and package verification passed. New UI has only code/DOM evidence where stated. Public download, isolated installed runtime, daily disk install and daily live runtime must be recorded separately when completed.
