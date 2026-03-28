"""
imports.py — Router
--------------------
v2.0.0 — Bank statement import endpoints.

Endpoints:
  POST /import/upload          → parse file, return preview
  POST /import/confirm         → confirm and bulk-create expenses
  GET  /income-sources         → list user-defined income sources
  POST /income-sources         → create income source
  PUT  /income-sources/{id}    → update income source
  DELETE /income-sources/{id}  → delete income source
"""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session, select

from app.database import get_session
from app.models import IncomeSource
from app.schemas import (
    ImportConfirmRequest,
    ImportConfirmResponse,
    ImportPreviewResponse,
    IncomeSourceCreate,
    IncomeSourceRead,
    IncomeSourceUpdate,
)
from app.services.import_service import confirm_import, parse_and_preview

router = APIRouter(tags=["Import"])

# ---------------------------------------------------------------------------
# File Upload & Preview
# ---------------------------------------------------------------------------

@router.post(
    "/import/upload",
    response_model=ImportPreviewResponse,
    summary="Upload bank statement (PDF or CSV) and get a preview",
)
async def upload_bank_statement(
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
):
    """
    Accepts a Canara Bank PDF or a generic CSV bank statement.
    Parses transactions, classifies each one (expense / income / investment /
    transfer), checks for duplicates, and returns a preview for user review.

    The returned `session_id` must be sent with the confirm request.
    """
    allowed = {".pdf", ".csv"}
    suffix = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if suffix not in allowed:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{suffix}'. Upload a .pdf or .csv file.",
        )

    max_bytes = 20 * 1024 * 1024  # 20 MB
    file_bytes = await file.read()
    if len(file_bytes) > max_bytes:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 20 MB.")
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        preview = parse_and_preview(
            filename=file.filename,
            file_bytes=file_bytes,
            db=db,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse file: {exc}",
        )

    return preview


# ---------------------------------------------------------------------------
# Confirm Import
# ---------------------------------------------------------------------------

@router.post(
    "/import/confirm",
    response_model=ImportConfirmResponse,
    summary="Confirm import — bulk-create expense records",
)
def confirm_bank_import(
    request: ImportConfirmRequest,
    db: Session = Depends(get_session),
):
    """
    Receives the user's reviewed/edited row list and the session_id from the
    upload step. Creates Expense rows for all non-skipped, non-transfer rows.
    Sessions expire after 30 minutes.
    """
    try:
        result = confirm_import(request=request, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Import failed: {exc}",
        )
    return result


# ---------------------------------------------------------------------------
# Income Sources CRUD
# ---------------------------------------------------------------------------

@router.get(
    "/income-sources",
    response_model=list[IncomeSourceRead],
    summary="List all user-defined income sources",
)
def list_income_sources(db: Session = Depends(get_session)):
    """Returns all income sources, ordered by name."""
    sources = db.exec(select(IncomeSource).order_by(IncomeSource.name)).all()
    return sources


@router.post(
    "/income-sources",
    response_model=IncomeSourceRead,
    status_code=201,
    summary="Create an income source",
)
def create_income_source(
    data: IncomeSourceCreate,
    db: Session = Depends(get_session),
):
    """
    Define a recurring income sender (tenant, employer, client).
    The sender_keyword is stored upper-case and matched against bank descriptions
    during future imports.
    """
    source = IncomeSource(
        name=data.name,
        source_type=data.source_type,
        sender_keyword=data.sender_keyword.upper(),
        expected_amount=data.expected_amount,
        expected_day=data.expected_day,
        category_id=data.category_id,
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


@router.put(
    "/income-sources/{source_id}",
    response_model=IncomeSourceRead,
    summary="Update an income source",
)
def update_income_source(
    source_id: int,
    data: IncomeSourceUpdate,
    db: Session = Depends(get_session),
):
    source = db.get(IncomeSource, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Income source not found")

    if data.name is not None:
        source.name = data.name
    if data.source_type is not None:
        source.source_type = data.source_type
    if data.sender_keyword is not None:
        source.sender_keyword = data.sender_keyword.upper()
    if data.expected_amount is not None:
        source.expected_amount = data.expected_amount
    if data.expected_day is not None:
        source.expected_day = data.expected_day
    if data.category_id is not None:
        source.category_id = data.category_id

    db.add(source)
    db.commit()
    db.refresh(source)
    return source


@router.delete(
    "/income-sources/{source_id}",
    status_code=204,
    summary="Delete an income source",
)
def delete_income_source(
    source_id: int,
    db: Session = Depends(get_session),
):
    source = db.get(IncomeSource, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Income source not found")
    db.delete(source)
    db.commit()
