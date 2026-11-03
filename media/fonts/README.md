# Offline reading font

Qiaomu Reader's unchanged WOFF2 subset of Zhuque Fangsong v0.212 (technical preview), containing 7,554 Unicode codepoints. GB2312 characters plus supported Latin, punctuation and full-width characters; missing glyphs use the configured system serif fallback.

Source: the original Qiaomu Reader `fonts/QiaomuReadingFangsong.woff2` (read-only migration reference). WOFF2 SHA256: `73148a952a35fca9307b18ec93d4a7bc8a185e82d02f4bcd19e4fa78dbec8f02`. Upstream: https://github.com/TrionesType/zhuque

Copyright (c) 2023 Zhejiang JadeFoci Techonology Co. LTD. SIL Open Font License 1.1, in `licenses/zhuque-OFL.txt`. The subset was maintained by 向阳乔木 and is not an upstream release.

DSH's Host bundle embeds the bytes. Selecting Zhuque loads the font through the existing Remote bridge; no font CDN or OS font installation is used. Normal builds need only the existing npm dependencies. Imported user fonts are stored as separate Host assets outside the book library; they are never included in releases.
