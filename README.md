# 零碳园区公开数据图谱

**Zero-Carbon Park Data Atlas**

独立展示67个园区公开建设状态、数据透明度、42项完整评价数据准备度和证据来源。

本网站不计算综合绿色发展评分、排名、benchmark或100分总分；公开信息缺失不代表园区表现较差。

## 数据共建

网站提供C55-P建设状态补充与纠错表单。访问者只能生成结构化、预填充的GitHub Issue，不能直接修改正式CSV。提交默认进入 `PENDING` 队列，只有人工审核为 `ACCEPTED` 后才追加到状态历史库。

审核、Evidence等级、纠错和隐私规则见 [`DATA_CONTRIBUTION_WORKFLOW.md`](DATA_CONTRIBUTION_WORKFLOW.md)。

## 本地构建

```bash
python -m unittest discover -s tests -p "test_*.py" -v
python scripts/build_site.py
python scripts/serve_subpath.py
```

打开 `http://127.0.0.1:8766/zero-carbon-park-atlas/`。

## 数据

- `park_profiles.csv`：67条
- `park_transparency.csv`：67条
- `park_indicator_availability.csv`：2814条
- `c55p_status_history.csv`：77条
- `c55p_submission_log.csv`：公开审核日志结构，不包含提交人联系方式

所有关联以Park_ID和Evidence_ID完成，不使用园区名称模糊匹配。

审核通过并追加历史记录后，运行：

```bash
python scripts/update_c55_current_status.py
```

该脚本保留全部历史行，只使用已接受的E3/E4证据按状态优先级和年份更新Current Status。
