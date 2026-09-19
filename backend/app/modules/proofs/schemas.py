"""
Proof Schemas.
"""

from pydantic import BaseModel


class ProofUploadResponse(BaseModel):
    proof_id: str
    order_id: str
    file_name: str
    mime_type: str
    size_bytes: int
    created_at: str
