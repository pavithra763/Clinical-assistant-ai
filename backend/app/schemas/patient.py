from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID


class PatientCreate(BaseModel):
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None


class PatientResponse(PatientCreate):
    id: UUID

    class Config:
        from_attributes = True