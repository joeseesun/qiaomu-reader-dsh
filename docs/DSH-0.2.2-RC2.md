# DeepSeek Harness 0.2.2-rc.2 兼容验证

Reader 1.9.2 在宿主和 Typert peer 中加入精确版本 0.2.2-rc.2。Cordis 4.1.0 已包含在现有范围中。客户端和宿主 bundle 与 Reader 1.9.1 一致。

在 macOS arm64 上校验 DeepSeek 官方 Nightly ZIP 的 SHA-512 和签名，再用其内置 CLI 启动独立 Web profile。Reader 1.9.1 触发宿主版本检查并回滚。加入兼容声明的候选通过默认安装检查。

实际操作覆盖侧栏书库、EPUB 目录与划线回读、PDF 导入和第 2 页的内部链接定位、PDF 全文伴读及 EPUB 伴读草稿保护。通过宿主 `tools.execute` 调用 `reader_library`，验证文本导入、书库列表、正文读取、PDF 指定页读取及缺少书籍 ID 时的错误结果。

此次范围为隔离 Web。原生 Desktop、其他平台、真实模型回复、语音播放和旧版宿主运行未复测。
