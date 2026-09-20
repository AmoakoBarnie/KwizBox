"""Pydantic schemas for the admin API."""
from typing import Optional as Opt
from pydantic import BaseModel, Field
from datetime import datetime


# ---------- Admin auth ----------
class AdminLogin(BaseModel):
    username: str
    password: str


class AdminTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    full_name: Opt[str] = None


# ---------- Dashboard ----------
class DashboardStats(BaseModel):
    registered_users: int
    active_players: int          # played in last 24h
    online_players: int          # have an active (in-progress) session
    total_questions: int
    active_questions: int
    schools: int
    games_played: int
    avg_accuracy: float
    total_school_codes: int
    recent_activity: list


# ---------- User management ----------
class UserOut(BaseModel):
    id: int
    nickname: str
    class_level: Opt[str]
    school_code: Opt[str]
    is_guest: bool
    created_at: Opt[datetime]
    last_played: Opt[datetime]
    lifetime_score: int
    total_questions: int
    total_correct: int
    accuracy: float
    account_status: str  # active | disabled
    is_online: bool


class UserDetailOut(BaseModel):
    id: int
    nickname: str
    class_level: Opt[str]
    school_code: Opt[str]
    school: Opt[str]
    is_guest: bool
    created_at: Opt[datetime]
    last_played: Opt[datetime]
    lifetime_score: int
    total_questions: int
    total_correct: int
    accuracy: float
    current_streak: int
    longest_streak: int
    account_status: str
    games_played: int
    games: list  # recent sessions
    subject_accuracy: list = []   # [{subject, accuracy, questions}]
    mastered_count: int = 0


class SetUserStatus(BaseModel):
    is_active: bool


# ---------- Question management ----------
class QuestionOut(BaseModel):
    id: int
    class_level: str
    subject: str
    topic: str
    sub_topic: Opt[str] = None
    strand: str
    difficulty: str
    question: str
    options: list
    answer_index: int
    explanation: str
    is_active: bool
    times_answered: int
    times_correct: int
    correct_rate: Opt[float]
    question_type: str = "mcq"
    image_url: Opt[str] = None


class QuestionCreate(BaseModel):
    class_level: str = Field(pattern="^(B4|B5|B6|B7|B8|B9|S1|S2|S3)$")
    subject: str = Field(pattern="^(Mathematics|Science|Computing|English|Social Studies|French|Ghanaian Language|History|Our World and Our People|Creative Arts|Physical Education|Religious and Moral Education|Career Technology|Arabic|Mixed)$")
    topic: str
    sub_topic: Opt[str] = None
    strand: str = ""
    difficulty: str = Field(pattern="^(Easy|Medium|Hard)$")
    question: str
    options: list  # 4 for mcq/image_mcq; 2 for true_false
    answer_index: int = Field(ge=0, le=3)
    explanation: str = ""
    question_type: str = "mcq"
    image_url: Opt[str] = None


class QuestionUpdate(BaseModel):
    class_level: Opt[str] = None
    subject: Opt[str] = None
    topic: Opt[str] = None
    strand: Opt[str] = None
    difficulty: Opt[str] = None
    question: Opt[str] = None
    options: Opt[list] = None
    answer_index: Opt[int] = None
    explanation: Opt[str] = None
    is_active: Opt[bool] = None
    question_type: Opt[str] = None
    image_url: Opt[str] = None


# ---------- School code management ----------
class SchoolCodeCreate(BaseModel):
    name: str
    school: Opt[str] = None
    code: Opt[str] = None  # optional custom; else auto-generated
    expires_at: Opt[datetime] = None
    max_uses: Opt[int] = None
    count: int = 1  # generate N codes


class SchoolCodeOut(BaseModel):
    id: int
    code: str
    name: str
    school: Opt[str]
    created_at: Opt[datetime]
    expires_at: Opt[datetime]
    is_active: bool
    max_uses: Opt[int]
    used_count: int
    users_using: int


class SchoolCodeUpdate(BaseModel):
    is_active: Opt[bool] = None
    expires_at: Opt[datetime] = None
    name: Opt[str] = None
    school: Opt[str] = None


# ---------- Leaderboard ----------
class LeaderboardQuery(BaseModel):
    scope: str = "global"   # global | daily | weekly | monthly | school
    class_level: Opt[str] = None
    school_code: Opt[str] = None
    limit: int = 50


# ---------- Monitoring ----------
class GameActivityOut(BaseModel):
    active_games: int
    completed_games: int
    abandoned_games: int
    players_currently_playing: int
    live_players: list  # [{nickname, school, score, status}]


# ---------- Settings ----------
class SettingUpdate(BaseModel):
    value: str


class AuditLogOut(BaseModel):
    id: int
    admin_username: Opt[str]
    action: str
    target: Opt[str]
    detail: Opt[str]
    created_at: Opt[datetime]
