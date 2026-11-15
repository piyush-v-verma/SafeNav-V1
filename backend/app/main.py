from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="SafeNav API",
    description="Backend API for SafeNav navigation and safety services",
    version="0.1.0"
)

# CORS setup for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "SafeNav Backend API is running", "status": "healthy"}

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
