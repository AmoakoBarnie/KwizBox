"""Pydantic request/response schemas."""
from pydantic import BaseModel, Field
from typing import Optional, Literal

CLASSES = ["B4", "B5", "B6", "B7", "B8", "B9"]
SUBJECTS = ["Mathematics", "Science", "Computing", "Mixed"]
DIFFICULTIES = ["Easy", "Medium", "Hard"]


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    nickname: str = Field(min_length=2, max_length=40)
    password: str = Field(min_length=4, max_length=100)
    class_level: Optional[str] = Field(default=None, pattern="^(B[4-9])?$")
    school_code: Optional[str] = None


class LoginRequest(BaseModel):
    nickname: str
    password: str


class GuestRequest(BaseModel):
    nickname: Optional[str] = "Guest"
    class_level: Optional[str] = Field(default=None, pattern="^(B[4-9])?$")
    school_code: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "PublicUser"


class PublicUser(BaseModel):
    id: int
    nickname: str
    class_level: Optional[str]
    school_code: Optional[str]
    is_guest: bool
    lifetime_score: int
    total_questions: int
    total_correct: int
    current_streak: int
    longest_streak: int
    progress: Optional[dict] = None


# ---------- Questions ----------
class QuestionOut(BaseModel):
    id: int
    class_level: str
    subject: str
    topic: str
    strand: str
    difficulty: str
    question: str
    options: list[str]  # exactly 4, no correct-answer leaked


class QuizPackRequest(BaseModel):
    class_level: Literal["B4", "B5", "B6", "B7", "B8", "B9"]
    subject: Literal["Mathematics", "Science", "Computing", "Mixed"]
    difficulty: Optional[Literal["Easy", "Medium", "Hard"]] = None  # optional; omit => mixed
    topic: Optional[str] = None
    count: int = Field(default=12, ge=1, le=20)


# ---------- Quiz submission ----------
class AnswerSubmission(BaseModel):
    question_id: int
    selected_index: int  # 0..3; -1 allowed for "no answer"


class QuizResultRequest(BaseModel):
    class_level: Literal["B4", "B5", "B6", "B7", "B8", "B9"]
    subject: Literal["Mathematics", "Science", "Computing", "Mixed"]
    difficulty: Optional[Literal["Easy", "Medium", "Hard"]] = None
    topic: Optional[str] = None
    answers: list[AnswerSubmission]
    duration_seconds: Optional[int] = None


class AnswerFeedback(BaseModel):
    question_id: int
    selected_index: int
    correct_index: int
    is_correct: bool
    explanation: str
    question: str
    options: list[str]


class QuizResultResponse(BaseModel):
    session_id: int
    total: int
    correct: int
    accuracy: float
    score: int
    streak: int
    points_breakdown: dict
    feedback: list[AnswerFeedback]


# ---------- Leaderboard ----------
class LeaderboardEntry(BaseModel):
    rank: int
    nickname: str
    class_level: Optional[str]
    lifetime_score: int
    total_questions: int
    accuracy: float
    is_guest: bool
