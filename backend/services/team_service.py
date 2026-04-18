import random
from datetime import datetime
from config.db_connection import get_db
from models.team_model import TeamCreateRequest, TeamDeleteRequest
from pydantic import ValidationError


class TeamService:

    @staticmethod
    def _players_col():
        return get_db()["players"]

    @staticmethod
    def _teams_col():
        return get_db()["teams"]

    @staticmethod
    def _generate_code() -> str:
        col = TeamService._teams_col()
        while True:
            code = "T" + str(random.randint(10000, 99999))
            if not col.find_one({"team_code": code}):
                return code

    @staticmethod
    def _serialize_team(team: dict) -> dict:
        team["_id"] = str(team["_id"])
        if "created_at" in team and hasattr(team["created_at"], "isoformat"):
            team["created_at"] = team["created_at"].isoformat()
        return team

    @staticmethod
    def _clear_team_code_on_players(team_code: str):
        """
        When a team is deleted, reset team_code = None for all its players
        so they become available again.
        """
        TeamService._players_col().update_many(
            {"team_code": team_code},
            {"$set": {"team_code": None}}
        )

    # ── CREATE TEAMS ──────────────────────────────────
    @staticmethod
    def create_teams(data: dict) -> list:
        try:
            validated = TeamCreateRequest(**data)
        except ValidationError as e:
            errors = [f"{err['loc'][0]}: {err['msg']}" for err in e.errors()]
            raise ValueError("; ".join(errors))

        team_count = validated.team_count

        # Only use players NOT already assigned to a team
        players = list(TeamService._players_col().find(
            {"$or": [{"team_code": None}, {"team_code": {"$exists": False}}]}
        ))

        if len(players) < team_count:
            raise ValueError(
                f"Not enough available players. Need at least {team_count}, "
                f"have {len(players)} unassigned."
            )

        # Score and snake-draft
        for p in players:
            p["_id"] = str(p["_id"])
            p["_total_score"] = (
                p.get("batting_rating", 0) +
                p.get("bowling_rating", 0) +
                p.get("fielding_rating", 0) +
                p.get("wicket_keeping_rating", 0)
            )

        players.sort(key=lambda x: x["_total_score"], reverse=True)
        buckets = [[] for _ in range(team_count)]
        for i, player in enumerate(players):
            player.pop("_total_score", None)
            buckets[i % team_count].append(player)

        created = []
        for bucket in buckets:
            code = TeamService._generate_code()
            doc = {
                "team_code": code,
                "players": bucket,
                "created_at": datetime.utcnow(),
            }
            TeamService._teams_col().insert_one(doc)

            # Mark each player as belonging to this team
            player_codes = [p["player_code"] for p in bucket]
            TeamService._players_col().update_many(
                {"player_code": {"$in": player_codes}},
                {"$set": {"team_code": code}}
            )

            created.append(TeamService._serialize_team(doc.copy()))

        return created

    # ── READ ─────────────────────────────────────────
    @staticmethod
    def get_all_teams() -> list:
        teams = list(TeamService._teams_col().find())
        return [TeamService._serialize_team(t) for t in teams]

    @staticmethod
    def get_team_by_code(code: str) -> dict | None:
        team = TeamService._teams_col().find_one({"team_code": code})
        if team:
            return TeamService._serialize_team(team)
        return None

    # ── DELETE ───────────────────────────────────────
    @staticmethod
    def delete_team(code: str) -> int:
        # Free up players before removing the team
        TeamService._clear_team_code_on_players(code)
        result = TeamService._teams_col().delete_one({"team_code": code})
        return result.deleted_count

    @staticmethod
    def delete_multiple_teams(data: dict) -> int:
        try:
            validated = TeamDeleteRequest(**data)
        except ValidationError as e:
            errors = [f"{err['loc'][0]}: {err['msg']}" for err in e.errors()]
            raise ValueError("; ".join(errors))

        for code in validated.team_codes:
            TeamService._clear_team_code_on_players(code)

        result = TeamService._teams_col().delete_many(
            {"team_code": {"$in": validated.team_codes}}
        )
        return result.deleted_count