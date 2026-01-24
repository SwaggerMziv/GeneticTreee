from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from authx.schema import RequestToken, TokenPayload
from typing import Dict
from src.auth.schemas import (
    LoginSchema,
    RefreshSchema,
    LoginResponseSchema,
    AccessTokenResponseSchema,
    LogoutResponseSchema,
    MeResponseSchema,
    TelegramAuthSchema,
)
from src.auth.security import (
    security,
    create_access_token_for_user,
    create_refresh_token_for_user,
    revoke_token,
    get_current_payload,
    verify_telegram_auth,
)
from src.config import settings
from src.users.service import UserService
from src.users.dependencies import get_user_service
from src.auth.dependencies import get_current_user, get_access_token, get_current_user_id, get_refresh_token
from src.users.security import verify_hash_password
from src.users.models import UserModel
from src.users.schemas import UserOutputSchema

router = APIRouter(prefix='/api/v1/auth', tags=['Auth'])


@router.post(
    '/login',
    response_model=LoginResponseSchema,
    response_description='Токены доступа и обновления',
    summary='Вход пользователя и выдача токенов',
)
async def login(payload: LoginSchema, user_service: UserService = Depends(get_user_service)) -> JSONResponse:
    user = None
    try:
        if payload.username is not None:
            user = await user_service.get_user_by_username(username=payload.username)
        elif payload.email is not None:
            user = await user_service.get_user_by_email(email=payload.email)
        else:
            raise HTTPException(status_code=400, detail='Неверные учетные данные')
    except HTTPException:
        raise HTTPException(status_code=401, detail='Неверные учетные данные')

    if not user or not await verify_hash_password(payload.password, user.password):
        raise HTTPException(status_code=401, detail='Неверные учетные данные')

    if not user.is_active:
        raise HTTPException(status_code=403, detail='Пользователь деактивирован')

    access_token = create_access_token_for_user(user_id=user.id)
    refresh_token = create_refresh_token_for_user(user_id=user.id)

    # Если используем cookies, расставим их
    response = JSONResponse(status_code=200, content={'access_token': access_token, 'refresh_token': refresh_token})
    
    security.set_access_cookies(access_token, response)
    security.set_refresh_cookies(refresh_token, response)
    return response


@router.post(
    '/refresh',
    response_model=AccessTokenResponseSchema,
    response_description='Новый access токен',
    summary='Обновление access токена по refresh',
)
async def refresh(request: Request) -> JSONResponse:
    # Пробуем получить refresh token из cookies или headers
    refresh_token = None
    
    # Сначала из cookies
    if "refresh_token" in request.cookies:
        refresh_token = request.cookies["refresh_token"]
    # Затем из заголовка Authorization
    elif "authorization" in request.headers:
        auth_header = request.headers["authorization"]
        if auth_header.startswith("Bearer "):
            refresh_token = auth_header.replace("Bearer ", "")
    
    if not refresh_token:
        raise HTTPException(status_code=401, detail='Refresh token не найден')
    
    try:
        request_token = RequestToken(token=refresh_token, type='refresh', location='headers')
        payload = security.verify_token(request_token, verify_type=True, verify_csrf=False)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f'Неверный refresh token: {str(e)}')

    user_id = int(payload.sub)
    access_token = create_access_token_for_user(user_id=user_id)

    response = JSONResponse(content={'access_token': access_token})
    try:
        security.set_access_cookies(access_token, response)
    except Exception:
        pass
    return response

@router.get(
    '/me',
    response_model=UserOutputSchema,
    response_description='Информация о текущем пользователе',
    summary='Текущий пользователь по access токену',
)
async def me(user: UserModel = Depends(get_current_user)) -> UserOutputSchema:
    return user


@router.get('/me/sub', response_model=MeResponseSchema, dependencies=[Depends(get_current_user_id)])
async def me_sub(user_id: int = Depends(get_current_user_id)) -> MeResponseSchema:
    return MeResponseSchema(sub=user_id)


@router.post(
    '/telegram',
    response_model=LoginResponseSchema,
    response_description='Токены доступа и обновления',
    summary='Вход через Telegram Login Widget',
)
async def telegram_auth(
    payload: TelegramAuthSchema,
    user_service: UserService = Depends(get_user_service)
) -> JSONResponse:
    if not settings.telegram_bot_token:
        raise HTTPException(status_code=503, detail='Telegram аутентификация не настроена')
    
    auth_data = payload.model_dump()

    if not verify_telegram_auth(auth_data.copy(), settings.telegram_bot_token):
        raise HTTPException(status_code=401, detail='Неверные данные от Telegram')

    user = await user_service.get_or_create_telegram_user(
        telegram_id=str(payload.id),
        username=payload.username,
        first_name=payload.first_name
    )

    if not user.is_active:
        raise HTTPException(status_code=403, detail='Пользователь деактивирован')

    access_token = create_access_token_for_user(user_id=user.id)
    refresh_token = create_refresh_token_for_user(user_id=user.id)

    response = JSONResponse(
        status_code=200,
        content={'access_token': access_token, 'refresh_token': refresh_token}
    )

    security.set_access_cookies(access_token, response)
    security.set_refresh_cookies(refresh_token, response)
    return response


@router.delete(
    '/logout',
    response_model=LogoutResponseSchema,
    response_description='Статус выхода',
    summary='Выход и отзыв токена',
    dependencies=[Depends(get_current_user)],
)
async def logout(token = Depends(get_access_token)) -> JSONResponse:
    revoke_token(token.token)
    response = JSONResponse(content={'status': 'OK'})
    try:
        # Уберем куки, если они использовались
        security.unset_access_cookies(response)
        security.unset_refresh_cookies(response)
    except Exception:
        pass
    return response
