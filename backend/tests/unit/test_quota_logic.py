"""Unit тесты для QuotaService — логика квот без БД."""
import pytest
from unittest.mock import AsyncMock, MagicMock

from src.subscription.quota_service import QuotaService
from src.subscription.enums import QuotaResource, PlanType
from src.subscription.exceptions import QuotaExceededError
from tests.factories import make_plan, make_quota


@pytest.mark.unit
class TestGetUserPlan:
    async def test_active_subscription_returns_plan(self):
        plan = make_plan(name=PlanType.PRO)
        sub = MagicMock()
        sub.plan = plan

        sub_repo = AsyncMock()
        sub_repo.get_active_by_user.return_value = sub

        svc = QuotaService(AsyncMock(), sub_repo, AsyncMock(), AsyncMock())
        result = await svc.get_user_plan(1)
        assert result.name == PlanType.PRO

    async def test_no_subscription_returns_free(self):
        free_plan = make_plan(name=PlanType.FREE)

        sub_repo = AsyncMock()
        sub_repo.get_active_by_user.return_value = None

        plan_repo = AsyncMock()
        plan_repo.get_by_name.return_value = free_plan

        svc = QuotaService(plan_repo, sub_repo, AsyncMock(), AsyncMock())
        result = await svc.get_user_plan(1)
        assert result.name == PlanType.FREE

    async def test_free_plan_not_found_raises(self):
        sub_repo = AsyncMock()
        sub_repo.get_active_by_user.return_value = None

        plan_repo = AsyncMock()
        plan_repo.get_by_name.return_value = None

        svc = QuotaService(plan_repo, sub_repo, AsyncMock(), AsyncMock())
        with pytest.raises(RuntimeError, match="FREE"):
            await svc.get_user_plan(1)


@pytest.mark.unit
class TestCheckQuota:
    def _make_service(self, plan=None, quota=None):
        plan = plan or make_plan()
        quota = quota or make_quota()
        sub_repo = AsyncMock()
        sub_repo.get_active_by_user.return_value = None
        plan_repo = AsyncMock()
        plan_repo.get_by_name.return_value = plan
        quota_repo = AsyncMock()
        quota_repo.get_current.return_value = quota
        return QuotaService(plan_repo, sub_repo, quota_repo, AsyncMock())

    async def test_unlimited_returns_true(self):
        plan = make_plan(max_ai_requests_month=-1)
        svc = self._make_service(plan=plan)
        assert await svc.check_quota(1, QuotaResource.AI_REQUESTS) is True

    async def test_zero_limit_returns_false(self):
        plan = make_plan(max_book_generations_month=0)
        svc = self._make_service(plan=plan)
        assert await svc.check_quota(1, QuotaResource.BOOK_GENERATIONS) is False

    async def test_under_limit_returns_true(self):
        plan = make_plan(max_ai_requests_month=10)
        quota = make_quota(ai_requests_used=5)
        svc = self._make_service(plan=plan, quota=quota)
        assert await svc.check_quota(1, QuotaResource.AI_REQUESTS) is True

    async def test_at_limit_returns_false(self):
        plan = make_plan(max_ai_requests_month=10)
        quota = make_quota(ai_requests_used=10)
        svc = self._make_service(plan=plan, quota=quota)
        assert await svc.check_quota(1, QuotaResource.AI_REQUESTS) is False

    async def test_over_limit_returns_false(self):
        plan = make_plan(max_ai_requests_month=10)
        quota = make_quota(ai_requests_used=15)
        svc = self._make_service(plan=plan, quota=quota)
        assert await svc.check_quota(1, QuotaResource.AI_REQUESTS) is False


@pytest.mark.unit
class TestEnforceQuota:
    def _make_service(self, plan=None, quota=None):
        plan = plan or make_plan()
        quota = quota or make_quota()
        sub_repo = AsyncMock()
        sub_repo.get_active_by_user.return_value = None
        plan_repo = AsyncMock()
        plan_repo.get_by_name.return_value = plan
        quota_repo = AsyncMock()
        quota_repo.get_current.return_value = quota
        return QuotaService(plan_repo, sub_repo, quota_repo, AsyncMock())

    async def test_enforce_pass(self):
        plan = make_plan(max_ai_requests_month=10)
        quota = make_quota(ai_requests_used=5)
        svc = self._make_service(plan=plan, quota=quota)
        await svc.enforce_quota(1, QuotaResource.AI_REQUESTS)  # не бросает

    async def test_enforce_raises_at_limit(self):
        plan = make_plan(max_ai_requests_month=10)
        quota = make_quota(ai_requests_used=10)
        svc = self._make_service(plan=plan, quota=quota)
        with pytest.raises(QuotaExceededError):
            await svc.enforce_quota(1, QuotaResource.AI_REQUESTS)

    async def test_enforce_unlimited_passes(self):
        plan = make_plan(max_ai_requests_month=-1)
        svc = self._make_service(plan=plan)
        await svc.enforce_quota(1, QuotaResource.AI_REQUESTS)

    async def test_enforce_zero_limit_raises(self):
        plan = make_plan(max_book_generations_month=0)
        svc = self._make_service(plan=plan)
        with pytest.raises(QuotaExceededError):
            await svc.enforce_quota(1, QuotaResource.BOOK_GENERATIONS)


@pytest.mark.unit
class TestIncrementQuota:
    async def test_increment_updates_field(self):
        quota = make_quota(ai_requests_used=5)
        quota_repo = AsyncMock()
        quota_repo.get_current.return_value = quota

        svc = QuotaService(AsyncMock(), AsyncMock(), quota_repo, AsyncMock())
        await svc.increment_quota(1, QuotaResource.AI_REQUESTS)

        quota_repo.update.assert_called_once()
        call_kwargs = quota_repo.update.call_args[1]
        assert call_kwargs["ai_requests_used"] == 6

    async def test_increment_custom_amount(self):
        quota = make_quota(tree_generations_used=2)
        quota_repo = AsyncMock()
        quota_repo.get_current.return_value = quota

        svc = QuotaService(AsyncMock(), AsyncMock(), quota_repo, AsyncMock())
        await svc.increment_quota(1, QuotaResource.TREE_GENERATIONS, amount=3)

        call_kwargs = quota_repo.update.call_args[1]
        assert call_kwargs["tree_generations_used"] == 5


@pytest.mark.unit
class TestStorageLimit:
    async def test_storage_ok(self):
        plan = make_plan(max_storage_mb=100)
        quota = make_quota(storage_used_mb=50)
        sub_repo = AsyncMock()
        sub_repo.get_active_by_user.return_value = None
        plan_repo = AsyncMock()
        plan_repo.get_by_name.return_value = plan
        quota_repo = AsyncMock()
        quota_repo.get_current.return_value = quota

        svc = QuotaService(plan_repo, sub_repo, quota_repo, AsyncMock())
        assert await svc.check_storage_limit(1, 10.0) is True

    async def test_storage_exceeded(self):
        plan = make_plan(max_storage_mb=50)
        quota = make_quota(storage_used_mb=45)
        sub_repo = AsyncMock()
        sub_repo.get_active_by_user.return_value = None
        plan_repo = AsyncMock()
        plan_repo.get_by_name.return_value = plan
        quota_repo = AsyncMock()
        quota_repo.get_current.return_value = quota

        svc = QuotaService(plan_repo, sub_repo, quota_repo, AsyncMock())
        assert await svc.check_storage_limit(1, 10.0) is False

    async def test_storage_unlimited(self):
        plan = make_plan(max_storage_mb=-1)
        sub_repo = AsyncMock()
        sub_repo.get_active_by_user.return_value = None
        plan_repo = AsyncMock()
        plan_repo.get_by_name.return_value = plan

        svc = QuotaService(plan_repo, sub_repo, AsyncMock(), AsyncMock())
        assert await svc.check_storage_limit(1, 999.0) is True


@pytest.mark.unit
class TestGetOrCreateQuota:
    async def test_existing_quota_returned(self):
        quota = make_quota()
        quota_repo = AsyncMock()
        quota_repo.get_current.return_value = quota

        svc = QuotaService(AsyncMock(), AsyncMock(), quota_repo, AsyncMock())
        result = await svc.get_or_create_quota(1)
        assert result == quota
        quota_repo.create.assert_not_called()

    async def test_creates_when_missing(self):
        new_quota = make_quota()
        quota_repo = AsyncMock()
        quota_repo.get_current.return_value = None
        quota_repo.create.return_value = new_quota

        svc = QuotaService(AsyncMock(), AsyncMock(), quota_repo, AsyncMock())
        result = await svc.get_or_create_quota(1)
        assert result == new_quota
        quota_repo.create.assert_called_once()
