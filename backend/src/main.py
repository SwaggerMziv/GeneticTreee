from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import uvicorn
from src.users.router import router as users_router
from src.family.router import router as family_router
from src.exceptions import BaseAppException
from src.auth.router import router as auth_router
from src.core.cors import setup_cors
from src.core.middleware import setup_middleware
from src.core.router import router as core_router
from src.storage.s3.router import router as storage_router
from src.ai.router import router as ai_router
from src.book.router import router as book_router


app = FastAPI(
    title="GenericTree API",
    version="0.0.1",
    description="GenericTree API is a RESTful API for the GenericTree project."
)

@app.exception_handler(BaseAppException)
async def base_app_exception_handler(request: Request, exc: BaseAppException):
    """Обработчик для всех исключений приложения"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "message": exc.message,
            "details": exc.details
        }
    )

app.include_router(users_router)
app.include_router(family_router)
app.include_router(auth_router)
app.include_router(core_router)
app.include_router(storage_router)
app.include_router(ai_router)
app.include_router(book_router)

setup_cors(app)
setup_middleware(app)

