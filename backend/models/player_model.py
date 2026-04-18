from pydantic import BaseModel, Field, field_validator
from typing import Optional


class PlayerCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    age: int = Field(..., ge=14, le=60)
    batting_rating: Optional[int] = Field(default=50, ge=0, le=100)
    bowling_rating: Optional[int] = Field(default=50, ge=0, le=100)
    fielding_rating: Optional[int] = Field(default=50, ge=0, le=100)
    wicket_keeping_rating: Optional[int] = Field(default=50, ge=0, le=100)

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be blank or whitespace")
        return v.strip().title()

    @field_validator("batting_rating", "bowling_rating", "fielding_rating", "wicket_keeping_rating", mode="before")
    @classmethod
    def default_rating_if_none(cls, v):
        return v if v is not None else 50


class PlayerUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    age: Optional[int] = Field(default=None, ge=14, le=60)
    batting_rating: Optional[int] = Field(default=None, ge=0, le=100)
    bowling_rating: Optional[int] = Field(default=None, ge=0, le=100)
    fielding_rating: Optional[int] = Field(default=None, ge=0, le=100)
    wicket_keeping_rating: Optional[int] = Field(default=None, ge=0, le=100)

    @field_validator("name", mode="before")
    @classmethod
    def clean_name(cls, v):
        if v is not None:
            if not str(v).strip():
                raise ValueError("Name cannot be blank")
            return str(v).strip().title()
        return v


class PlayerResponse(BaseModel):
    player_code: str
    name: str
    age: int
    batting_rating: int
    bowling_rating: int
    fielding_rating: int
    wicket_keeping_rating: int
    team_code: Optional[str] = None       

    @property
    def total_score(self) -> int:
        return self.batting_rating + self.bowling_rating + self.fielding_rating + self.wicket_keeping_rating