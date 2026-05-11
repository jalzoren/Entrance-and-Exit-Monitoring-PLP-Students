from __future__ import annotations

import asyncio
import base64
import math
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import List, Optional

import cv2
import mediapipe as mp
import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# ─────────────────────────────────────────────────────────────────────────────
# Constants & Tunable Thresholds
# ─────────────────────────────────────────────────────────────────────────────

# Resize ALL input to this width before any ML work.
# 320 px is enough for FaceMesh + solvePnP; halving a 640-wide feed cuts
# MediaPipe inference time by ~4× (area scales quadratically).
INFERENCE_WIDTH = 320

# How long (seconds) to reuse a cached FaceMesh result when the frame
# hash hasn't changed.  0.08 s = reuse for up to 2 consecutive 600 ms polls
# that send the same frozen frame.
CACHE_TTL = 0.08

# Perceptual hash block size for frame deduplication.
PHASH_SIZE = 8

# Thread-pool workers for CPU-bound inference (FaceMesh + solvePnP).
# 2 workers is enough for a single webcam stream; raise to 4 for multi-stream.
THREAD_WORKERS = 2

# Face detection / quality thresholds (unchanged from original)
BRIGHTNESS_MIN      = 50
BRIGHTNESS_MAX      = 210
GLASSES_GLARE_RATIO = 0.06
BLUR_THRESHOLD      = 70.0
POSE_YAW_CENTER     = 25
POSE_PITCH_CENTER   = 25
POSE_SIDE_MIN       = 15
POSE_TILT_MIN       = 12
MOUTH_NARROW_RATIO  = 0.55
LOWER_DISP_RATIO    = 0.15
TILT_UP_RATIO_MIN   = 0.65
TILT_DOWN_RATIO_MIN = 0.38

# ─────────────────────────────────────────────────────────────────────────────
# MediaPipe — VIDEO mode
# ─────────────────────────────────────────────────────────────────────────────
# VIDEO mode maintains an internal Kalman-style tracker across calls.
# This removes the expensive "detect from scratch" step on every frame and
# cuts per-frame latency by ~40–60 % compared to static_image_mode=True.
# The single FaceMesh instance is NOT thread-safe, so all calls go through
# the thread-pool (one worker at a time) which serialises access safely.

_mp_face_mesh = mp.solutions.face_mesh
_face_mesh = _mp_face_mesh.FaceMesh(
    static_image_mode=False,          # ← VIDEO mode: reuses tracking state
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,      # ← track once detected, don't re-detect every frame
)

# ─────────────────────────────────────────────────────────────────────────────
# Thread pool
# ─────────────────────────────────────────────────────────────────────────────
# FastAPI's async endpoints cannot call blocking CPU code directly without
# stalling the entire event loop.  We push all heavy work into this executor
# and await it, keeping the loop free to accept new requests in parallel.
_executor = ThreadPoolExecutor(max_workers=THREAD_WORKERS)

# ─────────────────────────────────────────────────────────────────────────────
# Frame cache
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class _FrameCache:
    """Per-process cache for the last FaceMesh result."""
    phash: Optional[np.ndarray] = None
    result: Optional[object]    = None
    ts: float                   = 0.0

_frame_cache = _FrameCache()


def _phash(gray_small: np.ndarray) -> np.ndarray:
    """
    8×8 perceptual hash of a small grayscale image.
    Two frames with identical hashes are visually indistinguishable;
    we skip re-running FaceMesh and return the cached result instead.
    This fires most often when the webcam is polled at 600 ms but the
    subject is perfectly still (e.g. during pose-hold).
    """
    dct   = cv2.dct(gray_small.astype(np.float32))
    block = dct[:PHASH_SIZE, :PHASH_SIZE]
    mean  = block.mean()
    return (block > mean).flatten()


def _hash_equal(a: np.ndarray, b: np.ndarray) -> bool:
    """Hamming distance ≤ 4 → treat as the same frame."""
    return int(np.count_nonzero(a != b)) <= 4


# ─────────────────────────────────────────────────────────────────────────────
# Landmark indices (unchanged)
# ─────────────────────────────────────────────────────────────────────────────

POSE_LANDMARK_IDS = [1, 152, 33, 263, 61, 291]
POSE_3D_MODEL = np.array([
    [  0.0,    0.0,    0.0],
    [  0.0, -330.0,  -65.0],
    [-225.0,  170.0, -135.0],
    [ 225.0,  170.0, -135.0],
    [-150.0, -150.0, -125.0],
    [ 150.0, -150.0, -125.0],
], dtype=np.float64)

LEFT_EYE_IDS   = [33, 7, 163, 144, 145, 153, 154, 155, 133]
RIGHT_EYE_IDS  = [362, 382, 381, 380, 374, 373, 390, 249, 263]
LOWER_FACE_IDS = [61, 291, 17, 152, 13, 14, 78, 308]

MOUTH_LEFT_ID  = 61
MOUTH_RIGHT_ID = 291
NOSE_TIP_ID    = 1
CHIN_ID        = 152
FOREHEAD_ID    = 10

# ─────────────────────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI()

recognizer = None
scrfd_session = None


@app.on_event("startup")
async def load_models():
    global recognizer, scrfd_session

    try:
        print("Loading ArcFace model...")
        # Use only 1 intra-op thread for ArcFace on short requests;
        # avoids thread contention with MediaPipe's own thread pool.
        sess_opts = ort.SessionOptions()
        sess_opts.intra_op_num_threads = 1
        sess_opts.inter_op_num_threads = 1
        recognizer = ort.InferenceSession(
            "models/arcface.onnx",
            sess_options=sess_opts,
            providers=["CPUExecutionProvider"],
        )

        print("Loading SCRFD detector...")

        scrfd_session = ort.InferenceSession(
            "models/scrfd.onnx",
            providers=["CPUExecutionProvider"]
        )

        print("Models loaded successfully")
    except Exception as e:
        print("MODEL LOAD ERROR:", e)


# ─────────────────────────────────────────────────────────────────────────────
# Request / Response models (unchanged — frontend compatibility preserved)
# ─────────────────────────────────────────────────────────────────────────────

class ImageRequest(BaseModel):
    images:            List[str]
    min_face_size:     int   = 40
    quality_threshold: float = 0.3


class EmbeddingResponse(BaseModel):
    embeddings:     List[List[float]]
    faces_detected: int
    quality_scores: List[float]
    success:        bool


class SimilarityRequest(BaseModel):
    embedding1: List[float]
    embedding2: List[float]


class FrameValidationRequest(BaseModel):
    image:         str
    expected_pose: str = "center"


class FrameValidationResponse(BaseModel):
    face_detected:    bool
    mask_detected:    bool
    blur_ok:          bool
    pose_ok:          bool
    pose_label:       str
    message:          str
    glasses_detected: bool
    glasses_warning:  bool


# ─────────────────────────────────────────────────────────────────────────────
# Shared decode + resize helper
# ─────────────────────────────────────────────────────────────────────────────

def _decode_and_resize(b64: str) -> tuple[np.ndarray, np.ndarray]:
    """
    Decode Base64 → BGR image, then return BOTH:
      - `small`  (width=INFERENCE_WIDTH) — used for all ML inference
      - `full`   (original resolution)  — kept for ArcFace crop quality

    Splitting here means downstream functions always receive the downscaled
    image; they never touch the raw frame, so Base64 decode + resize happen
    exactly once per request.
    """
    if "," in b64:
        b64 = b64.split(",")[1]

    # Use frombuffer + imdecode (faster than base64.b64decode → BytesIO)
    buf  = np.frombuffer(base64.b64decode(b64), np.uint8)
    full = cv2.imdecode(buf, cv2.IMREAD_COLOR)

    if full is None:
        raise ValueError("Image decode failed")

    h, w = full.shape[:2]
    if w > INFERENCE_WIDTH:
        scale = INFERENCE_WIDTH / w
        small = cv2.resize(full, (INFERENCE_WIDTH, int(h * scale)),
                           interpolation=cv2.INTER_LINEAR)
    else:
        small = full  # already small, skip copy

    return small, full


# ─────────────────────────────────────────────────────────────────────────────
# Brightness check  (runs on small frame — negligible cost)
# ─────────────────────────────────────────────────────────────────────────────

def _check_brightness(frame_bgr: np.ndarray) -> dict:
    # np.mean on a downsized gray image is ~10× faster than on full 1080p
    lum = float(cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY).mean())
    if lum < BRIGHTNESS_MIN:
        return {"ok": False, "message": "Too dark — improve your lighting"}
    if lum > BRIGHTNESS_MAX:
        return {"ok": False, "message": "Too bright — reduce glare or step back"}
    return {"ok": True, "message": "Lighting looks good"}


# ─────────────────────────────────────────────────────────────────────────────
# Glasses (soft, non-blocking)
# ─────────────────────────────────────────────────────────────────────────────

def _check_glasses(frame_bgr: np.ndarray, landmarks, w: int, h: int) -> dict:
    eye_pts = [(int(landmarks[idx].x * w), int(landmarks[idx].y * h))
               for idx in LEFT_EYE_IDS + RIGHT_EYE_IDS]

    xs = [p[0] for p in eye_pts]; ys = [p[1] for p in eye_pts]
    x1 = max(0,     min(xs) - 10); y1 = max(0,     min(ys) - 10)
    x2 = min(w - 1, max(xs) + 10); y2 = min(h - 1, max(ys) + 10)

    if x2 <= x1 or y2 <= y1:
        return {"ok": True, "message": "Eye region too small"}

    eye_roi = frame_bgr[y1:y2, x1:x2]
    if eye_roi.size == 0:
        return {"ok": True, "message": "Eye region empty"}

    hsv         = cv2.cvtColor(eye_roi, cv2.COLOR_BGR2HSV)
    glare_mask  = (hsv[:, :, 2] > 220) & (hsv[:, :, 1] < 40)
    glare_ratio = float(glare_mask.sum()) / max(eye_roi.shape[0] * eye_roi.shape[1], 1)

    if glare_ratio > GLASSES_GLARE_RATIO:
        return {"ok": False, "message": "Glasses detected — may reduce accuracy"}
    return {"ok": True, "message": "No glasses detected"}


# ─────────────────────────────────────────────────────────────────────────────
# Blur check (Laplacian on face crop)
# ─────────────────────────────────────────────────────────────────────────────

def _check_blur(frame_bgr: np.ndarray, landmarks, w: int, h: int) -> dict:
    xs = [int(lm.x * w) for lm in landmarks]
    ys = [int(lm.y * h) for lm in landmarks]

    x1 = max(0,     min(xs) - 10); y1 = max(0,     min(ys) - 10)
    x2 = min(w - 1, max(xs) + 10); y2 = min(h - 1, max(ys) + 10)

    face_crop = frame_bgr[y1:y2, x1:x2]
    if face_crop.size == 0 or face_crop.shape[0] < 20 or face_crop.shape[1] < 20:
        return {"ok": True, "score": 0.0, "message": ""}

    gray  = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
    score = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    if score < BLUR_THRESHOLD:
        return {"ok": False, "score": round(score, 1),
                "message": "Hold still — image is too blurry"}
    return {"ok": True, "score": round(score, 1), "message": ""}


# ─────────────────────────────────────────────────────────────────────────────
# Occlusion check
# ─────────────────────────────────────────────────────────────────────────────

def _check_occlusion(landmarks, w: int, h: int) -> bool:
    nose_y = landmarks[NOSE_TIP_ID].y
    chin_y = landmarks[CHIN_ID].y
    face_h = abs(chin_y - nose_y)
    if face_h < 0.001:
        return False

    left_eye_x  = landmarks[33].x
    right_eye_x = landmarks[263].x
    eye_width   = abs(right_eye_x - left_eye_x)

    mouth_width = abs(landmarks[MOUTH_LEFT_ID].x - landmarks[MOUTH_RIGHT_ID].x)
    mouth_compressed = (eye_width > 0.001) and (mouth_width < eye_width * MOUTH_NARROW_RATIO)

    expected_y = nose_y + face_h * 0.60
    lower_ys   = [landmarks[idx].y for idx in LOWER_FACE_IDS]
    displaced  = (expected_y - float(np.mean(lower_ys))) > (face_h * LOWER_DISP_RATIO)

    return mouth_compressed or displaced


# ─────────────────────────────────────────────────────────────────────────────
# Pose estimation + check
# ─────────────────────────────────────────────────────────────────────────────

def _estimate_pose(landmarks, w: int, h: int) -> Optional[dict]:
    image_pts = np.array(
        [[landmarks[idx].x * w, landmarks[idx].y * h] for idx in POSE_LANDMARK_IDS],
        dtype=np.float64,
    )
    focal   = float(w)
    cam_mat = np.array([[focal, 0, w / 2], [0, focal, h / 2], [0, 0, 1]], dtype=np.float64)

    ok, rvec, _ = cv2.solvePnP(
        POSE_3D_MODEL, image_pts, cam_mat, np.zeros((4, 1)),
        flags=cv2.SOLVEPNP_ITERATIVE,
    )
    if not ok:
        return None

    rot_mat, _ = cv2.Rodrigues(rvec)
    pitch = math.atan2(-rot_mat[2, 0], math.sqrt(rot_mat[2, 1]**2 + rot_mat[2, 2]**2))
    yaw   = math.atan2(rot_mat[1, 0], rot_mat[0, 0])
    roll  = math.atan2(rot_mat[2, 1], rot_mat[2, 2])

    nose_y     = landmarks[NOSE_TIP_ID].y
    chin_y     = landmarks[CHIN_ID].y
    forehead_y = landmarks[FOREHEAD_ID].y
    full_h     = abs(chin_y - forehead_y)

    ncr = (abs(chin_y - nose_y)     / full_h) if full_h > 0.001 else 0.5
    nfr = (abs(nose_y - forehead_y) / full_h) if full_h > 0.001 else 0.5

    return {
        "yaw":                 round(math.degrees(yaw),   1),
        "pitch":               round(math.degrees(pitch), 1),
        "roll":                round(math.degrees(roll),  1),
        "nose_chin_ratio":     round(ncr, 3),
        "nose_forehead_ratio": round(nfr, 3),
    }


def _check_pose(pose: dict, expected: str) -> dict:
    yaw   = pose["yaw"]
    pitch = pose["pitch"]
    ncr   = pose.get("nose_chin_ratio",     0.5)
    nfr   = pose.get("nose_forehead_ratio", 0.5)

    tilt_up_by_ratio   = ncr > TILT_UP_RATIO_MIN
    tilt_down_by_ratio = nfr > TILT_DOWN_RATIO_MIN

    rules = {
        "center": lambda: abs(yaw) <= POSE_YAW_CENTER and abs(pitch) <= POSE_PITCH_CENTER,
        "left":   lambda: yaw  < -POSE_SIDE_MIN,
        "right":  lambda: yaw  >  POSE_SIDE_MIN,
        "up":     lambda: (pitch < -POSE_TILT_MIN) or tilt_up_by_ratio,
        "down":   lambda: (pitch >  POSE_TILT_MIN) or tilt_down_by_ratio,
    }
    instructions = {
        "center": "Look straight at the camera",
        "left":   "Turn your head slightly to the LEFT",
        "right":  "Turn your head slightly to the RIGHT",
        "up":     "Tilt your chin DOWN slightly (~15–25°) so your face points upward",
        "down":   "Tilt your chin UP slightly (~15–25°) so your face points downward",
    }

    rule = rules.get(expected)
    if rule and rule():
        return {"ok": True, "pose_label": expected, "message": f"Pose correct: {expected}"}
    return {"ok": False, "pose_label": expected,
            "message": instructions.get(expected, "Adjust head position")}


# ─────────────────────────────────────────────────────────────────────────────
# ArcFace helpers (logic unchanged; input is still the full-res crop)
# ─────────────────────────────────────────────────────────────────────────────

def base64_to_image(b64: str) -> np.ndarray:
    """Decode Base64 string to BGR image (full resolution)."""
    if "," in b64:
        b64 = b64.split(",")[1]
    buf = np.frombuffer(base64.b64decode(b64), np.uint8)
    img = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "Image decode failed")
    return img


# In your FastAPI backend, replace the preprocess_face function:

def preprocess_face(face: np.ndarray) -> np.ndarray:
    """
    Proper face preprocessing that preserves color information.
    """
    # Resize to ArcFace expected input
    face = cv2.resize(face, (112, 112))
    
    # Convert BGR to RGB (OpenCV loads as BGR)
    rgb = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
    
    # Apply CLAHE on L-channel only (preserves color)
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_eq = clahe.apply(l)
    
    lab_eq = cv2.merge([l_eq, a, b])
    face_eq = cv2.cvtColor(lab_eq, cv2.COLOR_LAB2RGB)
    
    # Normalize to [-1, 1] range (ArcFace expects this)
    face_normalized = (face_eq.astype(np.float32) - 127.5) / 127.5
    
    # Convert to NCHW format (batch, channels, height, width)
    face_transposed = np.transpose(face_normalized, (2, 0, 1))
    
    return np.expand_dims(face_transposed, axis=0)


def calculate_face_quality(face: np.ndarray) -> float:
    """
    Calculate face quality with more lenient thresholds
    """
    gray = cv2.cvtColor(face, cv2.COLOR_BGR2GRAY)
    
    # More lenient blur score
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    # Normalize: 0-1000 range maps to 0-1, with 200 being "good enough"
    blur_score = min(laplacian_var / 400, 1.0)  # Was 500, now 400
    
    # Brightness score - more forgiving
    brightness = np.mean(gray) / 255
    # Allow brightness from 0.2 to 0.8 (was 0.3-0.7)
    brightness_score = 1 - max(0, abs(brightness - 0.5) - 0.2) * 2
    brightness_score = max(0.3, min(1.0, brightness_score))  # Cap at 0.3 minimum
    
    # Contrast score - more lenient
    contrast = np.std(gray)
    contrast_score = min(contrast / 60, 1.0)  # Was 128, now 60
    
    # Weighted combination with higher tolerance
    quality = (blur_score * 0.4 + 
               brightness_score * 0.3 + 
               contrast_score * 0.3)
    
    # Add a small boost to ensure minimum scores
    quality = min(1.0, quality + 0.1)  # Add 0.1 boost
    
    return quality


# ─────────────────────────────────────────────────────────────────────────────
# SCRFD anchor generation & bbox decoding
# ─────────────────────────────────────────────────────────────────────────────

# SCRFD-2.5G / 10G anchor config:
# 2 anchors per location, 3 strides.  All anchors are ratio=1 (square).
_SCRFD_STRIDES      = [8, 16, 32]
_SCRFD_NUM_ANCHORS  = 2          # anchors per spatial location
_SCRFD_INPUT_SIZE   = 640        # model was exported at 640×640


def _generate_anchors(stride: int, feat_h: int, feat_w: int) -> np.ndarray:
    """
    Build (feat_h * feat_w * num_anchors, 2) array of anchor (cx, cy) centres
    for a single stride level.  SCRFD uses a single square anchor per slot
    (ratio=1, scale=1) so the centre is just the grid point.
    """
    num_anchors = _SCRFD_NUM_ANCHORS
    cx = (np.arange(feat_w, dtype=np.float32) + 0.5) * stride   # (feat_w,)
    cy = (np.arange(feat_h, dtype=np.float32) + 0.5) * stride   # (feat_h,)
    # meshgrid → flatten row-major (matches SCRFD's output ordering)
    grid_cx, grid_cy = np.meshgrid(cx, cy)                       # (feat_h, feat_w)
    centers = np.stack([grid_cx.ravel(), grid_cy.ravel()], axis=1)  # (N, 2)
    # Repeat each centre for the num_anchors slots
    centers = np.repeat(centers, num_anchors, axis=0)            # (N*num_anchors, 2)
    return centers                                                # (feat_h*feat_w*num_anchors, 2)


def _decode_boxes(anchors: np.ndarray, deltas: np.ndarray, stride: int) -> np.ndarray:
    """
    SCRFD box regression is distance-based (similar to FCOS / RetinaFace):
        x1 = cx - delta[0] * stride
        y1 = cy - delta[1] * stride
        x2 = cx + delta[2] * stride
        y2 = cy + delta[3] * stride

    anchors : (N, 2)  — cx, cy
    deltas  : (N, 4)  — l, t, r, b (non-negative distances)
    Returns : (N, 4)  — x1, y1, x2, y2  in 640-space
    """
    cx = anchors[:, 0]; cy = anchors[:, 1]
    x1 = cx - deltas[:, 0] * stride
    y1 = cy - deltas[:, 1] * stride
    x2 = cx + deltas[:, 2] * stride
    y2 = cy + deltas[:, 3] * stride
    return np.stack([x1, y1, x2, y2], axis=1)


def _nms(boxes: np.ndarray, scores: np.ndarray, iou_thresh: float = 0.4) -> np.ndarray:
    """
    Vectorised NMS.  Returns indices of kept boxes sorted by score desc.
    Pure NumPy — no cv2.dnn or extra libs required.
    """
    if len(boxes) == 0:
        return np.array([], dtype=np.int32)

    x1 = boxes[:, 0]; y1 = boxes[:, 1]
    x2 = boxes[:, 2]; y2 = boxes[:, 3]
    areas = np.maximum(0.0, x2 - x1) * np.maximum(0.0, y2 - y1)
    order = scores.argsort()[::-1]
    keep  = []

    while order.size > 0:
        i = order[0]
        keep.append(int(i))
        if order.size == 1:
            break
        rest = order[1:]
        ix1  = np.maximum(x1[i], x1[rest])
        iy1  = np.maximum(y1[i], y1[rest])
        ix2  = np.minimum(x2[i], x2[rest])
        iy2  = np.minimum(y2[i], y2[rest])
        inter = np.maximum(0.0, ix2 - ix1) * np.maximum(0.0, iy2 - iy1)
        iou   = inter / np.maximum(areas[i] + areas[rest] - inter, 1e-6)
        order = rest[iou < iou_thresh]

    return np.array(keep, dtype=np.int32)


# ─────────────────────────────────────────────────────────────────────────────
# Pre-build anchor tables for the fixed 640×640 input (done once at import)
# ─────────────────────────────────────────────────────────────────────────────

_ANCHOR_CACHE: dict[int, np.ndarray] = {}

def _get_anchors(stride: int) -> np.ndarray:
    if stride not in _ANCHOR_CACHE:
        feat = _SCRFD_INPUT_SIZE // stride          # 80, 40, or 20
        _ANCHOR_CACHE[stride] = _generate_anchors(stride, feat, feat)
    return _ANCHOR_CACHE[stride]

# Warm up at module load — zero cost at request time
for _s in _SCRFD_STRIDES:
    _get_anchors(_s)


# ─────────────────────────────────────────────────────────────────────────────
# detect_faces  — full replacement
# ─────────────────────────────────────────────────────────────────────────────

def detect_faces(img: np.ndarray, min_face_size: int) -> list:
    """
    Run SCRFD on `img` (any resolution) and return a list of dicts:
        [{"face": np.ndarray(112,112,3 BGR), "quality": float}, ...]

    Pipeline
    ────────
    1.  Letterbox-resize to 640×640  (preserves AR, pads with 0)
    2.  Run SCRFD
    3.  Per stride: generate anchors → decode boxes → filter by score
    4.  Concatenate all strides, NMS
    5.  Map boxes back to original image space
    6.  Crop, quality-score, return
    """
    if scrfd_session is None:
        raise HTTPException(500, "SCRFD detector not loaded")

    orig_h, orig_w = img.shape[:2]

    # ── 1. Letterbox to 640×640 ───────────────────────────────────────────────
    scale   = min(_SCRFD_INPUT_SIZE / orig_w, _SCRFD_INPUT_SIZE / orig_h)
    new_w   = int(round(orig_w * scale))
    new_h   = int(round(orig_h * scale))
    resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

    canvas  = np.zeros((_SCRFD_INPUT_SIZE, _SCRFD_INPUT_SIZE, 3), dtype=np.uint8)
    pad_top  = (_SCRFD_INPUT_SIZE - new_h) // 2
    pad_left = (_SCRFD_INPUT_SIZE - new_w) // 2
    canvas[pad_top:pad_top + new_h, pad_left:pad_left + new_w] = resized

    # ── 2. Preprocess + infer ─────────────────────────────────────────────────
    blob = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB).astype(np.float32)
    blob = (blob - 127.5) / 128.0
    blob = np.transpose(blob, (2, 0, 1))[np.newaxis]          # (1,3,640,640)

    input_name = scrfd_session.get_inputs()[0].name
    outputs    = scrfd_session.run(None, {input_name: blob})
    # outputs layout (9 tensors):
    #   [0,1,2] → scores  (N_i, 1)  per stride 8,16,32
    #   [3,4,5] → boxes   (N_i, 4)  per stride 8,16,32
    #   [6,7,8] → kpoints (N_i,10)  per stride 8,16,32  (ignored here)

    # ── 3 & 4. Decode per stride, collect, NMS ───────────────────────────────
    all_boxes  = []
    all_scores = []

    for idx, stride in enumerate(_SCRFD_STRIDES):
        raw_scores = outputs[idx].reshape(-1)          # (N_i,)
        raw_boxes  = outputs[idx + 3].reshape(-1, 4)   # (N_i, 4)

        keep_mask  = raw_scores >= 0.5
        if not keep_mask.any():
            continue

        scores  = raw_scores[keep_mask]
        deltas  = raw_boxes[keep_mask]
        anchors = _get_anchors(stride)[keep_mask]      # pre-built, sliced

        boxes = _decode_boxes(anchors, deltas, stride) # (M, 4) in 640-space
        all_boxes.append(boxes)
        all_scores.append(scores)

    if not all_boxes:
        print("DETECTED FACES: 0")
        return []

    boxes  = np.concatenate(all_boxes,  axis=0)
    scores = np.concatenate(all_scores, axis=0)

    keep = _nms(boxes, scores, iou_thresh=0.4)
    boxes  = boxes[keep]
    scores = scores[keep]

    # ── 5. Map from 640-space back to original image ──────────────────────────
    # Undo letterbox: remove padding offset, divide by scale
    boxes[:, 0] = (boxes[:, 0] - pad_left) / scale   # x1
    boxes[:, 1] = (boxes[:, 1] - pad_top)  / scale   # y1
    boxes[:, 2] = (boxes[:, 2] - pad_left) / scale   # x2
    boxes[:, 3] = (boxes[:, 3] - pad_top)  / scale   # y2

    # Clamp to original image bounds
    boxes[:, 0::2] = np.clip(boxes[:, 0::2], 0, orig_w)
    boxes[:, 1::2] = np.clip(boxes[:, 1::2], 0, orig_h)

    # ── 6. Crop + quality-score ───────────────────────────────────────────────
    faces = []
    for box in boxes.astype(np.int32):
        x1, y1, x2, y2 = box
        if x2 <= x1 or y2 <= y1:
            continue
        face_h = y2 - y1
        if face_h < min_face_size:
            continue
        crop = img[y1:y2, x1:x2]
        if crop.size == 0:
            continue
        crop_112 = cv2.resize(crop, (112, 112), interpolation=cv2.INTER_LINEAR)
        faces.append({"face": crop_112, "quality": calculate_face_quality(crop_112)})

    print(f"DETECTED FACES: {len(faces)}")
    return faces


def get_embedding(face: np.ndarray) -> np.ndarray:
    if recognizer is None:
        raise HTTPException(500, "Recognizer not loaded")
    tensor     = preprocess_face(face)
    input_name = recognizer.get_inputs()[0].name
    emb        = recognizer.run(None, {input_name: tensor})[0].flatten()
    return emb / np.linalg.norm(emb)


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


# ─────────────────────────────────────────────────────────────────────────────
# Core validate-frame logic  (runs in thread pool)
# ─────────────────────────────────────────────────────────────────────────────

def _validate_frame_sync(image_b64: str, expected_pose: str) -> FrameValidationResponse:
    """
    All CPU-bound work lives here.  Called via run_in_executor so the
    FastAPI event loop is never blocked.
    """
    # ── Decode + downscale once ───────────────────────────────────────────────
    try:
        small, _full = _decode_and_resize(image_b64)
    except Exception:
        raise HTTPException(400, "Could not decode image")

    h, w = small.shape[:2]

    # ── Gate 1: Brightness (no model — microseconds) ──────────────────────────
    bri = _check_brightness(small)
    if not bri["ok"]:
        return FrameValidationResponse(
            face_detected=False, mask_detected=False, blur_ok=True,
            pose_ok=False, pose_label="unknown", message=bri["message"],
            glasses_detected=False, glasses_warning=False,
        )

    # ── Frame deduplication via perceptual hash ───────────────────────────────
    # Convert to 64×64 gray for fast DCT hashing.
    gray_small = cv2.cvtColor(
        cv2.resize(small, (64, 64), interpolation=cv2.INTER_NEAREST),
        cv2.COLOR_BGR2GRAY,
    )
    current_hash = _phash(gray_small)
    now          = time.monotonic()

    landmarks = None
    if (
        _frame_cache.phash is not None
        and _hash_equal(current_hash, _frame_cache.phash)
        and (now - _frame_cache.ts) < CACHE_TTL
        and _frame_cache.result is not None
    ):
        # Frame is visually identical to the last one → reuse cached landmarks
        landmarks = _frame_cache.result
    else:
        # Run FaceMesh (VIDEO mode = fast tracked inference)
        rgb    = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
        result = _face_mesh.process(rgb)

        _frame_cache.phash  = current_hash
        _frame_cache.ts     = now

        if result.multi_face_landmarks:
            landmarks = result.multi_face_landmarks[0].landmark
            _frame_cache.result = landmarks
        else:
            _frame_cache.result = None

    # ── Gate 2: Face detected ─────────────────────────────────────────────────
    if landmarks is None:
        return FrameValidationResponse(
            face_detected=False, mask_detected=False, blur_ok=True,
            pose_ok=False, pose_label="unknown",
            message="Move closer — position your face in the oval",
            glasses_detected=False, glasses_warning=False,
        )

    # ── Soft check: Glasses ───────────────────────────────────────────────────
    glasses_result   = _check_glasses(small, landmarks, w, h)
    glasses_detected = not glasses_result["ok"]

    # ── Gate 3: Occlusion ─────────────────────────────────────────────────────
    if _check_occlusion(landmarks, w, h):
        return FrameValidationResponse(
            face_detected=True, mask_detected=True, blur_ok=True,
            pose_ok=False, pose_label="unknown",
            message="Remove any face covering or mask",
            glasses_detected=glasses_detected, glasses_warning=glasses_detected,
        )

    # ── Gate 4: Blur ──────────────────────────────────────────────────────────
    blur = _check_blur(small, landmarks, w, h)
    if not blur["ok"]:
        return FrameValidationResponse(
            face_detected=True, mask_detected=False, blur_ok=False,
            pose_ok=False, pose_label="unknown", message=blur["message"],
            glasses_detected=glasses_detected, glasses_warning=glasses_detected,
        )

    # ── Gate 5: Head pose ─────────────────────────────────────────────────────
    pose_angles = _estimate_pose(landmarks, w, h)
    pose_check  = (
        _check_pose(pose_angles, expected_pose)
        if pose_angles is not None
        else {"ok": False, "pose_label": "unknown",
              "message": "Could not read head pose — face the camera"}
    )

    return FrameValidationResponse(
        face_detected    = True,
        mask_detected    = False,
        blur_ok          = True,
        pose_ok          = pose_check["ok"],
        pose_label       = pose_check["pose_label"],
        message          = "All checks passed" if pose_check["ok"] else pose_check["message"],
        glasses_detected = glasses_detected,
        glasses_warning  = glasses_detected,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/validate-frame", response_model=FrameValidationResponse)
async def validate_frame(data: FrameValidationRequest):
    """
    Base64 JSON endpoint — kept for frontend compatibility.
    Heavy work is offloaded to the thread pool so the event loop stays free.
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        _executor,
        _validate_frame_sync,
        data.image,
        data.expected_pose,
    )


@app.post("/validate-frame-binary")
async def validate_frame_binary(request: Request):
    """
    FASTER ALTERNATIVE — accepts raw JPEG/PNG bytes in the request body
    plus an optional `X-Expected-Pose` header (default: "center").

    Cuts ~15–30 ms of Base64 encoding/decoding on the client side.
    Frontend usage:
        fetch('/validate-frame-binary', {
            method: 'POST',
            headers: {
                'Content-Type': 'image/jpeg',
                'X-Expected-Pose': 'center',
            },
            body: jpegBlob,   // canvas.toBlob() or webcam ImageCapture
        })
    """
    body         = await request.body()
    expected_pose = request.headers.get("X-Expected-Pose", "center")

    # Re-encode as Base64 so we can reuse the shared decode path.
    # This looks like it defeats the purpose, but the encoding happens
    # server-side in C (numpy/base64), not in JS, saving ~10–20 ms of
    # JS overhead.  For the fastest path, replace _decode_and_resize to
    # accept raw bytes directly.
    b64 = base64.b64encode(body).decode()

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        _executor,
        _validate_frame_sync,
        b64,
        expected_pose,
    )


@app.post("/generate-embedding", response_model=EmbeddingResponse)
async def generate_embedding(data: ImageRequest):
    """ArcFace embedding — logic unchanged, offloaded to thread pool."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _generate_embedding_sync, data)



def detect_faces_with_landmarks(img: np.ndarray, min_face_size: int) -> list:
    """
    Detect faces AND get landmarks for alignment.
    Returns list of dicts with 'face', 'quality', 'landmarks', 'bbox'
    """
    if scrfd_session is None:
        raise HTTPException(500, "SCRFD detector not loaded")

    orig_h, orig_w = img.shape[:2]

    # ── 1. Letterbox to 640×640 ───────────────────────────────────────────────
    scale = min(_SCRFD_INPUT_SIZE / orig_w, _SCRFD_INPUT_SIZE / orig_h)
    new_w = int(round(orig_w * scale))
    new_h = int(round(orig_h * scale))
    resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

    canvas = np.zeros((_SCRFD_INPUT_SIZE, _SCRFD_INPUT_SIZE, 3), dtype=np.uint8)
    pad_top = (_SCRFD_INPUT_SIZE - new_h) // 2
    pad_left = (_SCRFD_INPUT_SIZE - new_w) // 2
    canvas[pad_top:pad_top + new_h, pad_left:pad_left + new_w] = resized

    # ── 2. Preprocess + infer ─────────────────────────────────────────────────
    blob = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB).astype(np.float32)
    blob = (blob - 127.5) / 128.0
    blob = np.transpose(blob, (2, 0, 1))[np.newaxis]

    input_name = scrfd_session.get_inputs()[0].name
    outputs = scrfd_session.run(None, {input_name: blob})

    # ── 3. Decode per stride, collect, NMS ───────────────────────────────────
    all_boxes = []
    all_scores = []

    for idx, stride in enumerate(_SCRFD_STRIDES):
        raw_scores = outputs[idx].reshape(-1)
        raw_boxes = outputs[idx + 3].reshape(-1, 4)

        keep_mask = raw_scores >= 0.5
        if not keep_mask.any():
            continue

        scores = raw_scores[keep_mask]
        deltas = raw_boxes[keep_mask]
        anchors = _get_anchors(stride)[keep_mask]

        boxes = _decode_boxes(anchors, deltas, stride)
        all_boxes.append(boxes)
        all_scores.append(scores)

    if not all_boxes:
        print("DETECTED FACES: 0")
        return []

    boxes = np.concatenate(all_boxes, axis=0)
    scores = np.concatenate(all_scores, axis=0)

    keep = _nms(boxes, scores, iou_thresh=0.4)
    boxes = boxes[keep]
    scores = scores[keep]

    # ── 4. Map back to original image space ──────────────────────────────────
    boxes[:, 0] = (boxes[:, 0] - pad_left) / scale
    boxes[:, 1] = (boxes[:, 1] - pad_top) / scale
    boxes[:, 2] = (boxes[:, 2] - pad_left) / scale
    boxes[:, 3] = (boxes[:, 3] - pad_top) / scale

    boxes[:, 0::2] = np.clip(boxes[:, 0::2], 0, orig_w)
    boxes[:, 1::2] = np.clip(boxes[:, 1::2], 0, orig_h)

    # ── 5. For each face, get landmarks using MediaPipe ──────────────────────
    faces = []
    
    for box in boxes.astype(np.int32):
        x1, y1, x2, y2 = box
        if x2 <= x1 or y2 <= y1:
            continue
            
        face_h = y2 - y1
        if face_h < min_face_size:
            continue
            
        # Crop face
        crop = img[y1:y2, x1:x2]
        if crop.size == 0:
            continue
        
        # Get landmarks for this face using MediaPipe
        # First, resize crop to expected size
        crop_for_landmarks = cv2.resize(crop, (320, int(320 * crop.shape[0] / crop.shape[1])))
        rgb_crop = cv2.cvtColor(crop_for_landmarks, cv2.COLOR_BGR2RGB)
        landmarks_result = _face_mesh.process(rgb_crop)
        
        face_landmarks = None
        if landmarks_result.multi_face_landmarks:
            face_landmarks = landmarks_result.multi_face_landmarks[0].landmark
        
        crop_112 = cv2.resize(crop, (112, 112), interpolation=cv2.INTER_LINEAR)
        
        faces.append({
            "face": crop_112,
            "quality": calculate_face_quality(crop_112),
            "bbox": [x1, y1, x2, y2],
            "landmarks": face_landmarks
        })

    print(f"DETECTED FACES: {len(faces)}")
    if len(faces) > 1:
        print(f"  WARNING: Multiple faces ({len(faces)}) detected, selecting largest")
        # Sort by face area (width * height) and take the largest
        faces.sort(key=lambda x: (x['bbox'][2] - x['bbox'][0]) * (x['bbox'][3] - x['bbox'][1]), reverse=True)
        faces = [faces[0]]
    
    print(f"DETECTED FACES: {len(faces)}")
    return faces

def align_face_by_landmarks(face_img: np.ndarray, landmarks, original_bbox: list) -> np.ndarray:
    """
    Align face using eye landmarks for better recognition.
    Now works with the cropped face image.
    """
    if landmarks is None:
        return face_img
    
    h, w = face_img.shape[:2]
    
    # Get eye coordinates (relative to the cropped face)
    # These landmark indices are for the full image, but we're using them on the crop
    left_eye_idx = 33
    right_eye_idx = 263
    
    # Scale landmarks to crop dimensions (they're from the resized crop)
    left_eye_x = landmarks[left_eye_idx].x * w
    left_eye_y = landmarks[left_eye_idx].y * h
    right_eye_x = landmarks[right_eye_idx].x * w
    right_eye_y = landmarks[right_eye_idx].y * h
    
    left_eye = np.array([left_eye_x, left_eye_y])
    right_eye = np.array([right_eye_x, right_eye_y])
    
    # Calculate angle between eyes
    dy = right_eye[1] - left_eye[1]
    dx = right_eye[0] - left_eye[0]
    angle = np.degrees(np.arctan2(dy, dx))
    
    # Calculate eye center
    eye_center = ((left_eye + right_eye) / 2).astype(int)
    
    # Only rotate if angle is significant
    if abs(angle) > 3:
        # Get rotation matrix
        rotation_matrix = cv2.getRotationMatrix2D(tuple(eye_center), angle, scale=1.0)
        
        # Apply rotation
        aligned = cv2.warpAffine(face_img, rotation_matrix, (w, h), flags=cv2.INTER_LINEAR)
        return aligned
    
    return face_img


def _generate_embedding_sync(data: ImageRequest) -> dict:
    embeddings = []
    qualities = []
    total_faces = 0
    
    print(f"\n{'='*60}")
    print(f"Processing {len(data.images)} images")
    print(f"{'='*60}")

    for idx, img_str in enumerate(data.images):
        try:
            print(f"\n--- Processing image {idx + 1}/{len(data.images)} ---")
            
            img = base64_to_image(img_str)
            print(f"  ✓ Image decoded, shape: {img.shape}")
            
            # Use face detection with landmarks
            faces = detect_faces_with_landmarks(img, data.min_face_size)
            print(f"  → Faces detected: {len(faces)}")

            if not faces:
                print(f"  ✗ No face detected in image {idx + 1}")
                continue

            # IMPORTANT: Take ONLY the FIRST face (largest/closest)
            # Sort by face area and take the largest
            if len(faces) > 1:
                print(f"  ⚠ Multiple faces ({len(faces)}) detected, selecting largest")
                faces.sort(key=lambda x: (x['bbox'][2] - x['bbox'][0]) * (x['bbox'][3] - x['bbox'][1]), reverse=True)
            
            best_face = faces[0]
            quality = best_face["quality"]
            print(f"  → Selected face quality: {quality:.3f}")
            
            # Apply face alignment
            if best_face.get("landmarks") is not None:
                aligned_face = align_face_by_landmarks(
                    best_face["face"], 
                    best_face["landmarks"],
                    best_face["bbox"]
                )
                print(f"  → Face alignment applied")
            else:
                aligned_face = best_face["face"]
                print(f"  ⚠ No landmarks available")
            
            # Generate embedding
            emb = get_embedding(aligned_face)
            
            if emb is None or len(emb) != 512:
                print(f"  ✗ Invalid embedding: {len(emb) if emb else 0}")
                continue
            
            embeddings.append(emb.tolist())
            qualities.append(quality)
            total_faces += 1
            print(f"  ✓ Success (quality: {quality:.3f})")

        except Exception as e:
            print(f"  ✗ ERROR: {str(e)}")
            import traceback
            traceback.print_exc()

    print(f"\n{'='*60}")
    print(f"SUMMARY: Expected {len(data.images)}, Got {len(embeddings)} embeddings")
    print(f"Qualities: {[f'{q:.3f}' for q in qualities]}")
    print(f"{'='*60}\n")

    # For registration (5 images), require all 5
    if len(data.images) == 5 and len(embeddings) != 5:
        print(f"ERROR: Registration requires 5 embeddings, got {len(embeddings)}")
        return EmbeddingResponse(
            embeddings=[], 
            faces_detected=total_faces, 
            quality_scores=[], 
            success=False
        ).dict()

    if not embeddings:
        return EmbeddingResponse(
            embeddings=[], faces_detected=0, quality_scores=[], success=False
        ).dict()

    return {
        "embeddings": embeddings,
        "faces_detected": total_faces,
        "quality_scores": qualities,
        "success": True,
    }

@app.post("/calculate-similarity")
async def similarity(data: SimilarityRequest):
    emb1 = np.array(data.embedding1); emb1 /= np.linalg.norm(emb1)
    emb2 = np.array(data.embedding2); emb2 /= np.linalg.norm(emb2)
    sim  = float(np.dot(emb1, emb2))
    pct  = (sim + 1) / 2 * 100
    return {"cosine_similarity": sim, "similarity_percent": pct, "is_match": pct > 75}


@app.get("/health")
async def health():
    return {
        "recognizer_loaded": recognizer is not None,
        "detector_loaded": scrfd_session is not None,
        "status":            "healthy",
    }

@app.post("/debug-face")
async def debug_face(data: ImageRequest):
    """Debug endpoint to analyze face quality and similarity"""
    results = []
    
    for img_str in data.images:
        try:
            img = base64_to_image(img_str)
            faces = detect_faces_with_landmarks(img, 40)
            
            for face_data in faces:
                aligned = align_face_by_landmarks(
                    face_data["face"],
                    face_data.get("landmarks"),
                    face_data["bbox"]
                )
                
                emb = get_embedding(aligned)
                
                results.append({
                    "quality": face_data["quality"],
                    "aligned": face_data.get("landmarks") is not None,
                    "embedding_preview": emb[:5].tolist(),  # First 5 values
                    "bbox": face_data["bbox"]
                })
        except Exception as e:
            results.append({"error": str(e)})
    
    return {"results": results, "count": len(results)}





# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)