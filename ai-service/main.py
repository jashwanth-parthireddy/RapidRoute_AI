"""
RapidRoute AI — FastAPI AI Service
Provides: route recommendation, ETA prediction, junction prioritization
"""
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from prediction.coordinator import recommend_route, predict_eta, prioritize_junctions, score_route

app = FastAPI(
    title="RapidRoute AI Service",
    description="AI-powered route optimization and traffic prediction for emergency ambulance coordination",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Schemas ──────────────────────────────────────────────

class LatLng(BaseModel):
    lat: float
    lng: float

class RouteRecommendRequest(BaseModel):
    origin:       LatLng
    destination:  LatLng
    emergency_id: Optional[str] = None
    traffic_snapshot: Optional[List[dict]] = None

class ETARequest(BaseModel):
    distance_km:    float
    current_speed:  Optional[float] = 0
    junction_count: Optional[int]   = 3
    traffic_levels: Optional[List[str]] = []
    congestion_pct: Optional[float] = 40.0

class JunctionItem(BaseModel):
    id:                Optional[str] = None
    name:              Optional[str] = None
    latitude:          Optional[float] = 0
    longitude:         Optional[float] = 0
    traffic_level:     Optional[str]   = 'medium'
    congestion_pct:    Optional[float] = 40
    vehicle_count:     Optional[int]   = 250
    avg_speed:         Optional[float] = 25
    signal_count:      Optional[int]   = 4
    eta_to_junction:   Optional[float] = 5

class JunctionPriorityRequest(BaseModel):
    junctions:         List[JunctionItem]
    ambulance_eta:     Optional[float] = 10

class RouteScoreRequest(BaseModel):
    normal:       dict
    alt:          dict
    emergency_id: Optional[str] = None

# ─── Endpoints ────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "rapidroute-ai", "models": ["route", "eta", "junction"]}


@app.post("/route/recommend")
def route_recommend(req: RouteRecommendRequest):
    try:
        result = recommend_route(
            origin={'lat': req.origin.lat, 'lng': req.origin.lng},
            destination={'lat': req.destination.lat, 'lng': req.destination.lng},
            traffic_snapshot=req.traffic_snapshot,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/route/score")
def route_score(req: RouteScoreRequest):
    try:
        return score_route(req.normal, req.alt, req.emergency_id or '')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/eta/predict")
def eta_predict(req: ETARequest):
    try:
        return predict_eta(req.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/junctions/prioritize")
def junctions_prioritize(req: JunctionPriorityRequest):
    try:
        junctions_dicts = [j.model_dump() for j in req.junctions]
        return prioritize_junctions(junctions_dicts, req.ambulance_eta or 10)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("AI_HOST", "0.0.0.0")
    port = int(os.getenv("AI_PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True)
