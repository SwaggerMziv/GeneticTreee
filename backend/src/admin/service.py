from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, cast, Date
from sqlalchemy.orm.attributes import flag_modified
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from src.users.models import UserModel
from src.family.models import FamilyRelationModel, FamilyRelationshipModel
from src.admin.models import AdminAuditLogModel, AIUsageLogModel, BookGenerationModel
from src.admin.schemas import (
    AdminUserListItemSchema,
    AdminUserListResponseSchema,
    AdminDashboardStatsSchema,
    AdminRelativeListItemSchema,
    AdminStoryItemSchema,
    AdminActiveInterviewSchema,
    AdminTelegramStatsSchema,
    AdminAuditLogItemSchema,
    AdminAuditLogResponseSchema,
    AIUsageLogItemSchema,
    AIUsageLogResponseSchema,
    AIUsageStatsSchema,
    BookGenerationItemSchema,
    BookGenerationListResponseSchema,
    DayDataPointSchema,
    DashboardChartsSchema,
    AdminAllRelativesResponseSchema,
)


class AdminService:
    """Сервис для админ-панели - агрегатные запросы по всем таблицам"""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ==================== ДАШБОРД ====================

    async def get_dashboard_stats(self) -> AdminDashboardStatsSchema:
        """Общая статистика платформы"""
        now = datetime.now(timezone.utc)

        # Юзеры
        total_users_q = await self.session.execute(
            select(func.count()).select_from(UserModel)
        )
        total_users = total_users_q.scalar() or 0

        active_users_q = await self.session.execute(
            select(func.count()).select_from(UserModel).where(UserModel.is_active == True)
        )
        active_users = active_users_q.scalar() or 0

        inactive_users = total_users - active_users

        # Юзеры за 7 и 30 дней
        users_7d_q = await self.session.execute(
            select(func.count()).select_from(UserModel).where(
                UserModel.created_at >= now - timedelta(days=7)
            )
        )
        users_7d = users_7d_q.scalar() or 0

        users_30d_q = await self.session.execute(
            select(func.count()).select_from(UserModel).where(
                UserModel.created_at >= now - timedelta(days=30)
            )
        )
        users_30d = users_30d_q.scalar() or 0

        # Родственники
        total_relatives_q = await self.session.execute(
            select(func.count()).select_from(FamilyRelationModel).where(
                FamilyRelationModel.is_active == True
            )
        )
        total_relatives = total_relatives_q.scalar() or 0

        # Связи
        total_relationships_q = await self.session.execute(
            select(func.count()).select_from(FamilyRelationshipModel).where(
                FamilyRelationshipModel.is_active == True
            )
        )
        total_relationships = total_relationships_q.scalar() or 0

        # Активированные родственники (Telegram)
        total_activated_q = await self.session.execute(
            select(func.count()).select_from(FamilyRelationModel).where(
                FamilyRelationModel.is_active == True,
                FamilyRelationModel.is_activated == True
            )
        )
        total_activated = total_activated_q.scalar() or 0

        # Приглашения отправлены
        total_invitations_q = await self.session.execute(
            select(func.count()).select_from(FamilyRelationModel).where(
                FamilyRelationModel.invitation_token.isnot(None)
            )
        )
        total_invitations = total_invitations_q.scalar() or 0

        # Истории - загружаем context и считаем ключи (без interview_messages)
        contexts_q = await self.session.execute(
            select(FamilyRelationModel.context).where(
                FamilyRelationModel.is_active == True,
                FamilyRelationModel.context.isnot(None)
            )
        )
        total_stories = 0
        for (context,) in contexts_q.all():
            if context and isinstance(context, dict):
                for key, value in context.items():
                    if key == 'interview_messages':
                        continue
                    if isinstance(value, str) or (isinstance(value, dict) and 'text' in value):
                        total_stories += 1

        # Среднее кол-во родственников на юзера
        avg_relatives = round(total_relatives / active_users, 1) if active_users > 0 else 0

        # Топ юзеры (по количеству родственников)
        top_users = await self._get_top_users(limit=5)

        return AdminDashboardStatsSchema(
            total_users=total_users,
            active_users=active_users,
            inactive_users=inactive_users,
            total_relatives=total_relatives,
            total_relationships=total_relationships,
            total_stories=total_stories,
            total_activated_relatives=total_activated,
            total_invitations_sent=total_invitations,
            users_registered_last_7_days=users_7d,
            users_registered_last_30_days=users_30d,
            avg_relatives_per_user=avg_relatives,
            top_users=top_users,
        )

    async def _get_top_users(self, limit: int = 5) -> List[AdminUserListItemSchema]:
        """Топ юзеров по количеству родственников"""
        relatives_sub = (
            select(
                FamilyRelationModel.user_id,
                func.count(FamilyRelationModel.id).label('relatives_count')
            )
            .where(FamilyRelationModel.is_active == True)
            .group_by(FamilyRelationModel.user_id)
            .subquery()
        )

        query = (
            select(UserModel, relatives_sub.c.relatives_count)
            .outerjoin(relatives_sub, UserModel.id == relatives_sub.c.user_id)
            .where(UserModel.is_active == True)
            .order_by(relatives_sub.c.relatives_count.desc().nullslast())
            .limit(limit)
        )
        result = await self.session.execute(query)
        rows = result.all()

        items = []
        for user, rel_count in rows:
            items.append(AdminUserListItemSchema(
                id=user.id,
                username=user.username,
                email=user.email,
                telegram_id=user.telegram_id,
                is_active=user.is_active,
                is_superuser=user.is_superuser,
                created_at=user.created_at,
                relatives_count=rel_count or 0,
            ))
        return items

    # ==================== ЮЗЕРЫ ====================

    async def get_users_list(
        self,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        only_active: Optional[bool] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        sort_by: str = "created_at",
    ) -> AdminUserListResponseSchema:
        """Список юзеров с поиском и фильтрацией"""
        # Подзапросы для подсчёта
        relatives_sub = (
            select(
                FamilyRelationModel.user_id,
                func.count(FamilyRelationModel.id).label('relatives_count')
            )
            .where(FamilyRelationModel.is_active == True)
            .group_by(FamilyRelationModel.user_id)
            .subquery()
        )

        relationships_sub = (
            select(
                FamilyRelationshipModel.user_id,
                func.count(FamilyRelationshipModel.id).label('relationships_count')
            )
            .where(FamilyRelationshipModel.is_active == True)
            .group_by(FamilyRelationshipModel.user_id)
            .subquery()
        )

        activated_sub = (
            select(
                FamilyRelationModel.user_id,
                func.count(FamilyRelationModel.id).label('activated_count')
            )
            .where(
                FamilyRelationModel.is_active == True,
                FamilyRelationModel.is_activated == True
            )
            .group_by(FamilyRelationModel.user_id)
            .subquery()
        )

        # Базовый запрос
        base_filter = []
        if search:
            search_pattern = f"%{search}%"
            base_filter.append(
                or_(
                    UserModel.username.ilike(search_pattern),
                    UserModel.email.ilike(search_pattern),
                )
            )
        if only_active is True:
            base_filter.append(UserModel.is_active == True)
        elif only_active is False:
            base_filter.append(UserModel.is_active == False)
        if date_from:
            base_filter.append(UserModel.created_at >= date_from)
        if date_to:
            base_filter.append(UserModel.created_at <= date_to)

        # Подсчёт total
        count_q = select(func.count()).select_from(UserModel)
        if base_filter:
            count_q = count_q.where(*base_filter)
        total_result = await self.session.execute(count_q)
        total = total_result.scalar() or 0

        # Основной запрос
        query = (
            select(
                UserModel,
                relatives_sub.c.relatives_count,
                relationships_sub.c.relationships_count,
                activated_sub.c.activated_count,
            )
            .outerjoin(relatives_sub, UserModel.id == relatives_sub.c.user_id)
            .outerjoin(relationships_sub, UserModel.id == relationships_sub.c.user_id)
            .outerjoin(activated_sub, UserModel.id == activated_sub.c.user_id)
        )
        if base_filter:
            query = query.where(*base_filter)

        # Сортировка
        if sort_by == "relatives_count":
            query = query.order_by(relatives_sub.c.relatives_count.desc().nullslast())
        else:
            query = query.order_by(UserModel.created_at.desc())

        query = query.offset(skip).limit(limit)
        result = await self.session.execute(query)
        rows = result.all()

        users = []
        for user, rel_count, rels_count, act_count in rows:
            # Подсчёт историй для этого юзера - загрузим контексты
            stories_count = await self._count_user_stories(user.id)
            users.append(AdminUserListItemSchema(
                id=user.id,
                username=user.username,
                email=user.email,
                telegram_id=user.telegram_id,
                is_active=user.is_active,
                is_superuser=user.is_superuser,
                created_at=user.created_at,
                relatives_count=rel_count or 0,
                stories_count=stories_count,
                relationships_count=rels_count or 0,
                activated_relatives_count=act_count or 0,
            ))

        return AdminUserListResponseSchema(
            users=users, total=total, skip=skip, limit=limit
        )

    async def _count_user_stories(self, user_id: int) -> int:
        """Подсчёт историй юзера из context JSON"""
        contexts_q = await self.session.execute(
            select(FamilyRelationModel.context).where(
                FamilyRelationModel.user_id == user_id,
                FamilyRelationModel.is_active == True,
                FamilyRelationModel.context.isnot(None)
            )
        )
        count = 0
        for (context,) in contexts_q.all():
            if context and isinstance(context, dict):
                for key, value in context.items():
                    if key == 'interview_messages':
                        continue
                    if isinstance(value, str) or (isinstance(value, dict) and 'text' in value):
                        count += 1
        return count

    # ==================== РОДСТВЕННИКИ ====================

    async def get_user_relatives(
        self, user_id: int
    ) -> List[AdminRelativeListItemSchema]:
        """Родственники конкретного юзера"""
        query = (
            select(FamilyRelationModel, UserModel.username)
            .join(UserModel, FamilyRelationModel.user_id == UserModel.id)
            .where(FamilyRelationModel.user_id == user_id)
            .order_by(FamilyRelationModel.created_at.desc())
        )
        result = await self.session.execute(query)
        rows = result.all()

        items = []
        for relative, owner_username in rows:
            stories_count = 0
            if relative.context and isinstance(relative.context, dict):
                for key, value in relative.context.items():
                    if key == 'interview_messages':
                        continue
                    if isinstance(value, str) or (isinstance(value, dict) and 'text' in value):
                        stories_count += 1

            items.append(AdminRelativeListItemSchema(
                id=relative.id,
                user_id=relative.user_id,
                owner_username=owner_username,
                first_name=relative.first_name,
                last_name=relative.last_name,
                gender=relative.gender.value if relative.gender else None,
                is_active=relative.is_active,
                is_activated=relative.is_activated,
                telegram_user_id=relative.telegram_user_id,
                stories_count=stories_count,
                created_at=relative.created_at,
            ))
        return items

    async def get_all_relatives(
        self,
        skip: int = 0,
        limit: int = 20,
        user_id: Optional[int] = None,
        gender: Optional[str] = None,
        is_activated: Optional[bool] = None,
        has_stories: Optional[bool] = None,
    ) -> AdminAllRelativesResponseSchema:
        """Все родственники на платформе с фильтрами"""
        base_filter = [FamilyRelationModel.is_active == True]

        if user_id is not None:
            base_filter.append(FamilyRelationModel.user_id == user_id)
        if gender is not None:
            base_filter.append(FamilyRelationModel.gender == gender)
        if is_activated is not None:
            base_filter.append(FamilyRelationModel.is_activated == is_activated)

        # Подсчёт total (без has_stories фильтра, т.к. он пост-фильтр)
        count_q = select(func.count()).select_from(FamilyRelationModel).where(*base_filter)
        total_result = await self.session.execute(count_q)

        query = (
            select(FamilyRelationModel, UserModel.username)
            .join(UserModel, FamilyRelationModel.user_id == UserModel.id)
            .where(*base_filter)
            .order_by(FamilyRelationModel.created_at.desc())
        )

        # Если has_stories фильтр — загружаем всё и фильтруем в Python
        if has_stories is not None:
            result = await self.session.execute(query)
            all_rows = result.all()

            filtered = []
            for relative, owner_username in all_rows:
                stories_count = 0
                if relative.context and isinstance(relative.context, dict):
                    for key, value in relative.context.items():
                        if key == 'interview_messages':
                            continue
                        if isinstance(value, str) or (isinstance(value, dict) and 'text' in value):
                            stories_count += 1

                if has_stories and stories_count == 0:
                    continue
                if not has_stories and stories_count > 0:
                    continue

                filtered.append((relative, owner_username, stories_count))

            total = len(filtered)
            page_items = filtered[skip:skip + limit]
        else:
            total = (total_result.scalar() or 0)
            query = query.offset(skip).limit(limit)
            result = await self.session.execute(query)
            rows = result.all()
            page_items = []
            for relative, owner_username in rows:
                stories_count = 0
                if relative.context and isinstance(relative.context, dict):
                    for key, value in relative.context.items():
                        if key == 'interview_messages':
                            continue
                        if isinstance(value, str) or (isinstance(value, dict) and 'text' in value):
                            stories_count += 1
                page_items.append((relative, owner_username, stories_count))

        items = []
        for relative, owner_username, stories_count in page_items:
            items.append(AdminRelativeListItemSchema(
                id=relative.id,
                user_id=relative.user_id,
                owner_username=owner_username,
                first_name=relative.first_name,
                last_name=relative.last_name,
                gender=relative.gender.value if relative.gender else None,
                is_active=relative.is_active,
                is_activated=relative.is_activated,
                telegram_user_id=relative.telegram_user_id,
                stories_count=stories_count,
                created_at=relative.created_at,
            ))

        return AdminAllRelativesResponseSchema(
            relatives=items, total=total, skip=skip, limit=limit
        )

    # ==================== ИСТОРИИ ====================

    async def get_all_stories(
        self,
        skip: int = 0,
        limit: int = 20,
        user_id: Optional[int] = None,
    ) -> List[AdminStoryItemSchema]:
        """Все истории на платформе"""
        query = (
            select(FamilyRelationModel, UserModel.username)
            .join(UserModel, FamilyRelationModel.user_id == UserModel.id)
            .where(
                FamilyRelationModel.is_active == True,
                FamilyRelationModel.context.isnot(None),
            )
        )
        if user_id is not None:
            query = query.where(FamilyRelationModel.user_id == user_id)

        query = query.order_by(FamilyRelationModel.updated_at.desc())
        result = await self.session.execute(query)
        rows = result.all()

        stories = []
        for relative, owner_username in rows:
            if not relative.context or not isinstance(relative.context, dict):
                continue
            for key, value in relative.context.items():
                if key == 'interview_messages':
                    continue

                text = ''
                media_count = 0
                media_urls = []
                created_at = None

                if isinstance(value, str):
                    text = value
                elif isinstance(value, dict) and 'text' in value:
                    text = value['text']
                    media_list = value.get('media', [])
                    media_count = len(media_list)
                    for media_item in media_list:
                        if isinstance(media_item, dict) and media_item.get('url'):
                            media_urls.append(media_item['url'])
                        elif isinstance(media_item, str):
                            media_urls.append(media_item)
                    created_at = value.get('created_at')
                else:
                    continue

                relative_name = ' '.join(
                    filter(None, [relative.first_name, relative.last_name])
                ) or f'Родственник #{relative.id}'

                stories.append(AdminStoryItemSchema(
                    relative_id=relative.id,
                    relative_name=relative_name,
                    owner_username=owner_username,
                    user_id=relative.user_id,
                    story_key=key,
                    story_text=text[:200] if text else '',
                    media_count=media_count,
                    media_urls=media_urls,
                    created_at=created_at,
                ))

        # Ручная пагинация (т.к. истории вложены в JSON)
        return stories[skip:skip + limit]

    async def delete_story(self, relative_id: int, story_key: str) -> bool:
        """Удалить историю по ключу"""
        result = await self.session.execute(
            select(FamilyRelationModel).where(FamilyRelationModel.id == relative_id)
        )
        relative = result.scalar_one_or_none()
        if not relative:
            return False

        context = relative.context or {}
        if story_key not in context:
            return False

        del context[story_key]
        relative.context = context
        flag_modified(relative, 'context')
        await self.session.flush()
        return True

    # ==================== ДЕРЕВО ====================

    async def get_user_tree(self, user_id: int) -> dict:
        """Получить дерево пользователя для read-only просмотра админом"""
        # Проверяем, что user существует
        user_q = await self.session.execute(
            select(UserModel).where(UserModel.id == user_id)
        )
        user = user_q.scalar_one_or_none()
        if not user:
            return {"relatives": [], "relationships": []}

        # Родственники
        relatives_q = await self.session.execute(
            select(FamilyRelationModel).where(
                FamilyRelationModel.user_id == user_id,
                FamilyRelationModel.is_active == True
            )
        )
        relatives = relatives_q.scalars().all()

        # Связи
        relationships_q = await self.session.execute(
            select(FamilyRelationshipModel).where(
                FamilyRelationshipModel.user_id == user_id,
                FamilyRelationshipModel.is_active == True
            )
        )
        relationships = relationships_q.scalars().all()

        relatives_data = []
        for r in relatives:
            relatives_data.append({
                "id": r.id,
                "user_id": r.user_id,
                "first_name": r.first_name,
                "middle_name": r.middle_name,
                "last_name": r.last_name,
                "gender": r.gender.value if r.gender else None,
                "birth_date": r.birth_date.isoformat() if r.birth_date else None,
                "death_date": r.death_date.isoformat() if r.death_date else None,
                "image_url": r.image_url,
                "generation": r.generation,
                "is_activated": r.is_activated,
                "is_active": r.is_active,
            })

        relationships_data = []
        for rel in relationships:
            relationships_data.append({
                "id": rel.id,
                "user_id": rel.user_id,
                "from_relative_id": rel.from_relative_id,
                "to_relative_id": rel.to_relative_id,
                "relationship_type": rel.relationship_type.value if rel.relationship_type else None,
                "is_active": rel.is_active,
            })

        return {
            "relatives": relatives_data,
            "relationships": relationships_data,
        }

    # ==================== СБРОС ПАРОЛЯ ====================

    async def reset_user_password(self, user_id: int, new_password: str) -> bool:
        """Сбросить пароль пользователя"""
        from src.users.security import hash_password

        result = await self.session.execute(
            select(UserModel).where(UserModel.id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            return False

        user.password = await hash_password(new_password)
        await self.session.flush()
        return True

    # ==================== TELEGRAM ====================

    async def get_telegram_stats(self) -> AdminTelegramStatsSchema:
        """Статистика Telegram"""
        # Активированные
        activated_q = await self.session.execute(
            select(func.count()).select_from(FamilyRelationModel).where(
                FamilyRelationModel.is_activated == True
            )
        )
        total_activated = activated_q.scalar() or 0

        # Приглашения отправлены
        invitations_q = await self.session.execute(
            select(func.count()).select_from(FamilyRelationModel).where(
                FamilyRelationModel.invitation_token.isnot(None)
            )
        )
        total_invitations = invitations_q.scalar() or 0

        # Ожидающие активации (token есть, но не активированы)
        pending_q = await self.session.execute(
            select(func.count()).select_from(FamilyRelationModel).where(
                FamilyRelationModel.invitation_token.isnot(None),
                FamilyRelationModel.is_activated == False
            )
        )
        total_pending = pending_q.scalar() or 0

        # Загружаем всех с context для подсчёта интервью и историй
        interviews_q = await self.session.execute(
            select(FamilyRelationModel, UserModel.username)
            .join(UserModel, FamilyRelationModel.user_id == UserModel.id)
            .where(
                FamilyRelationModel.is_activated == True,
                FamilyRelationModel.context.isnot(None),
            )
        )
        rows = interviews_q.all()

        total_with_interviews = 0
        stories_via_bot = 0
        active_interviews = []

        for relative, owner_username in rows:
            context = relative.context or {}
            messages = context.get('interview_messages', [])

            has_interview = bool(messages)
            if has_interview:
                total_with_interviews += 1

            # Считаем истории через бот: если есть interview_messages И есть другие story-ключи
            for key, value in context.items():
                if key == 'interview_messages':
                    continue
                if isinstance(value, str) or (isinstance(value, dict) and 'text' in value):
                    if has_interview:
                        stories_via_bot += 1

            if not messages:
                continue

            relative_name = ' '.join(
                filter(None, [relative.first_name, relative.last_name])
            ) or f'Родственник #{relative.id}'

            last_message_at = None
            if messages and isinstance(messages[-1], dict):
                last_message_at = messages[-1].get('timestamp')

            active_interviews.append(AdminActiveInterviewSchema(
                relative_id=relative.id,
                name=relative_name,
                owner_username=owner_username,
                messages_count=len(messages),
                last_message_at=last_message_at,
            ))

        # Сортируем по кол-ву сообщений
        active_interviews.sort(key=lambda x: x.messages_count, reverse=True)

        # Общее количество историй для вычисления stories_manually
        all_contexts_q = await self.session.execute(
            select(FamilyRelationModel.context).where(
                FamilyRelationModel.is_active == True,
                FamilyRelationModel.context.isnot(None)
            )
        )
        total_stories = 0
        for (ctx,) in all_contexts_q.all():
            if ctx and isinstance(ctx, dict):
                for key, value in ctx.items():
                    if key == 'interview_messages':
                        continue
                    if isinstance(value, str) or (isinstance(value, dict) and 'text' in value):
                        total_stories += 1

        stories_manually = max(0, total_stories - stories_via_bot)

        return AdminTelegramStatsSchema(
            total_activated=total_activated,
            total_invitations_sent=total_invitations,
            total_with_interviews=total_with_interviews,
            total_pending_invitations=total_pending,
            stories_via_bot=stories_via_bot,
            stories_manually=stories_manually,
            active_interviews=active_interviews[:20],
        )

    # ==================== АУДИТ ====================

    async def get_audit_logs(
        self,
        skip: int = 0,
        limit: int = 20,
        action: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> AdminAuditLogResponseSchema:
        """Просмотр аудит-логов"""
        filters = []
        if action:
            filters.append(AdminAuditLogModel.action == action)
        if date_from:
            filters.append(AdminAuditLogModel.created_at >= date_from)
        if date_to:
            filters.append(AdminAuditLogModel.created_at <= date_to)

        count_q = select(func.count()).select_from(AdminAuditLogModel)
        if filters:
            count_q = count_q.where(*filters)
        total = (await self.session.execute(count_q)).scalar() or 0

        query = select(AdminAuditLogModel)
        if filters:
            query = query.where(*filters)
        query = query.order_by(AdminAuditLogModel.created_at.desc()).offset(skip).limit(limit)

        result = await self.session.execute(query)
        logs = result.scalars().all()

        items = [
            AdminAuditLogItemSchema(
                id=log.id,
                admin_user_id=log.admin_user_id,
                action=log.action,
                target_type=log.target_type,
                target_id=log.target_id,
                ip_address=log.ip_address,
                details=log.details,
                created_at=log.created_at,
            )
            for log in logs
        ]

        return AdminAuditLogResponseSchema(items=items, total=total, skip=skip, limit=limit)

    # ==================== AI USAGE ====================

    async def get_ai_usage(
        self,
        skip: int = 0,
        limit: int = 20,
        user_id: Optional[int] = None,
        endpoint_type: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> AIUsageLogResponseSchema:
        """Получить логи использования AI"""
        filters = []
        if user_id:
            filters.append(AIUsageLogModel.user_id == user_id)
        if endpoint_type:
            filters.append(AIUsageLogModel.endpoint_type == endpoint_type)
        if date_from:
            filters.append(AIUsageLogModel.created_at >= date_from)
        if date_to:
            filters.append(AIUsageLogModel.created_at <= date_to)

        count_q = select(func.count()).select_from(AIUsageLogModel)
        if filters:
            count_q = count_q.where(*filters)
        total = (await self.session.execute(count_q)).scalar() or 0

        query = select(AIUsageLogModel)
        if filters:
            query = query.where(*filters)
        query = query.order_by(AIUsageLogModel.created_at.desc()).offset(skip).limit(limit)

        result = await self.session.execute(query)
        logs = result.scalars().all()

        items = [
            AIUsageLogItemSchema(
                id=log.id,
                user_id=log.user_id,
                model=log.model,
                prompt_tokens=log.prompt_tokens,
                completion_tokens=log.completion_tokens,
                total_tokens=log.total_tokens,
                endpoint_type=log.endpoint_type,
                error_message=log.error_message,
                created_at=log.created_at,
            )
            for log in logs
        ]

        return AIUsageLogResponseSchema(items=items, total=total, skip=skip, limit=limit)

    async def get_ai_stats(self) -> AIUsageStatsSchema:
        """Агрегированная статистика AI usage"""
        total_q = await self.session.execute(
            select(
                func.count().label('total_calls'),
                func.coalesce(func.sum(AIUsageLogModel.total_tokens), 0).label('total_tokens'),
                func.coalesce(func.sum(AIUsageLogModel.prompt_tokens), 0).label('total_prompt'),
                func.coalesce(func.sum(AIUsageLogModel.completion_tokens), 0).label('total_completion'),
            ).select_from(AIUsageLogModel)
        )
        row = total_q.one()

        errors_q = await self.session.execute(
            select(func.count()).select_from(AIUsageLogModel).where(
                AIUsageLogModel.error_message.isnot(None)
            )
        )
        errors_count = errors_q.scalar() or 0

        # Разбивка по типам
        types_q = await self.session.execute(
            select(
                AIUsageLogModel.endpoint_type,
                func.count().label('cnt')
            ).group_by(AIUsageLogModel.endpoint_type)
        )
        calls_by_type = {t: c for t, c in types_q.all()}

        # Примерная стоимость (GPT-4o: ~$2.5/1M input, ~$10/1M output; GPT-4o-mini: ~$0.15/1M input, ~$0.6/1M output)
        # Используем средний тариф ~$5/1M tokens для приблизительной оценки
        total_tokens = int(row.total_tokens)
        estimated_cost = round(total_tokens / 1_000_000 * 5.0, 4)

        return AIUsageStatsSchema(
            total_calls=int(row.total_calls),
            total_tokens=total_tokens,
            total_prompt_tokens=int(row.total_prompt),
            total_completion_tokens=int(row.total_completion),
            estimated_cost_usd=estimated_cost,
            errors_count=errors_count,
            calls_by_type=calls_by_type,
        )

    # ==================== КНИГИ ====================

    async def get_books(
        self,
        skip: int = 0,
        limit: int = 20,
        user_id: Optional[int] = None,
    ) -> BookGenerationListResponseSchema:
        """Список сгенерированных книг"""
        filters = []
        if user_id:
            filters.append(BookGenerationModel.user_id == user_id)

        count_q = select(func.count()).select_from(BookGenerationModel)
        if filters:
            count_q = count_q.where(*filters)
        total = (await self.session.execute(count_q)).scalar() or 0

        query = select(BookGenerationModel)
        if filters:
            query = query.where(*filters)
        query = query.order_by(BookGenerationModel.created_at.desc()).offset(skip).limit(limit)

        result = await self.session.execute(query)
        books = result.scalars().all()

        items = [
            BookGenerationItemSchema(
                id=b.id,
                user_id=b.user_id,
                status=b.status,
                filename=b.filename,
                s3_key=b.s3_key,
                s3_url=b.s3_url,
                file_size_bytes=b.file_size_bytes,
                error_message=b.error_message,
                created_at=b.created_at,
                completed_at=b.completed_at,
            )
            for b in books
        ]

        return BookGenerationListResponseSchema(items=items, total=total, skip=skip, limit=limit)

    async def delete_book(self, book_id: int) -> Optional[str]:
        """Удалить запись книги. Возвращает s3_url для удаления из S3 или None"""
        result = await self.session.execute(
            select(BookGenerationModel).where(BookGenerationModel.id == book_id)
        )
        book = result.scalar_one_or_none()
        if not book:
            return None

        s3_url = book.s3_url
        await self.session.delete(book)
        await self.session.flush()
        return s3_url or ""

    # ==================== ГРАФИКИ ====================

    async def get_dashboard_charts(self) -> DashboardChartsSchema:
        """Данные для графиков дашборда (30 дней)"""
        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)

        # Регистрации по дням
        reg_q = await self.session.execute(
            select(
                cast(UserModel.created_at, Date).label('day'),
                func.count().label('cnt')
            )
            .where(UserModel.created_at >= thirty_days_ago)
            .group_by(cast(UserModel.created_at, Date))
            .order_by(cast(UserModel.created_at, Date))
        )
        registrations = [
            DayDataPointSchema(date=str(day), count=cnt)
            for day, cnt in reg_q.all()
        ]

        # Активные юзеры по дням (по updated_at родственников)
        active_q = await self.session.execute(
            select(
                cast(FamilyRelationModel.updated_at, Date).label('day'),
                func.count(func.distinct(FamilyRelationModel.user_id)).label('cnt')
            )
            .where(
                FamilyRelationModel.updated_at >= thirty_days_ago,
                FamilyRelationModel.is_active == True
            )
            .group_by(cast(FamilyRelationModel.updated_at, Date))
            .order_by(cast(FamilyRelationModel.updated_at, Date))
        )
        active_users = [
            DayDataPointSchema(date=str(day), count=cnt)
            for day, cnt in active_q.all()
        ]

        return DashboardChartsSchema(
            registrations_by_day=registrations,
            active_users_by_day=active_users,
        )
