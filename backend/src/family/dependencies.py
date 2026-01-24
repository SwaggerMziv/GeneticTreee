from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.dependencies import get_database_session
from src.family.repository import FamilyRelationRepository, FamilyRelationshipRepository
from src.family.service import FamilyRelationService, FamilyRelationshipService
from src.storage.s3.dependencies import get_s3_manager
from src.storage.s3.manager import S3Manager


async def get_family_relation_repository(session: AsyncSession = Depends(get_database_session)):
    return FamilyRelationRepository(session)

async def get_family_relationship_repository(session: AsyncSession = Depends(get_database_session)):
    return FamilyRelationshipRepository(session)

async def get_family_relation_service(repository: FamilyRelationRepository = Depends(get_family_relation_repository), s3_manager: S3Manager = Depends(get_s3_manager)):
    return FamilyRelationService(repository, s3_manager)

async def get_family_relationship_service(
    relationship_repository: FamilyRelationshipRepository = Depends(get_family_relationship_repository),
    relation_repository: FamilyRelationRepository = Depends(get_family_relation_repository)
):
    return FamilyRelationshipService(relationship_repository, relation_repository)

