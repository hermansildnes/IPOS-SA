import json
import math
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlmodel import Session, col, func, select

from audit.models import ACTION_CATEGORY, AuditAction, AuditCategory, AuditLog, AuditLogPage


def log_action(
    session: Session,
    *,
    action: AuditAction,
    performed_by_id: Optional[UUID] = None,
    performed_by_username: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    target_label: Optional[str] = None,
    detail: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    entry = AuditLog(
        action=action,
        category=ACTION_CATEGORY[action],
        performed_by_id=performed_by_id,
        performed_by_username=performed_by_username,
        target_type=target_type,
        target_id=target_id,
        target_label=target_label,
        detail=json.dumps(detail) if detail else None,
        ip_address=ip_address,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


def query_logs(
    session: Session,
    *,
    page: int = 1,
    page_size: int = 50,
    category: Optional[AuditCategory] = None,
    action: Optional[AuditAction] = None,
    username: Optional[str] = None,
    target_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> AuditLogPage:
    stmt = select(AuditLog)

    if category:
        stmt = stmt.where(AuditLog.category == category)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if username:
        stmt = stmt.where(col(AuditLog.performed_by_username).ilike(f"%{username}%"))
    if target_type:
        stmt = stmt.where(AuditLog.target_type == target_type)
    if start_date:
        dt = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
        stmt = stmt.where(AuditLog.timestamp >= dt)
    if end_date:
        dt = datetime.fromisoformat(end_date).replace(
            hour=23, minute=59, second=59, tzinfo=timezone.utc
        )
        stmt = stmt.where(AuditLog.timestamp <= dt)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = session.exec(count_stmt).one()

    offset = (page - 1) * page_size
    stmt = stmt.order_by(col(AuditLog.timestamp).desc()).offset(offset).limit(page_size)
    items = list(session.exec(stmt).all())

    return AuditLogPage(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
    )