"""Contact form routes."""
import json
import os
from datetime import datetime, timezone
from typing import List

import boto3
from fastapi import APIRouter, HTTPException, Query

from models.contact import ContactCreate, Contact

router = APIRouter()

@router.post("/contact", response_model=Contact, status_code=201)
async def create_contact(payload: ContactCreate):
    contacts_table_name = os.environ.get("CONTACTS_TABLE")
    if not contacts_table_name:
        raise HTTPException(status_code=500, detail="CONTACTS_TABLE environment variable is required")

    sns_topic_arn = os.environ.get("SNS_TOPIC_ARN")
    contacts_table = boto3.resource("dynamodb").Table(contacts_table_name)

    contact = Contact(**payload.model_dump())
    item = contact.model_dump(exclude_none=True)
    item["createdAt"] = contact.createdAt.isoformat()

    contacts_table.put_item(Item=item)

    if sns_topic_arn:
        boto3.client("sns").publish(
            TopicArn=sns_topic_arn,
            Subject=f"New PlaySharp Contact: {contact.name}",
            Message=json.dumps(item, indent=2),
        )

    return contact


@router.get("/contact", response_model=List[Contact])
async def list_contacts(limit: int = Query(200, ge=1, le=500)):
    contacts_table_name = os.environ.get("CONTACTS_TABLE")
    if not contacts_table_name:
        raise HTTPException(status_code=500, detail="CONTACTS_TABLE environment variable is required")

    contacts_table = boto3.resource("dynamodb").Table(contacts_table_name)
    result = contacts_table.scan(Limit=limit)
    items = result.get("Items", [])
    return [Contact(**item) for item in items]
