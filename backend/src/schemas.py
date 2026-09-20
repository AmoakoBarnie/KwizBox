"""Pydantic request/response schemas."""
from pydantic import BaseModel, Field
from typing import Optional, Literal

CLASSES = ["B4", "B5", "B6", "B7", "B8", "B9", "S1", "S2", "S3"]
SUBJECTS = [
    "Mathematics",
    "Science",
    "Computing",
    "English",
    "Social Studies",
    "French",
    "Ghanaian Language",
    "History",
    "Our World and Our People",
    "Creative Arts",
    "Physical Education",
    "Religious and Moral Education",
    "Career Technology",
    "Arabic",
    "Mixed",
    "Physics",
    "Chemistry",
    "Biology",
    "ICT",
    "Elective Mathematics",
    "Economics",
    "Government",
    "Geography",
    "Agricultural Science",
]
DIFFICULTIES = ["Easy", "Medium", "Hard"]


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    nickname: str = Field(min_length=2, max_length=40)
    password: str = Field(min_length=6, max_length=100)
    class_level: Optional[str] = Field(default=None, pattern="^(B[4-9]|S[1-3])?$")
    school_code: Optional[str] = None


class LoginRequest(BaseModel):
    nickname: str
    password: str


class GuestRequest(BaseModel):
    nickname: Optional[str] = "Guest"
    class_level: Optional[str] = Field(default=None, pattern="^(B[4-9]|S[1-3])?$")
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
    # ---- Avatar customization (Upgrade 8) ----
    avatar: dict = Field(default_factory=lambda: {"skin": "warm", "hat": "none", "accessory": "none", "gender": "male"})


# ---------- Questions ----------
class QuestionOut(BaseModel):
    id: int
    class_level: str
    subject: str
    topic: str
    sub_topic: Optional[str] = None
    strand: str
    difficulty: str
    question: str
    options: list[str]  # 4 for mcq/image_mcq, 2 for true_false; never leaks the answer
    question_type: str = "mcq"  # mcq | true_false | image_mcq
    image_url: Optional[str] = None


class QuizPackRequest(BaseModel):
    class_level: Literal["B4", "B5", "B6", "B7", "B8", "B9", "S1", "S2", "S3"]
    subject: str
    difficulty: Optional[Literal["Easy", "Medium", "Hard"]] = None
    topic: Optional[str] = None
    sub_topic: Optional[str] = None
    count: int = Field(default=12, ge=1, le=20)
    exclude_ids: Optional[list[int]] = None
    daily: bool = False  # daily challenge: deterministic pack seeded by date


# ---------- Quiz submission ----------
class CheckAnswerRequest(BaseModel):
    question_id: int
    selected_index: int


class AnswerSubmission(BaseModel):
    question_id: int
    selected_index: int  # 0..3 (0..1 for true_false); -1 allowed for "no answer"
    seconds_taken: Optional[float] = None  # per-question timer for speed bonus
    max_streak: Optional[int] = None  # best streak during this challenge (Upgrade 9)


class QuizResultRequest(BaseModel):
    class_level: Literal["B4", "B5", "B6", "B7", "B8", "B9", "S1", "S2", "S3"]
    subject: str
    difficulty: Optional[Literal["Easy", "Medium", "Hard"]] = None
    topic: Optional[str] = None
    question_ids: list[int]
    answers: list[AnswerSubmission]
    duration_seconds: Optional[int] = None
    daily: Optional[bool] = None  # required for daily challenges so the submit can validate consistency


class AnswerFeedback(BaseModel):
    question_id: int
    selected_index: int
    correct_index: int
    is_correct: bool
    explanation: str
    question: str
    options: list[str]
    points: int = 0  # points earned on this question (0 if wrong)


class QuizResultResponse(BaseModel):
    session_id: int
    total: int
    correct: int
    accuracy: float
    score: int
    streak: int
    points_breakdown: dict
    feedback: list[AnswerFeedback]
    points_breakdown_list: list[dict] = Field(default_factory=list)  # [{question_id, points}, ...] for per-question display


# ---------- Leaderboard ----------
class LeaderboardEntry(BaseModel):
    rank: int
    nickname: str
    class_level: Optional[str]
    lifetime_score: int
    total_questions: int
    accuracy: float
    is_guest: bool
