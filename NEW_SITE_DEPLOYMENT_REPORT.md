# 零碳园区公开数据图谱部署报告

## 仓库与发布地址

- 仓库：<https://github.com/Erwintao21/zero-carbon-park-atlas>
- 初始实现提交：`89fa92b0e69e2d23abe7480b37988d25d212e8d0`
- 首次成功部署提交：`34dfc991ba059c959a60f89efa545b12647369e6`
- Pages：<https://erwintao21.github.io/zero-carbon-park-atlas/>
- 发布状态：GitHub Pages 已启用，构建源为 GitHub Actions，线上验证通过

## 页面模块

1. 首页
2. 全国园区地图
3. 园区公开画像
4. 数据透明度
5. 42项指标数据准备度
6. 数据来源
7. 方法说明

网站未包含碳核算、技术措施筛选、投资测算或复杂场景计算，也不生成综合绿色评分、排名、benchmark 或100分总分。

## 数据文件

- `data/park_catalog.csv`
- `data/park_profiles.csv`
- `data/park_transparency.csv`
- `data/park_indicator_availability.csv`
- `data/c55p_status_history.csv`
- `data/park_public_evidence.csv`

所有园区数据以 `Park_ID` 关联，证据以 `Evidence_ID` 追溯。统计卡中的67、10、57和42均由CSV运行时动态计算。

## 测试结果

- Python 数据完整性测试：8/8 通过
- JavaScript 语法检查：通过
- Playwright 浏览器测试：3/3 通过
- 67个园区与唯一 `Park_ID`：通过
- 2814条 Park×Indicator 与每园区42项：通过
- C55-P 10个正式认定、57个建设名单：通过
- Missing 保持空值、不转为0：通过
- 不存在综合 Green Score 或 Rank：通过
- 地图、筛选、证据链接、42项展开：通过
- 390px移动端与 `/zero-carbon-park-atlas/` 子路径：通过

## 方法边界

数据透明度仅表示公开信息可获得性，不代表园区绿色低碳发展水平。`SELECTED_FOR_CONSTRUCTION` 始终显示为“建设名单”，不解释为已完成建设或已达到零碳标准。公开信息缺失不解释为绩效为零。

## 线上验证

- Pages 工作流 `32520478201`：build 与 deploy 均成功
- 实际 Pages 首页：HTTP 200
- 线上 Playwright：3/3 通过
- 已在线验证动态67/10/57/42统计、全国地图、五类筛选、园区画像、证据链接、42项矩阵展开和390px移动端布局
- GitHub Pages 子路径 `/zero-carbon-park-atlas/` 下的HTML、CSS、JavaScript、CSV和地图资源均正常加载

## 已知限制

- 公开证据的可访问性可能随来源网站调整而变化。
- 42项完整评价仍需要园区填报、企业调查及环境、能源、水务、安全和智慧园区系统数据。
- GitHub Actions 提示部分官方 actions 仍以 Node.js 20 为目标、由运行器强制使用 Node.js 24；当前不影响构建和部署，后续可随官方 action 版本更新消除提示。

`NEW_SITE_DEPLOYMENT_SUCCESS`
