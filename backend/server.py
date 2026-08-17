from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query, UploadFile, File
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# ---------------- MongoDB ----------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---------------- Object Storage ----------------
import requests as _requests
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "hamstore"
_storage_key = None


def init_storage(force: bool = False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = _requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = _requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = _requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = _requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = _requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


MIME_TYPES = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif", "webp": "image/webp"}

# ---------------- App ----------------
app = FastAPI(title="Toko HP Management API")
api = APIRouter(prefix="/api")

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"

# For staff role enforcement: staff users (role 'staf' or 'staff') are only allowed
# to access a restricted set of API prefixes. All other API paths will return 403.
STAFF_ALLOWED_PREFIXES = [
    "/api/auth",
    "/api/sales",
    "/api/shifts",
    "/api/ppob",
    "/api/products",
    "/api/stock",
    "/api/stock/opname",
    "/api/stock/movements",
    "/api/stock/analysis",
    "/api/hp-prices",
    "/api/service-prices",
    "/api/services",
    "/api/customers",
    "/api/expenses",
    "/api/attendance",
    "/api/tasks",
    "/api/content-posts",
    "/api/shifts",
    "/api/ppob",
    "/api/dashboard",
]


@app.middleware("http")
async def enforce_staff_routes(request: Request, call_next):
    path = request.url.path
    # only enforce for API routes
    if not path.startswith("/api"):
        return await call_next(request)
    # try to get token from cookie or Authorization header
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        return await call_next(request)
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        return await call_next(request)
    role = (payload.get("role") or "").lower()
    if role in ("staf", "staff"):
        allowed = False
        for p in STAFF_ALLOWED_PREFIXES:
            if path == p or path.startswith(p + "/"):
                allowed = True
                break
        if not allowed:
            return Response(status_code=403, content='{"detail":"Access denied for role staf"}', media_type="application/json")
    return await call_next(request)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------------- Helpers ----------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def hash_password(pwd: str) -> str:
    return bcrypt.hashpw(pwd.encode(), bcrypt.gensalt()).decode()


def verify_password(pwd: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pwd.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_roles(*roles):
    async def checker(user: dict = Depends(get_current_user)):
        if roles and user.get("role") not in roles and user.get("role") != "owner":
            raise HTTPException(status_code=403, detail="Access denied")
        return user
    return checker


# ---------------- Models ----------------
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "kasir"  # owner, kasir, staf


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ProductIn(BaseModel):
    name: str
    sku: Optional[str] = ""
    brand: Optional[str] = ""
    category: Optional[str] = "Handphone"
    imei: Optional[str] = ""
    stock: int = 0
    min_stock: int = 1
    cost_price: float = 0  # HPP
    sell_price: float = 0
    description: Optional[str] = ""
    image_url: Optional[str] = ""
    # Additional optional fields
    battery_health: Optional[str] = ""  # percent or text
    condition: Optional[str] = ""  # Baru / Bekas / Like New
    internet_type: Optional[str] = ""  # WiFi Only / All Operator
    device_status: Optional[str] = ""  # Bea Cukai / iBox / lainnya
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = ""
    color: Optional[str] = ""


class CustomerIn(BaseModel):
    name: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    address: Optional[str] = ""
    device_type: Optional[str] = ""  # tipe HP yang dibeli
    imei: Optional[str] = ""
    note: Optional[str] = ""


class SupplierIn(BaseModel):
    name: str
    phone: Optional[str] = ""
    address: Optional[str] = ""


class SaleItemIn(BaseModel):
    product_id: str
    product_name: str
    qty: int
    price: float
    cost_price: float = 0


class TradeInIn(BaseModel):
    device_name: str
    imei: Optional[str] = ""
    condition: Optional[str] = ""
    trade_value: float = 0  # nilai potongan / nilai tukar
    cost_price: float = 0   # HPP saat masuk ke inventaris


class SaleIn(BaseModel):
    customer_id: Optional[str] = None
    customer_name: Optional[str] = "Umum"
    items: List[SaleItemIn]
    discount: float = 0
    tax: float = 0
    paid: float = 0
    payment_method: str = "cash"  # cash, transfer, hutang
    note: Optional[str] = ""
    mode: str = "jual"  # jual | tukar_tambah
    trade_in: Optional[TradeInIn] = None


class PurchaseItemIn(BaseModel):
    product_id: Optional[str] = None
    product_name: Optional[str] = ""
    qty: int = 1
    cost_price: float = 0
    imeis: Optional[List[str]] = None
    color: Optional[str] = None
    battery_health: Optional[str] = None
    condition: Optional[str] = None
    internet_type: Optional[str] = None
    device_status: Optional[str] = None
    # product_template can include product fields to create a new product when product_id is not provided
    product_template: Optional[dict] = None


class PurchaseIn(BaseModel):
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = "Umum"
    items: List[PurchaseItemIn]
    paid: float = 0
    payment_method: str = "cash"
    note: Optional[str] = ""


class StockOpnameItemIn(BaseModel):
    product_id: str
    product_name: str
    system_stock: int
    physical_stock: int


class StockOpnameIn(BaseModel):
    note: Optional[str] = ""
    items: List[StockOpnameItemIn]


class ExpenseIn(BaseModel):
    category: str
    amount: float
    description: Optional[str] = ""
    date: Optional[str] = None


class DebtIn(BaseModel):
    kind: str  # hutang or piutang
    party_name: str
    amount: float
    due_date: Optional[str] = None
    note: Optional[str] = ""
    reference: Optional[str] = ""


class DebtPaymentIn(BaseModel):
    amount: float
    note: Optional[str] = ""
    date: Optional[str] = None
    method: Optional[str] = "cash"


class AttendanceIn(BaseModel):
    staff_id: str
    kind: str  # in | out | break_start | break_end
    shift: Optional[str] = "pagi"  # pagi | siang
    note: Optional[str] = ""


class HpPriceIn(BaseModel):
    brand: str
    model: str
    market_price: float
    note: Optional[str] = ""


class PPOBIn(BaseModel):
    kind: str  # pulsa, token_pln, paket_data, bpjs, pdam
    customer_number: str
    customer_name: Optional[str] = ""
    nominal: float
    price: float  # harga jual ke pelanggan
    cost: float  # harga modal
    payment_method: str = "cash"


class ServicePriceIn(BaseModel):
    name: str  # ex: Ganti LCD iPhone 11
    category: Optional[str] = "Umum"
    price: float
    duration_hours: Optional[float] = 1
    description: Optional[str] = ""


class ServiceIn(BaseModel):
    customer_name: str
    customer_phone: Optional[str] = ""
    device_name: str
    imei: Optional[str] = ""
    complaint: str
    technician_id: Optional[str] = None
    technician_name: Optional[str] = ""
    service_type: Optional[str] = ""
    service_price: float = 0
    sparepart_cost: float = 0
    total_price: float = 0
    dp: float = 0
    note: Optional[str] = ""


class ServiceStatusIn(BaseModel):
    status: str  # antre, diproses, selesai, diambil, batal
    note: Optional[str] = ""


class TaskIn(BaseModel):
    title: str
    description: Optional[str] = ""
    assignee_id: str
    priority: str = "normal"  # low, normal, high
    deadline: Optional[str] = None


class TaskStatusIn(BaseModel):
    status: str  # todo, in_progress, done, missed
    note: Optional[str] = ""


class ContentPostIn(BaseModel):
    staff_id: str
    platform: str  # tiktok, instagram, facebook, youtube, whatsapp
    content_type: Optional[str] = "post"  # post, story, reel, video
    title: Optional[str] = ""
    target_time: str  # ISO datetime target upload
    actual_time: Optional[str] = None
    status: str = "scheduled"  # scheduled, uploaded, missed
    link: Optional[str] = ""
    note: Optional[str] = ""


class AssetIn(BaseModel):
    name: str
    category: Optional[str] = "Umum"
    quantity: int = 1
    condition: Optional[str] = "Baik"  # Baik, Rusak, Butuh Servis
    acquired_date: Optional[str] = None
    value: float = 0
    location: Optional[str] = ""
    note: Optional[str] = ""


class IMEIIn(BaseModel):
    imei: str
    result: Optional[str] = ""  # optional manual result / note
    note: Optional[str] = ""


@api.get("/imei-history")
async def list_imei(request: Request, q: Optional[str] = None, page: int = 1, limit: int = 100, user: dict = Depends(get_current_user)):
    query = {}
    if q:
        query["$or"] = [{"imei": {"$regex": q, "$options": "i"}}, {"result": {"$regex": q, "$options": "i"}}, {"note": {"$regex": q, "$options": "i"}}]
    skip = max(0, (page - 1) * limit)
    rows = await db.imei_history.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    # maintain backward compatibility: return raw list unless pagination/sort/date params provided
    if not any(k in request.query_params for k in ("page", "limit", "sort_by", "sort_dir", "start", "end")):
        return rows
    return {"page": page, "limit": limit, "items": rows}


@api.post("/imei-history")
async def create_imei(body: IMEIIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["user_id"] = user.get("id")
    doc["user_name"] = user.get("name")
    doc["created_at"] = now_iso()
    await db.imei_history.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/imei-history/{iid}")
async def delete_imei(iid: str, user: dict = Depends(get_current_user)):
    await db.imei_history.delete_one({"id": iid})
    return {"ok": True}


# ---------------- Auth Routes ----------------
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    uid = new_id()
    doc = {
        "id": uid,
        "name": body.name,
        "email": email,
        "password_hash": hash_password(body.password),
        "role": body.role,
        "active": True,
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    token = create_access_token(uid, email, body.role)
    response.set_cookie("access_token", token, httponly=True, secure=True, samesite="none", max_age=43200, path="/")
    return {"id": uid, "name": body.name, "email": email, "role": body.role, "token": token}


@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Akun tidak aktif")
    token = create_access_token(user["id"], email, user["role"])
    response.set_cookie("access_token", token, httponly=True, secure=True, samesite="none", max_age=43200, path="/")
    return {"id": user["id"], "name": user["name"], "email": email, "role": user["role"], "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ---------------- Users / Staff ----------------
@api.get("/staff")
async def list_staff(user: dict = Depends(get_current_user)):
    docs = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return docs


@api.post("/staff")
async def create_staff(body: RegisterIn, user: dict = Depends(require_roles("owner"))):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    uid = new_id()
    doc = {
        "id": uid, "name": body.name, "email": email,
        "password_hash": hash_password(body.password),
        "role": body.role, "active": True, "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    doc.pop("password_hash", None)
    doc.pop("_id", None)
    return doc


@api.put("/staff/{sid}")
async def update_staff(sid: str, body: dict, user: dict = Depends(require_roles("owner"))):
    updates = {k: v for k, v in body.items() if k in ("name", "role", "active", "phone", "address")}
    if "password" in body and body["password"]:
        updates["password_hash"] = hash_password(body["password"])
    await db.users.update_one({"id": sid}, {"$set": updates})
    return {"ok": True}


@api.delete("/staff/{sid}")
async def delete_staff(sid: str, user: dict = Depends(require_roles("owner"))):
    await db.users.delete_one({"id": sid})
    return {"ok": True}


# ---------------- Products ----------------
@api.get("/products")
async def list_products(
    request: Request,
    q: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    supplier_id: Optional[str] = None,
    condition: Optional[str] = None,
    internet_type: Optional[str] = None,
    device_status: Optional[str] = None,
    stock_status: Optional[str] = None,  # 'available' or 'out'
    min_stock: Optional[int] = None,
    sort_by: Optional[str] = "created_at",
    sort_dir: Optional[int] = -1,
    page: int = 1,
    limit: int = 100,
    user: dict = Depends(get_current_user),
):
    query: dict = {}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"sku": {"$regex": q, "$options": "i"}},
            {"imei": {"$regex": q, "$options": "i"}},
            {"brand": {"$regex": q, "$options": "i"}},
        ]
    if category:
        query["category"] = category
    if brand:
        query["brand"] = brand
    if supplier_id:
        query["supplier_id"] = supplier_id
    if condition:
        query["condition"] = condition
    if internet_type:
        query["internet_type"] = internet_type
    if device_status:
        query["device_status"] = device_status
    if stock_status:
        if stock_status == "out":
            query["stock"] = {"$lte": 0}
        elif stock_status == "available":
            query["stock"] = {"$gte": 1}
    if min_stock is not None:
        query["stock"] = {"$lte": min_stock}
    allowed_sort = {"name", "sell_price", "cost_price", "stock", "created_at"}
    sb = sort_by if sort_by in allowed_sort else "created_at"
    sd = -1 if sort_dir == -1 else 1
    skip = max(0, (page - 1) * limit)
    cursor = db.products.find(query, {"_id": 0}).sort(sb, sd).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    if not any(k in request.query_params for k in ("page", "limit", "sort_by", "sort_dir", "start", "end")):
        return docs
    return {"page": page, "limit": limit, "items": docs}


@api.post("/products")
async def create_product(body: ProductIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["created_at"] = now_iso()
    await db.products.insert_one(doc)
    await log_activity(user, "Tambah Produk", f"{doc.get('name')} · modal Rp {doc.get('cost_price', 0):,.0f} · jual Rp {doc.get('sell_price', 0):,.0f}", "produk")
    doc.pop("_id", None)
    return doc


@api.put("/products/{pid}")
async def update_product(pid: str, body: ProductIn, user: dict = Depends(get_current_user)):
    await db.products.update_one({"id": pid}, {"$set": body.model_dump()})
    return {"ok": True}


@api.delete("/products/{pid}")
async def delete_product(pid: str, user: dict = Depends(get_current_user)):
    await db.products.delete_one({"id": pid})
    return {"ok": True}


# ---------------- Customers ----------------
@api.get("/customers")
async def list_customers(
    request: Request,
    q: Optional[str] = None,
    sort_by: Optional[str] = "created_at",
    sort_dir: Optional[int] = -1,
    page: int = 1,
    limit: int = 100,
    user: dict = Depends(get_current_user),
):
    query = {}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"imei": {"$regex": q, "$options": "i"}},
        ]
    allowed_sort = {"name", "created_at", "phone"}
    sb = sort_by if sort_by in allowed_sort else "created_at"
    sd = -1 if sort_dir == -1 else 1
    # If no pagination/search params provided, return full legacy list for compatibility
    if not any(k in request.query_params for k in ("page", "limit", "sort_by", "sort_dir", "q")):
        return await db.customers.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
    skip = max(0, (page - 1) * limit)
    rows = await db.customers.find(query, {"_id": 0}).sort(sb, sd).skip(skip).limit(limit).to_list(length=limit)
    return {"page": page, "limit": limit, "items": rows}


@api.post("/customers")
async def create_customer(body: CustomerIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["created_at"] = now_iso()
    await db.customers.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/customers/{cid}")
async def update_customer(cid: str, body: CustomerIn, user: dict = Depends(get_current_user)):
    await db.customers.update_one({"id": cid}, {"$set": body.model_dump()})
    return {"ok": True}


@api.delete("/customers/{cid}")
async def delete_customer(cid: str, user: dict = Depends(get_current_user)):
    await db.customers.delete_one({"id": cid})
    return {"ok": True}


# ---------------- Suppliers ----------------
@api.get("/suppliers")
async def list_suppliers(user: dict = Depends(get_current_user)):
    return await db.suppliers.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api.post("/suppliers")
async def create_supplier(body: SupplierIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["created_at"] = now_iso()
    await db.suppliers.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/suppliers/{sid}")
async def delete_supplier(sid: str, user: dict = Depends(get_current_user)):
    await db.suppliers.delete_one({"id": sid})
    return {"ok": True}


# ---------------- Sales ----------------
async def _log_stock(product_id: str, product_name: str, delta: int, kind: str, ref: str, user_id: str):
    await db.stock_movements.insert_one({
        "id": new_id(), "product_id": product_id, "product_name": product_name,
        "delta": delta, "kind": kind, "reference": ref, "user_id": user_id, "date": now_iso(),
    })


@api.post("/sales")
async def create_sale(body: SaleIn, user: dict = Depends(get_current_user)):
    sid = new_id()
    subtotal = sum(i.qty * i.price for i in body.items)
    total_cost = sum(i.qty * i.cost_price for i in body.items)
    trade_value = body.trade_in.trade_value if (body.mode == "tukar_tambah" and body.trade_in) else 0
    total = subtotal - body.discount + body.tax - trade_value
    profit = subtotal - total_cost - body.discount - trade_value
    invoice = f"INV-{datetime.now().strftime('%Y%m%d')}-{sid[:6].upper()}"
    doc = {
        "id": sid, "invoice": invoice, "customer_id": body.customer_id,
        "customer_name": body.customer_name, "items": [i.model_dump() for i in body.items],
        "subtotal": subtotal, "discount": body.discount, "tax": body.tax,
        "total": total, "total_cost": total_cost, "profit": profit,
        "paid": body.paid, "change": max(0, body.paid - total),
        "due": max(0, total - body.paid),
        "payment_method": body.payment_method, "note": body.note,
        "cashier_id": user["id"], "cashier_name": user["name"],
        "mode": body.mode, "trade_in": body.trade_in.model_dump() if body.trade_in else None,
        "trade_value": trade_value,
        "date": now_iso(), "status": "paid" if body.paid >= total else "hutang",
    }
    await db.sales.insert_one(doc)
    await log_activity(user, "Penjualan", f"{invoice} · {body.customer_name or 'Umum'} · Rp {total:,.0f}", "penjualan")
    for item in body.items:
        await db.products.update_one({"id": item.product_id}, {"$inc": {"stock": -item.qty}})
        await _log_stock(item.product_id, item.product_name, -item.qty, "sale", invoice, user["id"])
    # if trade-in, add device to products inventory
    if body.mode == "tukar_tambah" and body.trade_in and body.trade_in.device_name:
        ti = body.trade_in
        new_prod = {
            "id": new_id(), "name": f"[BEKAS] {ti.device_name}",
            "sku": "", "brand": "", "category": "HP Bekas", "imei": ti.imei or "",
            "stock": 1, "min_stock": 1,
            "cost_price": ti.cost_price or ti.trade_value,
            "sell_price": (ti.cost_price or ti.trade_value) * 1.15,
            "description": f"Trade-in {ti.condition or ''}", "created_at": now_iso(),
        }
        await db.products.insert_one(new_prod)
        await _log_stock(new_prod["id"], new_prod["name"], 1, "trade_in", invoice, user["id"])
    if doc["due"] > 0:
        await db.debts.insert_one({
            "id": new_id(), "kind": "piutang", "party_name": body.customer_name or "Umum",
            "amount": doc["due"], "paid": 0, "remaining": doc["due"],
            "reference": invoice, "note": f"Penjualan {invoice}",
            "created_at": now_iso(), "status": "open",
        })
    doc.pop("_id", None)
    return doc


@api.get("/sales")
async def list_sales(
    q: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    sort_by: Optional[str] = "date",
    sort_dir: Optional[int] = -1,
    page: int = 1,
    limit: int = 100,
    user: dict = Depends(get_current_user),
):
    query: dict = {}
    if start or end:
        query["date"] = {}
        if start: query["date"]["$gte"] = start
        if end: query["date"]["$lte"] = end
    if q:
        query["$or"] = [
            {"invoice": {"$regex": q, "$options": "i"}},
            {"customer_name": {"$regex": q, "$options": "i"}},
            {"items.product_name": {"$regex": q, "$options": "i"}},
        ]
    allowed_sort = {"date", "customer_name", "total", "invoice"}
    sb = sort_by if sort_by in allowed_sort else "date"
    sd = -1 if sort_dir == -1 else 1
    skip = max(0, (page - 1) * limit)
    rows = await db.sales.find(query, {"_id": 0}).sort(sb, sd).skip(skip).limit(limit).to_list(length=limit)
    if user.get("role") != "owner":
        for r in rows:
            r.pop("profit", None)
            r.pop("total_cost", None)
            for it in r.get("items", []):
                it.pop("cost_price", None)

    # Simple heuristic: if common pagination/filter params are not present, return legacy list for compatibility
    if page == 1 and limit == 100 and not start and not end and not q:
        return rows
    return {"page": page, "limit": limit, "items": rows}


@api.get("/sales/{sid}")
async def get_sale(sid: str, user: dict = Depends(get_current_user)):
    doc = await db.sales.find_one({"id": sid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


# ---------------- Purchases ----------------
@api.post("/purchases")
async def create_purchase(body: PurchaseIn, user: dict = Depends(get_current_user)):
    pid = new_id()
    subtotal = sum(i.qty * i.cost_price for i in body.items)
    invoice = f"PO-{datetime.now().strftime('%Y%m%d')}-{pid[:6].upper()}"
    doc = {
        "id": pid, "invoice": invoice, "supplier_id": body.supplier_id,
        "supplier_name": body.supplier_name, "items": [i.model_dump() for i in body.items],
        "total": subtotal, "paid": body.paid, "due": max(0, subtotal - body.paid),
        "payment_method": body.payment_method, "note": body.note,
        "user_id": user["id"], "user_name": user["name"],
        "date": now_iso(), "status": "paid" if body.paid >= subtotal else "hutang",
    }
    await db.purchases.insert_one(doc)
    # Process each purchased item: support creating new products and per-unit IMEIs
    for item in body.items:
        # determine qty based on imeis if provided
        qty = item.qty
        imeis = item.imeis or []
        if imeis and len(imeis) != 0:
            qty = len(imeis)

        # if product_id missing but product_template provided, create product
        if not item.product_id and item.product_template:
            pdoc = {**item.product_template}
            pdoc["id"] = new_id()
            pdoc["name"] = pdoc.get("name") or item.product_name or "Produk Baru"
            pdoc["stock"] = qty
            pdoc["cost_price"] = item.cost_price
            pdoc["created_at"] = now_iso()
            await db.products.insert_one(pdoc)
            product_id = pdoc["id"]
        else:
            product_id = item.product_id

        if product_id:
            # update product stock
            await db.products.update_one({"id": product_id}, {"$inc": {"stock": qty}, "$set": {"cost_price": item.cost_price}})
            await _log_stock(product_id, item.product_name, qty, "purchase", invoice, user["id"])

            # create inventory unit records for each IMEI (if provided)
            for im in imeis:
                u = {
                    "id": new_id(), "product_id": product_id, "imei": im,
                    "cost_price": item.cost_price, "color": item.color,
                    "battery_health": item.battery_health, "condition": item.condition,
                    "internet_type": item.internet_type, "device_status": item.device_status,
                    "created_at": now_iso(), "status": "in_stock",
                }
                await db.inventory_units.insert_one(u)
        else:
            # no product_id and no template: skip
            continue
    if doc["due"] > 0:
        await db.debts.insert_one({
            "id": new_id(), "kind": "hutang", "party_name": body.supplier_name or "Umum",
            "amount": doc["due"], "paid": 0, "remaining": doc["due"],
            "reference": invoice, "note": f"Pembelian {invoice}",
            "created_at": now_iso(), "status": "open",
        })
    doc.pop("_id", None)
    return doc


@api.get("/purchases")
async def list_purchases(start: Optional[str] = None, end: Optional[str] = None, user: dict = Depends(get_current_user)):
    q: dict = {}
    if start or end:
        q["date"] = {}
        if start: q["date"]["$gte"] = start
        if end: q["date"]["$lte"] = end
    return await db.purchases.find(q, {"_id": 0}).sort("date", -1).to_list(2000)


# ---------------- Stock ----------------
@api.get("/stock/movements")
async def stock_movements(
    request: Request,
    q: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    sort_by: Optional[str] = "date",
    sort_dir: Optional[int] = -1,
    page: int = 1,
    limit: int = 200,
    user: dict = Depends(get_current_user),
):
    qf: dict = {}
    if start or end:
        qf["date"] = {}
        if start: qf["date"]["$gte"] = start
        if end: qf["date"]["$lte"] = end
    if q:
        qf["$or"] = [
            {"product_name": {"$regex": q, "$options": "i"}},
            {"reference": {"$regex": q, "$options": "i"}},
        ]
    allowed_sort = {"date", "product_name", "delta"}
    sb = sort_by if sort_by in allowed_sort else "date"
    sd = -1 if sort_dir == -1 else 1
    skip = max(0, (page - 1) * limit)
    rows = await db.stock_movements.find(qf, {"_id": 0}).sort(sb, sd).skip(skip).limit(limit).to_list(length=limit)
    if not any(k in request.query_params for k in ("page", "limit", "sort_by", "sort_dir", "start", "end")):
        return rows
    return {"page": page, "limit": limit, "items": rows}


@api.post("/stock/opname")
async def create_opname(body: StockOpnameIn, user: dict = Depends(get_current_user)):
    oid = new_id()
    items_out = []
    for it in body.items:
        diff = it.physical_stock - it.system_stock
        items_out.append({**it.model_dump(), "diff": diff})
        if diff != 0:
            await db.products.update_one({"id": it.product_id}, {"$set": {"stock": it.physical_stock}})
            await _log_stock(it.product_id, it.product_name, diff, "opname", oid, user["id"])
    doc = {"id": oid, "note": body.note, "items": items_out, "date": now_iso(), "user_id": user["id"], "user_name": user["name"]}
    await db.stock_opname.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/stock/opname")
async def list_opname(user: dict = Depends(get_current_user)):
    return await db.stock_opname.find({}, {"_id": 0}).sort("date", -1).to_list(500)


# ---------------- Expenses ----------------
@api.get("/expenses")
async def list_expenses(user: dict = Depends(get_current_user)):
    return await db.expenses.find({}, {"_id": 0}).sort("date", -1).to_list(1000)


@api.post("/expenses")
async def create_expense(body: ExpenseIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["date"] = doc.get("date") or now_iso()
    doc["user_id"] = user["id"]
    doc["user_name"] = user["name"]
    await db.expenses.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/expenses/{eid}")
async def delete_expense(eid: str, user: dict = Depends(get_current_user)):
    await db.expenses.delete_one({"id": eid})
    return {"ok": True}


# ---------------- Debts (Hutang/Piutang) ----------------
@api.get("/debts")
async def list_debts(kind: Optional[str] = None, user: dict = Depends(get_current_user)):
    q: dict = {}
    if kind: q["kind"] = kind
    return await db.debts.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api.post("/debts")
async def create_debt(body: DebtIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["paid"] = 0
    doc["remaining"] = doc["amount"]
    doc["status"] = "open"
    doc["created_at"] = now_iso()
    await db.debts.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.post("/debts/{did}/pay")
async def pay_debt(did: str, body: DebtPaymentIn, user: dict = Depends(get_current_user)):
    debt = await db.debts.find_one({"id": did})
    if not debt:
        raise HTTPException(404, "Not found")
    # allow specifying payment date and method; date defaults to now
    pay_date = body.date or now_iso()
    new_paid = debt.get("paid", 0) + body.amount
    remaining = debt["amount"] - new_paid
    status = "paid" if remaining <= 0 else "open"
    await db.debts.update_one({"id": did}, {"$set": {"paid": new_paid, "remaining": max(0, remaining), "status": status}})
    payment_doc = {
        "id": new_id(), "debt_id": did, "amount": body.amount, "note": body.note,
        "date": pay_date, "user_id": user["id"], "user_name": user.get("name"), "method": body.method or "cash", "remaining_after": max(0, remaining)
    }
    await db.debt_payments.insert_one(payment_doc)
    return {"ok": True, "remaining": max(0, remaining), "payment": payment_doc}


@api.delete("/debts/{did}")
async def delete_debt(did: str, user: dict = Depends(get_current_user)):
    await db.debts.delete_one({"id": did})
    return {"ok": True}


@api.get("/debts/{did}/payments")
async def list_debt_payments(did: str, user: dict = Depends(get_current_user)):
    # return payments for a debt ordered by date asc
    items = await db.debt_payments.find({"debt_id": did}, {"_id": 0}).sort("date", 1).to_list(1000)
    return {"items": items}


# ---------------- Attendance ----------------
SHIFT_HOURS = {
    "pagi": {"in_h": 9, "in_m": 30, "out_h": 19, "out_m": 0},
    "siang": {"in_h": 13, "in_m": 0, "out_h": 22, "out_m": 30},
}


def _wib_now():
    """Return datetime in WIB (UTC+7)."""
    return datetime.now(timezone.utc) + timedelta(hours=7)


@api.get("/attendance")
async def list_attendance(user: dict = Depends(get_current_user)):
    return await db.attendance.find({}, {"_id": 0}).sort("date", -1).to_list(1000)


@api.post("/attendance")
async def create_attendance(body: AttendanceIn, user: dict = Depends(get_current_user)):
    staff = await db.users.find_one({"id": body.staff_id}, {"_id": 0, "password_hash": 0})
    now_wib = _wib_now()
    doc = body.model_dump()
    doc.update({
        "id": new_id(),
        "staff_name": staff["name"] if staff else "Unknown",
        "date": now_iso(),
        "wib_time": now_wib.strftime("%H:%M:%S"),
        "wib_date": now_wib.strftime("%Y-%m-%d"),
    })

    late_min = 0
    overtime_min = 0
    sh = SHIFT_HOURS.get(body.shift or "pagi", SHIFT_HOURS["pagi"])
    if body.kind == "in":
        # scheduled in time today (in local wib)
        sched = now_wib.replace(hour=sh["in_h"], minute=sh["in_m"], second=0, microsecond=0)
        delta = (now_wib - sched).total_seconds() / 60.0
        if delta > 0:
            late_min = int(delta)
    elif body.kind == "out":
        sched = now_wib.replace(hour=sh["out_h"], minute=sh["out_m"], second=0, microsecond=0)
        delta = (now_wib - sched).total_seconds() / 60.0
        if delta > 0:
            overtime_min = int(delta)

    doc["late_minutes"] = late_min
    doc["overtime_minutes"] = overtime_min

    await db.attendance.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/attendance/summary")
async def attendance_summary(start: Optional[str] = None, end: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {}
    if start or end:
        q["date"] = {}
        if start: q["date"]["$gte"] = start
        if end: q["date"]["$lte"] = end
    from collections import defaultdict
    data = defaultdict(lambda: {"in": 0, "late_total": 0, "overtime_total": 0, "days": set()})
    rows = await db.attendance.find(q, {"_id": 0}).to_list(5000)
    for r in rows:
        sid = r.get("staff_id")
        d = data[sid]
        d["staff_id"] = sid
        d["staff_name"] = r.get("staff_name")
        if r.get("kind") == "in": d["in"] += 1
        d["late_total"] += r.get("late_minutes", 0) or 0
        d["overtime_total"] += r.get("overtime_minutes", 0) or 0
        d["days"].add(r.get("wib_date") or (r.get("date") or "")[:10])
    result = []
    for sid, d in data.items():
        result.append({
            "staff_id": sid, "staff_name": d.get("staff_name"),
            "check_ins": d["in"], "days_present": len(d["days"]),
            "late_minutes": d["late_total"], "overtime_minutes": d["overtime_total"],
        })
    return result


@api.get("/attendance/daily")
async def attendance_daily(start: Optional[str] = None, end: Optional[str] = None, staff_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {}
    if start or end:
        q["date"] = {}
        if start: q["date"]["$gte"] = start
        if end: q["date"]["$lte"] = end
    if staff_id:
        q["staff_id"] = staff_id
    rows = await db.attendance.find(q, {"_id": 0}).to_list(5000)
    # group by staff_id and wib_date
    groups = {}
    for r in rows:
        key = (r.get("staff_id"), r.get("wib_date"))
        g = groups.setdefault(key, {"staff_id": r.get("staff_id"), "staff_name": r.get("staff_name"), "date": r.get("wib_date"), "shift": r.get("shift"), "entries": []})
        g["entries"].append(r)

    out = []
    from datetime import datetime as _dt
    for (sid, wdate), g in groups.items():
        entries = g["entries"]
        # helper to parse time "HH:MM:SS"
        def to_minutes(t):
            try:
                hh, mm, ss = map(int, t.split(":"))
                return hh * 60 + mm
            except Exception:
                return None

        in_times = [e.get("wib_time") for e in entries if e.get("kind") == "in"]
        out_times = [e.get("wib_time") for e in entries if e.get("kind") == "out"]
        bstart_times = [e.get("wib_time") for e in entries if e.get("kind") == "break_start"]
        bend_times = [e.get("wib_time") for e in entries if e.get("kind") == "break_end"]

        in_time = min(in_times) if in_times else None
        out_time = max(out_times) if out_times else None
        break_start = min(bstart_times) if bstart_times else None
        break_end = min(bend_times) if bend_times else None

        total_minutes = None
        try:
            if in_time and out_time:
                im = to_minutes(in_time); om = to_minutes(out_time)
                total = (om - im) if (im is not None and om is not None) else None
                # subtract break duration if both present
                if break_start and break_end:
                    bm = to_minutes(break_start); be = to_minutes(break_end)
                    if bm is not None and be is not None:
                        total -= max(0, be - bm)
                total_minutes = total
        except Exception:
            total_minutes = None

        late_total = sum((e.get("late_minutes") or 0) for e in entries)
        overtime_total = sum((e.get("overtime_minutes") or 0) for e in entries)

        out.append({
            "staff_id": sid,
            "staff_name": g.get("staff_name"),
            "date": g.get("date"),
            "shift": g.get("shift"),
            "in_time": in_time,
            "break_start": break_start,
            "break_end": break_end,
            "out_time": out_time,
            "total_minutes": total_minutes,
            "late_minutes": late_total,
            "overtime_minutes": overtime_total,
        })
    # sort by date desc then staff
    out.sort(key=lambda x: (x.get("date") or "", x.get("staff_name") or ""), reverse=True)
    return out


# ---------------- PPOB ----------------
@api.get("/ppob")
async def list_ppob(
    request: Request,
    q: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    sort_by: Optional[str] = "date",
    sort_dir: Optional[int] = -1,
    page: int = 1,
    limit: int = 100,
    user: dict = Depends(get_current_user),
):
    query: dict = {}
    if start or end:
        query["date"] = {}
        if start: query["date"]["$gte"] = start
        if end: query["date"]["$lte"] = end
    if q:
        query["$or"] = [
            {"customer_name": {"$regex": q, "$options": "i"}},
            {"customer_number": {"$regex": q, "$options": "i"}},
            {"invoice": {"$regex": q, "$options": "i"}},
        ]
    allowed_sort = {"date", "customer_name", "price", "invoice"}
    sb = sort_by if sort_by in allowed_sort else "date"
    sd = -1 if sort_dir == -1 else 1
    skip = max(0, (page - 1) * limit)
    rows = await db.ppob.find(query, {"_id": 0}).sort(sb, sd).skip(skip).limit(limit).to_list(length=limit)
    if not any(k in request.query_params for k in ("page", "limit", "sort_by", "sort_dir", "start", "end")):
        return rows
    return {"page": page, "limit": limit, "items": rows}


@api.post("/ppob")
async def create_ppob(body: PPOBIn, user: dict = Depends(get_current_user)):
    pid = new_id()
    profit = body.price - body.cost
    doc = body.model_dump()
    doc.update({
        "id": pid, "profit": profit, "date": now_iso(),
        "user_id": user["id"], "user_name": user["name"],
        "invoice": f"PPOB-{datetime.now().strftime('%Y%m%d')}-{pid[:6].upper()}",
        "status": "success",
    })
    await db.ppob.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ---------------- Dashboard & Reports ----------------
@api.get("/dashboard/summary")
async def dashboard_summary(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    month_start = datetime.now(timezone.utc).replace(day=1).strftime("%Y-%m-%d")
    
    async def sum_field(col, field, start):
        pipeline = [{"$match": {"date": {"$gte": start}}}, {"$group": {"_id": None, "s": {"$sum": f"${field}"}}}]
        r = await col.aggregate(pipeline).to_list(1)
        return r[0]["s"] if r else 0

    sales_today = await sum_field(db.sales, "total", today)
    sales_month = await sum_field(db.sales, "total", month_start)
    profit_month = await sum_field(db.sales, "profit", month_start)
    ppob_month = await sum_field(db.ppob, "profit", month_start)
    expense_month = await sum_field(db.expenses, "amount", month_start)
    
    tx_today = await db.sales.count_documents({"date": {"$gte": today}})
    products_count = await db.products.count_documents({})
    customers_count = await db.customers.count_documents({})
    low_stock = await db.products.count_documents({"$expr": {"$lte": ["$stock", "$min_stock"]}})
    hutang = await db.debts.aggregate([{"$match": {"kind": "hutang", "status": "open"}}, {"$group": {"_id": None, "s": {"$sum": "$remaining"}}}]).to_list(1)
    piutang = await db.debts.aggregate([{"$match": {"kind": "piutang", "status": "open"}}, {"$group": {"_id": None, "s": {"$sum": "$remaining"}}}]).to_list(1)

    # last 7 days sales
    from collections import defaultdict
    trend = defaultdict(float)
    sales_recent = await db.sales.find({"date": {"$gte": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()}}, {"_id": 0, "date": 1, "total": 1}).to_list(2000)
    for s in sales_recent:
        d = s["date"][:10]
        trend[d] += s["total"]
    trend_list = [{"date": k, "total": v} for k, v in sorted(trend.items())]

    top_content = await db.content_posts.find({"status": {"$in": ["upload", "uploaded"]}}, {"_id": 0}).sort("views", -1).to_list(6)
    result = {
        "sales_today": sales_today, "sales_month": sales_month,
        "profit_month": profit_month + (ppob_month or 0) - (expense_month or 0),
        "gross_profit": profit_month, "ppob_profit": ppob_month, "expense_month": expense_month,
        "tx_today": tx_today, "products_count": products_count,
        "customers_count": customers_count, "low_stock_count": low_stock,
        "total_hutang": hutang[0]["s"] if hutang else 0,
        "total_piutang": piutang[0]["s"] if piutang else 0,
        "trend_7d": trend_list,
        "top_content": top_content,
    }
    if user.get("role") != "owner":
        for k in ["profit_month", "gross_profit", "ppob_profit", "expense_month", "total_hutang", "total_piutang"]:
            result.pop(k, None)
    return result


@api.get("/reports/profit-loss")
async def report_pl(start: str, end: str, user: dict = Depends(require_roles("owner"))):
    sales = await db.sales.find({"date": {"$gte": start, "$lte": end}}, {"_id": 0}).to_list(5000)
    ppob = await db.ppob.find({"date": {"$gte": start, "$lte": end}}, {"_id": 0}).to_list(5000)
    expenses = await db.expenses.find({"date": {"$gte": start, "$lte": end}}, {"_id": 0}).to_list(5000)
    services = await db.services.find({"created_at": {"$gte": start, "$lte": end}}, {"_id": 0}).to_list(5000)
    purchases = await db.purchases.find({"date": {"$gte": start, "$lte": end}}, {"_id": 0}).to_list(5000)

    sales_revenue = sum(s.get("total", 0) for s in sales)
    hpp = sum(s.get("total_cost", 0) for s in sales)
    sales_profit = sum(s.get("profit", 0) for s in sales)
    ppob_revenue = sum(p.get("price", 0) for p in ppob)
    ppob_cost = sum(p.get("cost", 0) for p in ppob)
    ppob_profit = sum(p.get("profit", 0) for p in ppob)
    service_revenue = sum(s.get("total_price", 0) for s in services)
    service_cost = sum(s.get("sparepart_cost", 0) for s in services)
    service_profit = service_revenue - service_cost
    total_expense = sum(e.get("amount", 0) for e in expenses)
    purchase_total = sum(p.get("total", 0) for p in purchases)

    total_omset = sales_revenue + ppob_revenue + service_revenue
    gross_profit = sales_profit + ppob_profit + service_profit
    net = gross_profit - total_expense
    return {
        "revenue": sales_revenue, "hpp": hpp, "gross_profit": sales_profit,
        "sales_revenue": sales_revenue, "sales_hpp": hpp, "sales_profit": sales_profit, "sales_count": len(sales),
        "ppob_revenue": ppob_revenue, "ppob_cost": ppob_cost, "ppob_profit": ppob_profit, "ppob_count": len(ppob),
        "service_revenue": service_revenue, "service_cost": service_cost, "service_profit": service_profit, "service_count": len(services),
        "purchase_total": purchase_total, "purchase_count": len(purchases),
        "total_omset": total_omset, "total_gross_profit": gross_profit,
        "total_expense": total_expense, "net_profit": net,
        "expense_breakdown": _breakdown(expenses, "category", "amount"),
    }


def _breakdown(items, key, field):
    from collections import defaultdict
    d = defaultdict(float)
    for i in items:
        d[i.get(key, "-")] += i.get(field, 0)
    return [{"label": k, "value": v} for k, v in d.items()]


@api.get("/reports/sales")
async def report_sales(start: str, end: str, user: dict = Depends(get_current_user)):
    sales = await db.sales.find({"date": {"$gte": start, "$lte": end}}, {"_id": 0}).sort("date", -1).to_list(5000)
    total = sum(s.get("total", 0) for s in sales)
    profit = sum(s.get("profit", 0) for s in sales)
    return {"total": total, "profit": profit, "count": len(sales), "items": sales}


@api.get("/reports/purchases")
async def report_purchases(start: str, end: str, user: dict = Depends(get_current_user)):
    purchases = await db.purchases.find({"date": {"$gte": start, "$lte": end}}, {"_id": 0}).sort("date", -1).to_list(5000)
    total = sum(p.get("total", 0) for p in purchases)
    return {"total": total, "count": len(purchases), "items": purchases}


# ---------------- Service Prices (Master) ----------------
@api.get("/service-prices")
async def list_service_prices(user: dict = Depends(get_current_user)):
    return await db.service_prices.find({}, {"_id": 0}).sort("category", 1).to_list(1000)


@api.post("/service-prices")
async def create_service_price(body: ServicePriceIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["created_at"] = now_iso()
    await db.service_prices.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/service-prices/{sid}")
async def update_service_price(sid: str, body: ServicePriceIn, user: dict = Depends(get_current_user)):
    await db.service_prices.update_one({"id": sid}, {"$set": body.model_dump()})
    return {"ok": True}


@api.delete("/service-prices/{sid}")
async def delete_service_price(sid: str, user: dict = Depends(get_current_user)):
    await db.service_prices.delete_one({"id": sid})
    return {"ok": True}


# ---------------- Services (Repair Jobs) ----------------
@api.get("/services")
async def list_services(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    q: dict = {}
    if status: q["status"] = status
    return await db.services.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api.post("/services")
async def create_service(body: ServiceIn, user: dict = Depends(get_current_user)):
    sid = new_id()
    total = (body.total_price or (body.service_price + body.sparepart_cost))
    doc = body.model_dump()
    doc.update({
        "id": sid,
        "invoice": f"SRV-{datetime.now().strftime('%Y%m%d')}-{sid[:6].upper()}",
        "total_price": total,
        "paid": body.dp,
        "remaining": max(0, total - body.dp),
        "status": "antre",
        "history": [{"status": "antre", "date": now_iso(), "note": "Barang diterima"}],
        "created_at": now_iso(),
        "user_id": user["id"], "user_name": user["name"],
    })
    await db.services.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/services/{sid}/status")
async def update_service_status(sid: str, body: ServiceStatusIn, user: dict = Depends(get_current_user)):
    srv = await db.services.find_one({"id": sid})
    if not srv:
        raise HTTPException(404, "Not found")
    hist = srv.get("history", []) + [{"status": body.status, "date": now_iso(), "note": body.note, "by": user["name"]}]
    updates = {"status": body.status, "history": hist}
    if body.status == "diambil":
        updates["remaining"] = 0
        updates["paid"] = srv.get("total_price", 0)
    await db.services.update_one({"id": sid}, {"$set": updates})
    return {"ok": True}


@api.delete("/services/{sid}")
async def delete_service(sid: str, user: dict = Depends(get_current_user)):
    await db.services.delete_one({"id": sid})
    return {"ok": True}


# ---------------- Tasks / Jobdesk ----------------
@api.get("/tasks")
async def list_tasks(assignee_id: Optional[str] = None, status: Optional[str] = None, user: dict = Depends(get_current_user)):
    q: dict = {}
    if assignee_id: q["assignee_id"] = assignee_id
    if status: q["status"] = status
    return await db.tasks.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api.post("/tasks")
async def create_task(body: TaskIn, user: dict = Depends(get_current_user)):
    assignee = await db.users.find_one({"id": body.assignee_id}, {"_id": 0, "name": 1})
    doc = body.model_dump()
    doc.update({
        "id": new_id(),
        "assignee_name": assignee["name"] if assignee else "-",
        "status": "todo",
        "created_by": user["name"],
        "created_at": now_iso(),
        "completed_at": None,
    })
    await db.tasks.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/tasks/{tid}/status")
async def update_task_status(tid: str, body: TaskStatusIn, user: dict = Depends(get_current_user)):
    updates: dict = {"status": body.status}
    if body.status == "done":
        updates["completed_at"] = now_iso()
    await db.tasks.update_one({"id": tid}, {"$set": updates})
    return {"ok": True}


@api.delete("/tasks/{tid}")
async def delete_task(tid: str, user: dict = Depends(get_current_user)):
    await db.tasks.delete_one({"id": tid})
    return {"ok": True}


# ---------------- Content Schedule ----------------
@api.get("/content-posts")
async def list_content_posts(staff_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q: dict = {}
    if staff_id: q["staff_id"] = staff_id
    return await db.content_posts.find(q, {"_id": 0}).sort("target_time", -1).to_list(1000)


@api.post("/content-posts")
async def create_content_post(body: ContentPostIn, user: dict = Depends(get_current_user)):
    staff = await db.users.find_one({"id": body.staff_id}, {"_id": 0, "name": 1})
    doc = body.model_dump()
    doc.update({
        "id": new_id(),
        "staff_name": staff["name"] if staff else "-",
        "views": 0, "likes": 0, "comments": 0,
        "created_at": now_iso(),
    })
    await db.content_posts.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/content-posts/{cid}/mark-uploaded")
async def mark_content_uploaded(cid: str, body: dict, user: dict = Depends(get_current_user)):
    post = await db.content_posts.find_one({"id": cid})
    if not post:
        raise HTTPException(404, "Not found")
    actual = body.get("actual_time") or now_iso()
    link = body.get("link", post.get("link", ""))
    target = post.get("target_time")
    status = "uploaded"
    # if actual is > 30 min late from target, mark missed
    try:
        t = datetime.fromisoformat(target.replace("Z", "+00:00")) if target else None
        a = datetime.fromisoformat(actual.replace("Z", "+00:00"))
        if t and (a - t).total_seconds() > 1800:
            status = "late"
    except Exception:
        pass
    await db.content_posts.update_one({"id": cid}, {"$set": {"actual_time": actual, "status": status, "link": link}})
    return {"ok": True, "status": status}


@api.put("/content-posts/{cid}/status")
async def update_content_status(cid: str, body: dict, user: dict = Depends(get_current_user)):
    post = await db.content_posts.find_one({"id": cid})
    if not post:
        raise HTTPException(404, "Not found")
    status = body.get("status")
    updates = {"status": status}
    if status in ("upload", "uploaded"):
        updates["status"] = "upload"
        updates["actual_time"] = body.get("actual_time") or now_iso()
        if body.get("link"):
            updates["link"] = body.get("link")
    await db.content_posts.update_one({"id": cid}, {"$set": updates})
    return {"ok": True, "status": updates["status"]}


@api.put("/content-posts/{cid}/metrics")
async def update_content_metrics(cid: str, body: dict, user: dict = Depends(get_current_user)):
    updates = {}
    for k in ("views", "likes", "comments"):
        if k in body:
            updates[k] = int(body.get(k) or 0)
    if "link" in body:
        updates["link"] = body["link"]
    await db.content_posts.update_one({"id": cid}, {"$set": updates})
    return {"ok": True}


@api.delete("/content-posts/{cid}")
async def delete_content_post(cid: str, user: dict = Depends(get_current_user)):
    await db.content_posts.delete_one({"id": cid})
    return {"ok": True}


# ---------------- Performance Summary ----------------
@api.get("/performance/summary")
async def performance_summary(start: Optional[str] = None, end: Optional[str] = None, user: dict = Depends(require_roles("owner"))):
    from collections import defaultdict
    start = start or (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    end = end or now_iso()

    staff_list = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    result = []
    for s in staff_list:
        sid = s["id"]
        # Sales as cashier
        sales_agg = await db.sales.aggregate([
            {"$match": {"cashier_id": sid, "date": {"$gte": start, "$lte": end}}},
            {"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}, "profit": {"$sum": "$profit"}}}
        ]).to_list(1)
        # Tasks
        tasks_done = await db.tasks.count_documents({"assignee_id": sid, "status": "done"})
        tasks_todo = await db.tasks.count_documents({"assignee_id": sid, "status": {"$in": ["todo", "in_progress"]}})
        tasks_missed = await db.tasks.count_documents({"assignee_id": sid, "status": "missed"})
        # Content
        cnt_uploaded = await db.content_posts.count_documents({"staff_id": sid, "status": "uploaded"})
        cnt_late = await db.content_posts.count_documents({"staff_id": sid, "status": "late"})
        cnt_missed = await db.content_posts.count_documents({"staff_id": sid, "status": "missed"})
        cnt_scheduled = await db.content_posts.count_documents({"staff_id": sid, "status": "scheduled"})
        # Services handled
        srv_count = await db.services.count_documents({"technician_id": sid})
        # Attendance
        att_in = await db.attendance.count_documents({"staff_id": sid, "kind": "in", "date": {"$gte": start, "$lte": end}})

        total_tasks = tasks_done + tasks_todo + tasks_missed
        total_content = cnt_uploaded + cnt_late + cnt_missed + cnt_scheduled
        task_score = (tasks_done / total_tasks * 100) if total_tasks else 0
        content_score = (cnt_uploaded / (cnt_uploaded + cnt_late + cnt_missed) * 100) if (cnt_uploaded + cnt_late + cnt_missed) else 0
        overall = round((task_score * 0.5 + content_score * 0.5), 1) if (total_tasks or total_content) else 0

        result.append({
            "staff_id": sid, "name": s["name"], "role": s.get("role"),
            "sales_total": sales_agg[0]["total"] if sales_agg else 0,
            "sales_count": sales_agg[0]["count"] if sales_agg else 0,
            "sales_profit": sales_agg[0]["profit"] if sales_agg else 0,
            "tasks_done": tasks_done, "tasks_todo": tasks_todo, "tasks_missed": tasks_missed,
            "content_uploaded": cnt_uploaded, "content_late": cnt_late,
            "content_missed": cnt_missed, "content_scheduled": cnt_scheduled,
            "services_handled": srv_count,
            "attendance_days": att_in,
            "task_score": round(task_score, 1),
            "content_score": round(content_score, 1),
            "overall_score": overall,
        })
    return {"start": start, "end": end, "staff": result}


# ---------------- HP Prices (Trade-in / Buy master) ----------------
DEFAULT_GRADES = {"A": 0.85, "B": 0.75, "C": 0.60, "D": 0.40}


@api.get("/hp-prices")
async def list_hp_prices(q: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if q:
        query = {"$or": [{"model": {"$regex": q, "$options": "i"}}, {"brand": {"$regex": q, "$options": "i"}}]}
    return await db.hp_prices.find(query, {"_id": 0}).sort("model", 1).to_list(1000)


@api.post("/hp-prices")
async def create_hp_price(body: HpPriceIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["updated_at"] = now_iso()
    await db.hp_prices.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/hp-prices/{hid}")
async def update_hp_price(hid: str, body: HpPriceIn, user: dict = Depends(get_current_user)):
    await db.hp_prices.update_one({"id": hid}, {"$set": {**body.model_dump(), "updated_at": now_iso()}})
    return {"ok": True}


@api.delete("/hp-prices/{hid}")
async def delete_hp_price(hid: str, user: dict = Depends(get_current_user)):
    await db.hp_prices.delete_one({"id": hid})
    return {"ok": True}


@api.get("/hp-prices/grades")
async def get_grades(user: dict = Depends(get_current_user)):
    cfg = await db.settings.find_one({"key": "hp_grades"}, {"_id": 0})
    return cfg.get("value") if cfg else DEFAULT_GRADES


@api.post("/hp-prices/grades")
async def set_grades(body: dict, user: dict = Depends(require_roles("owner"))):
    await db.settings.update_one({"key": "hp_grades"}, {"$set": {"value": body}}, upsert=True)
    return {"ok": True}


# ---------------- Bulk Import ----------------
@api.post("/import/products")
async def import_products(body: dict, user: dict = Depends(require_roles("owner"))):
    items = body.get("items", [])
    if body.get("clear"):
        await db.products.delete_many({})
    added = 0
    for it in items:
        doc = {
            "id": new_id(),
            "name": it.get("name", ""),
            "sku": it.get("sku", ""),
            "brand": it.get("brand", ""),
            "category": it.get("category", "Handphone"),
            "imei": it.get("imei", ""),
            "stock": int(it.get("stock", 0) or 0),
            "min_stock": int(it.get("min_stock", 1) or 1),
            "cost_price": float(it.get("cost_price", 0) or 0),
            "sell_price": float(it.get("sell_price", 0) or 0),
            "description": it.get("description", ""),
            "created_at": now_iso(),
        }
        await db.products.insert_one(doc)
        added += 1
    return {"added": added}


@api.post("/import/service-prices")
async def import_service_prices(body: dict, user: dict = Depends(require_roles("owner"))):
    items = body.get("items", [])
    if body.get("clear"):
        await db.service_prices.delete_many({})
    for it in items:
        doc = {**it, "id": new_id(), "created_at": now_iso()}
        await db.service_prices.insert_one(doc)
    return {"added": len(items)}


@api.post("/import/hp-prices")
async def import_hp_prices(body: dict, user: dict = Depends(require_roles("owner"))):
    items = body.get("items", [])
    if body.get("clear"):
        await db.hp_prices.delete_many({})
    for it in items:
        doc = {**it, "id": new_id(), "updated_at": now_iso()}
        await db.hp_prices.insert_one(doc)
    return {"added": len(items)}


@api.post("/seed/from-files")
async def seed_from_files(user: dict = Depends(require_roles("owner"))):
    """One-click seed for the pre-uploaded HAM STORE data files."""
    import json as _json
    root = ROOT_DIR
    results = {}
    mapping = [
        ("products", "seed_products.json", db.products),
        ("service_prices", "seed_services.json", db.service_prices),
        ("hp_prices", "seed_hp_prices.json", db.hp_prices),
    ]
    for key, fname, col in mapping:
        p = root / fname
        if not p.exists():
            results[key] = {"skipped": True, "reason": "file not found"}
            continue
        data = _json.loads(p.read_text())
        existing = await col.count_documents({})
        if existing > 0:
            results[key] = {"skipped": True, "existing": existing}
            continue
        for it in data:
            doc = {**it, "id": new_id(), "created_at": now_iso()}
            await col.insert_one(doc)
        results[key] = {"added": len(data)}
    return results


# ---------------- Assets ----------------
@api.get("/assets")
async def list_assets(
    request: Request,
    q: Optional[str] = None,
    category: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    sort_by: Optional[str] = "acquired_date",
    sort_dir: Optional[int] = -1,
    page: int = 1,
    limit: int = 100,
    user: dict = Depends(get_current_user),
):
    query: dict = {}
    if q:
        query["$or"] = [{"name": {"$regex": q, "$options": "i"}}, {"location": {"$regex": q, "$options": "i"}}, {"note": {"$regex": q, "$options": "i"}}]
    if category:
        query["category"] = category
    if start or end:
        query["acquired_date"] = {}
        if start: query["acquired_date"]["$gte"] = start
        if end: query["acquired_date"]["$lte"] = end
    allowed_sort = {"acquired_date", "name", "value", "quantity"}
    sb = sort_by if sort_by in allowed_sort else "acquired_date"
    sd = -1 if sort_dir == -1 else 1
    skip = max(0, (page - 1) * limit)
    rows = await db.assets.find(query, {"_id": 0}).sort(sb, sd).skip(skip).limit(limit).to_list(length=limit)
    if not any(k in request.query_params for k in ("page", "limit", "sort_by", "sort_dir", "start", "end")):
        return rows
    return {"page": page, "limit": limit, "items": rows}


@api.post("/assets")
async def create_asset(body: AssetIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["created_at"] = now_iso()
    await db.assets.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/assets/{aid}")
async def update_asset(aid: str, body: AssetIn, user: dict = Depends(get_current_user)):
    await db.assets.update_one({"id": aid}, {"$set": body.model_dump()})
    return {"ok": True}


@api.delete("/assets/{aid}")
async def delete_asset(aid: str, user: dict = Depends(get_current_user)):
    await db.assets.delete_one({"id": aid})
    return {"ok": True}


@api.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "bin"
    ctype = file.content_type or MIME_TYPES.get(ext, "application/octet-stream")
    path = f"{APP_NAME}/uploads/{new_id()}.{ext}"
    data = await file.read()
    result = put_object(path, data, ctype)
    await db.files.insert_one({
        "id": new_id(), "storage_path": result["path"], "original_filename": file.filename,
        "content_type": ctype, "size": result.get("size", 0), "is_deleted": False, "created_at": now_iso(),
    })
    return {"url": f"/api/files/{result['path']}", "path": result["path"]}


@app.get("/api/files/{path:path}")
async def serve_file(path: str):
    rec = await db.files.find_one({"storage_path": path, "is_deleted": False})
    data, ct = get_object(path)
    return Response(content=data, media_type=(rec.get("content_type") if rec else None) or ct)


# ---------------- Activity Log ----------------
async def log_activity(user: dict, action: str, detail: str = "", category: str = "umum"):
    try:
        await db.activity_logs.insert_one({
            "id": new_id(), "user_id": user.get("id"), "user_name": user.get("name"),
            "role": user.get("role"), "action": action, "detail": detail,
            "category": category, "date": now_iso(),
        })
    except Exception:
        pass


@api.get("/activity-logs")
async def list_activity_logs(limit: int = 300, user: dict = Depends(require_roles("owner"))):
    return await db.activity_logs.find({}, {"_id": 0}).sort("date", -1).to_list(limit)


# ---------------- Cash Drawer / Shift ----------------
class ShiftOpenIn(BaseModel):
    opening_cash: float = 0
    note: Optional[str] = ""


class ShiftCloseIn(BaseModel):
    cash_actual: float = 0
    edc_actual: float = 0
    brilink_actual: float = 0
    bank_actual: float = 0
    note: Optional[str] = ""


@api.get("/shifts/current")
async def current_shift(user: dict = Depends(get_current_user)):
    return await db.shifts.find_one({"opened_by": user["id"], "status": "open"}, {"_id": 0})


@api.post("/shifts/open")
async def open_shift(body: ShiftOpenIn, user: dict = Depends(get_current_user)):
    if await db.shifts.find_one({"opened_by": user["id"], "status": "open"}):
        raise HTTPException(400, "Masih ada shift yang terbuka. Tutup dulu.")
    doc = {
        "id": new_id(), "opened_by": user["id"], "opened_by_name": user["name"],
        "opening_cash": body.opening_cash, "note": body.note,
        "opened_at": now_iso(), "status": "open",
    }
    await db.shifts.insert_one(doc)
    await log_activity(user, "Buka Shift", f"Modal laci awal Rp {body.opening_cash:,.0f}", "shift")
    doc.pop("_id", None)
    return doc


@api.post("/shifts/close")
async def close_shift(body: ShiftCloseIn, user: dict = Depends(get_current_user)):
    shift = await db.shifts.find_one({"opened_by": user["id"], "status": "open"})
    if not shift:
        raise HTTPException(400, "Tidak ada shift terbuka")
    start, end = shift["opened_at"], now_iso()
    sales = await db.sales.find({"cashier_id": user["id"], "date": {"$gte": start, "$lte": end}}, {"_id": 0}).to_list(5000)
    ppob = await db.ppob.find({"date": {"$gte": start, "$lte": end}}, {"_id": 0}).to_list(5000)
    by_method = {"cash": 0.0, "transfer": 0.0, "hutang": 0.0}
    for s in sales:
        m = s.get("payment_method", "cash")
        by_method[m] = by_method.get(m, 0) + s.get("paid", 0)
    ppob_cash = sum(p.get("price", 0) for p in ppob if p.get("payment_method", "cash") == "cash")
    cash_sales = by_method.get("cash", 0) + ppob_cash
    expected_cash = shift["opening_cash"] + cash_sales
    total_actual = body.cash_actual + body.edc_actual + body.brilink_actual + body.bank_actual
    updates = {
        "status": "closed", "closed_at": end, "closed_by_name": user["name"],
        "cash_sales": cash_sales, "transfer_sales": by_method.get("transfer", 0),
        "ppob_total": sum(p.get("price", 0) for p in ppob),
        "expected_cash": expected_cash,
        "cash_actual": body.cash_actual, "edc_actual": body.edc_actual,
        "brilink_actual": body.brilink_actual, "bank_actual": body.bank_actual,
        "total_actual": total_actual, "cash_diff": body.cash_actual - expected_cash,
        "sales_count": len(sales), "close_note": body.note,
    }
    await db.shifts.update_one({"id": shift["id"]}, {"$set": updates})
    await log_activity(user, "Tutup Shift", f"Selisih kas Rp {updates['cash_diff']:,.0f}", "shift")
    return {"ok": True, "id": shift["id"], **updates}


@api.get("/shifts")
async def list_shifts(user: dict = Depends(get_current_user)):
    q = {} if user.get("role") == "owner" else {"opened_by": user["id"]}
    return await db.shifts.find(q, {"_id": 0}).sort("opened_at", -1).to_list(500)


# ---------------- Stock Analysis (barang lama) ----------------
@api.get("/stock/analysis")
async def stock_analysis(days: int = 30, user: dict = Depends(get_current_user)):
    from datetime import datetime as _dt, timezone as _tz
    prods = await db.products.find({"stock": {"$gt": 0}}, {"_id": 0}).to_list(5000)
    now = _dt.now(_tz.utc)
    old, tied = [], 0.0
    for p in prods:
        ca = p.get("created_at")
        if not ca:
            continue
        try:
            d = _dt.fromisoformat(str(ca).replace("Z", "+00:00"))
            if d.tzinfo is None:
                d = d.replace(tzinfo=_tz.utc)
        except Exception:
            continue
        age = (now - d).days
        if age >= days:
            modal = (p.get("cost_price", 0) or 0) * (p.get("stock", 0) or 0)
            tied += modal
            old.append({
                "id": p["id"], "name": p.get("name"), "imei": p.get("imei"),
                "brand": p.get("brand"), "stock": p.get("stock"),
                "cost_price": p.get("cost_price"), "modal": modal,
                "created_at": ca, "age_days": age,
            })
    old.sort(key=lambda x: x["age_days"], reverse=True)
    return {"days": days, "count": len(old), "total_modal": tied, "items": old}


@api.get("/stock/summary")
async def stock_summary(user: dict = Depends(get_current_user)):
    prods = await db.products.find({}, {"_id": 0}).to_list(10000)
    total_units = sum((p.get("stock", 0) or 0) for p in prods)
    total_modal = sum((p.get("cost_price", 0) or 0) * (p.get("stock", 0) or 0) for p in prods)
    total_nilai_jual = sum((p.get("sell_price", 0) or 0) * (p.get("stock", 0) or 0) for p in prods)
    low_stock = sum(1 for p in prods if 0 < (p.get("stock", 0) or 0) <= (p.get("min_stock", 0) or 0))
    out_stock = sum(1 for p in prods if (p.get("stock", 0) or 0) <= 0)
    return {
        "total_products": len(prods),
        "total_units": total_units,
        "total_modal": total_modal,
        "total_nilai_jual": total_nilai_jual,
        "potensi_laba": total_nilai_jual - total_modal,
        "low_stock_count": low_stock,
        "out_of_stock": out_stock,
    }


# ---------------- Include & CORS
app.include_router(api)

cors_origins = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "").split(",")
    if origin.strip() and origin.strip() != "*"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- Startup: seed admin & indexes ----------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.products.create_index("sku")
    await db.sales.create_index("date")
    await db.purchases.create_index("date")
    await db.hp_prices.create_index("model")

    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@tokohp.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": new_id(), "name": "Owner Toko", "email": admin_email,
            "password_hash": hash_password(admin_password), "role": "owner",
            "active": True, "created_at": now_iso(),
        })
        logger.info(f"Admin seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    # Ensure a default staff account exists for QA/tests
    staff_email = os.environ.get("STAFF_EMAIL", "staf@tokohp.com")
    staff_password = os.environ.get("STAFF_PASSWORD", "staf123")
    existing_staff = await db.users.find_one({"email": staff_email})
    if not existing_staff:
        await db.users.insert_one({
            "id": new_id(), "name": "Staff Toko", "email": staff_email,
            "password_hash": hash_password(staff_password), "role": "staf",
            "active": True, "created_at": now_iso(),
        })
        logger.info(f"Staff seeded: {staff_email}")

    # Auto-seed HAM STORE data if empty
    import json as _json
    seeds = [
        ("seed_products.json", db.products),
        ("seed_services.json", db.service_prices),
        ("seed_hp_prices.json", db.hp_prices),
    ]
    for fname, col in seeds:
        p = ROOT_DIR / fname
        if not p.exists():
            continue
        if await col.count_documents({}) > 0:
            continue
        try:
            data = _json.loads(p.read_text())
            for it in data:
                doc = {**it, "id": new_id(), "created_at": now_iso()}
                await col.insert_one(doc)
            logger.info(f"Seeded {len(data)} rows from {fname}")
        except Exception as e:
            logger.error(f"Seed failed {fname}: {e}")


@app.on_event("shutdown")
async def shutdown():
    client.close()
