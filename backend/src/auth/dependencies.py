from authx.schema import TokenPayload, RequestToken
from fastapi import Depends, Request, HTTPException, Response
from src.auth.security import security
from src.users.service import UserService
from src.users.dependencies import get_user_service
from src.users.models import UserModel
import logging

# Payload dependencies
async def get_current_payload(request: Request, response: Response) -> TokenPayload:
    """
    Получает payload из access токена, читая его из cookies или headers.
    Если access истёк, пробует refresh из cookies/headers, выдаёт новый access и ставит его в cookies.
    """
    try:
        return await security.access_token_required(request)
    except Exception as e:
        # Попытка авто‑рефреша при истёкшем access
        try:
            refresh_payload = await security.refresh_token_required(request)
        except Exception:
            # Если в cookies нет refresh, пробуем достать refresh из заголовков:
            #  - X-Refresh-Token: <token>
            #  - Authorization: Bearer <refresh> (если фронт передал refresh вместо access)
            refresh_token_header = request.headers.get("x-refresh-token") or ""
            auth_header = request.headers.get("authorization") or ""
            candidate_refresh = ""
            if refresh_token_header:
                candidate_refresh = refresh_token_header
            elif auth_header.startswith("Bearer "):
                candidate_refresh = auth_header.replace("Bearer ", "")

            if not candidate_refresh:
                logging.error(
                    f'Ошибка при получении payload. Cookies: {request.cookies}, Headers: {dict(request.headers)}. '
                    f'Ошибки: access={e}, refresh=refresh token not provided'
                )
                raise HTTPException(status_code=401, detail="Токен не найден или невалиден")

            try:
                request_token = RequestToken(token=candidate_refresh, type='refresh', location='headers')
                refresh_payload = security.verify_token(request_token, verify_type=True, verify_csrf=False)
            except Exception as refresh_error:
                logging.error(
                    f'Ошибка при получении payload. Cookies: {request.cookies}, Headers: {dict(request.headers)}. '
                    f'Ошибки: access={e}, refresh={refresh_error}'
                )
                raise HTTPException(status_code=401, detail="Токен не найден или невалиден")

        new_access = security.create_access_token(uid=refresh_payload.sub)
        security.set_access_cookies(token=new_access, response=response)
        # Декодируем новый access, чтобы вернуть корректный payload
        return security._decode_token(new_access)


async def get_current_user_id(payload: TokenPayload = Depends(get_current_payload)) -> int:
    try:
        return int(payload.sub)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid subject in token") from exc


async def get_current_user(
    user_id: int = Depends(get_current_user_id),
    user_service: UserService = Depends(get_user_service),
) -> UserModel:
    user = await user_service.get_user_by_id(user_id=user_id)
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Пользователь деактивирован")
    return user


# Raw token dependencies
async def get_access_token(request: Request) -> RequestToken:
    return await security.get_access_token_from_request(request)


async def get_refresh_token(request: Request) -> RequestToken:
    return await security.get_refresh_token_from_request(request)


async def require_superuser(user: UserModel = Depends(get_current_user)) -> UserModel:
    if not user.is_superuser:
        raise HTTPException(status_code=403, detail="Требуются права суперпользователя")
    return user