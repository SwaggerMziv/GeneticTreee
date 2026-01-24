from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, Response, FastAPI

class BaseAppMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Можно добавить любой pre-processing здесь
        response: Response = await call_next(request)
        # Можно добавить любой post-processing здесь
        return response

def setup_middleware(app: FastAPI):
    app.add_middleware(BaseAppMiddleware)
