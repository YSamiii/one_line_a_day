# One Line a Day — PWA v11

修复：
- 修复 gpt-5-mini 测试连接时报错：
  `temperature does not support 0.2`
- AI 请求现在默认不发送 `temperature`
- 因此兼容 gpt-5-mini 等只接受默认 temperature 的模型
- Provider / Endpoint / Model / API Key 设置保持不变
- 单条 AI 整理、批量 AI 整理、历史记录、月份跳转、多主题、新图标等 v10 功能全部保留

更新方式：
1. 解压 ZIP。
2. 将全部文件覆盖上传到原 GitHub Pages 仓库根目录。
3. 发布后用网址末尾加 `?v=11` 打开一次。
4. 回到 App 设置 → AI 设置 → 测试 AI 连接。
