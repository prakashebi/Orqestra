# Orqestra - An event-driven collaboration and workflow platform

An actively developed metadata-rich document management system designed for research and enterprise use cases.

This platform focuses on structured metadata, advanced search capabilities, and auditability of document access and modifications.

---
## 🚀 Current Status

⚠️ Work in Progress (early prototype)

- Project setup (FastAPI + React)
- Initial authentication scaffold
- Deployed basic frontend on AWS EC2
- Core entity management (tasks/work items – evolving to generic entities)
- Metadata schema (extensible)
- OpenSearch integration (early)
- Event logging (foundation for audit + activity streams)
- Role-based access control (RBAC)

---

## 🧠 Problem Statement

Modern collaboration and workflow systems often suffer from:

- Limited extensibility beyond simple “tasks”
- Poor visibility into system activity and history
- Weak search across entities and interactions
- Lack of real-time collaboration capabilities
- Tight coupling between components (hard to scale)

Orqestra addresses these gaps by introducing:

- An event-driven architecture
- Extensible entity models (not limited to tasks)
- Real-time updates and activity streams
- Search-first design with OpenSearch
- Auditability and traceability by design

---
## 🏗️ Architecture Overview
### Core Components
- Backend: FastAPI (Python)
- Frontend: React
- Database: PostgreSQL
- Search Engine: OpenSearch
- Event Layer: (Planned – async/event-driven pattern)
- Storage: AWS S3 (planned)
- Deployment: containerisation (current), AWS EC2 planned

### High-Level Flow
```
(Client - React)
        ↓
(FastAPI Backend / API Layer)
        ↓
(Event Layer - Planned)
   ↓              ↓
(PostgreSQL)   (OpenSearch)
        ↓
(Optional Storage - S3)
```

---
## 🔑 Core Features
- User authentication (JWT-based)
- Role-based access control (RBAC)
- Generic entity management (tasks, workflows, future extensions)
- Real-time updates (WebSocket / event-driven – planned)
- Event logging and activity streams
- Full-text and faceted search (OpenSearch)
- Audit logging (system-wide traceability)
- Versioning of entities (history tracking)
- RESTful API design with OpenAPI documentation

---
## 🧩 Design Principles
- Event-driven first → every action is an event
- Extensibility → not limited to “tasks”
- Search-centric → OpenSearch as a core component
- Auditability → trace everything
- Scalability → loosely coupled components
- Cloud-ready → AWS-native deployment path

---

## 📦 Project Structure

```
repo-root/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   │   └── routes.py
│   │   ├── core/
│   │   │   └── config.py
│   │   ├── models/
│   │   │   └── base.py
│   │   ├── schemas/
│   │   │   └── user.py
│   │
│   ├── requirements.txt
│
├── frontend/
│   └── README.md
│
├── infra/
│   └── docker-compose.yml
│
├── docs/
│   └── architecture.md
│
└── README.md
```

---

## ⚙️ Getting Started (Backend)

```
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

uvicorn app.main:app --reload
```

API docs available at:
http://localhost:8000/docs

---

## 🛣️ Roadmap
### Short-term
- Core entity APIs (CRUD + relationships)
- Metadata schema design (extensible)
- PostgreSQL integration
- Basic event logging

### Mid-term
- OpenSearch indexing + search APIs
- Activity stream (event-driven)
- Entity versioning system
- Audit logging

### Long-term
- Real-time collaboration (WebSockets)
- Event bus integration (async processing)
- AI-assisted workflows (AWS Bedrock)
- Semantic search and recommendations
- Workflow automation / orchestration engine

---
## 📌 Notes

This project is being developed iteratively with a focus on:

- clean, modular architecture
- event-driven system design
- scalability and extensibility
- alignment with research and platform engineering use cases (e.g. CERN / EMBL)

---
## 👤 Author

Prakash Gaur

