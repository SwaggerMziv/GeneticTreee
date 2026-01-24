from pydantic import BaseModel, Field, ConfigDict


class UploadOutputSchema(BaseModel):
	key: str = Field(..., description='Ключ объекта в S3')
	url: str = Field(description='Публичный URL объекта')
	content_type: str = Field(description='MIME тип загруженного файла')

	model_config = ConfigDict(extra='forbid')

