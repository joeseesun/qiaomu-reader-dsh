# DeepSeek Harness 0.2.2-rc.3 兼容验证

Reader 1.9.3 在宿主和 Typert peer 中加入精确版本 0.2.2-rc.3，保留已有范围。客户端和宿主 bundle 与 Reader 1.9.2 一致。

对比 rc.2 与 rc.3 标签下的兼容评估、Remote、Typert、阅读伴读及工具接口。rc.3 新增会话侧栏动作槽，Reader 仍使用既有面板槽。会话导入和 Windows 更新属于宿主功能。

在 macOS arm64 上使用官方签名 Nightly 的内置 CLI 和独立 Web profile。验证默认安装检查、侧栏书库、EPUB 划线回读、PDF 内部定位及全文伴读，并用宿主工具执行器运行导入、书库列表、正文读取和缺参用例。

本轮范围为隔离 Web。日用原生桌面、真实模型、语音播放、旧宿主和其他平台未复测。
