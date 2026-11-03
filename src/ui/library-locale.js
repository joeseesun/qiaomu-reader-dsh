import { NAVIGATION_COPY } from './navigation-locale.js';
import { SPEECH_COPY } from './speech-locale.js';
/** Shared client messages; kept in sync with locale/*.json. */
export const LIBRARY_MESSAGES = {
  "zh": {
    "catalog": {
      "deleteConfirm": "从书库移除《{title}》？\n文件、进度、划线与笔记均保留，可在已移除书籍中恢复。",
      "finished": "已读完",
      "justStarted": "刚开始",
      "unread": "未读",
      "openBook": "打开《{title}》",
      "unknownAuthor": "未知作者",
      "opening": "打开中…",
      "highlightsCount": "{count} 条划线",
      "bookHighlights": "查看《{title}》的 {count} 条划线",
      "bookActions": "《{title}》的更多操作",
      "more": "更多操作",
      "notes": "阅读笔记",
      "highlights": "查看划线",
      "delete": "从书库移除",
      "pickerError": "当前环境无法打开文件选择器",
      "importing": "导入中…",
      "import": "导入书籍",
      "categories": "书库分类",
      "filter": "阅读状态",
      "formats": "文件格式",
      "allFormats": "全部格式",
      "bookCount": "{count} 本书",
      "searchPlaceholder": "搜索书名或作者",
      "search": "搜索书库",
      "refresh": "刷新书库",
      "fullscreen": "全屏",
      "close": "关闭阅读器",
      "error": "书库操作失败",
      "retry": "重试",
      "continue": "继续阅读",
      "collection": "我的书目",
      "sort": "排序方式",
      "recent": "最近阅读",
      "added": "加入时间",
      "title": "书名",
      "loading": "书库正在加载…",
      "noResults": "没有符合条件的书",
      "empty": "从第一本书开始",
      "noResultsHelp": "换个关键词，或清空筛选。",
      "emptyHelp": "导入 EPUB、PDF、TXT、Markdown 或 HTML，开始阅读。",
      "clear": "清空筛选",
      "titleAuthor": "书名 / 作者",
      "format": "格式",
      "progress": "阅读进度",
      "annotations": "划线",
      "all": "全部书籍",
      "reading": "正在阅读",
      "highlighted": "有划线",
      "removedBooks": "已移除书籍",
      "restore": "恢复到书库",
      "removed": "已移除，阅读数据已保留",
      "restored": "已恢复到书库"
    },
    "speech": {
      "title": "连续朗读",
      "close": "关闭面板",
      "provider": "语音来源",
      "browser": "浏览器系统语音",
      "macos": "macOS 系统语音",
      "voice": "音色",
      "default": "系统默认",
      "rate": "语速",
      "follow": "跟随朗读翻页",
      "pause": "暂停",
      "resume": "继续朗读",
      "here": "从当前页朗读",
      "back": "回到朗读处",
      "idle": "选择音色后开始朗读",
      "playing": "正在朗读",
      "loading": "正在准备语音…",
      "paused": "已暂停",
      "ended": "已读完全书",
      "error": "朗读失败，可重试"
    },
    "lookup": {
      "title": "查词与翻译",
      "close": "关闭查词",
      "meaning": "释义（可编辑）",
      "generate": "生成解释",
      "save": "加入生词本",
      "saved": "已加入生词本",
      "vocabulary": "生词本",
      "export": "导出 Markdown",
      "empty": "选中文字，点击查词后加入生词本。",
      "back": "回到原文",
      "anki": "发送到 Anki",
      "ankiSaved": "已发送到 Anki",
      "unavailable": "原生对话尚未就绪，请先在 Harness 中选择工作区与模型",
      "saveFailed": "无法保存原文位置"
    },
    "discover": {
      "title": "找书 · Project Gutenberg",
      "query": "书名或作者",
      "search": "搜索",
      "offline": "请连接宿主后再搜索书源",
      "searching": "正在搜索…",
      "downloading": "正在下载并校验 EPUB…",
      "importing": "正在加入书库…",
      "added": "已加入书库",
      "empty": "没有匹配的书籍",
      "owned": "已拥有",
      "download": "下载 EPUB"
    },
    "navigation": {
      "return": "回到跳转前"
    }
  },
  "en": {
    "catalog": {
      "all": "All books",
      "reading": "Reading",
      "finished": "Finished",
      "highlighted": "Highlighted",
      "deleteConfirm": "Remove “{title}” from your library?\nFiles, progress and notes are kept. Restore it from Removed books.",
      "justStarted": "Just started",
      "unread": "Unread",
      "opening": "Opening…",
      "openBook": "Open “{title}”",
      "unknownAuthor": "Unknown author",
      "highlightsCount": "{count} highlights",
      "bookHighlights": "View {count} highlights in “{title}”",
      "bookActions": "More actions for “{title}”",
      "more": "More actions",
      "notes": "Reading notes",
      "highlights": "View highlights",
      "delete": "Remove from library",
      "pickerError": "Unable to open the file picker",
      "categories": "Library categories",
      "filter": "Reading status",
      "formats": "File format",
      "allFormats": "All formats",
      "importing": "Importing…",
      "import": "Import books",
      "bookCount": "{count} books",
      "searchPlaceholder": "Search title or author",
      "search": "Search library",
      "refresh": "Refresh library",
      "fullscreen": "Full screen",
      "close": "Close reader",
      "error": "Library operation failed",
      "retry": "Retry",
      "continue": "Continue reading",
      "collection": "My books",
      "sort": "Sort books",
      "recent": "Recently read",
      "added": "Date added",
      "title": "Title",
      "loading": "Loading your library…",
      "noResults": "No matching books",
      "empty": "Start with your first book",
      "noResultsHelp": "Try another keyword or clear the filters.",
      "emptyHelp": "Import EPUB, PDF, TXT, Markdown or HTML to start reading.",
      "clear": "Clear filters",
      "titleAuthor": "Title / Author",
      "format": "Format",
      "progress": "Reading progress",
      "annotations": "Highlights",
      "removedBooks": "Removed books",
      "restore": "Restore to library",
      "removed": "Removed; reading data kept",
      "restored": "Restored to library"
    },
    "speech": {
      "title": "Read aloud",
      "close": "Close panel",
      "provider": "Speech source",
      "browser": "Browser system voices",
      "macos": "macOS system voices",
      "voice": "Voice",
      "default": "System default",
      "rate": "Speed",
      "follow": "Follow reading position",
      "pause": "Pause",
      "resume": "Resume",
      "here": "Read from this page",
      "back": "Back to speech",
      "idle": "Choose a voice to start",
      "playing": "Reading aloud",
      "loading": "Preparing audio…",
      "paused": "Paused",
      "ended": "Book finished",
      "error": "Speech failed; retry"
    },
    "lookup": {
      "title": "Dictionary and translation",
      "close": "Close lookup",
      "meaning": "Meaning (editable)",
      "generate": "Explain selection",
      "save": "Save word",
      "saved": "Word saved",
      "vocabulary": "Vocabulary",
      "export": "Export Markdown",
      "empty": "Select text and look it up to save a word.",
      "back": "Return to source",
      "anki": "Send to Anki",
      "ankiSaved": "Sent to Anki",
      "unavailable": "Choose a workspace and model in Harness first",
      "saveFailed": "Unable to save source position"
    },
    "discover": {
      "title": "Find books · Project Gutenberg",
      "query": "Title or author",
      "search": "Search",
      "offline": "Connect the host to search for books",
      "searching": "Searching…",
      "downloading": "Downloading and validating EPUB…",
      "importing": "Adding to library…",
      "added": "Added to library",
      "empty": "No matching books",
      "owned": "In library",
      "download": "Download EPUB"
    },
    "navigation": {
      "return": "Back before jump"
    }
  }
};

const shelfMessages = {
  language: ['zh', 'en'], offline: ['请连接宿主后重试', 'Connect the host and retry'],
  privacy: ['Hacker Books 书单；搜索和推荐在本地计算，书库与清单不上传。', 'Hacker Books lists. Search and recommendations run locally; your library and lists are never uploaded.'],
  best: ['值得读', 'Worth reading'], top: ['最多人提', 'Most mentioned'], lindy: ['经典常青', 'Enduring classics'], foryou: ['为你推荐', 'For you'], wish: ['想读', 'Want to read'], read: ['读过', 'Read'], views: ['书单', 'Lists'],
  query: ['书名或作者', 'Title or author'], topics: ['全部主题', 'All topics'], loading: ['正在加载书单…', 'Loading books…'], loadFailed: ['书单加载失败，请重试', 'Unable to load books; retry'], saveFailed: ['保存失败，原清单已保留，请重试', 'Save failed; your previous list is preserved. Retry.'],
  retry: ['重试', 'Retry'], back: ['返回书单', 'Back to books'], owned: ['已拥有', 'In library'], advice: ['阅读建议', 'Reading advice'], comments: ['HN 读者评论', 'HN reader comments'], related: ['相关书籍', 'Related books'], more: ['显示更多', 'Show more'], seeds: ['先加入想读清单，或导入书籍以获取推荐。', 'Add books to your lists or library for recommendations.'], empty: ['暂无书籍', 'No books yet'],
};
const promptMessages = {
  send: ['直接发送：{title}', 'Send: {title}'],
  language: ['zh', 'en'], manage: ['管理快捷提示词', 'Manage quick prompts'], title: ['快捷提示词', 'Quick prompts'], close: ['关闭', 'Close'], hint: ['显示在伴读输入框上方。点击后直接发送；已有手写草稿时会保留草稿。', 'Shown above the chat input. Click to send; existing drafts are preserved.'],
  edit: ['编辑', 'Edit'], delete: ['删除', 'Delete'], name: ['名称', 'Name'], body: ['提示词', 'Prompt'], cancel: ['取消', 'Cancel'], save: ['保存', 'Save'], add: ['+ 新增提示词', '+ Add prompt'], reset: ['恢复内置', 'Restore defaults'], failed: ['保存失败，修改已保留，请重试', 'Save failed; your edits are preserved. Retry.'],
};
for (const [language, index] of [['zh', 0], ['en', 1]]) {
  const messages = LIBRARY_MESSAGES[language];
  messages.shelf = Object.fromEntries(Object.entries(shelfMessages).map(([key, values]) => [key, values[index]]));
  messages.prompts = Object.fromEntries(Object.entries(promptMessages).map(([key, values]) => [key, values[index]]));
  messages.discover.title = index ? 'Browse library' : '浏览书库';
}

const DISCOVERY_MESSAGES = {
  "shelf": {
    "mine": [
      "我的清单",
      "My lists"
    ],
    "mentions": [
      "{count} 人提及",
      "{count} mentions"
    ],
    "recommended": [
      "{count} 人推荐",
      "{count} recommendations"
    ],
    "score": [
      "值得读指数 {score}",
      "Score {score}"
    ],
    "getBook": [
      "在哪里读",
      "Find a copy"
    ],
    "stancer": [
      "推荐",
      "Recommended"
    ],
    "stancen": [
      "提及",
      "Mentioned"
    ],
    "stancec": [
      "批评",
      "Critical"
    ],
    "fit": [
      "适合谁",
      "For readers who"
    ],
    "warn": [
      "读前留意",
      "Before you read"
    ],
    "about": [
      "内容简介",
      "About the book"
    ],
    "clear": [
      "清除",
      "Clear"
    ],
    "searchResults": [
      "搜索结果",
      "Search results"
    ],
    "bestHint": [
      "读者真正推荐的好书",
      "Books readers recommend"
    ],
    "topHint": [
      "Hacker News 讨论中被提及最多的书",
      "The most mentioned books on Hacker News"
    ],
    "lindyHint": [
      "经受时间检验、仍被读者推荐的经典",
      "Classics readers still recommend"
    ],
    "foryouHint": [
      "根据书库与清单，在本地寻找相关好书",
      "Related books based on your library and lists, computed locally"
    ],
    "mineHint": [
      "留下下一本想读的书，也记住读过的书",
      "Keep your next reads and the books you have read"
    ],
    "noResults": [
      "没有找到相关书籍",
      "No matching books"
    ],
    "noResultsHint": [
      "换个书名、作者或主题试试。",
      "Try another title, author or topic."
    ],
    "emptyHint": [
      "打开一本书的详情，标记想读或读过。",
      "Open a book and mark it as want to read or read."
    ]
  },
  "discover": {
    "publicSource": ["公开书源", "Public books"],
    "localSource": ["本地书库", "Local library"],
    "subtitle": [
      "发现值得读的书",
      "Discover your next read"
    ],
    "sources": [
      "书源",
      "Book sources"
    ],
    "hint": [
      "在 Project Gutenberg 搜索公版书，下载后直接加入书库。",
      "Search public-domain books on Project Gutenberg and add them to your library."
    ],
    "retry": [
      "重试搜索",
      "Retry search"
    ],
    "start": [
      "找一本公版书",
      "Find a public-domain book"
    ],
    "startHint": [
      "输入书名或作者，如 Alice 或 Shakespeare。",
      "Enter a title or author, such as Alice or Shakespeare."
    ],
    "localHint": [
      "书库和清单留在本地；公开目录仅提供找书线索。",
      "Your library and lists stay local. Public catalogues help you find a copy."
    ]
  },
  "prompts": {
    "required": [
      "请填写每条提示词的名称和正文",
      "Enter a name and text for every prompt"
    ],
    "editorHint": [
      "名称显示在按钮上，完整提示词发送给 AI。",
      "The name appears on the button. The full prompt is sent to AI."
    ],
    "empty": [
      "还没有快捷提示词。添加一条，或恢复内置提示词。",
      "No quick prompts yet. Add one or restore the defaults."
    ],
    "add": [
      "新增提示词",
      "Add prompt"
    ]
  }
};
for (const [language, index] of [["zh", 0], ["en", 1]]) {
  for (const [section, rows] of Object.entries(DISCOVERY_MESSAGES)) Object.assign(LIBRARY_MESSAGES[language][section], Object.fromEntries(Object.entries(rows).map(([key, values]) => [key, values[index]])));
}

const EBOOK_MESSAGES = {
  "ownedOpen": ["已拥有 · 打开阅读", "In library · Open"],
  "source": [
    "乔木书库",
    "Qiaomu Library"
  ],
  "connecting": [
    "正在验证服务状态…",
    "Verifying service access…"
  ],
  "activationHelp": [
    "输入乔木书库激活码，连接后可搜索并下载到本地书库。",
    "Enter your Qiaomu Library activation code to search and download into your local library."
  ],
  "code": [
    "激活码",
    "Activation code"
  ],
  "activate": [
    "激活书库",
    "Activate library"
  ],
  "activating": [
    "正在激活…",
    "Activating…"
  ],
  "privacy": [
    "激活码不会保存；刷新凭据仅保存在此设备的 Host 私有文件中。",
    "The activation code is not saved. Refresh credentials stay in private Host files on this device."
  ],
  "retry": [
    "重试",
    "Retry"
  ],
  "connected": [
    "已连接乔木书库",
    "Connected to Qiaomu Library"
  ],
  "remaining": [
    "今日剩余 {remaining} / {limit} 次",
    "Today: {remaining} / {limit} downloads remaining"
  ],
  "expires": [
    "有效期至 {date}",
    "Expires {date}"
  ],
  "logout": [
    "退出激活",
    "Sign out"
  ],
  "query": [
    "书名或作者",
    "Title or author"
  ],
  "search": [
    "搜索",
    "Search"
  ],
  "searching": [
    "正在搜索…",
    "Searching…"
  ],
  "cancel": [
    "取消下载",
    "Cancel download"
  ],
  "open": [
    "打开阅读",
    "Open book"
  ],
  "pendingJobs": [
    "可继续的下载",
    "Downloads to resume"
  ],
  "unfinished": [
    "未完成的下载",
    "Unfinished download"
  ],
  "resume": [
    "继续下载 / 重试入库",
    "Resume / retry import"
  ],
  "versions": [
    "找到 {count} 个版本",
    "{count} editions found"
  ],
  "format": [
    "格式",
    "Format"
  ],
  "allFormats": [
    "全部格式",
    "All formats"
  ],
  "referenceCover": [
    "作品参考封面",
    "Reference work cover"
  ],
  "noCover": [
    "暂无封面",
    "No cover"
  ],
  "download": [
    "下载并加入书库",
    "Download and import"
  ],
  "unsupported": [
    "当前阅读器不支持此格式，请选择 EPUB、PDF 或 TXT",
    "This format is not supported. Choose EPUB, PDF or TXT."
  ],
  "empty": [
    "未找到相关版本，请换个书名或作者",
    "No editions found. Try another title or author."
  ],
  "startHint": [
    "搜索后选择版本和格式。下载完成会校验文件，再保存到本地书库。",
    "Search and choose an edition. Downloads are verified before import into your local library."
  ],
  "queued": [
    "正在排队…",
    "Queued…"
  ],
  "running": [
    "正在下载…",
    "Downloading…"
  ],
  "verifying": [
    "正在校验文件…",
    "Verifying file…"
  ],
  "importing": [
    "正在加入本地书库…",
    "Importing into local library…"
  ],
  "imported": [
    "已加入本地书库",
    "Imported into local library"
  ],
  "cancelled": [
    "下载已取消，可在任务中继续",
    "Download cancelled. You can resume it from downloads."
  ],
  "error": [
    "下载未完成，请重试",
    "Download incomplete. Retry."
  ],
  "idle": [
    "准备下载",
    "Ready"
  ],
  "error-offline": [
    "请连接宿主后再试",
    "Connect to the Host and retry."
  ],
  "error-service": [
    "服务暂不可用，请重试",
    "Service unavailable. Retry."
  ],
  "error-network": [
    "连接失败，请检查网络后重试",
    "Connection failed. Check the network and retry."
  ],
  "error-invalid-code": [
    "激活码格式或内容不正确",
    "Invalid activation code."
  ],
  "error-invalid-device": [
    "设备身份无效，请重试激活",
    "Invalid device identity. Retry activation."
  ],
  "error-unauthorized": [
    "激活状态无效，请重新激活",
    "Access is invalid. Activate again."
  ],
  "error-inactive": [
    "激活已过期或停用，请重新激活",
    "Access expired or inactive. Activate again."
  ],
  "error-device-revoked": [
    "此设备已被移除，请重新激活",
    "This device was revoked. Activate again."
  ],
  "error-device-limit": [
    "激活设备数已达上限",
    "Activation device limit reached."
  ],
  "error-quota": [
    "今日下载配额已用完",
    "Today’s download quota is exhausted."
  ],
  "error-save": [
    "凭据保存失败，原有文件已保留，请重试",
    "Credential save failed. Existing files were preserved. Retry."
  ],
  "error-file": [
    "文件校验失败，未加入书库",
    "File validation failed. Nothing was imported."
  ],
  "error-busy": [
    "已有下载正在进行",
    "A download is already in progress."
  ],
  "error-pending": [
    "下载仍在服务端处理中，可稍后继续",
    "The service is still preparing the download. Resume later."
  ],
  "error-search-expired": [
    "搜索版本已过期，请重新搜索",
    "Search results expired. Search again."
  ],
  "error-file-expired": [
    "下载文件已过期，请重新搜索",
    "Download expired. Search again."
  ],
  "error-file-missing": [
    "下载文件不可用，请重新搜索",
    "File unavailable. Search again."
  ],
  "error-import": [
    "加入书库失败，下载任务已保留，可重试入库",
    "Import failed. The download is retained for retry."
  ],
  "error-already-imported": [
    "此下载已加入书库",
    "This download was already imported."
  ],
  "error-download-failed": [
    "下载失败，请重试或重新搜索",
    "Download failed. Retry or search again."
  ],
  "error-service-restarted": [
    "服务已重启，请重新搜索",
    "The service restarted. Search again."
  ],
  "error-cancelled": [
    "下载已取消，可在任务中继续",
    "Download cancelled. Resume it from downloads."
  ],
  "error-invalid-query": [
    "请输入160字以内的书名或作者",
    "Enter a title or author within 160 characters."
  ],
  "error-unsupported-format": [
    "请选择 EPUB、PDF 或 TXT 版本",
    "Choose an EPUB, PDF or TXT edition."
  ]
};
for (const [language,index] of [['zh',0],['en',1]]) LIBRARY_MESSAGES[language].ebook = Object.fromEntries(Object.entries(EBOOK_MESSAGES).map(([key,values])=>[key,values[index]]));

for (const [language,index] of [['zh',0],['en',1]]) Object.assign(LIBRARY_MESSAGES[language].speech,Object.fromEntries(Object.entries(SPEECH_COPY).map(([key,values])=>[key,values[index]])));

for (const [language,index] of [['zh',0],['en',1]]) LIBRARY_MESSAGES[language].nav=Object.fromEntries(Object.entries(NAVIGATION_COPY).map(([key,values])=>[key,values[index]]));

// DSH LocaleFace looks up literal keys; it does not traverse nested objects.
export function flatMessages(messages, prefix = '') {
  return Object.fromEntries(Object.entries(messages).flatMap(([key, value]) => {
    const name = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' ? Object.entries(flatMessages(value, name)) : [[name, value]];
  }));
}
