# One Line a Day — PWA v16

新增 PDF 导出：

- 全年页新增「导出 Year at a Glance PDF」
- 可选择年份
- 可选择指定 Block：
  - 我的一天
  - 熹熹的一天
  - 任意自定义 Block
- 可选择版式：
  - 两页：1–6 月 / 7–12 月
  - 一页：全年 12 个月
- 可选择是否保留空白日期

导出样式参考 Year at a Glance：
- 横向 A3
- 每个月一列
- 日期 1–31 纵向排列
- 每天的内容放入对应日期格
- 两页版更接近现有 Year at a Glance PDF，也更容易阅读

说明：
PDF 由 App 在浏览器端生成。当前版本使用 jsPDF CDN，因此生成 PDF 时需要网络连接。

其他 v15 功能全部保留。

部署：
解压 ZIP 后覆盖 GitHub Pages 仓库根目录。
建议发布后用 ?v=16 打开一次。
