import random
from config.db_connection import get_db


class PlayerUpdate:

    @staticmethod
    def _col():
        return get_db()["players"]

    @staticmethod
    def _teams_col():
        return get_db()["teams"]

    @staticmethod
    def generate_player_code():
        col = PlayerUpdate._col()
        while True:
            code = "P" + str(random.randint(10000, 99999))
            if not col.find_one({"player_code": code}):
                return code

    @staticmethod
    def insert_player(player_data: dict) -> dict:
        # A new player has no team yet
        player_data["player_code"] = PlayerUpdate.generate_player_code()
        player_data.setdefault("team_code", None)
        PlayerUpdate._col().insert_one(player_data)
        return {"player_code": player_data["player_code"]}

    @staticmethod
    def insert_multiple_player(players_list: list) -> list:
        for player in players_list:
            player["player_code"] = PlayerUpdate.generate_player_code()
            player.setdefault("team_code", None)
        result = PlayerUpdate._col().insert_many(players_list)
        return [str(_id) for _id in result.inserted_ids]

    @staticmethod
    def get_player_by_code(player_code: str) -> dict | None:
        player = PlayerUpdate._col().find_one({"player_code": player_code})
        if player:
            player["_id"] = str(player["_id"])
            return player
        return None

    @staticmethod
    def get_all_player() -> list:
        players = list(PlayerUpdate._col().find())
        for p in players:
            p["_id"] = str(p["_id"])
        return players

    @staticmethod
    def update_player_by_code(player_code: str, update_data: dict) -> int:
        update_data.pop("player_code", None)
        result = PlayerUpdate._col().update_one(
            {"player_code": player_code},
            {"$set": update_data}
        )
        return result.modified_count

    @staticmethod
    def update_multiple_player_by_code(players_list: list) -> int:
        updated_count = 0
        for player in players_list:
            player_code = player.get("player_code")
            if not player_code:
                continue
            update_data = {k: v for k, v in player.items() if k != "player_code"}
            result = PlayerUpdate._col().update_one(
                {"player_code": player_code},
                {"$set": update_data}
            )
            updated_count += result.modified_count
        return updated_count

    @staticmethod
    def _remove_player_from_team(player_code: str):
        """
        Pull this player from whichever team document embeds them.
        Called before deleting a player so teams stay consistent.
        """
        PlayerUpdate._teams_col().update_many(
            {"players.player_code": player_code},
            {"$pull": {"players": {"player_code": player_code}}}
        )

    @staticmethod
    def delete_player_by_code(player_code: str) -> int:
        # 1. Remove from any team that holds this player
        PlayerUpdate._remove_player_from_team(player_code)
        # 2. Delete the player document
        result = PlayerUpdate._col().delete_one({"player_code": player_code})
        return result.deleted_count

    @staticmethod
    def delete_multiple_players(player_codes: list) -> int:
        # 1. Remove each player from their respective team
        for code in player_codes:
            PlayerUpdate._remove_player_from_team(code)
        # 2. Bulk-delete player documents
        result = PlayerUpdate._col().delete_many({"player_code": {"$in": player_codes}})
        return result.deleted_count