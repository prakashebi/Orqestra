import os
import uuid
import shutil
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import uvicorn

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="DocuSphere API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory document store until PostgreSQL is wired up
documents: dict[str, dict] = {}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    doc_id = str(uuid.uuid4())
    dest = UPLOAD_DIR / doc_id / file.filename
    dest.parent.mkdir(parents=True, exist_ok=True)

    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    documents[doc_id] = {
        "id": doc_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "size": dest.stat().st_size,
        "path": str(dest),
    }

    print(f"File uploaded successfully: {file.filename} → {doc_id}")
    return {"id": doc_id, "filename": file.filename}


@app.get("/documents")
def list_documents(
    q: Optional[str] = Query(None, description="Filter by filename substring")
):
    results = list(documents.values())
    if q:
        results = [d for d in results if q.lower() in d["filename"].lower()]
    return results


@app.get("/documents/{doc_id}")
def get_document(doc_id: str):
    doc = documents.get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@app.get("/documents/{doc_id}/download")
def download_document(doc_id: str):
    doc = documents.get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    path = Path(doc["path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(path, filename=doc["filename"], media_type=doc["content_type"])


@app.delete("/documents/{doc_id}", status_code=204)
def delete_document(doc_id: str):
    doc = documents.pop(doc_id, None)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    shutil.rmtree(Path(doc["path"]).parent, ignore_errors=True)


def main():
    uvicorn.run(
        "server:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=True,
    )


if __name__ == "__main__":
    main()
