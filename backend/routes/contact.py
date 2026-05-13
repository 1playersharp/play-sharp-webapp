"""Contact form routes."""
from typing import List

from fastapi import APIRouter, Query

from models.contact import ContactCreate, Contact
from services.mongodb import contacts_collection

router = APIRouter()


@router.post("/contact", response_model=Contact, status_code=201)
async def create_contact(payload: ContactCreate):
    contact = Contact(**payload.model_dump())
    item = contact.model_dump(exclude_none=True)
    item["createdAt"] = contact.createdAt.isoformat()

    contacts_collection.insert_one(item)
    return contact


@router.get("/contact", response_model=List[Contact])
async def list_contacts(limit: int = Query(200, ge=1, le=500)):
    cursor = contacts_collection.find().limit(limit)
    items = []
    for item in cursor:
        item.pop("_id", None)
        items.append(Contact(**item))
    return items
