from pydantic import BaseModel, Field, field_validator
from typing import List


class TeamCreateRequest(BaseModel):
    team_count: int = Field(..., ge=2, le=20, description="Number of teams to create (2–20)")

    @field_validator("team_count")
    @classmethod
    def must_be_positive(cls, v: int) -> int:
        if v < 2:
            raise ValueError("At least 2 teams are required")
        return v


class TeamDeleteRequest(BaseModel):
    team_codes: List[str] = Field(..., min_length=1, description="List of team codes to delete")

    @field_validator("team_codes")
    @classmethod
    def codes_must_not_be_empty(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("team_codes list cannot be empty")
        return [c.strip() for c in v if c.strip()]
