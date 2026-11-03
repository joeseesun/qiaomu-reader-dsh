# Release validation / 发布验证

Date: 2026-09-30. Platform: macOS. Host: DeepSeek Harness 0.2.0-rc.2.

## Build and package

`npm ci`, `npm run check` and `npm pack` passed. The prepack guard checks package exports, bundle patch, README, license and screenshot paths. Home: 21 tests. Reader: 47 tests. RSS: all seven test scripts passed. Counts refer to the corresponding repository only.

## Isolated host

Installed the built tarball into a fresh Web profile with a separate DSH_HOME, without a development-directory symlink. Started the full host and exercised the visible plugin:

Reader: displayed six starter books, opened Tao Te Ching and its chapter navigation.

Screenshots were captured from this environment. No model key was configured; live AI inference was not verified in this pass. Other operating systems, mobile devices, all real-world files and long-running behavior are outside this verification.

## Distribution

PR checks and merge are visible on GitHub. Releases include a prebuilt tarball and SHA256 file. Public download and reinstall evidence is recorded in the Release notes after publication. Topics and prepared marketplace metadata do not mean marketplace acceptance. No marketplace submission or npm publication is claimed.


## v1.0.2 — 2026-10-01

Build, 47 existing tests and the package export/README/license guard passed. Client activation fixtures were synchronized with the existing React DOM portal dependency and the reading-context Remote descriptor.

Installed the prebuilt v1.0.2 tarball into an independent Web profile with separate DSH_HOME and DSH_WORKSPACE directories. The installed package is a pnpm tarball installation, not a link to the source checkout. The composed profile contains the qiaomu-reader-dsh bundle and the full Harness host starts successfully.

In the installed UI: six starter books appeared; Tao Te Ching opened; Pure white was available beside Paper; choosing it made the page and reading header rgb(255,255,255). Selected a three-line passage in chapter three using the mouse, created a pink highlight, clicked it to open the annotation panel, and observed is-focused=true, border=0px, outline=none and box-shadow=none. The host saved theme=white and one highlight in the isolated book state file. See docs/qa/white-borderless-harness.png, which contains only a default test workspace and public-domain book.

Source release preparation covers the prior library and companion UI refinements too. Live AI inference, real user-file imports and other operating systems were not exercised in this release pass. GitHub CI, Release upload and public asset checksum are checked separately at publication time.

## v1.1.0 — 2026-10-27

Reconciled the tested local 1.1.0 implementation with the existing public repository at `1a640ee`. Preserved the repository's CI, prepack/export guard, portable starter-book script, GPL license, third-party notices and older screenshots. Added Marked, parse5 and entities notices. The rebuilt Host and Client bundles match the previously verified local candidate byte-for-byte.

`npm ci` and `npm run check` passed: 84 tests, build, exports, bundle, README/license and screenshot-path verification. CI additionally rebuilds on Node 22 / Linux and compares committed bundles.

Runtime evidence comes from macOS, bundled DSH 0.2.1-rc.3, an isolated Web profile installed from a tarball. Verified: Markdown table/task rendering, remove/reload/restore with saved vocabulary and progress, native lookup-session UI and manual meanings, Markdown export/backlinks, actual macOS audio playback/pause and cross-chapter/resume, Gutenberg search/download/import, 10,008-book metadata search and end-of-list virtualization, and 390px simulated viewport. See READER-ADAPTATION.md and `docs/qa/adaptation-*.png`.

The ordinary desktop process has not been reloaded. Actual model replies and real Anki cards remain unverified. Kindle transport, activated Qiaomu Library, extra speech engines, MOBI/FB2/comics and stable whole-book page numbers remain outside this first-stage release. These are not described as completed.

Public-distribution evidence (merge SHA, tarball SHA256, unauthenticated download and second-profile install) is recorded in the v1.1.0 Release notes after publication. Preparing this source does not itself prove public availability. No new marketplace submission or npm publication is claimed.

## v1.2.0 — 2026-11-03

Based on remote main `b549874` (1.1.2), preserving explicit rc.2/rc.3/rc.4/rc.5 compatibility declarations. The implementation adapts Reader 4.9.3/4.9.4 prompt and discovery behavior to Host Remote + React; it does not copy Obsidian DOM or credentials. Original `b857729` was a local reference, not evidence of an upstream public release.

`npm run check` passes build, 93 tests and the package guard. Tests cover public request coalescing and retry, bounded/validated metadata, bilingual search/ranking, local recommendations, concurrent reading-list writes, restart persistence, corrupt-file preservation, prompt defaults/custom/empty/reset/storage failure, matching locale files and native draft/attachment/busy guards. No dependency was added. Prebuilt tgz audit and installed-file comparison are separate checks.

Runtime: macOS, bundled Harness 0.2.1-rc.3; isolated `DSH_HOME=/tmp/qmr-shelf-qa-20261103`, profile `reader-qa`, workspace under that home, tarball installation. Live UI verified public shelf, details/Chinese description/reading advice/HN comments and links, author search, topics, recommendations and reading-list persistence across host restart. Corrupting the isolated list JSON preserved the prior displayed mark and re-enabled buttons; restoring it and retrying saved successfully. An isolated process preload injected one HTTP 503; the real Retry button then loaded the real catalogue. The preload is not packaged.

Prompt UI: injected browser storage quota failure, observed retained title/body editor fields and successful retry; removed every prompt, confirmed empty storage and remaining manager entry, restored defaults; a typed native chat draft was preserved on quick-send rejection. Switched Harness to English and inspected the English catalogue and default prompt titles/bodies. Gutenberg search Alice, download of book 11, EPUB validation, import and owned-state update succeeded; the previously opened Tao Te Ching remained readable. 390px screenshot uses browser viewport simulation, not a physical device.

Screenshots: `docs/qa/discovery-*.png`. AI replies and actual Anki card writes are still not verified in this isolated profile. Activated Qiaomu Library, extra speech engines, Kindle transport/pairing/conversion, MOBI/FB2/comics, stable whole-book pagination and native slash integration remain gaps listed in READER-ADAPTATION.md. Windows/Linux and rc.2/rc.4/rc.5 runtime were not retested for this feature release. The initial isolated validation did not restart desktop; subsequent desktop validation is recorded below.

Public merge, release checksums and second-profile install are recorded in the v1.2.0 GitHub Release after publication. A local tarball is not itself a published release. No npm or marketplace publication is claimed.

### v1.2.0 final distribution and desktop evidence

[PR #8](https://github.com/joeseesun/qiaomu-reader-dsh/pull/8) merged as `6a04a3cc5fbe37eab3ddc8367525ed3abd57baf9`; PR and main CI passed. [v1.2.0 Release](https://github.com/joeseesun/qiaomu-reader-dsh/releases/tag/v1.2.0) has the tgz and SHA256SUMS. Anonymous public download matches SHA256 `16087449f5aa0412e9c2254b7ddf76f1a56a063226557ed59c9dd85930af8598`. A second fresh Web profile installed that downloaded package, started, and opened the shelf; all 22 packaged files match.

Desktop Reader's development symlink was replaced with the public prebuilt package at a durable plugin-packages path. Backed up the existing Reader directory and package manifest/lock before updating; all seven prior Reader file hashes remained unchanged. Restarted the ordinary app and observed the existing six books, 6% Tao Te Ching progress, one highlight, and the new Hacker Books shelf/details. The installer reported an existing RSS 0.9.2/rc.5 compatibility warning; no RSS changes or exemptions were made, and this record does not claim overall profile health.

Final candidate speech regression observed real HTML audio `playing` (readyState 4, advancing currentTime), cross-chapter progression to chapter three, then Pause. Speech controls retained their computed padding/border/height. After viewport layout settled, the 390px page width was 390px with zero overflowing shelf controls. The released tgz includes the initial validation snapshot; this post-publication record and Release acceptance notes add final distribution/desktop evidence without changing runtime code.


## v1.3.0 — 2026-11-03

Restored the original Reader discovery card/detail hierarchy using actual Reader 4.9.4 Obsidian screenshots as reference. Preserved the C library list and Harness native AI composer. Browse library now sits next to library search; the dialog has public catalogue and Gutenberg only. Scoped styles keep speech controls outside this change. Batch prompt editing writes only on successful Save. Host cover backfill and offline migration preserve source bytes and reading state.

`npm run check`: build, 95 tests and package guard pass. Installed the prebuilt package into isolated Harness rc.5. Real browser checks cover actual loaded covers, author search, empty result, details, dark theme, 390px viewport and 486px short viewport. Field height is44px; 390px viewport has a366px dialog and364px content. Returning from detail restores scroll450px and clicked-card focus; closing returns focus to the toolbar trigger. Screenshots: `docs/qa/parity-dsh-*.png`; original references: `parity-reference-*.png`. Simulated viewports are not physical mobile validation.

Ordinary desktop: backed up package/lock and Reader files, installed physical tarball instead of a development link, restarted, observed original six books,6% Tao Te Ching progress and one highlight. All seven prior data hashes remain unchanged before reading interactions. Latest two-source candidate matches all22 packaged files. Existing RSS compatibility warning remains unrelated and unchanged. Final public checksum and reinstall are recorded in Release notes. AI inference, actual Anki cards, Kindle and activated Qiaomu Library are not claimed by this release.


## v1.4.0 — 2026-11-03

Qiaomu Library is now implemented through the original Reader activate/refresh/me/search/covers/jobs/file protocol. Host-private mode0700/0600 files replace Obsidian storage; access tokens remain in memory and activation codes are not persisted. Connection status requires a verified profile response. Edition metadata and attributed reference covers remain independent of the selected download candidate. EPUB/PDF/TXT can import; MOBI/AZW3/FB2 are explicitly disabled.

Build,111 tests and package guard pass. Tests include fixed activation identity on retry, coalesced refresh,quota,cancel,corrupt file/path/size/hash,failed import recovery,idempotent job creation,actual Host EPUB bytes/cover/metadata/receipt after restart,existing-content reuse and state preservation,and concurrent imports plus progress writes. Index read/modify/write operations share a transaction queue.

Real installed rc.5 UI: three source tabs,activation form,invalid-code feedback,390px44px field,and dark theme. In an isolated process only,a non-packaged transport fixture exercises activation/profile,edition/format/size/cover results,unsupported-format disablement,queued progress,cancel/resume,verified import and actual Alice reading. Fixture screenshots are named `ebook-fixture-*.png`; they are not evidence of a real activated service account.

Live service GET /me without credentials returned401 unauthorized. Ordinary DSH configuration contained no relevant activation state; no original Obsidian token was copied. Real activation,real quota and real service download remain unverified until the user enters their activation code in the ordinary Reader UI. This is the remaining live-service acceptance gate,not a substitute for implementing the feature. AI inference,Anki,Kindle and other operating systems remain outside this pass.

Final UI correction: cancelled/resumed job completion now immediately updates the edition row to “已拥有 · 打开阅读”; the resume list becomes empty and that row opens the imported Alice text. This was repeated against the frozen installed candidate. Ordinary desktop was backed up at `/Users/joe/.dsh/backups/reader-1.4.0-20261103`, installed as a physical1.4.0 tarball,and restarted. Actual native UI shows all three sources and an unactivated Qiaomu code field; no test credentials were installed there. All39 packaged candidate files match and all seven prior Reader data hashes are unchanged. Native screenshot remains local to avoid publishing sidebar chat names. Public-package checksum/reinstallation evidence is added to Release notes after publication.


## v1.5.0 — 2026-11-03

Adds the original complete speech-provider protocols,Host-private speech profiles/keys,voice/model choices,catalog loading,independent audition,segment controls and selection speech. Browser/Mac/Edge/eight cloud adapters plus Kokoro/MeloTTS setup are available. Closing/switching the panel cancels speech; async source changes keep provider identity and book generation. Full-content SHA256 protects saved speech positions. Google free lookup/translation,language targets,AI fallback and retry/save UI are integrated through real Host Remote.

Build,137 Node tests and the Python worker regressions pass. Actual installed rc.5: Google Wonderland→仙境 saved to Host vocabulary; Edge HTML audio playing with readyState4 and advancing time,pause and close stop every player; selection menu opens and plays the retained selection. Paper lookup card in a dark Host has paired text/button colors; speech panel follows Host colors.390px controls have zero horizontal overflow. Screenshots are actual isolated installed UI (`speech-*.png`,`lookup-google-installed.png`).

Actual synthesis:191 Mac voices,21600-byte Edge MP3,145220-byte Mac WAV; Kokoro and MeloTTS full install/check/synthesis succeeded with144610/221634-byte WAVs. Both local models completed actual ordinary-desktop auditions. The mutable Kokoro upstream archive changed; GitHub asset677613419 size/digest matched the downloaded archive,all377 allowlisted members were checked and a new manifest pinned. Checksum validation was preserved. Models,runtime and authenticated loopback worker files stay outside books.

Ordinary desktop: backed up at `/Users/joe/.dsh/backups/reader-1.5.0-20261103`,installed43-file candidate,restarted; all seven prior Reader hashes were unchanged before deliberate audition-setting changes. Local native screenshots stay outside Git because the sidebar contains chat names. Paid provider accounts,the activated ebook service,other operating systems and physical mobile/Kindle devices remain unverified. Public checksum and independent public install are recorded in Release notes after publication;this release does not complete all60 parity gates.


## v1.8.0 — 2026-11-03

Restores original named font stacks and the unchanged OFL Zhuque subset, bundled offline through Host. Adds safe custom stacks, Host system-family enumeration, TTF/OTF/WOFF/WOFF2 import with actual browser decode before persistence, per-library private asset storage, integrity checks, repair by reimport, and independent companion fonts. New books default to Zhuque; explicit saved font choices remain.

Build,160 tests and package guard pass. Actual installed rc.5:300 system font families; all four containers imported and decoded, corrupt WOFF2 rejected without a new index entry, restart restored imported fonts, and reimport repaired deliberately damaged isolated assets while retaining corrupt bytes. Companion font changes preserved body Georgia/page3 of15; follow mode resolves Zhuque on body, companion and native editor,18px/31.5px editor text.390px viewport has five visible font controls and zero overflow. CSS parser regression and actual hover/always/hidden controls passed; eInk pseudo-element transition is0s. Screenshots are isolated fixtures, not user sidebar content. Windows/Linux enumeration and real assistant reply typography remain unverified.

Ordinary desktop: backup `/Users/joe/.dsh/backups/reader-1.8.0-20261103`,58/58 candidate files match,8 prior Reader file hashes unchanged before reading interactions. Restarted actual desktop, selected bundled Zhuque without a loading error at Alice CHAPTER I /7%,then restored the prior serif choice. Native screenshot is private and outside Git. Public download,checksum and independent clean-profile installation are separate delivery gates recorded after publication. Full original Reader parity remains in progress.


Public delivery: PR17 merged as `d45b75b07309a43368c0978e698794005916bf49`; PR/main CI passed. [v1.8.0 Release](https://github.com/joeseesun/qiaomu-reader-dsh/releases/tag/v1.8.0) anonymous download matches SHA256 `a7de089aa43c99a635a821ec1ee62efb62da6865e08e18c0ca4df88f6f9e0513`. Fresh web-profile and ordinary desktop both match all58 packaged files. Fresh profile actually opened Alice and selected bundled Zhuque: FontFace loaded, computed body stack resolves Zhuque, no loading errors. Packaged client/index match the already restarted native candidate byte-for-byte; only verification documents differ. Built-in books preserve their explicit serif setting,while the new-import Zhuque default was verified with a separate TXT. Public asset remains immutable; this evidence commit does not replace the released tarball.


## v1.9.0 — 2026-11-03

Adds whole-PDF companion material,physical page labels and180000-character even sampling,kept separate from bounded current page/selection. Scans explicitly report no OCR; extraction failure falls back to current page with a notice. Close/book changes cancel extraction; successful results are cached until disposal. Limits:10000 pages,16-page/2M-character text cache,bounded sampling retention. PDF outlines and link annotations resolve named/XYZ/Fit coordinates through the current rotated viewport; external links allow HTTP(S) only. Geometry locators preserve visible text and its viewport offset,or the center of scan regions,across zoom/resize. User zoom remains independent from destination zoom parameters.

Build,170 tests and package guard pass. Actual installed rc.5: annotation link moved page1→page2 lower destination; outline target remained visible after width532→732 and200% zoom.3-page material included an unopened final-page marker. A real12-page PDF produced242090 source characters;179989-character material retained all12 page labels and final marker,Remote returned HTTP200/ok. A2-page scan sent empty document,textPages0,ocr:false and displayed the no-OCR notice. At390px with Host sidebar collapsed,status occupies x56/width334/right390,document width390. Screenshots contain only isolated fixtures. Actual model inference and PDF dual-page layout are separate pending gates. Native desktop and public distribution evidence follow after delivery.


Ordinary desktop candidate:61/61 files match;8 prior Reader hashes unchanged before deliberate import. Backup `/Users/joe/.dsh/backups/reader-1.9.0-20261103`. Restarted native app,imported the owned3-page fixture,followed its link to page2 and opened companion showing “PDF 全文 · 3 页”. Removed the fixture from the active shelf through the recoverable action;it remains one archived item with its data. Original six books,Tao6%/Alice7% remain;7 original state/note files are byte-identical,library.json contains the deliberate fixture receipt. Private native screenshot stays outside Git. Public delivery evidence follows separately.


Public delivery: PR19 merged as `67b45e44ce36af42f80abbf6fa0695d5eb8d27c3`; PR/main CI passed. [v1.9.0 Release](https://github.com/joeseesun/qiaomu-reader-dsh/releases/tag/v1.9.0) anonymous download matches SHA256 `7f50e4dc0100e0bca333561d6c8d5750359eb2c27460c3d924e6fca490118e28`. Fresh web profile and ordinary desktop match all61 packaged files;client/index match the already restarted native candidate. Clean profile actually imported the3-page fixture,followed the annotation to page2 with the target visible(top601.82,viewport bottom852),then opened companion showing full PDF3pages with a native composer and no context errors. No model was configured. The released asset remains immutable;this evidence commit only updates documents.
