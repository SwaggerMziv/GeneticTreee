"""Сервис интеграции с ЮKassa"""

import uuid
from yookassa import Configuration, Payment as YooPayment
from yookassa.domain.response import PaymentResponse

from src.config import settings
from src.subscription.enums import PlanType, BillingPeriod
from src.subscription.repository import SubscriptionPlanRepository, PaymentRepository
from src.subscription.exceptions import PlanNotFoundError, PaymentFailedError
from src.core.logger import get_logger

logger = get_logger(__name__)


def _configure_yookassa():
    """Инициализация SDK ЮKassa"""
    Configuration.account_id = settings.yookassa_shop_id
    Configuration.secret_key = settings.yookassa_secret_key


class PaymentService:
    def __init__(
        self,
        plan_repo: SubscriptionPlanRepository,
        payment_repo: PaymentRepository,
    ):
        self.plan_repo = plan_repo
        self.payment_repo = payment_repo
        _configure_yookassa()

    async def create_checkout(
        self,
        user_id: int,
        plan_name: PlanType,
        billing_period: BillingPeriod,
        return_url: str,
    ) -> dict:
        """Создать платёж в ЮKassa и вернуть URL для оплаты"""
        plan = await self.plan_repo.get_by_name(plan_name)
        if not plan:
            raise PlanNotFoundError(plan_name=plan_name.value)

        if plan_name == PlanType.FREE:
            raise PaymentFailedError("Нельзя оплатить бесплатный тариф")

        # Определяем сумму
        if billing_period == BillingPeriod.YEARLY:
            amount_kop = plan.price_yearly_kop
            period_label = "год"
        else:
            amount_kop = plan.price_monthly_kop
            period_label = "месяц"

        amount_rub = f"{amount_kop / 100:.2f}"
        description = f"Подписка {plan.display_name} на {period_label}"

        idempotency_key = str(uuid.uuid4())

        try:
            payment: PaymentResponse = YooPayment.create(
                {
                    "amount": {
                        "value": amount_rub,
                        "currency": "RUB",
                    },
                    "confirmation": {
                        "type": "redirect",
                        "return_url": return_url,
                    },
                    "capture": True,
                    "description": description,
                    "metadata": {
                        "user_id": str(user_id),
                        "plan_name": plan_name.value,
                        "billing_period": billing_period.value,
                    },
                },
                idempotency_key,
            )
        except Exception as e:
            logger.error(f"Ошибка создания платежа ЮKassa: {e}")
            raise PaymentFailedError(str(e))

        # Сохраняем платёж в БД
        await self.payment_repo.create(
            user_id=user_id,
            amount_kop=amount_kop,
            yookassa_payment_id=payment.id,
            yookassa_status=payment.status,
            description=description,
            extra_data={
                "plan_name": plan_name.value,
                "billing_period": billing_period.value,
            },
        )

        confirmation_url = payment.confirmation.confirmation_url

        logger.info(
            f"Платёж создан: user={user_id}, plan={plan_name.value}, "
            f"amount={amount_rub} RUB, yookassa_id={payment.id}"
        )

        return {
            "payment_id": payment.id,
            "confirmation_url": confirmation_url,
            "amount_kop": amount_kop,
        }

    async def create_recurring_payment(
        self,
        user_id: int,
        plan_name: PlanType,
        billing_period: BillingPeriod,
        payment_method_id: str,
    ) -> dict | None:
        """Создать рекуррентный платёж (автосписание)"""
        plan = await self.plan_repo.get_by_name(plan_name)
        if not plan:
            return None

        if billing_period == BillingPeriod.YEARLY:
            amount_kop = plan.price_yearly_kop
        else:
            amount_kop = plan.price_monthly_kop

        amount_rub = f"{amount_kop / 100:.2f}"
        description = f"Автопродление подписки {plan.display_name}"

        idempotency_key = str(uuid.uuid4())

        try:
            payment: PaymentResponse = YooPayment.create(
                {
                    "amount": {
                        "value": amount_rub,
                        "currency": "RUB",
                    },
                    "capture": True,
                    "payment_method_id": payment_method_id,
                    "description": description,
                    "metadata": {
                        "user_id": str(user_id),
                        "plan_name": plan_name.value,
                        "billing_period": billing_period.value,
                        "recurring": "true",
                    },
                },
                idempotency_key,
            )
        except Exception as e:
            logger.error(f"Ошибка рекуррентного платежа: user={user_id}, error={e}")
            return None

        await self.payment_repo.create(
            user_id=user_id,
            amount_kop=amount_kop,
            yookassa_payment_id=payment.id,
            yookassa_status=payment.status,
            description=description,
            extra_data={
                "plan_name": plan_name.value,
                "billing_period": billing_period.value,
                "recurring": True,
            },
        )

        logger.info(
            f"Рекуррентный платёж создан: user={user_id}, yookassa_id={payment.id}"
        )
        return {"payment_id": payment.id, "status": payment.status}
