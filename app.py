from flask import Flask, render_template, request, jsonify
import os
import json
import sys
import threading

# 判断是否为打包环境
if getattr(sys, 'frozen', False):
    # 打包后的资源路径 (sys._MEIPASS)
    template_folder = os.path.join(sys._MEIPASS, 'templates')
    static_folder = os.path.join(sys._MEIPASS, 'static')
    app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)
    # 输出目录在 exe 同级
    BASE_DIR = os.path.dirname(sys.executable)
else:
    # 开发环境
    app = Flask(__name__)
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 配置输出目录
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
MATCH_LOG_FILE = os.path.join(OUTPUT_DIR, 'match_log.json')
log_lock = threading.Lock()

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

@app.route('/api/log_event', methods=['POST'])
def log_event():
    event = request.json
    
    with log_lock:
        # 如果是比赛开始事件，清空日志
        if event.get('type') == 'match_start':
            logs = [event]
            try:
                with open(MATCH_LOG_FILE, 'w', encoding='utf-8') as f:
                    json.dump(logs, f, ensure_ascii=False, indent=2)
                    f.flush()
                    os.fsync(f.fileno())
                return jsonify({"status": "success", "message": "Log reset"})
            except Exception as e:
                print(f"Error resetting log: {e}")
                return jsonify({"status": "error", "message": str(e)}), 500

        # 读取现有日志
        logs = []
        if os.path.exists(MATCH_LOG_FILE):
            try:
                with open(MATCH_LOG_FILE, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # 移除 NUL 字符，防止文件损坏导致读取失败
                    content = content.replace('\x00', '')
                    if content.strip():
                        try:
                            logs = json.loads(content)
                        except json.JSONDecodeError:
                            print("JSON Decode Error in match_log.json, starting fresh or appending.")
                            # 如果解析失败，可能是文件截断。
                            # 这里为了简单起见，如果无法解析，我们尝试保留旧内容（如果需要更复杂的恢复逻辑可以加）
                            # 但为了保证程序不崩，我们初始化为空列表，这会导致旧日志丢失。
                            # 更好的做法可能是备份坏文件。
                            pass
            except Exception as e:
                print(f"Error reading log: {e}")
        
        logs.append(event)
        
        try:
            with open(MATCH_LOG_FILE, 'w', encoding='utf-8') as f:
                json.dump(logs, f, ensure_ascii=False, indent=2)
                f.flush()
                os.fsync(f.fileno())
        except Exception as e:
            print(f"Error writing log: {e}")
            return jsonify({"status": "error", "message": str(e)}), 500
            
        return jsonify({"status": "success"})

if __name__ == '__main__':
    # 打包后禁用 debug
    debug_mode = not getattr(sys, 'frozen', False)
    if not debug_mode:
        print("FlyScore Server is running on http://127.0.0.1:5000")
        print("Close this window to stop the server.")
    app.run(debug=debug_mode, host='0.0.0.0', port=5000)
