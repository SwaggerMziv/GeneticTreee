from fastapi import APIRouter, Depends, status, Body, Response
from typing import List
from src.users.schemas import (
    UserCreateSchema,
    UserOutputSchema,
    UserUpdateSchema,
)
from src.users.dependencies import get_user_service
from src.users.service import UserService
from src.auth.dependencies import require_superuser
from src.auth.dependencies import get_current_user_id
from src.auth.security import security

router = APIRouter(prefix="/api/v1/users", tags=["Users"])

# Users endpoints
@router.post("/", response_model=UserOutputSchema, status_code=status.HTTP_201_CREATED)
async def create_user(
    user: UserCreateSchema,
    service: UserService = Depends(get_user_service)
):
    return await service.create_user(user)

@router.get("/{user_id}", response_model=UserOutputSchema, dependencies=[Depends(get_current_user_id)])
async def get_user_by_id(
    user_id: int,
    service: UserService = Depends(get_user_service)
):
    return await service.get_user_by_id(user_id)

@router.get("/", response_model=List[UserOutputSchema], dependencies=[Depends(get_current_user_id)])
async def get_users_by_filter(
    skip: int = 0,
    limit: int = 100,
    only_active: bool = True,
    service: UserService = Depends(get_user_service)
):
    return await service.get_all_users(skip, limit, only_active)

@router.patch("/me", response_model=UserOutputSchema, dependencies=[Depends(get_current_user_id)])
async def update_current_user(
    user_id: int = Depends(get_current_user_id),
    user: UserUpdateSchema = Body(...),
    service: UserService = Depends(get_user_service)
):
    return await service.update_user(user_id, user)

@router.put("/{user_id}", response_model=UserOutputSchema, dependencies=[Depends(require_superuser)])
async def update_user_by_id(user_id: int, user: UserUpdateSchema, service: UserService = Depends(get_user_service)):
    return await service.update_user(user_id, user)

@router.patch("/{user_id}/superuser", response_model=UserOutputSchema, dependencies=[Depends(require_superuser)])
async def update_superuser_by_id(
    user_id: int,
    is_superuser: bool,
    service: UserService = Depends(get_user_service)
):
    return await service.update_superuser(user_id, is_superuser)

@router.patch("/{user_id}/activate", response_model=UserOutputSchema, dependencies=[Depends(require_superuser)])
async def activate_user_by_id(
    user_id: int,
    service: UserService = Depends(get_user_service)
):
    return await service.activate_user(user_id)

@router.patch("/{user_id}/deactivate/me", response_model=UserOutputSchema, dependencies=[Depends(get_current_user_id)])
async def deactivate_current_user(
    response: Response,
    user_id: int = Depends(get_current_user_id),
    service: UserService = Depends(get_user_service)
):
    user = await service.deactivate_user(user_id=user_id)
    security.unset_access_cookies(response)
    security.unset_refresh_cookies(response)
    return user


@router.patch("/{user_id}/deactivate", response_model=UserOutputSchema, dependencies=[Depends(require_superuser)])
async def deactivate_user_by_id(
    user_id: int,
    response: Response,
    service: UserService = Depends(get_user_service)
):
    user = await service.deactivate_user(user_id)
    security.unset_access_cookies(response)
    security.unset_refresh_cookies(response)
    return user

@router.delete("/{user_id}", dependencies=[Depends(require_superuser)])
async def delete_user_by_id(
    user_id: int,
    service: UserService = Depends(get_user_service)
):
    return await service.delete_user(user_id)



@router.get("/search/{search_term}", response_model=List[UserOutputSchema], dependencies=[Depends(get_current_user_id)])
async def search_users(
    search_term: str,
    skip: int = 0,
    limit: int = 100,
    service: UserService = Depends(get_user_service)
):
    return await service.search_users(search_term, skip, limit)

