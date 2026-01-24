from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.config import settings

def setup_cors(app: FastAPI):
    
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    if settings.allow_origins:
        allowed_origins.extend([origin.strip() for origin in settings.allow_origins.split(",") if origin.strip()])
    
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )