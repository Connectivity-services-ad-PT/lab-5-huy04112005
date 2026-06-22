import os
import pymysql
from pymysql.cursors import DictCursor
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional
import logging

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SERVICE_NAME = os.getenv("SERVICE_NAME", "iot-ingestion")
SERVICE_VERSION = os.getenv("SERVICE_VERSION", "0.4.0")
AUTH_TOKEN = os.getenv("AUTH_TOKEN", "local-dev-token")

# DB Config
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "admin")
DB_PASS = os.getenv("DB_PASS", "password")
DB_NAME = os.getenv("DB_NAME", "iot_db")
DB_PORT = int(os.getenv("DB_PORT", 3306))

app = FastAPI(
    title="FIT4110 Lab 05 - IoT Ingestion Service (MySQL)",
    version=SERVICE_VERSION,
    description="Dockerized IoT Ingestion API connected to MySQL.",
)

def get_db_connection():
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        port=DB_PORT,
        cursorclass=DictCursor,
        autocommit=True
    )

@app.on_event("startup")
def startup_event():
    logger.info("Initializing database table...")
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sensor_readings (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    reading_id VARCHAR(50) UNIQUE NOT NULL,
                    device_id VARCHAR(100) NOT NULL,
                    metric VARCHAR(50) NOT NULL,
                    value FLOAT NOT NULL,
                    unit VARCHAR(20),
                    timestamp VARCHAR(50) NOT NULL,
                    created_at VARCHAR(50) NOT NULL
                )
            """)
        conn.close()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

class SensorMetric(str, Enum):
    temperature = "temperature"
    humidity = "humidity"
    motion = "motion"
    smoke = "smoke"

class SensorUnit(str, Enum):
    celsius = "celsius"
    percent = "percent"
    boolean = "boolean"
    ppm = "ppm"

class ProblemDetails(BaseModel):
    type: str = "about:blank"
    title: str
    status: int = Field(..., ge=400, le=599)
    detail: str
    instance: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str

class SensorReadingCreate(BaseModel):
    device_id: str = Field(..., min_length=3, examples=["ESP32-LAB-A01"])
    metric: SensorMetric = Field(..., examples=["temperature"])
    value: float = Field(
        ...,
        ge=-40,
        le=80,
        description="Boundary range used in Lab 03 and Lab 04: -40 to 80.",
        examples=[31.5],
    )
    unit: Optional[SensorUnit] = Field(default=None, examples=["celsius"])
    timestamp: str = Field(..., examples=["2026-05-13T08:30:00+07:00"])

class SensorReadingCreated(BaseModel):
    reading_id: str
    device_id: str
    metric: SensorMetric
    accepted: bool
    created_at: str

def build_problem(
    *,
    status_code: int,
    title: str,
    detail: str,
    instance: Optional[str] = None,
    problem_type: str = "about:blank",
) -> Dict:
    problem = {
        "type": problem_type,
        "title": title,
        "status": status_code,
        "detail": detail,
    }
    if instance:
        problem["instance"] = instance
    return problem

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    import http
    
    status_phrase = http.HTTPStatus(exc.status_code).phrase if exc.status_code in [s.value for s in http.HTTPStatus] else "HTTP Error"

    if isinstance(exc.detail, dict):
        problem = exc.detail
    else:
        problem = build_problem(
            status_code=exc.status_code,
            title=status_phrase,
            detail=str(exc.detail),
            instance=str(request.url.path),
        )
    problem.setdefault("status", exc.status_code)
    problem.setdefault("title", status_phrase)
    problem.setdefault("type", "about:blank")
    problem.setdefault("detail", "Request failed")
    problem.setdefault("instance", str(request.url.path))
    return JSONResponse(
        status_code=exc.status_code,
        content=problem,
        media_type="application/problem+json",
        headers=getattr(exc, "headers", None),
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    first_error = exc.errors()[0] if exc.errors() else {}
    location = ".".join(str(item) for item in first_error.get("loc", []))
    message = first_error.get("msg", "Request validation error")
    detail = f"{location}: {message}" if location else message

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=build_problem(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            title="Validation error",
            detail=detail,
            instance=str(request.url.path),
            problem_type="https://smart-campus.local/problems/validation-error",
        ),
        media_type="application/problem+json",
    )

def verify_bearer_token(authorization: Optional[str] = Header(default=None)) -> None:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=build_problem(
                status_code=status.HTTP_401_UNAUTHORIZED,
                title="Unauthorized",
                detail="Missing Authorization header",
                problem_type="https://smart-campus.local/problems/unauthorized",
            ),
        )

    expected = f"Bearer {AUTH_TOKEN}"
    if authorization != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=build_problem(
                status_code=status.HTTP_401_UNAUTHORIZED,
                title="Unauthorized",
                detail="Invalid bearer token",
                problem_type="https://smart-campus.local/problems/unauthorized",
            ),
        )

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")

def next_reading_id(conn) -> str:
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    with conn.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) as cnt FROM sensor_readings WHERE created_at LIKE %s", (f"{today[:4]}-{today[4:6]}-{today[6:8]}%",))
        res = cursor.fetchone()
        cnt = res['cnt'] if res else 0
    return f"R-{today}-{cnt + 1:04d}"

@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=SERVICE_NAME,
        version=SERVICE_VERSION,
    )

@app.post(
    "/readings",
    response_model=SensorReadingCreated,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_bearer_token)],
)
def create_reading(payload: SensorReadingCreate, response: Response) -> SensorReadingCreated:
    if payload.metric == SensorMetric.temperature and payload.value >= 70:
        response.headers["X-Warning"] = "high-temperature"

    created_at = now_iso()
    
    try:
        conn = get_db_connection()
        reading_id = next_reading_id(conn)
        unit_val = payload.unit.value if payload.unit else None
        
        with conn.cursor() as cursor:
            sql = """
                INSERT INTO sensor_readings 
                (reading_id, device_id, metric, value, unit, timestamp, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (
                reading_id, payload.device_id, payload.metric.value, 
                payload.value, unit_val, payload.timestamp, created_at
            ))
        conn.close()
        
        return SensorReadingCreated(
            reading_id=reading_id,
            device_id=payload.device_id,
            metric=payload.metric,
            accepted=True,
            created_at=created_at,
        )
    except Exception as e:
        logger.error(f"DB Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/readings/latest", dependencies=[Depends(verify_bearer_token)])
def latest_readings(
    device_id: Optional[str] = Query(default=None),
    limit: int = Query(default=10, ge=1, le=100),
) -> Dict[str, List[Dict]]:
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if device_id:
                sql = "SELECT * FROM sensor_readings WHERE device_id = %s ORDER BY id DESC LIMIT %s"
                cursor.execute(sql, (device_id, limit))
            else:
                sql = "SELECT * FROM sensor_readings ORDER BY id DESC LIMIT %s"
                cursor.execute(sql, (limit,))
            items = cursor.fetchall()
        conn.close()
        
        for item in items:
            item.pop('id', None) # Remove internal ID
            
        return {"items": items}
    except Exception as e:
        logger.error(f"DB Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/readings/{reading_id}", dependencies=[Depends(verify_bearer_token)])
def get_reading(reading_id: str) -> Dict:
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            sql = "SELECT * FROM sensor_readings WHERE reading_id = %s"
            cursor.execute(sql, (reading_id,))
            item = cursor.fetchone()
        conn.close()
        
        if item:
            item.pop('id', None)
            return item
            
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=build_problem(
                status_code=status.HTTP_404_NOT_FOUND,
                title="Not Found",
                detail=f"Reading {reading_id} does not exist",
                instance=f"/readings/{reading_id}",
                problem_type="https://smart-campus.local/problems/not-found",
            ),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"DB Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
