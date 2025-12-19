from flask import Flask, render_template, request, jsonify
import os
import json

app = Flask(__name__)

# 配置输出目录
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, 'output')

# 定义子目录结构
DIRS = {
    'root': OUTPUT_DIR,
    'scores': os.path.join(OUTPUT_DIR, 'scores'),
    'teams': os.path.join(OUTPUT_DIR, 'teams'),
    'info': os.path.join(OUTPUT_DIR, 'match_info')
}

# 确保所有目录存在
for d in DIRS.values():
    if not os.path.exists(d):
        os.makedirs(d)

GAME_STATE_FILE = os.path.join(OUTPUT_DIR, 'game_state.json')

def write_txt(category, filename, content):
    """
    category: 'scores', 'teams', 'info'
    """
    target_dir = DIRS.get(category, OUTPUT_DIR)
    try:
        with open(os.path.join(target_dir, filename), 'w', encoding='utf-8') as f:
            f.write(str(content))
    except Exception as e:
        print(f"Error writing to {category}/{filename}: {e}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/get_state', methods=['GET'])
def get_state():
    if os.path.exists(GAME_STATE_FILE):
        try:
            with open(GAME_STATE_FILE, 'r', encoding='utf-8') as f:
                return jsonify(json.load(f))
        except Exception as e:
            print(f"Error reading state: {e}")
            return jsonify({})
    return jsonify({})

@app.route('/api/update_status', methods=['POST'])
def update_status():
    data = request.json
    
    # 保存完整状态用于恢复
    if 'fullState' in data:
        try:
            with open(GAME_STATE_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Error saving state: {e}")

    # 写入文件
    
    # 1. 赛事元数据 (match_info)
    write_txt('info', 'event_name.txt', data.get('event_name', ''))
    write_txt('info', 'match_stage.txt', data.get('match_stage', ''))
    write_txt('info', 'match_venue.txt', data.get('match_venue', ''))
    write_txt('info', 'umpire.txt', data.get('umpire', ''))
    write_txt('info', 'service_judge.txt', data.get('service_judge', ''))
    write_txt('info', 'start_time.txt', data.get('start_time', ''))
    write_txt('info', 'end_time.txt', data.get('end_time', ''))
    write_txt('info', 'match_status.txt', data.get('status_message', ''))

    # 2. 比赛双方 (teams)
    write_txt('teams', 'team_a_name.txt', data.get('team_a_name', ''))
    write_txt('teams', 'team_b_name.txt', data.get('team_b_name', ''))
    
    # 发球方指示
    if data.get('serving_team') == 'A':
        write_txt('teams', 'indicator_a.txt', '🏸')
        write_txt('teams', 'indicator_b.txt', '')
    else:
        write_txt('teams', 'indicator_a.txt', '')
        write_txt('teams', 'indicator_b.txt', '🏸')
    
    # 3. 比分 (scores)
    # 大比分 (局分)
    write_txt('scores', 'score_a_sets.txt', data.get('sets_a', 0))
    write_txt('scores', 'score_b_sets.txt', data.get('sets_b', 0))
    write_txt('scores', 'score_sets_combined.txt', f"{data.get('sets_a', 0)} - {data.get('sets_b', 0)}")
    
    # 小比分 (当前局分数)
    write_txt('scores', 'score_a_points.txt', data.get('points_a', 0))
    write_txt('scores', 'score_b_points.txt', data.get('points_b', 0))
    write_txt('scores', 'score_points_combined.txt', f"{data.get('points_a', 0)} - {data.get('points_b', 0)}")

    return jsonify({"status": "success"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
