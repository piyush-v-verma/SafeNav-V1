# SafeNav

SafeNav is an intelligent navigation and safety-focused application featuring a FastAPI backend and a React + MapLibre GL frontend.

## Project Structure

```
SafeNav V1/
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── package-lock.json
│
├── backend/
│   ├── .venv/
│   ├── app/
│   │   └── main.py
│   ├── data/
│   │   ├── raw/
│   │   └── processed/
│   ├── scripts/
│   ├── requirements.txt
│   └── .env
│
├── .gitignore
└── README.md
```

## Getting Started

### 1. Backend Setup (FastAPI)
```powershell
# Navigate to backend directory
cd backend

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Start FastAPI dev server
uvicorn app.main:app --reload --port 8000
```
- API Documentation: http://localhost:8000/docs

### 2. Frontend Setup (React + MapLibre GL)
```powershell
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already installed)
npm install

# Start Vite dev server
npm run dev
```
- Web Application: http://localhost:5173
