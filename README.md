# 零碳园区公开数据图谱

**Zero-Carbon Park Data Atlas**

独立展示67个园区公开建设状态、数据透明度、42项完整评价数据准备度和证据来源。

本网站不计算综合绿色发展评分、排名、benchmark或100分总分；公开信息缺失不代表园区表现较差。

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

所有关联以Park_ID和Evidence_ID完成，不使用园区名称模糊匹配。
