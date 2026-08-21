# C55-P 数据共建与审核流程

## 1. 用户提交流程

1. 用户从“绿色低碳建设状态专题”“园区公开画像”或“数据共建”打开表单。
2. 园区默认只能从67个 `Park_ID` 中选择；“园区不在列表中”进入单独人工复核。
3. 浏览器检查状态、年份、来源、URL和证据文本。
4. 表单先生成 Submission Preview，明确提示不会直接修改正式数据库。
5. 用户确认后打开预填的公开 GitHub Issue。前端不保存令牌，也不调用带凭据的写API。
6. Issue默认标记 `data-submission`、`c55p`、`needs-review`，审核状态为 `PENDING`。

`Submission_Type_System` 当前只开放 `C55P_STATUS`；未来可扩展 `INDICATOR_VALUE`、`EVIDENCE_CORRECTION` 和 `PARK_INFORMATION`。

## 2. 审核流程

管理员依次核验：

1. `Park_ID` 与园区归属；
2. 来源URL、发布机构和文件标题；
3. 原文是否直接支持建议状态；
4. `DESIGNATED`、`SELECTED_FOR_CONSTRUCTION`、`PILOT`、`PLANNED` 是否被正确区分；
5. 是否与既有 Issue、Evidence 或历史记录重复；
6. 证据等级和纠错追溯字段是否合理。

审核状态只能为：`PENDING`、`ACCEPTED`、`REJECTED`、`NEEDS_MORE_EVIDENCE`、`DUPLICATE`。

审核结果登记到 `data/c55p_submission_log.csv`。只有 `ACCEPTED` 才能追加到 `data/c55p_status_history.csv`。建议使用标签 `accepted`、`rejected`、`duplicate` 或 `needs-more-evidence` 关闭审核循环。

## 3. 状态定义

- `DESIGNATED`：已经获得正式认定或正式创建结果。
- `SELECTED_FOR_CONSTRUCTION`：入选建设名单或承担建设任务；不表示已经建成或达标。
- `PILOT`：正式列入试点或示范试点。
- `PLANNED`：处于规划、拟建或实施方案阶段；不能视为已认定。
- `OTHER`：不属于以上类型，必须在备注中解释。
- `UNKNOWN`：证据不足，暂时无法判断。

状态不是绿色绩效分，不用于自动评分或排名。

## 4. Evidence 等级

- `E4_OFFICIAL_PRIMARY`：发布认定的主管部门正式文件。
- `E3_OFFICIAL_SECONDARY`：其他政府部门对正式认定的转载或确认。
- `E2_INSTITUTIONAL`：园区、企业或机构官方材料。
- `E1_MEDIA`：媒体报道。
- `E0_UNVERIFIED`：目前无法验证。

正式 Current Status 默认只使用审核通过的 E3/E4。E1/E2可保留在历史或审核记录中并显示为“待进一步验证”，不能自动升级园区状态。

## 5. 正式数据库更新规则

接受提交后：

1. 在 `c55p_submission_log.csv` 登记 Issue、Submission ID、审核人、日期和结论，不记录公开联系方式。
2. 向 `c55p_status_history.csv` **追加**记录，生成新的 `Evidence_ID`，填写 `Submission_ID` 与 `Reviewed_Status=ACCEPTED`。
3. 运行：

   ```bash
   python scripts/update_c55_current_status.py
   ```

4. 脚本只用 E3/E4 且已接受的历史证据计算当前状态，优先级为：

   `DESIGNATED > SELECTED_FOR_CONSTRUCTION > PILOT > PLANNED > UNKNOWN`

   同一状态按年份选择最新记录。历史行数必须保持或增加，禁止减少。
5. 运行完整测试并通过 Pull Request 或受控 main 提交发布。

## 6. 纠错规则

`CORRECTION` 不删除原记录。审核通过后追加一条 Correction Record，并填写以下至少一个字段：

- `Supersedes_Evidence_ID`
- `Corrects_Record_ID`

旧证据、新证据和纠错关系必须同时保留。若纠错证据不足，使用 `NEEDS_MORE_EVIDENCE`，不得修改正式 Current Status。

## 7. 隐私与安全

- `Contributor_Contact` 只存在于当前浏览器表单内，不写入公开 Issue、CSV或前端存储。
- 前端不包含 GitHub PAT、个人Access Token或匿名数据库写权限。
- 只接受 `http`/`https` 来源URL。
- 用户文本通过 `textContent` 展示；不得用未转义的 `innerHTML` 渲染用户输入。
- GitHub Issue 是待审核材料，不是正式数据，也不会自动进入公开画像。
