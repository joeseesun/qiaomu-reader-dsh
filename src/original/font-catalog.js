import {BUNDLED_FONT_FAMILIES} from './bundled-fonts.js';
export const READER_FONTS = Object.freeze({
  custom: {
    id: "custom",
    stack: "Georgia,serif",
    labels: { ru: "custom-font", en: "Custom font", zh: "自定义字体" },
  },
  georgia: {
    id: "georgia",
    stack: "Georgia,'Times New Roman',serif",
    labels: { ru: "Georgia", en: "Georgia", zh: "Georgia" },
  },
  lora: {
    id: "lora",
    stack: "'Lora',Georgia,serif",
    labels: { ru: "Lora", en: "Lora", zh: "Lora" },
  },
  inter: {
    id: "inter",
    stack: "'Inter',system-ui,sans-serif",
    labels: { ru: "Inter", en: "Inter", zh: "Inter" },
  },
  systemSans: {
    id: "systemSans",
    stack: "-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC','Noto Sans SC',sans-serif",
    labels: { ru: "system-sans-serif", en: "System sans", zh: "系统黑体" },
    cjk: true,
  },
  sourceHanSerif: {
    id: "sourceHanSerif",
    stack: `'Source Han Serif CN','Source Han Serif SC','思源宋体 CN','Noto Serif CJK SC','Noto Serif SC','Songti SC','STSong','SimSun',serif`,
    labels: { ru: "Source Han Serif", en: "Source Han Serif", zh: "思源宋体" },
    cjk: true,
  },
  sourceHanSans: {
    id: "sourceHanSans",
    stack: `'Source Han Sans CN','Source Han Sans SC','思源黑体 CN','Noto Sans CJK SC','Noto Sans SC','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif`,
    labels: { ru: "Source Han Sans", en: "Source Han Sans", zh: "思源黑体" },
    cjk: true,
  },
  songti: {
    id: "songti",
    stack: "'Songti SC','STSong','SimSun','Noto Serif CJK SC','Noto Serif SC',serif",
    labels: { ru: "cjk-serif", en: "CJK serif", zh: "宋体" },
    cjk: true,
  },
  kaiti: {
    id: "kaiti",
    stack: "'Kaiti SC','STKaiti','KaiTi','Noto Serif CJK SC','Songti SC',serif",
    labels: { ru: "kaiti", en: "Kaiti", zh: "楷体" },
    cjk: true,
  },
  lxgw: {
    id: "lxgw",
    stack: `'LXGW WenKai GB Screen','LXGW WenKai Screen','LXGW WenKai','霞鹜文楷','Songti SC','STSong','Noto Serif CJK SC',serif`,
    labels: { ru: "LXGW WenKai", en: "LXGW WenKai", zh: "霞鹜文楷" },
    cjk: true,
  },
  zhenkai: {
    id: "zhenkai",
    stack: `'LXGW ZhenKai GB','霞鹜臻楷 GB','Kaiti SC','STKaiti','KaiTi','Noto Serif CJK SC',serif`,
    labels: { ru: "LXGW ZhenKai GB", en: "LXGW ZhenKai GB", zh: "霞鹜臻楷 GB" },
    cjk: true,
  },
  zhuque: {
    id: "zhuque",
    stack: `'${BUNDLED_FONT_FAMILIES.zhuque}','Zhuque Fangsong (technical preview)','朱雀仿宋（预览测试版）','FangSong','STFangsong','Noto Serif CJK SC','Songti SC',serif`,
    labels: { ru: "Zhuque Fangsong", en: "Zhuque Fangsong", zh: "朱雀仿宋" },
    cjk: true,
  },
});
export const FONTS = Object.fromEntries(Object.values(READER_FONTS).map((font) => [font.id, font.stack]));
