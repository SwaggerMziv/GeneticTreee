"""
CLI-утилита для назначения суперюзера.

Использование:
    cd backend
    python -m src.admin.cli <username>

Примеры:
    python -m src.admin.cli admin          # Назначить admin суперюзером
    python -m src.admin.cli admin --remove # Снять права суперюзера
"""
import asyncio
import sys

from sqlalchemy import select, update
from src.database.client import async_session
from src.users.models import UserModel
from src.family.models import FamilyRelationModel, FamilyRelationshipModel  # noqa: F401 — нужен для SQLAlchemy mapper


async def set_superuser(username: str, is_superuser: bool = True):
    async with async_session() as session:
        result = await session.execute(
            select(UserModel).where(UserModel.username == username)
        )
        user = result.scalar_one_or_none()

        if not user:
            print(f"Пользователь '{username}' не найден.")
            print("\nСуществующие пользователи:")
            all_users = await session.execute(
                select(UserModel.id, UserModel.username, UserModel.email, UserModel.is_superuser)
            )
            for uid, uname, email, is_su in all_users.all():
                marker = " [ADMIN]" if is_su else ""
                print(f"  #{uid} {uname} ({email or 'нет email'}){marker}")
            return False

        if user.is_superuser == is_superuser:
            status = "уже является суперюзером" if is_superuser else "уже не является суперюзером"
            print(f"Пользователь '{username}' {status}.")
            return True

        await session.execute(
            update(UserModel)
            .where(UserModel.id == user.id)
            .values(is_superuser=is_superuser)
        )
        await session.commit()

        action = "назначен суперюзером" if is_superuser else "лишён прав суперюзера"
        print(f"Пользователь '{username}' (ID: {user.id}) {action}.")
        return True


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    username = sys.argv[1]
    remove = "--remove" in sys.argv

    asyncio.run(set_superuser(username, is_superuser=not remove))


if __name__ == "__main__":
    main()
