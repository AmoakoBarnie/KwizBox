"""Curriculum manifest + topic endpoints."""
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pathlib import Path

from ..database import get_db
from ..models import Question

router = APIRouter(prefix="/curriculum", tags=["curriculum"])

MANIFEST_PATH = Path("/media/stephen/FILES/MyShit/ghana-stem-trivia/backend/curriculum/output/nacca_manifest.json")


@router.get("/manifest")
def get_manifest():
    if not MANIFEST_PATH.exists():
        return {"subjects": []}
    try:
        data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        return JSONResponse(content=data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load manifest: {e}")


@router.get("/topics")
def get_topics(
    subject: str = Query(None, description="Filter by subject"),
    class_level: str = Query(None, description="Filter by class level (B4-B9)"),
    db: Session = Depends(get_db),
):
    """Return distinct topic/sub_topic pairs grouped by subject and class_level,
    drawn directly from the questions table so the frontend can show what's actually available."""
    q = db.query(Question.subject, Question.class_level, Question.topic, Question.sub_topic).filter(
        Question.is_active == True, Question.topic != ""
    )
    if subject:
        q = q.filter(Question.subject == subject)
    if class_level:
        q = q.filter(Question.class_level == class_level)
    rows = q.order_by(Question.subject, Question.class_level, Question.topic, Question.sub_topic).all()

    grouped = {}
    for subj, cl, topic, sub_topic in rows:
        if subj not in grouped:
            grouped[subj] = {}
        if cl not in grouped[subj]:
            grouped[subj][cl] = {}
        if topic not in grouped[subj][cl]:
            grouped[subj][cl][topic] = []
        if sub_topic and sub_topic not in grouped[subj][cl][topic]:
            grouped[subj][cl][topic].append(sub_topic)
    return grouped