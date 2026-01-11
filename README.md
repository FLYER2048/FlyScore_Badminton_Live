# FlyScore Badminton Live - 羽毛球比赛计分系统

FlyScore是一个基于Flask的球赛计分系统，FlyScore Badminton专为羽毛球比赛直播设计。它提供了一个直观的操作界面来管理比分、站位和比赛状态，并实时生成TXT文件供OBS等直播软件读取，亦可输出规范的记分表。

## 功能特点

*   **多模式支持**：支持男单(MS)、女单(WS)、男双(MD)、女双(WD)、混双(XD)。
*   **实时计分**：简单的点击操作即可增加分数，自动判断局点、赛点和换发球权。
*   **场地可视化**：实时显示球员在场地上的站位，自动处理单双打发球区域规则。
*   **直播对接 (OBS)**：所有比赛数据（比分、队名、状态、赛事信息）实时输出为 TXT 文件。
*   **断点续传**：刷新页面或更换设备，比赛进度自动同步，不会丢失数据。
*   **赛事管理**：支持录入赛事名称、阶段、地点、裁判姓名及比赛时间。
*   **辅助功能**：支持撤销误操作、交换场地、手动换发球权。
*   **导出比分**：支持导出json格式的比赛日志和Excel格式的记分表

<img width="2523" height="1599" alt="image" src="https://github.com/user-attachments/assets/6fc8e02a-b2a9-4963-bb28-0257ca353615" />

## 安装与运行

### 1. 环境要求
*   Python 3.x
*   Flask

### 2. 安装依赖
```bash
pip install flask
```

### 3. 启动系统
在项目根目录下运行：
```bash
python app.py
```
启动后，浏览器访问 `http://127.0.0.1:5000` 即可进入计分界面。

## OBS 直播对接指南

系统运行后，会在 `output` 文件夹下自动生成各类 TXT 文件。在 OBS 中添加“文本 (GDI+)”来源，勾选“从文件读取”，并选择对应的 TXT 文件即可。

### 输出文件结构

*   **`output/scores/` (比分数据)**
    *   `score_a_points.txt`: A队当前局比分
    *   `score_b_points.txt`: B队当前局比分
    *   `score_a_sets.txt`: A队大比分（局数）
    *   `score_b_sets.txt`: B队大比分（局数）
    *   `score_points_combined.txt`: 组合小分 (例如 "21 - 19")
    *   `score_sets_combined.txt`: 组合大分 (例如 "1 - 1")

*   **`output/teams/` (队伍信息)**
    *   `team_a_name.txt`: A队名称
    *   `team_b_name.txt`: B队名称
    *   `indicator_a.txt`: A队发球指示 (显示 🏸)
    *   `indicator_b.txt`: B队发球指示

*   **`output/match_info/` (赛事元数据)**
    *   `event_name.txt`: 赛事名称
    *   `match_stage.txt`: 比赛阶段 (如 "决赛")
    *   `match_venue.txt`: 比赛地点
    *   `umpire.txt`: 主裁判
    *   `service_judge.txt`: 副裁判
    *   `start_time.txt`: 开始时间
    *   `end_time.txt`: 结束时间
    *   `match_status.txt`: 比赛状态 (如 "关键分", "局点")
*   **`output/` (json数据)**
    *   `game_state.json`: 当前比赛状态
    *   `match_log.json`: 完整的比赛日志

## 操作说明

1.  **赛前设置**：在左侧面板设置比赛模式、队伍名称、球员姓名及规则（局数、分数）。
2.  **赛事信息**：填写赛事名称、裁判等信息，点击“开始比赛”自动记录开始时间。
3.  **计分**：点击对应队伍下方的 `+1分` 按钮进行计分。
4.  **修正**：如果操作失误，点击“撤销上一步”。
5.  **结束**：比赛结束后，点击“重置比赛”可归零比分并开始下一场。

## 目录结构
```
FlyScore_Badminton_Live3/
├── app.py              # 后端 Flask 应用
├── run.bat             # Windows 启动脚本
├── output/             # 自动生成的直播数据文件夹
│   ├── scores/
│   ├── teams/
│   └── match_info/
├── static/
│   ├── css/
│   │   └── style.css   # 样式表
│   └── js/
│       └── script.js   # 核心逻辑
└── templates/
    ├── index.html      # 前端界面
    │
    ├── scoreboard.html # 比分板界面
    │
    └── scoretable_template.xlsx # 比分板Excel模板
```

