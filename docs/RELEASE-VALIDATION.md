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
