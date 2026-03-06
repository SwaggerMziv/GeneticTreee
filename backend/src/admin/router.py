import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional, List
from datetime import datetime

from src.auth.dependencies import require_superuser
from src.admin.dependencies import get_admin_service
from src.admin.service import AdminService
from src.admin.audit import log_admin_action
from src.admin.schemas import (
    AdminDashboardStatsSchema,
    AdminUserListResponseSchema,
    AdminRelativeListItemSchema,
    AdminStoryItemSchema,
    AdminTelegramStatsSchema,
    AdminAuditLogResponseSchema,
    ResetPasswordSchema,
    AIUsageLogResponseSchema,
    AIUsageStatsSchema,
    BookGenerationListResponseSchema,
    DashboardChartsSchema,
    AdminAllRelativesResponseSchema,
)
from src.users.models import UserModel
from src.storage.s3.dependencies import get_s3_manager
from src.storage.s3.manager import S3Manager
from src.subscription.dependencies import (
    get_subscription_repository,
    get_payment_repository,
    get_plan_repository,
)
from src.subscription.repository import (
    UserSubscriptionRepository,
    PaymentRepository,
    SubscriptionPlanRepository,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["admin"],
    dependencies=[Depends(require_superuser)],
)


# ==================== ДАШБОРД ====================

@router.get("/dashboard", response_model=AdminDashboardStatsSchema)
async def get_dashboard_stats(
    service: AdminService = Depends(get_admin_service),
):
    """Общая статистика платформы"""
    return await service.get_dashboard_stats()


@router.get("/dashboard/charts", response_model=DashboardChartsSchema)
async def get_dashboard_charts(
    service: AdminService = Depends(get_admin_service),
):
    """Данные для графиков дашборда"""
    return await service.get_dashboard_charts()


# ==================== ЮЗЕРЫ ====================

@router.get("/users", response_model=AdminUserListResponseSchema)
async def get_users_list(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    only_active: Optional[bool] = Query(default=None),
    date_from: Optional[datetime] = Query(default=None),
    date_to: Optional[datetime] = Query(default=None),
    sort_by: str = Query(default="created_at", pattern="^(created_at|relatives_count)$"),
    service: AdminService = Depends(get_admin_service),
):
    """Список пользователей с поиском и фильтрацией"""
    return await service.get_users_list(
        skip=skip, limit=limit, search=search, only_active=only_active,
        date_from=date_from, date_to=date_to, sort_by=sort_by,
    )


@router.get("/users/{user_id}/relatives", response_model=List[AdminRelativeListItemSchema])
async def get_user_relatives(
    user_id: int,
    service: AdminService = Depends(get_admin_service),
):
    """Родственники конкретного пользователя"""
    return await service.get_user_relatives(user_id)


@router.get("/users/{user_id}/tree")
async def get_user_tree(
    user_id: int,
    service: AdminService = Depends(get_admin_service),
):
    """Дерево пользователя (read-only для админа)"""
    return await service.get_user_tree(user_id)


@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: int,
    body: ResetPasswordSchema,
    request: Request,
    admin: UserModel = Depends(require_superuser),
    service: AdminService = Depends(get_admin_service),
):
    """Сброс пароля пользователя"""
    success = await service.reset_user_password(user_id, body.new_password)
    if not success:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    await log_admin_action(
        session=service.session,
        admin_user_id=admin.id,
        action="reset_password",
        target_type="user",
        target_id=str(user_id),
        request=request,
    )
    return {"message": "Пароль сброшен"}


# ==================== ВСЕ РОДСТВЕННИКИ ====================

@router.get("/relatives", response_model=AdminAllRelativesResponseSchema)
async def get_all_relatives(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    user_id: Optional[int] = Query(default=None),
    gender: Optional[str] = Query(default=None, pattern="^(male|female|other)$"),
    is_activated: Optional[bool] = Query(default=None),
    has_stories: Optional[bool] = Query(default=None),
    service: AdminService = Depends(get_admin_service),
):
    """Все родственники на платформе с фильтрами"""
    return await service.get_all_relatives(
        skip=skip, limit=limit, user_id=user_id,
        gender=gender, is_activated=is_activated, has_stories=has_stories,
    )


# ==================== ИСТОРИИ ====================

@router.get("/stories", response_model=List[AdminStoryItemSchema])
async def get_all_stories(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    user_id: Optional[int] = Query(default=None),
    service: AdminService = Depends(get_admin_service),
):
    """Все истории на платформе"""
    return await service.get_all_stories(skip=skip, limit=limit, user_id=user_id)


@router.delete("/relatives/{relative_id}/stories/{story_key}")
async def delete_story(
    relative_id: int,
    story_key: str,
    request: Request,
    admin: UserModel = Depends(require_superuser),
    service: AdminService = Depends(get_admin_service),
):
    """Удалить историю"""
    success = await service.delete_story(relative_id, story_key)
    if not success:
        raise HTTPException(status_code=404, detail="История не найдена")

    await log_admin_action(
        session=service.session,
        admin_user_id=admin.id,
        action="delete_story",
        target_type="story",
        target_id=f"{relative_id}:{story_key}",
        request=request,
    )
    return {"message": "История удалена"}


# ==================== TELEGRAM ====================

@router.get("/telegram", response_model=AdminTelegramStatsSchema)
async def get_telegram_stats(
    service: AdminService = Depends(get_admin_service),
):
    """Статистика Telegram бота"""
    return await service.get_telegram_stats()


# ==================== АУДИТ ====================

@router.get("/audit-logs", response_model=AdminAuditLogResponseSchema)
async def get_audit_logs(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    action: Optional[str] = Query(default=None),
    date_from: Optional[datetime] = Query(default=None),
    date_to: Optional[datetime] = Query(default=None),
    service: AdminService = Depends(get_admin_service),
):
    """Просмотр логов аудита"""
    return await service.get_audit_logs(
        skip=skip, limit=limit, action=action, date_from=date_from, date_to=date_to,
    )


# ==================== AI USAGE ====================

@router.get("/ai/usage", response_model=AIUsageLogResponseSchema)
async def get_ai_usage(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    user_id: Optional[int] = Query(default=None),
    endpoint_type: Optional[str] = Query(default=None),
    date_from: Optional[datetime] = Query(default=None),
    date_to: Optional[datetime] = Query(default=None),
    service: AdminService = Depends(get_admin_service),
):
    """Логи использования AI"""
    return await service.get_ai_usage(
        skip=skip, limit=limit, user_id=user_id,
        endpoint_type=endpoint_type, date_from=date_from, date_to=date_to,
    )


@router.get("/ai/stats", response_model=AIUsageStatsSchema)
async def get_ai_stats(
    service: AdminService = Depends(get_admin_service),
):
    """Агрегированная статистика AI"""
    return await service.get_ai_stats()


# ==================== КНИГИ ====================

@router.get("/books", response_model=BookGenerationListResponseSchema)
async def get_books(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    user_id: Optional[int] = Query(default=None),
    service: AdminService = Depends(get_admin_service),
):
    """Список сгенерированных книг"""
    return await service.get_books(skip=skip, limit=limit, user_id=user_id)


@router.delete("/books/{book_id}")
async def delete_book(
    book_id: int,
    request: Request,
    admin: UserModel = Depends(require_superuser),
    service: AdminService = Depends(get_admin_service),
    s3_manager: S3Manager = Depends(get_s3_manager),
):
    """Удалить книгу из S3 и БД"""
    s3_url = await service.delete_book(book_id)
    if s3_url is None:
        raise HTTPException(status_code=404, detail="Книга не найдена")

    # Удаляем из S3
    if s3_url:
        try:
            await s3_manager.delete(s3_url)
        except Exception as e:
            logger.error(f"Ошибка удаления книги из S3: {e}")

    await log_admin_action(
        session=service.session,
        admin_user_id=admin.id,
        action="delete_book",
        target_type="book",
        target_id=str(book_id),
        request=request,
    )
    return {"message": "Книга удалена"}


# ==================== ПОДПИСКИ ====================

@router.get("/subscriptions")
async def get_subscriptions(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    sub_repo: UserSubscriptionRepository = Depends(get_subscription_repository),
):
    """Все активные подписки"""
    subs = await sub_repo.get_all_active(skip, limit)
    return [
        {
            "id": s.id,
            "user_id": s.user_id,
            "plan_name": s.plan.name.value if s.plan else "unknown",
            "plan_display_name": s.plan.display_name if s.plan else "—",
            "status": s.status.value if hasattr(s.status, 'value') else s.status,
            "billing_period": s.billing_period.value if s.billing_period and hasattr(s.billing_period, 'value') else s.billing_period,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "expires_at": s.expires_at.isoformat() if s.expires_at else None,
            "auto_renew": s.auto_renew,
        }
        for s in subs
    ]


@router.get("/payments")
async def get_all_payments(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    payment_repo: PaymentRepository = Depends(get_payment_repository),
):
    """Все платежи"""
    payments = await payment_repo.get_all(skip, limit)
    return [
        {
            "id": p.id,
            "user_id": p.user_id,
            "amount_rub": p.amount_kop / 100,
            "status": p.status.value if hasattr(p.status, 'value') else p.status,
            "payment_method_type": p.payment_method_type,
            "description": p.description,
            "paid_at": p.paid_at.isoformat() if p.paid_at else None,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in payments
    ]


@router.get("/subscription-stats")
async def get_subscription_stats(
    sub_repo: UserSubscriptionRepository = Depends(get_subscription_repository),
    payment_repo: PaymentRepository = Depends(get_payment_repository),
):
    """Статистика подписок: MRR, распределение по планам"""
    from datetime import datetime, timezone, timedelta

    plan_counts = await sub_repo.count_by_plan()
    now = datetime.now(timezone.utc)
    month_ago = now - timedelta(days=30)
    revenue = await payment_repo.get_revenue_stats(since=month_ago)

    total_paid = sum(v for k, v in plan_counts.items() if k != "free")
    total_free = plan_counts.get("free", 0)

    return {
        "plan_distribution": plan_counts,
        "total_paid_subscribers": total_paid,
        "total_free_users": total_free,
        "mrr_kop": revenue["total_kop"],
        "mrr_rub": revenue["total_kop"] / 100,
        "payments_last_30_days": revenue["count"],
    }


@router.post("/users/{user_id}/set-plan")
async def admin_set_user_plan(
    user_id: int,
    plan_name: str = Query(..., description="free, pro, или premium"),
    request: Request = None,
    admin: UserModel = Depends(require_superuser),
    plan_repo: SubscriptionPlanRepository = Depends(get_plan_repository),
    sub_repo: UserSubscriptionRepository = Depends(get_subscription_repository),
    service: AdminService = Depends(get_admin_service),
):
    """Вручную назначить план пользователю (для поддержки)"""
    from src.subscription.enums import PlanType, SubscriptionStatus, BillingPeriod
    from src.subscription.exceptions import PlanNotFoundError
    from datetime import datetime, timezone
    from dateutil.relativedelta import relativedelta

    try:
        plan_type = PlanType(plan_name)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Неизвестный план: {plan_name}")

    plan = await plan_repo.get_by_name(plan_type)
    if not plan:
        raise PlanNotFoundError(plan_name=plan_name)

    # Деактивируем текущую подписку
    current = await sub_repo.get_active_by_user(user_id)
    if current:
        await sub_repo.update(
            current,
            status=SubscriptionStatus.EXPIRED,
            cancelled_at=datetime.now(timezone.utc),
        )

    # Создаём новую
    now = datetime.now(timezone.utc)
    await sub_repo.create(
        user_id=user_id,
        plan_id=plan.id,
        status=SubscriptionStatus.ACTIVE,
        billing_period=BillingPeriod.MONTHLY,
        started_at=now,
        expires_at=now + relativedelta(years=10) if plan_type == PlanType.FREE else now + relativedelta(months=1),
        auto_renew=False,
    )

    await log_admin_action(
        session=service.session,
        admin_user_id=admin.id,
        action="set_plan",
        target_type="user",
        target_id=str(user_id),
        details={"plan": plan_name},
        request=request,
    )
    return {"message": f"Пользователю {user_id} назначен план {plan_name}"}
