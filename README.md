# 乔木阅读 · DeepSeek Harness

> v1.1.2：DeepSeek Harness **0.2.1-rc.3** 兼容更新。[本次验证范围](docs/RC3-COMPATIBILITY.md)。

在 Harness 中阅读、划线、听书、记生词，使用宿主原生 AI 会话讨论正文。

![真实 DSH 中的阅读和生词本](docs/qa/adaptation-vocabulary.png)

图：1.1.0 预构建发布包，macOS 上的隔离 DSH Web profile；生词释义由测试人员输入，截图不代表模型回答已验收。

- EPUB、PDF、TXT、Markdown / HTML 导入；UTF-8、UTF-16 BOM 与 GB18030 文本解码。
- 从书库移除后保留原副本、进度、划线、生词和 Markdown 笔记，可恢复或重新导入。
- 浏览器系统语音与 macOS 宿主语音：跨章朗读、暂停续读、音色/速度、跟随和回到朗读处。
- 选区查词卡复用 Harness 原生会话；生词保留上下文与原文回跳，可导出 Markdown，可选 AnkiConnect。
- Gutenberg 搜索、EPUB 下载校验、已拥有提示；大书库窗口渲染。

## 安装预构建发布包

从 [v1.1.2 Release](https://github.com/joeseesun/qiaomu-reader-dsh/releases/tag/v1.1.2) 下载 `qiaomu-reader-dsh-1.1.2.tgz` 和 `SHA256SUMS`，校验后安装到你选择的 profile：

```sh
shasum -a 256 -c SHA256SUMS
dsh plugin --profile YOUR_PROFILE add /absolute/path/qiaomu-reader-dsh-1.1.2.tgz
```

`YOUR_PROFILE` 需要替换为目标 profile。macOS 桌面版请使用应用自带 CLI：`/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh`。不要把隔离测试配置直接覆盖日用配置。

实测环境：macOS、应用自带 DSH 0.2.1-rc.3、独立 Web profile。桌面日用 profile 使用本目录链接；该桌面进程尚未重载验收。其他系统、实体手机和平板未验收。详细记录在 [适配状态](docs/READER-ADAPTATION.md)。

## 使用

打开左侧「乔木阅读」，导入书籍。选中文字可划线、查词或交给 AI；右上角可打开朗读、生词本、搜索与伴读。书目更多菜单中的「从书库移除」保留全部阅读文件，在「已移除书籍」中恢复。

默认书库在宿主工作目录下的 `乔木阅读/`，由 `workspaceRoot` 配置固定；书籍、状态、生成的笔记分别在 `books/`、`state/`、`notes/`。更新笔记只替换受管理区块，保留手写文字。不要删除这些目录来卸载插件。

AI 需要用户在 Harness 配置模型。查词打开独立原生会话并提供引用上下文，点击「生成解释」后发送；可直接手填释义。Anki 需要在本机安装并运行 AnkiConnect，默认使用 `Default` 牌组的 `Basic` 笔记类型及 `Front` / `Back` 字段。

## 数据与联网

阅读副本和结构化状态保存在本机，浏览器保留离线缓存。书源搜索/下载访问 `www.gutenberg.org`；浏览器语音使用运行环境所提供的声音，其联网行为由该环境决定。macOS 语音通过 `/usr/bin/say` 本地合成，临时音频随请求清理。只有点击发送到 Anki 才访问固定本机端口 `127.0.0.1:8765`。AI 上下文交给用户选择的 Harness 模型，沿用宿主账号、工具与授权机制；本插件不搬迁原版 AI 密钥。

## 当前边界

本轮交付阅读/书库的第一阶段。Kindle 双模式传书、乔木书库激活接入、原版云端/本地模型 TTS 服务仍需后续宿主适配。MOBI、FB2、漫画不在本版支持范围。分页页码随窗口和排版变化，不宣称全书稳定页码。AI 实际回答、真实 Anki 卡片与 Kindle 设备阅读分别未验收。

若需回滚，重新安装此前已验证的包并重载 profile，先备份整个 `乔木阅读/`。旧版不认识新增的 Markdown/HTML 书籍及归档字段，不应用旧版执行书库修改。卸载插件时保留书库与浏览器缓存。

## 开发

```sh
npm ci
npm run check
npm pack --pack-destination /tmp
```

保留 GPL-3.0-only；原产品稳定版对照基线为 `qiaomu-reader` 提交 `4a6e6ee1e39966f2af5d831df8b3f4c4fd387ca3`（4.9.2）。原版工作区未修改。PDF.js、Marked、parse5 及其打包依赖的许可证见 [第三方来源说明](THIRD_PARTY_NOTICES.md)；六本内置公版书保留原始来源与许可。

## English

Read EPUB, PDF, TXT, Markdown and HTML inside DeepSeek Harness, with recoverable library removal, speech, vocabulary, Markdown backlinks and native AI sessions. Install the **prebuilt Release tgz** with `dsh plugin --profile YOUR_PROFILE add /absolute/path/package.tgz`, then reload the selected profile. Download the prebuilt tgz and SHA256SUMS from the v1.1.2 GitHub Release; no npm publication is provided.

Tested on macOS with bundled DSH 0.2.1-rc.3 in an isolated Web profile. The regular desktop process, Windows/Linux and physical mobile devices are not verified. AI replies require the user's native Harness model configuration. AnkiConnect is optional. Kindle, activated Qiaomu Library, additional TTS engines, MOBI/FB2/comics and stable whole-book pagination are outside this candidate.

Books, notes and state are stored locally. Gutenberg search/download contacts Gutenberg; AI context goes to the configured Harness provider; explicit Anki export uses localhost port 8765. macOS speech uses the system `say` service. Uninstall the plugin through Harness while keeping its library files; back up the library before rollback. Licensed GPL-3.0-only.

本次 Harness rc.5 支持范围与实测边界见 [兼容验证记录](docs/RC5-COMPATIBILITY.md)。
