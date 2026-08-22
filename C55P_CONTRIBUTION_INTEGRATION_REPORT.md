# C55-P 状态共建与纠错功能集成报告

## 1. 交付结果

- 网站：<https://erwintao21.github.io/zero-carbon-park-atlas/>
- 仓库：<https://github.com/Erwintao21/zero-carbon-park-atlas>
- 发布分支：`main`
- 功能部署提交：`4f4eab3b7163222af55480357ed47b2cf8bf568f`
- GitHub Pages 工作流：<https://github.com/Erwintao21/zero-carbon-park-atlas/actions/runs/32548839910>
- 工作流结果：`build success`、`deploy success`

本次集成在现有静态 GitHub Pages 架构内增加了 C55-P 建设状态补充、纠错、证据预审、GitHub Issue 提交入口、历史状态展示和公开提交日志。浏览器不直接修改 CSV，也不包含 GitHub Token 或其他写权限凭据。

## 2. 页面与功能

- 导航和首页增加“数据共建”入口。
- C55-P 专题与园区画像增加“补充建设状态”“提交纠错”和历史状态入口。
- 结构化表单覆盖园区、提交类型、拟议状态、认定层级、认定名称、发布机构、来源标题、日期、URL、证据摘录、页码/段落、备注和更正关系。
- 表单先进行本地校验和证据等级提示，再生成带唯一 `Submission_ID` 的 GitHub Issue 草稿。
- 新提交固定为 `PENDING`，只有维护者人工审核后才能进入正式历史记录。
- 历史时间线保留原记录，并显示证据、审核状态、更正与替代关系。
- 67 个园区均可从画像直接打开表单并自动填充唯一 `Park_ID`；目录外园区使用单独的 `OUT_OF_CATALOG` 选项，不进行中文名称模糊关联。

## 3. 数据结构

### `data/c55p_status_history.csv`

在保留既有 77 条历史记录的基础上增加：

- `Recognition_Name`
- `Evidence_Level`
- `Evidence_Quality`
- `Submission_ID`
- `Reviewed_Status`
- `Supersedes_Evidence_ID`
- `Corrects_Record_ID`
- `Last_Verified_Date`

当前状态只从 `ACCEPTED` 且证据等级为 `E3` 或 `E4` 的历史记录派生。优先级为：

`DESIGNATED > SELECTED_FOR_CONSTRUCTION > PILOT > PLANNED > UNKNOWN`

同一优先级以状态年份较新者为准。`SELECTED_FOR_CONSTRUCTION` 始终显示为“建设名单”，不表示已建成、已达标或正式认定。

### `data/c55p_submission_log.csv`

新增公开审核日志结构，记录 `Submission_ID`、Issue、园区、拟议状态、公开来源和审核结果。贡献者联系方式不进入该公开 CSV。

### 状态更新脚本

`scripts/update_c55_current_status.py` 负责规范历史字段并从可采信记录重新生成当前园区画像。脚本采用历史追加原则，不缩减历史记录行数，不用新值覆盖旧证据。

## 4. 审核流程

1. 贡献者在网页选择园区并填写来源与证据。
2. 前端校验必填字段、URL 协议和认定状态的最低证据要求。
3. 前端给出 E0–E4 证据等级预判，但该预判不是最终审核结论。
4. 用户确认后跳转 GitHub Issue，Issue 使用 `data-submission`、`c55p`、`needs-review` 标签。
5. 维护者核对园区 ID、原始来源、证据文字、状态定义、年份及重复/更正关系。
6. 审核结果为 `ACCEPTED`、`REJECTED`、`DUPLICATE` 或 `NEEDS_MORE_EVIDENCE`。
7. 只有 `ACCEPTED` 的 E3/E4 记录可影响当前状态；更新通过提交 CSV 和运行更新脚本完成。

完整规则见 `DATA_CONTRIBUTION_WORKFLOW.md`。

## 5. 方法边界与安全控制

- 网站展示公开证据可验证的建设状态和公开信息完整度，不构成园区综合绿色发展评分。
- 不建立绿色发展排名、benchmark 或 100 分总分。
- Missing 不转换为 0 分。
- 数据透明度不解释为园区绿色绩效。
- Issue 是征集与审核入口，不是自动入库接口。
- 前端不保存 GitHub PAT，不调用带写权限的 GitHub API，不直接编辑 CSV。
- 用户输入采用文本节点渲染，外链只接受 `http`/`https`，浏览器测试覆盖 HTML/JavaScript 注入场景。

## 6. 测试结果

### 本地

- Python：14/14 通过。
- JavaScript 语法检查：通过。
- Playwright：9/9 通过。
- 静态站点构建：通过，7 个数据文件同步至 `site/data/`。

### 线上

对 <https://erwintao21.github.io/zero-carbon-park-atlas/> 运行同一套 Playwright 测试：9/9 通过。

覆盖内容包括：

- GitHub Pages 子路径、动态统计、地图和筛选；
- 园区画像、42 项矩阵和证据展开；
- 67 个园区表单入口与 `Park_ID` 自动填充；
- `DESIGNATED` 来源必填与非法 URL 拦截；
- 唯一 `Submission_ID` 及完整 Issue 字段；
- HTML/JavaScript 注入防护；
- 状态优先级和“建设名单”语义；
- 390px 移动端页面与抽屉无横向溢出。

## 7. 已知限制

- GitHub Issue 提交需要用户登录 GitHub；未登录用户仍可完成本地预览，但需登录后提交。
- GitHub Pages 是静态站点，公开提交日志与已接受历史记录必须由维护者审核后提交到仓库，不能实时自动写入。
- 前端证据等级仅用于协助整理，最终采信等级由维护者根据原始文件人工确认。

## 8. 发布结论

C55-P 状态共建与纠错工作流已完成集成，数据历史、人工审核边界、状态语义、隐私与前端安全约束均已落实，且通过本地及线上质量门禁。
