from flask import Flask, request, jsonify
from flask_cors import CORS
from services.player_service import PlayerUpdate
from services.team_service import TeamService
from services.auth_service import AuthService
from middleware.jwt_middleware import jwt_required, admin_required

app = Flask(__name__)
CORS(app, expose_headers=["Authorization"])

# ── AUTH (public) ──────────────────────────────────
@app.route('/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        user = AuthService.login(data)
        return jsonify(user), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        user = AuthService.register(data)
        return jsonify(user), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# ── PLAYERS (protected) ────────────────────────────
@app.route('/add_Player', methods=['POST'])
@jwt_required
def create_player():
    try:
        data = request.get_json()
        player_id = PlayerUpdate.insert_player(data)
        return jsonify({"message": "Player created successfully", "player_id": player_id}), 201
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@app.route('/add_Players', methods=['POST'])
@jwt_required
def create_multiple_player():
    try:
        players_data = request.get_json()
        response = PlayerUpdate.insert_multiple_player(players_data)
        return jsonify({"message": "Players created successfully", "player_ids": response}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/get_Players', methods=['GET'])
@jwt_required
def fetch_players():
    try:
        players = PlayerUpdate.get_all_player()
        return jsonify(players), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/get_Player/<player_code>', methods=['GET'])
@jwt_required
def fetch_player(player_code):
    player = PlayerUpdate.get_player_by_code(player_code)
    if not player:
        return jsonify({"message": "Player not found"}), 404
    return jsonify(player), 200

@app.route('/update_player/<player_code>', methods=['PUT'])
@jwt_required
def update_single_player(player_code):
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        updated_count = PlayerUpdate.update_player_by_code(player_code, data)
        if updated_count == 0:
            return jsonify({"message": "Player not found or no change"}), 404
        return jsonify({"message": "Player updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/update_players', methods=['PUT'])
@jwt_required
def update_multiple_player():
    try:
        data = request.get_json()
        if not isinstance(data, list):
            return jsonify({"error": "Input should be a list"}), 400
        updated_count = PlayerUpdate.update_multiple_player_by_code(data)
        return jsonify({"message": f"{updated_count} players updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/delete_player/<player_code>', methods=['DELETE'])
@jwt_required
def delete_player(player_code):
    try:
        deleted_count = PlayerUpdate.delete_player_by_code(player_code)
        if deleted_count == 0:
            return jsonify({"message": "Player not found"}), 404
        return jsonify({"message": "Player deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/delete_players', methods=['DELETE'])
@jwt_required
def bulk_delete_players():
    try:
        data = request.get_json()
        if not isinstance(data, list):
            return jsonify({"error": "Input should be a list of player_codes"}), 400
        deleted_count = PlayerUpdate.delete_multiple_players(data)
        return jsonify({"message": f"{deleted_count} players deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── TEAMS (protected) ──────────────────────────────
@app.route('/teams', methods=['POST'])
@jwt_required
def create_teams():
    try:
        data = request.get_json()
        if not data or not data.get("team_count"):
            return jsonify({"error": "Invalid team count"}), 400
        teams = TeamService.create_teams(data)
        return jsonify({"teams": teams}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/teams', methods=['GET'])
@jwt_required
def fetch_teams():
    teams = TeamService.get_all_teams()
    return jsonify(teams), 200

@app.route('/teams/<team_code>', methods=['GET'])
@jwt_required
def fetch_team(team_code):
    team = TeamService.get_team_by_code(team_code)
    if not team:
        return jsonify({"message": "Team not found"}), 404
    return jsonify(team), 200

@app.route('/teams/<team_code>', methods=['DELETE'])
@jwt_required
def delete_team(team_code):
    deleted = TeamService.delete_team(team_code)
    if deleted == 0:
        return jsonify({"message": "Team not found"}), 404
    return jsonify({"message": "Team deleted successfully"}), 200

@app.route('/teams', methods=['DELETE'])
@jwt_required
def bulk_delete_teams():
    try:
        data = request.get_json()
        if not isinstance(data, list):
            return jsonify({"error": "Input should be list"}), 400
        deleted = TeamService.delete_multiple_teams({"team_codes": data})
        return jsonify({"message": f"{deleted} teams deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)