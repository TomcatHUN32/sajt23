from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import socketio
import resend
import asyncio
import secrets
import string
from jose import JWTError, jwt
from passlib.context import CryptContext
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'secret')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@tuningtalalkozok.com')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://motor-lounge.preview.emergentagent.com')
resend.api_key = RESEND_API_KEY

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    username: str
    email: EmailStr
    bio: Optional[str] = ""
    profile_pic: Optional[str] = ""
    cover_pic: Optional[str] = ""
    wallet_balance: float = 0.0
    unique_payment_reference: str
    online_status: str = "offline"
    last_seen: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    role: int = 0
    email_verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfileUpdate(BaseModel):
    bio: Optional[str] = None
    profile_pic: Optional[str] = None
    cover_pic: Optional[str] = None

class Post(BaseModel):
    model_config = ConfigDict(extra="ignore")
    post_id: str
    user_id: str
    username: str
    profile_pic: Optional[str] = ""
    content: str
    image_base64: Optional[str] = ""
    video_base64: Optional[str] = ""
    reaction_count: int = 0
    comment_count: int = 0
    status: str = "pending"  # pending, approved, rejected
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PostCreate(BaseModel):
    content: str
    image_base64: Optional[str] = ""
    video_base64: Optional[str] = ""

class Reaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    reaction_id: str
    post_id: str
    user_id: str
    username: str
    reaction_type: str = "like"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReactionCreate(BaseModel):
    reaction_type: str = "like"

class Comment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    comment_id: str
    post_id: str
    user_id: str
    username: str
    profile_pic: Optional[str] = ""
    content: str
    image_base64: Optional[str] = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommentCreate(BaseModel):
    content: str
    image_base64: Optional[str] = ""

class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    event_id: str
    user_id: str
    username: str
    title: str
    description: str
    date: datetime
    end_date: Optional[datetime] = None
    city: str
    address: Optional[str] = ""
    entry_fee: float
    is_official: bool = False
    image_base64: Optional[str] = ""
    status: str = "pending"
    highlighted: bool = False
    highlighted_pending: bool = False
    going_count: int = 0
    not_going_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EventCreate(BaseModel):
    title: str
    description: str
    date: datetime
    end_date: Optional[datetime] = None
    city: str
    address: Optional[str] = ""
    entry_fee: float
    is_official: bool = False
    image_base64: Optional[str] = ""

class RSVP(BaseModel):
    model_config = ConfigDict(extra="ignore")
    rsvp_id: str
    event_id: str
    user_id: str
    status: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RSVPCreate(BaseModel):
    status: str

class FriendRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    request_id: str
    from_user_id: str
    to_user_id: str
    from_username: str
    to_username: str
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    payment_id: str
    user_id: str
    username: str
    amount: float
    payment_method: str
    unique_reference: str
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentCreate(BaseModel):
    amount: float
    payment_method: str

class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    message_id: str
    from_user_id: str
    to_user_id: str
    content: str
    read_status: bool = False
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

def generate_unique_reference():
    return 'AUTO-' + ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))

def generate_user_id():
    return 'user_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != 1:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
fastapi_app = FastAPI()

# CORS middleware - MUST be added before routes for proper registration
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

active_users = {}

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    if sid in active_users:
        user_id = active_users[sid]
        del active_users[sid]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"online_status": "offline", "last_seen": datetime.now(timezone.utc).isoformat()}}
        )
        await sio.emit('user_status_change', {"user_id": user_id, "status": "offline"}, skip_sid=sid)
    logger.info(f"Client disconnected: {sid}")
@sio.event
async def join_room(sid, data):
    user_id = data.get("user_id")
    if not user_id:
        return
    active_users[sid] = user_id
    await sio.enter_room(sid, user_id)
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"online_status": "online"}}
    )
    await sio.emit('user_status_change', {"user_id": user_id, "status": "online"}, skip_sid=sid)
    logger.info(f"User {user_id} joined room")

@sio.event
async def send_message(sid, data):
    from_user_id = data.get("from_user_id")
    to_user_id = data.get("to_user_id")
    content = data.get("content")

    message_id = 'msg_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
    message_data = {
        "message_id": message_id,
        "from_user_id": from_user_id,
        "to_user_id": to_user_id,
        "content": content,
        "read_status": False,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    await db.messages.insert_one(message_data.copy())
    await sio.emit('receive_message', message_data, room=to_user_id)
    await sio.emit('receive_message', message_data, room=from_user_id)

@sio.event
async def typing(sid, data):
    to_user_id = data.get("to_user_id")
    from_user_id = data.get("from_user_id")
    await sio.emit('typing_indicator', {"from_user_id": from_user_id}, room=to_user_id)

@fastapi_app.post("/api/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"$or": [{"email": user_data.email}, {"username": user_data.username}]}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email vagy felhasználónév már létezik")

    user_id = generate_user_id()
    payment_ref = generate_unique_reference()
    verification_token = secrets.token_urlsafe(32)

    user_doc = {
        "user_id": user_id,
        "username": user_data.username,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "bio": "",
        "profile_pic": "",
        "cover_pic": "",
        "wallet_balance": 0.0,
        "unique_payment_reference": payment_ref,
        "online_status": "offline",
        "last_seen": datetime.now(timezone.utc).isoformat(),
        "role": 0,
        "email_verified": False,
        "verification_token": verification_token,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.users.insert_one(user_doc.copy())

    verification_link = f"{FRONTEND_URL}/?verify_email={verification_token}"
    email_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #18181b; color: #ffffff;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #27272a; padding: 30px; border-radius: 10px;">
            <h2 style="color: #f97316; margin-bottom: 20px;">Üdvözlünk a TuningTalálkozón!</h2>
            <p style="color: #a1a1aa; margin-bottom: 20px;">Köszönjük a regisztrációt. Kattints az alábbi linkre az email cím megerősítéséhez:</p>
            <a href="{verification_link}" style="display: inline-block; padding: 12px 24px; background: #f97316; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Email megerősítése</a>
            <p style="color: #71717a; margin-top: 30px; font-size: 14px;">Ha nem te regisztráltál, kérjük figyelmen kívül hagyni ezt az emailt.</p>
            <p style="color: #a1a1aa; margin-top: 20px;">Üdvözlettel,<br>TuningTalálkozó csapata</p>
        </div>
    </body>
    </html>
    """

    try:
        await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [user_data.email],
            "subject": "Email megerősítés - TuningTalálkozó",
            "html": email_html
        })
    except Exception as e:
        logger.error(f"Email küldési hiba: {e}")

    token = create_access_token({"sub": user_id})
    return {"token": token, "user_id": user_id, "unique_payment_reference": payment_ref}

@fastapi_app.get("/api/auth/verify-email/{token}")
async def verify_email(token: str):
    from fastapi.responses import RedirectResponse

    user = await db.users.find_one({"verification_token": token}, {"_id": 0})
    if not user:
        return RedirectResponse(url=f"{FRONTEND_URL}/?verified=error")

    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"email_verified": True}, "$unset": {"verification_token": ""}}
    )

    return RedirectResponse(url=f"{FRONTEND_URL}/?verified=success")

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class EmailChangeRequest(BaseModel):
    new_email: EmailStr
    password: str

@fastapi_app.post("/api/auth/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    if not user:
        return {"message": "Ha az email létezik, küldtünk egy jelszó-visszaállító linket."}
    
    reset_token = secrets.token_urlsafe(32)
    reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"reset_token": reset_token, "reset_token_expires": reset_expires.isoformat()}}
    )
    
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    email_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #18181b; color: #ffffff;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #27272a; padding: 30px; border-radius: 10px;">
            <h2 style="color: #f97316; margin-bottom: 20px;">Jelszó visszaállítás</h2>
            <p style="color: #a1a1aa; margin-bottom: 20px;">Kaptunk egy kérelmet a jelszavad visszaállítására. Kattints az alábbi linkre:</p>
            <a href="{reset_link}" style="display: inline-block; padding: 12px 24px; background: #f97316; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Jelszó visszaállítása</a>
            <p style="color: #71717a; margin-top: 30px; font-size: 14px;">A link 1 órán belül lejár.</p>
            <p style="color: #71717a; font-size: 14px;">Ha nem te kérted, figyelmen kívül hagyhatod ezt az emailt.</p>
            <p style="color: #a1a1aa; margin-top: 20px;">Üdvözlettel,<br>TuningTalálkozó csapata</p>
        </div>
    </body>
    </html>
    """
    
    try:
        await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [request.email],
            "subject": "Jelszó visszaállítás - TuningTalálkozó",
            "html": email_html
        })
    except Exception as e:
        logger.error(f"Email küldési hiba: {e}")
    
    return {"message": "Ha az email létezik, küldtünk egy jelszó-visszaállító linket."}

@fastapi_app.post("/api/auth/reset-password")
async def reset_password(request: PasswordResetConfirm):
    user = await db.users.find_one({"reset_token": request.token}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=400, detail="Érvénytelen vagy lejárt token")
    
    if user.get("reset_token_expires"):
        expires = datetime.fromisoformat(user["reset_token_expires"])
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(status_code=400, detail="A token lejárt")
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {"password_hash": hash_password(request.new_password)},
            "$unset": {"reset_token": "", "reset_token_expires": ""}
        }
    )
    
    return {"message": "Jelszó sikeresen megváltoztatva"}

@fastapi_app.post("/api/auth/request-email-change")
async def request_email_change(request: EmailChangeRequest, current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Hibás jelszó")
    
    existing = await db.users.find_one({"email": request.new_email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Ez az email cím már használatban van")
    
    email_change_token = secrets.token_urlsafe(32)
    
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$set": {"pending_email": request.new_email, "email_change_token": email_change_token}}
    )
    
    verification_link = f"{FRONTEND_URL}/?verify_email_change={email_change_token}"
    email_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #18181b; color: #ffffff;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #27272a; padding: 30px; border-radius: 10px;">
            <h2 style="color: #f97316; margin-bottom: 20px;">Email cím módosítása</h2>
            <p style="color: #a1a1aa; margin-bottom: 20px;">Kattints az alábbi linkre az új email cím megerősítéséhez:</p>
            <a href="{verification_link}" style="display: inline-block; padding: 12px 24px; background: #f97316; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Email megerősítése</a>
            <p style="color: #71717a; margin-top: 30px; font-size: 14px;">Ha nem te kérted, figyelmen kívül hagyhatod ezt az emailt.</p>
            <p style="color: #a1a1aa; margin-top: 20px;">Üdvözlettel,<br>TuningTalálkozó csapata</p>
        </div>
    </body>
    </html>
    """
    
    try:
        await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [request.new_email],
            "subject": "Email megerősítés - TuningTalálkozó",
            "html": email_html
        })
    except Exception as e:
        logger.error(f"Email küldési hiba: {e}")
        raise HTTPException(status_code=500, detail="Email küldési hiba")
    
    return {"message": "Megerősítő email elküldve az új címre"}

@fastapi_app.get("/api/auth/verify-email-change/{token}")
async def verify_email_change(token: str):
    from fastapi.responses import RedirectResponse
    
    user = await db.users.find_one({"email_change_token": token}, {"_id": 0})
    if not user or not user.get("pending_email"):
        return RedirectResponse(url=f"{FRONTEND_URL}/?email_changed=error")
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$set": {"email": user["pending_email"]},
            "$unset": {"pending_email": "", "email_change_token": ""}
        }
    )
    
    return RedirectResponse(url=f"{FRONTEND_URL}/?email_changed=success")

@fastapi_app.post("/api/auth/resend-verification")
async def resend_verification(current_user: User = Depends(get_current_user)):
    if current_user.email_verified:
        raise HTTPException(status_code=400, detail="Email már meg van erősítve")
    
    verification_token = secrets.token_urlsafe(32)
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$set": {"verification_token": verification_token}}
    )
    
    verification_link = f"{FRONTEND_URL}/?verify_email={verification_token}"
    email_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #18181b; color: #ffffff;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #27272a; padding: 30px; border-radius: 10px;">
            <h2 style="color: #f97316; margin-bottom: 20px;">Email megerősítés</h2>
            <p style="color: #a1a1aa; margin-bottom: 20px;">Kattints az alábbi linkre az email cím megerősítéséhez:</p>
            <a href="{verification_link}" style="display: inline-block; padding: 12px 24px; background: #f97316; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Email megerősítése</a>
            <p style="color: #71717a; margin-top: 30px; font-size: 14px;">Ha nem te kérted, figyelmen kívül hagyhatod ezt az emailt.</p>
            <p style="color: #a1a1aa; margin-top: 20px;">Üdvözlettel,<br>TuningTalálkozó csapata</p>
        </div>
    </body>
    </html>
    """
    
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0, "email": 1})
    
    try:
        await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [user["email"]],
            "subject": "Email megerősítés - TuningTalálkozó",
            "html": email_html
        })
    except Exception as e:
        logger.error(f"Email küldési hiba: {e}")
        raise HTTPException(status_code=500, detail="Email küldési hiba")
    
    return {"message": "Megerősítő email elküldve"}

@fastapi_app.post("/api/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Hibás email vagy jelszó")

    if not user.get("email_verified", False):
        # Új megerősítő email küldése automatikusan
        verification_token = secrets.token_urlsafe(32)
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"verification_token": verification_token}}
        )

        verification_link = f"{FRONTEND_URL}/?verify_email={verification_token}"
        email_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #18181b; color: #ffffff;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #27272a; padding: 30px; border-radius: 10px;">
                <h2 style="color: #f97316; margin-bottom: 20px;">Email megerősítés</h2>
                <p style="color: #a1a1aa; margin-bottom: 20px;">Küldtünk egy új megerősítő linket. Kattints az alábbi gombra:</p>
                <a href="{verification_link}" style="display: inline-block; padding: 12px 24px; background: #f97316; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Email megerősítése</a>
                <p style="color: #71717a; margin-top: 30px; font-size: 14px;">Ha nem te regisztráltál, kérjük figyelmen kívül hagyni ezt az emailt.</p>
                <p style="color: #a1a1aa; margin-top: 20px;">Üdvözlettel,<br>TuningTalálkozó csapata</p>
            </div>
        </body>
        </html>
        """

        try:
            await asyncio.to_thread(resend.Emails.send, {
                "from": SENDER_EMAIL,
                "to": [user_data.email],
                "subject": "Email megerősítés - TuningTalálkozó",
                "html": email_html
            })
        except Exception as e:
            logger.error(f"Email küldési hiba: {e}")

        raise HTTPException(status_code=403, detail="Email cím nincs megerősítve. Új megerősítő emailt küldtünk!")

    token = create_access_token({"sub": user["user_id"]})
    user.pop("password_hash", None)
    user.pop("verification_token", None)
    return {"token": token, "user": user}

@fastapi_app.get("/api/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@fastapi_app.get("/api/users/{user_id}", response_model=User)
async def get_user(user_id: str, current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0, "verification_token": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Felhasználó nem található")
    return User(**user)

@fastapi_app.put("/api/users/profile")
async def update_profile(update_data: UserProfileUpdate, current_user: User = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not update_dict:
        return {"message": "Nincs frissítendő adat"}

    await db.users.update_one({"user_id": current_user.user_id}, {"$set": update_dict})
    return {"message": "Profil frissítve"}

@fastapi_app.get("/api/users/search/{query}")
async def search_users(query: str, current_user: User = Depends(get_current_user)):
    users = await db.users.find(
        {"username": {"$regex": query, "$options": "i"}},
        {"_id": 0, "user_id": 1, "username": 1, "profile_pic": 1}
    ).limit(10).to_list(10)

    for user in users:
        if user["user_id"] == current_user.user_id:
            user["friendship_status"] = "self"
        else:
            friend_request = await db.friend_requests.find_one({
                "$or": [
                    {"from_user_id": current_user.user_id, "to_user_id": user["user_id"]},
                    {"from_user_id": user["user_id"], "to_user_id": current_user.user_id}
                ]
            }, {"_id": 0, "status": 1})

            if friend_request:
                user["friendship_status"] = friend_request["status"]
            else:
                user["friendship_status"] = "none"

    return users

@fastapi_app.post("/api/friends/request")
async def send_friend_request(to_user_id: str, current_user: User = Depends(get_current_user)):
    if to_user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Nem küldhetsz ismerős kérést önmagadnak")

    already_friends = await db.friend_requests.find_one({
        "$or": [
            {"from_user_id": current_user.user_id, "to_user_id": to_user_id, "status": "accepted"},
            {"from_user_id": to_user_id, "to_user_id": current_user.user_id, "status": "accepted"}
        ]
    }, {"_id": 0})

    if already_friends:
        raise HTTPException(status_code=400, detail="Már ismerősök vagytok")

    existing = await db.friend_requests.find_one({
        "$or": [
            {"from_user_id": current_user.user_id, "to_user_id": to_user_id, "status": "pending"},
            {"from_user_id": to_user_id, "to_user_id": current_user.user_id, "status": "pending"}
        ]
    }, {"_id": 0})

    if existing:
        raise HTTPException(status_code=400, detail="Már létezik függőben lévő kérés")

    to_user = await db.users.find_one({"user_id": to_user_id}, {"_id": 0, "username": 1})
    if not to_user:
        raise HTTPException(status_code=404, detail="Felhasználó nem található")

    request_id = 'req_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
    request_doc = {
        "request_id": request_id,
        "from_user_id": current_user.user_id,
        "to_user_id": to_user_id,
        "from_username": current_user.username,
        "to_username": to_user["username"],
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.friend_requests.insert_one(request_doc.copy())
    return {"message": "Ismerős kérés elküldve", "request_id": request_id}
@fastapi_app.put("/api/friends/accept/{request_id}")
async def accept_friend_request(request_id: str, current_user: User = Depends(get_current_user)):
    request = await db.friend_requests.find_one({"request_id": request_id, "to_user_id": current_user.user_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Kérés nem található")

    await db.friend_requests.update_one({"request_id": request_id}, {"$set": {"status": "accepted"}})
    return {"message": "Ismerős elfogadva"}

@fastapi_app.put("/api/friends/reject/{request_id}")
async def reject_friend_request(request_id: str, current_user: User = Depends(get_current_user)):
    request = await db.friend_requests.find_one({"request_id": request_id, "to_user_id": current_user.user_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Kérés nem található")

    await db.friend_requests.update_one({"request_id": request_id}, {"$set": {"status": "rejected"}})
    return {"message": "Ismerős elutasítva"}

@fastapi_app.get("/api/friends/pending")
async def get_pending_requests(current_user: User = Depends(get_current_user)):
    requests = await db.friend_requests.find(
        {"to_user_id": current_user.user_id, "status": "pending"},
        {"_id": 0}
    ).to_list(100)
    return requests

@fastapi_app.get("/api/friends/list")
async def get_friends(current_user: User = Depends(get_current_user)):
    requests = await db.friend_requests.find(
        {
            "$or": [
                {"from_user_id": current_user.user_id, "status": "accepted"},
                {"to_user_id": current_user.user_id, "status": "accepted"}
            ]
        },
        {"_id": 0}
    ).to_list(1000)

    friend_ids = []
    for req in requests:
        if req["from_user_id"] == current_user.user_id:
            friend_ids.append(req["to_user_id"])
        else:
            friend_ids.append(req["from_user_id"])

    friends = await db.users.find(
        {"user_id": {"$in": friend_ids}},
        {"_id": 0, "user_id": 1, "username": 1, "profile_pic": 1, "online_status": 1, "last_seen": 1}
    ).to_list(1000)

    return friends

@fastapi_app.get("/api/friends/list/{target_user_id}")
async def get_user_friends(target_user_id: str, current_user: User = Depends(get_current_user)):
    """Más felhasználó ismerőseinek lekérése - közös ismerősök és ismerősi státusz megjelölésével"""
    # Target user ismerősei
    target_requests = await db.friend_requests.find(
        {
            "$or": [
                {"from_user_id": target_user_id, "status": "accepted"},
                {"to_user_id": target_user_id, "status": "accepted"}
            ]
        },
        {"_id": 0}
    ).to_list(1000)

    target_friend_ids = []
    for req in target_requests:
        if req["from_user_id"] == target_user_id:
            target_friend_ids.append(req["to_user_id"])
        else:
            target_friend_ids.append(req["from_user_id"])

    # Current user ismerősei (közös ismerősök számításához)
    my_requests = await db.friend_requests.find(
        {
            "$or": [
                {"from_user_id": current_user.user_id, "status": "accepted"},
                {"to_user_id": current_user.user_id, "status": "accepted"}
            ]
        },
        {"_id": 0}
    ).to_list(1000)

    my_friend_ids = set()
    for req in my_requests:
        if req["from_user_id"] == current_user.user_id:
            my_friend_ids.add(req["to_user_id"])
        else:
            my_friend_ids.add(req["from_user_id"])

    # Ismerősök lekérése
    friends = await db.users.find(
        {"user_id": {"$in": target_friend_ids}},
        {"_id": 0, "user_id": 1, "username": 1, "profile_pic": 1, "online_status": 1, "last_seen": 1}
    ).to_list(1000)

    # Ismerősi státusz és közös ismerős megjelölése
    for friend in friends:
        if friend["user_id"] == current_user.user_id:
            friend["is_me"] = True
            friend["is_mutual"] = False
            friend["friendship_status"] = "self"
        elif friend["user_id"] in my_friend_ids:
            friend["is_mutual"] = True
            friend["friendship_status"] = "accepted"
        else:
            friend["is_mutual"] = False
            # Ellenőrizzük, van-e függőben lévő kérés
            pending = await db.friend_requests.find_one({
                "$or": [
                    {"from_user_id": current_user.user_id, "to_user_id": friend["user_id"], "status": "pending"},
                    {"from_user_id": friend["user_id"], "to_user_id": current_user.user_id, "status": "pending"}
                ]
            }, {"_id": 0})
            friend["friendship_status"] = "pending" if pending else "none"

    # Rendezés: közös ismerősök elöl
    friends.sort(key=lambda x: (not x.get("is_mutual", False), x.get("username", "")))

    return friends

@fastapi_app.get("/api/friends/mutual/{target_user_id}")
async def get_mutual_friends(target_user_id: str, current_user: User = Depends(get_current_user)):
    """Közös ismerősök lekérése"""
    if target_user_id == current_user.user_id:
        return []

    # Target user ismerősei
    target_requests = await db.friend_requests.find(
        {
            "$or": [
                {"from_user_id": target_user_id, "status": "accepted"},
                {"to_user_id": target_user_id, "status": "accepted"}
            ]
        },
        {"_id": 0}
    ).to_list(1000)

    target_friend_ids = set()
    for req in target_requests:
        if req["from_user_id"] == target_user_id:
            target_friend_ids.add(req["to_user_id"])
        else:
            target_friend_ids.add(req["from_user_id"])

    # Current user ismerősei
    my_requests = await db.friend_requests.find(
        {
            "$or": [
                {"from_user_id": current_user.user_id, "status": "accepted"},
                {"to_user_id": current_user.user_id, "status": "accepted"}
            ]
        },
        {"_id": 0}
    ).to_list(1000)

    my_friend_ids = set()
    for req in my_requests:
        if req["from_user_id"] == current_user.user_id:
            my_friend_ids.add(req["to_user_id"])
        else:
            my_friend_ids.add(req["from_user_id"])

    # Közös ismerősök
    mutual_ids = list(target_friend_ids.intersection(my_friend_ids))

    if not mutual_ids:
        return []

    mutual_friends = await db.users.find(
        {"user_id": {"$in": mutual_ids}},
        {"_id": 0, "user_id": 1, "username": 1, "profile_pic": 1}
    ).to_list(1000)

    return mutual_friends

@fastapi_app.get("/api/friends/status/{target_user_id}")
async def get_friendship_status(target_user_id: str, current_user: User = Depends(get_current_user)):
    if target_user_id == current_user.user_id:
        return {"status": "self"}

    friend_request = await db.friend_requests.find_one({
        "$or": [
            {"from_user_id": current_user.user_id, "to_user_id": target_user_id},
            {"from_user_id": target_user_id, "to_user_id": current_user.user_id}
        ]
    }, {"_id": 0, "status": 1})

    if friend_request:
        return {"status": friend_request["status"]}
    return {"status": "none"}

@fastapi_app.post("/api/posts", response_model=Post)
async def create_post(post_data: PostCreate, current_user: User = Depends(get_current_user)):
    post_id = 'post_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
    post_doc = {
        "post_id": post_id,
        "user_id": current_user.user_id,
        "username": current_user.username,
        "profile_pic": current_user.profile_pic,
        "content": post_data.content,
        "image_base64": post_data.image_base64 or "",
        "video_base64": post_data.video_base64 or "",
        "reaction_count": 0,
        "comment_count": 0,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.posts.insert_one(post_doc.copy())
    if isinstance(post_doc["created_at"], str):
        post_doc["created_at"] = datetime.fromisoformat(post_doc["created_at"])
    return Post(**post_doc)

@fastapi_app.get("/api/posts/feed", response_model=List[Post])
async def get_feed(current_user: User = Depends(get_current_user)):
    # Sima user: csak jóváhagyott posztok, Admin: minden poszt
    query = {} if current_user.role == 1 else {"$or": [{"status": "approved"}, {"status": {"$exists": False}}, {"user_id": current_user.user_id}]}
    posts = await db.posts.find(query, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    for post in posts:
        if isinstance(post["created_at"], str):
            post["created_at"] = datetime.fromisoformat(post["created_at"])
    return [Post(**post) for post in posts]

@fastapi_app.get("/api/posts/pending", response_model=List[Post])
async def get_pending_posts(current_user: User = Depends(get_current_user)):
    """Admin: jóváhagyásra váró posztok"""
    if current_user.role != 1:
        raise HTTPException(status_code=403, detail="Csak admin")
    
    posts = await db.posts.find({"status": "pending"}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for post in posts:
        if isinstance(post["created_at"], str):
            post["created_at"] = datetime.fromisoformat(post["created_at"])
    return [Post(**post) for post in posts]

@fastapi_app.post("/api/posts/{post_id}/approve")
async def approve_post(post_id: str, current_user: User = Depends(get_current_user)):
    """Admin: poszt jóváhagyása"""
    if current_user.role != 1:
        raise HTTPException(status_code=403, detail="Csak admin")
    
    result = await db.posts.update_one({"post_id": post_id}, {"$set": {"status": "approved"}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Poszt nem található")
    
    return {"message": "Poszt jóváhagyva"}

@fastapi_app.post("/api/posts/{post_id}/reject")
async def reject_post(post_id: str, current_user: User = Depends(get_current_user)):
    """Admin: poszt elutasítása"""
    if current_user.role != 1:
        raise HTTPException(status_code=403, detail="Csak admin")
    
    await db.posts.delete_one({"post_id": post_id})
    return {"message": "Poszt elutasítva és törölve"}

@fastapi_app.get("/api/posts/user/{user_id}", response_model=List[Post])
async def get_user_posts(user_id: str, current_user: User = Depends(get_current_user)):
    posts = await db.posts.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for post in posts:
        if isinstance(post["created_at"], str):
            post["created_at"] = datetime.fromisoformat(post["created_at"])
    return [Post(**post) for post in posts]

@fastapi_app.delete("/api/posts/{post_id}")
async def delete_post(post_id: str, current_user: User = Depends(get_current_user)):
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Bejegyzés nem található")

    if post["user_id"] != current_user.user_id and current_user.role != 1:
        raise HTTPException(status_code=403, detail="Nincs jogosultság")

    await db.posts.delete_one({"post_id": post_id})
    await db.reactions.delete_many({"post_id": post_id})
    await db.comments.delete_many({"post_id": post_id})
    return {"message": "Bejegyzés törölve"}

@fastapi_app.post("/api/posts/{post_id}/react")
async def react_to_post(post_id: str, reaction_data: ReactionCreate, current_user: User = Depends(get_current_user)):
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Bejegyzés nem található")

    existing = await db.reactions.find_one({"post_id": post_id, "user_id": current_user.user_id}, {"_id": 0})

    if existing:
        await db.reactions.update_one(
            {"post_id": post_id, "user_id": current_user.user_id},
            {"$set": {"reaction_type": reaction_data.reaction_type}}
        )
        return {"message": "Reakció frissítve"}
    else:
        reaction_id = 'react_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
        reaction_doc = {
            "reaction_id": reaction_id,
            "post_id": post_id,
            "user_id": current_user.user_id,
            "username": current_user.username,
            "reaction_type": reaction_data.reaction_type,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.reactions.insert_one(reaction_doc.copy())

        count = await db.reactions.count_documents({"post_id": post_id})
        await db.posts.update_one({"post_id": post_id}, {"$set": {"reaction_count": count}})

        return {"message": "Reakció hozzáadva", "reaction_id": reaction_id}

@fastapi_app.get("/api/posts/{post_id}/reactions")
async def get_post_reactions(post_id: str, current_user: User = Depends(get_current_user)):
    reactions = await db.reactions.find({"post_id": post_id}, {"_id": 0}).to_list(1000)
    return reactions

@fastapi_app.post("/api/posts/{post_id}/comment", response_model=Comment)
async def add_comment(post_id: str, comment_data: CommentCreate, current_user: User = Depends(get_current_user)):
    post = await db.posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Bejegyzés nem található")

    comment_id = 'comment_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
    comment_doc = {
        "comment_id": comment_id,
        "post_id": post_id,
        "user_id": current_user.user_id,
        "username": current_user.username,
        "profile_pic": current_user.profile_pic,
        "content": comment_data.content,
        "image_base64": comment_data.image_base64 or "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.comments.insert_one(comment_doc.copy())

    count = await db.comments.count_documents({"post_id": post_id})
    await db.posts.update_one({"post_id": post_id}, {"$set": {"comment_count": count}})

    if isinstance(comment_doc["created_at"], str):
        comment_doc["created_at"] = datetime.fromisoformat(comment_doc["created_at"])
    return Comment(**comment_doc)

@fastapi_app.get("/api/posts/{post_id}/comments", response_model=List[Comment])
async def get_post_comments(post_id: str, current_user: User = Depends(get_current_user)):
    comments = await db.comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    for comment in comments:
        if isinstance(comment["created_at"], str):
            comment["created_at"] = datetime.fromisoformat(comment["created_at"])
    return [Comment(**comment) for comment in comments]

@fastapi_app.delete("/api/comments/{comment_id}")
async def delete_comment(comment_id: str, current_user: User = Depends(get_current_user)):
    comment = await db.comments.find_one({"comment_id": comment_id}, {"_id": 0})
    if not comment:
        raise HTTPException(status_code=404, detail="Komment nem található")

    if comment["user_id"] != current_user.user_id and current_user.role != 1:
        raise HTTPException(status_code=403, detail="Nincs jogosultság")

    await db.comments.delete_one({"comment_id": comment_id})

    count = await db.comments.count_documents({"post_id": comment["post_id"]})
    await db.posts.update_one({"post_id": comment["post_id"]}, {"$set": {"comment_count": count}})

    return {"message": "Komment törölve"}
@fastapi_app.post("/api/events", response_model=Event)
async def create_event(event_data: EventCreate, current_user: User = Depends(get_current_user)):
    event_id = 'event_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
    event_doc = {
        "event_id": event_id,
        "user_id": current_user.user_id,
        "username": current_user.username,
        "title": event_data.title,
        "description": event_data.description,
        "date": event_data.date.isoformat(),
        "end_date": event_data.end_date.isoformat() if event_data.end_date else None,
        "city": event_data.city,
        "address": event_data.address or "",
        "entry_fee": event_data.entry_fee,
        "is_official": event_data.is_official,
        "image_base64": event_data.image_base64,
        "status": "pending",
        "highlighted": False,
        "highlighted_pending": False,
        "going_count": 0,
        "not_going_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.events.insert_one(event_doc.copy())

    if isinstance(event_doc["date"], str):
        event_doc["date"] = datetime.fromisoformat(event_doc["date"])
    if event_doc.get("end_date") and isinstance(event_doc["end_date"], str):
        event_doc["end_date"] = datetime.fromisoformat(event_doc["end_date"])
    if isinstance(event_doc["created_at"], str):
        event_doc["created_at"] = datetime.fromisoformat(event_doc["created_at"])
    return Event(**event_doc)

@fastapi_app.get("/api/events", response_model=List[Event])
async def get_events(current_user: User = Depends(get_current_user)):
    if current_user.role == 1:
        events = await db.events.find({}, {"_id": 0}).sort("date", 1).to_list(100)
    else:
        events = await db.events.find({"status": "approved"}, {"_id": 0}).sort("date", 1).to_list(100)

    for event in events:
        if isinstance(event["date"], str):
            event["date"] = datetime.fromisoformat(event["date"])
        if event.get("end_date") and isinstance(event["end_date"], str):
            event["end_date"] = datetime.fromisoformat(event["end_date"])
        if isinstance(event["created_at"], str):
            event["created_at"] = datetime.fromisoformat(event["created_at"])
    return [Event(**event) for event in events]

@fastapi_app.get("/api/events/highlighted", response_model=List[Event])
async def get_highlighted_events(current_user: User = Depends(get_current_user)):

    now = datetime.now(timezone.utc).isoformat()

    events = await db.events.find(
        {
            "status": "approved",
            "highlighted": True,
            "$or": [
                {"end_date": {"$gt": now}},
                {
                    "$and": [
                        {"$or": [{"end_date": None}, {"end_date": {"$exists": False}}]},
                        {"date": {"$gt": now}}
                    ]
                }
            ]
        },
        {"_id": 0}
    ).sort("date", 1).limit(5).to_list(5)

    for event in events:

        if isinstance(event["date"], str):
            event["date"] = datetime.fromisoformat(event["date"])

        if event.get("end_date") and isinstance(event["end_date"], str):
            event["end_date"] = datetime.fromisoformat(event["end_date"])

        if isinstance(event["created_at"], str):
            event["created_at"] = datetime.fromisoformat(event["created_at"])

    return [Event(**event) for event in events]

@fastapi_app.get("/api/events/{event_id}", response_model=Event)
async def get_event(event_id: str, current_user: User = Depends(get_current_user)):
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Esemény nem található")

    if event["status"] != "approved" and current_user.role != 1:
        raise HTTPException(status_code=403, detail="Esemény még nem jóváhagyott")

    if isinstance(event["date"], str):
        event["date"] = datetime.fromisoformat(event["date"])
    if event.get("end_date") and isinstance(event["end_date"], str):
        event["end_date"] = datetime.fromisoformat(event["end_date"])
    if isinstance(event["created_at"], str):
        event["created_at"] = datetime.fromisoformat(event["created_at"])
    return Event(**event)

@fastapi_app.post("/api/events/{event_id}/rsvp")
async def rsvp_event(event_id: str, rsvp_data: RSVPCreate, current_user: User = Depends(get_current_user)):
    event = await db.events.find_one({"event_id": event_id, "status": "approved"}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Esemény nem található")

    existing = await db.rsvps.find_one({"event_id": event_id, "user_id": current_user.user_id}, {"_id": 0})

    if existing:
        await db.rsvps.update_one(
            {"event_id": event_id, "user_id": current_user.user_id},
            {"$set": {"status": rsvp_data.status}}
        )
    else:
        rsvp_id = 'rsvp_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
        rsvp_doc = {
            "rsvp_id": rsvp_id,
            "event_id": event_id,
            "user_id": current_user.user_id,
            "status": rsvp_data.status,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.rsvps.insert_one(rsvp_doc.copy())

    going_count = await db.rsvps.count_documents({"event_id": event_id, "status": "going"})
    not_going_count = await db.rsvps.count_documents({"event_id": event_id, "status": "not_going"})

    await db.events.update_one(
        {"event_id": event_id},
        {"$set": {"going_count": going_count, "not_going_count": not_going_count}}
    )

    return {"message": "RSVP rögzítve"}

@fastapi_app.post("/api/events/{event_id}/highlight")
async def highlight_event(event_id: str, current_user: User = Depends(get_current_user)):
    event = await db.events.find_one({"event_id": event_id, "user_id": current_user.user_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Esemény nem található vagy nincs jogosultság")

    if event["highlighted"] or event["highlighted_pending"]:
        raise HTTPException(status_code=400, detail="Esemény már kiemelt vagy kiemelés alatt áll")

    if current_user.wallet_balance < 1000:
        raise HTTPException(status_code=400, detail="Nincs elegendő egyenleg (1000 Ft szükséges)")

    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$inc": {"wallet_balance": -1000}}
    )

    await db.events.update_one(
        {"event_id": event_id},
        {"$set": {"highlighted_pending": True}}
    )

    return {"message": "Kiemelés kérelem elküldve, admin jóváhagyásra vár"}

@fastapi_app.get("/api/wallet/balance")
async def get_wallet_balance(current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0, "wallet_balance": 1, "unique_payment_reference": 1})
    return user

@fastapi_app.post("/api/wallet/topup")
async def topup_wallet(payment_data: PaymentCreate, current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0, "unique_payment_reference": 1})

    payment_id = 'pay_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
    payment_doc = {
        "payment_id": payment_id,
        "user_id": current_user.user_id,
        "username": current_user.username,
        "amount": payment_data.amount,
        "payment_method": payment_data.payment_method,
        "unique_reference": user["unique_payment_reference"],
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.payments.insert_one(payment_doc.copy())
    return {"message": "Fizetés kérelem elküldve, admin jóváhagyásra vár", "payment_id": payment_id, "unique_reference": user["unique_payment_reference"]}

class ManualWalletAdjust(BaseModel):
    amount: float
    note: Optional[str] = ""

@fastapi_app.post("/api/wallet/manual-adjust")
async def manual_adjust_wallet(data: ManualWalletAdjust, current_user: User = Depends(get_current_user)):
    if data.amount == 0:
        raise HTTPException(status_code=400, detail="Az összeg nem lehet 0")

    # Update balance
    new_user = await db.users.find_one_and_update(
        {"user_id": current_user.user_id},
        {"$inc": {"wallet_balance": data.amount}},
        return_document=True,
        projection={"_id": 0, "wallet_balance": 1}
    )

    if new_user and new_user.get("wallet_balance", 0) < 0:
        # Rollback if balance would go negative
        await db.users.update_one(
            {"user_id": current_user.user_id},
            {"$inc": {"wallet_balance": -data.amount}}
        )
        raise HTTPException(status_code=400, detail="Nincs elegendő egyenleg")

    # Record the transaction
    payment_id = 'pay_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
    tx_type = "manual_add" if data.amount > 0 else "manual_subtract"
    payment_doc = {
        "payment_id": payment_id,
        "user_id": current_user.user_id,
        "username": current_user.username,
        "amount": data.amount,
        "payment_method": tx_type,
        "unique_reference": data.note or tx_type,
        "status": "approved",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payments.insert_one(payment_doc.copy())

    return {
        "message": f"Egyenleg módosítva: {'+' if data.amount > 0 else ''}{data.amount} Ft",
        "new_balance": new_user["wallet_balance"]
    }

@fastapi_app.get("/api/wallet/transactions")
async def get_wallet_transactions(current_user: User = Depends(get_current_user)):
    payments = await db.payments.find({"user_id": current_user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return payments
@fastapi_app.get("/api/admin/users")
async def admin_get_users(admin: User = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0, "verification_token": 0}).to_list(1000)
    return users

@fastapi_app.delete("/api/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: User = Depends(get_admin_user)):
    if user_id == admin.user_id:
        raise HTTPException(status_code=400, detail="Nem törölheted saját magad")

    await db.users.delete_one({"user_id": user_id})
    await db.posts.delete_many({"user_id": user_id})
    await db.comments.delete_many({"user_id": user_id})
    await db.reactions.delete_many({"user_id": user_id})
    await db.events.delete_many({"user_id": user_id})
    return {"message": "Felhasználó törölve"}

@fastapi_app.put("/api/admin/users/{user_id}/role")
async def admin_update_role(user_id: str, role: int, admin: User = Depends(get_admin_user)):
    if role not in [0, 1]:
        raise HTTPException(status_code=400, detail="Érvénytelen role érték")

    await db.users.update_one({"user_id": user_id}, {"$set": {"role": role}})
    return {"message": "Role frissítve"}

@fastapi_app.put("/api/admin/users/{user_id}/verify-email")
async def admin_verify_email(user_id: str, admin: User = Depends(get_admin_user)):
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"email_verified": True}, "$unset": {"verification_token": ""}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Felhasználó nem található")
    return {"message": "Email megerősítve"}

@fastapi_app.delete("/api/admin/posts/{post_id}")
async def admin_delete_post(post_id: str, admin: User = Depends(get_admin_user)):
    await db.posts.delete_one({"post_id": post_id})
    await db.reactions.delete_many({"post_id": post_id})
    await db.comments.delete_many({"post_id": post_id})
    return {"message": "Bejegyzés törölve"}

@fastapi_app.delete("/api/admin/comments/{comment_id}")
async def admin_delete_comment(comment_id: str, admin: User = Depends(get_admin_user)):
    comment = await db.comments.find_one({"comment_id": comment_id}, {"_id": 0})
    if comment:
        await db.comments.delete_one({"comment_id": comment_id})
        count = await db.comments.count_documents({"post_id": comment["post_id"]})
        await db.posts.update_one({"post_id": comment["post_id"]}, {"$set": {"comment_count": count}})
    return {"message": "Komment törölve"}

@fastapi_app.delete("/api/admin/events/{event_id}")
async def admin_delete_event(event_id: str, admin: User = Depends(get_admin_user)):
    await db.events.delete_one({"event_id": event_id})
    await db.rsvps.delete_many({"event_id": event_id})
    return {"message": "Esemény törölve"}

@fastapi_app.put("/api/admin/events/{event_id}/approve")
async def admin_approve_event(event_id: str, admin: User = Depends(get_admin_user)):
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Esemény nem található")
    
    await db.events.update_one({"event_id": event_id}, {"$set": {"status": "approved"}})
    
    # Email értesítés küldése minden felhasználónak
    users = await db.users.find({"email_verified": True}, {"_id": 0, "email": 1}).to_list(10000)
    
    event_date = event.get("date", "")
    if isinstance(event_date, str):
        try:
            event_date = datetime.fromisoformat(event_date).strftime("%Y. %m. %d. %H:%M")
        except:
            pass
    
    email_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #18181b; color: #ffffff;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #27272a; padding: 30px; border-radius: 10px;">
            <h2 style="color: #f97316; margin-bottom: 20px;">🚗 Új esemény a TuningTalálkozón!</h2>
            <h3 style="color: #ffffff; margin-bottom: 10px;">{event.get('title', '')}</h3>
            <p style="color: #a1a1aa; margin-bottom: 10px;">📍 {event.get('city', '')}{', ' + event.get('address', '') if event.get('address') else ''}</p>
            <p style="color: #a1a1aa; margin-bottom: 10px;">📅 {event_date}</p>
            <p style="color: #a1a1aa; margin-bottom: 20px;">{event.get('description', '')[:200]}...</p>
            <a href="{FRONTEND_URL}/events" style="display: inline-block; padding: 12px 24px; background: #f97316; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Megnézem az eseményt</a>
            <p style="color: #a1a1aa; margin-top: 20px;">Üdvözlettel,<br>TuningTalálkozó csapata</p>
        </div>
    </body>
    </html>
    """
    
    # Háttérben küldjük az emaileket
    async def send_notifications():
        for user in users:
            try:
                await asyncio.to_thread(resend.Emails.send, {
                    "from": SENDER_EMAIL,
                    "to": [user["email"]],
                    "subject": f"Új esemény: {event.get('title', '')} - TuningTalálkozó",
                    "html": email_html
                })
            except Exception as e:
                logger.error(f"Email küldési hiba ({user['email']}): {e}")
    
    asyncio.create_task(send_notifications())
    
    return {"message": "Esemény jóváhagyva, értesítések kiküldve"}

@fastapi_app.put("/api/admin/events/{event_id}/reject")
async def admin_reject_event(event_id: str, admin: User = Depends(get_admin_user)):
    await db.events.update_one({"event_id": event_id}, {"$set": {"status": "rejected"}})
    return {"message": "Esemény elutasítva"}

@fastapi_app.put("/api/admin/events/{event_id}/highlight-approve")
async def admin_approve_highlight(event_id: str, admin: User = Depends(get_admin_user)):
    await db.events.update_one(
        {"event_id": event_id},
        {"$set": {"highlighted": True, "highlighted_pending": False}}
    )
    return {"message": "Kiemelés jóváhagyva"}

@fastapi_app.put("/api/admin/events/{event_id}/highlight-reject")
async def admin_reject_highlight(event_id: str, admin: User = Depends(get_admin_user)):
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if event:
        await db.users.update_one(
            {"user_id": event["user_id"]},
            {"$inc": {"wallet_balance": 1000}}
        )

    await db.events.update_one(
        {"event_id": event_id},
        {"$set": {"highlighted_pending": False}}
    )
    return {"message": "Kiemelés elutasítva, egyenleg visszatérítve"}

@fastapi_app.get("/api/admin/payments")
async def admin_get_payments(admin: User = Depends(get_admin_user)):
    payments = await db.payments.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return payments

@fastapi_app.put("/api/admin/payments/{payment_id}/approve")
async def admin_approve_payment(payment_id: str, admin: User = Depends(get_admin_user)):
    payment = await db.payments.find_one({"payment_id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Fizetés nem található")

    if payment["status"] != "pending":
        raise HTTPException(status_code=400, detail="Fizetés már feldolgozva")

    await db.users.update_one(
        {"user_id": payment["user_id"]},
        {"$inc": {"wallet_balance": payment["amount"]}}
    )

    await db.payments.update_one(
        {"payment_id": payment_id},
        {"$set": {"status": "approved"}}
    )

    return {"message": "Fizetés jóváhagyva, egyenleg frissítve"}

@fastapi_app.put("/api/admin/payments/{payment_id}/reject")
async def admin_reject_payment(payment_id: str, admin: User = Depends(get_admin_user)):
    await db.payments.update_one(
        {"payment_id": payment_id},
        {"$set": {"status": "rejected"}}
    )
    return {"message": "Fizetés elutasítva"}

@fastapi_app.put("/api/admin/wallet/{user_id}/adjust")
async def admin_adjust_wallet(user_id: str, amount: float, admin: User = Depends(get_admin_user)):
    await db.users.update_one(
        {"user_id": user_id},
        {"$inc": {"wallet_balance": amount}}
    )
    return {"message": f"Egyenleg módosítva: {amount} Ft"}

# ============ KÖR EMAIL ============
class MassEmailRequest(BaseModel):
    subject: str
    content: str

@fastapi_app.post("/api/admin/mass-email")
async def send_mass_email(email_data: MassEmailRequest, admin: User = Depends(get_admin_user)):
    users = await db.users.find({"email_verified": True}, {"_id": 0, "email": 1}).to_list(10000)
    
    if not users:
        raise HTTPException(status_code=400, detail="Nincsenek megerősített email címek")
    
    email_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #18181b; color: #ffffff;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #27272a; padding: 30px; border-radius: 10px;">
            <h2 style="color: #f97316; margin-bottom: 20px;">{email_data.subject}</h2>
            <div style="color: #a1a1aa; margin-bottom: 20px;">{email_data.content}</div>
            <p style="color: #a1a1aa; margin-top: 20px;">Üdvözlettel,<br>TuningTalálkozó csapata</p>
        </div>
    </body>
    </html>
    """
    
    sent_count = 0
    failed_count = 0
    
    for user in users:
        try:
            await asyncio.to_thread(resend.Emails.send, {
                "from": SENDER_EMAIL,
                "to": [user["email"]],
                "subject": email_data.subject,
                "html": email_html
            })
            sent_count += 1
        except Exception as e:
            logger.error(f"Email küldési hiba ({user['email']}): {e}")
            failed_count += 1
    
    return {"message": f"Email kiküldve: {sent_count} sikeres, {failed_count} sikertelen"}

# ============ KUPON RENDSZER ============
class CouponCreate(BaseModel):
    code: str
    amount: float
    max_uses: int = 1
    expires_at: Optional[datetime] = None

class CouponUse(BaseModel):
    code: str

@fastapi_app.post("/api/admin/coupons")
async def create_coupon(coupon_data: CouponCreate, admin: User = Depends(get_admin_user)):
    existing = await db.coupons.find_one({"code": coupon_data.code.upper()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Ez a kuponkód már létezik")
    
    coupon_doc = {
        "coupon_id": 'coupon_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(8)),
        "code": coupon_data.code.upper(),
        "amount": coupon_data.amount,
        "max_uses": coupon_data.max_uses,
        "used_count": 0,
        "used_by": [],
        "expires_at": coupon_data.expires_at.isoformat() if coupon_data.expires_at else None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.coupons.insert_one(coupon_doc.copy())
    return {"message": f"Kupon létrehozva: {coupon_data.code.upper()}", "coupon": coupon_doc}

@fastapi_app.get("/api/admin/coupons")
async def get_coupons(admin: User = Depends(get_admin_user)):
    coupons = await db.coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return coupons

@fastapi_app.delete("/api/admin/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str, admin: User = Depends(get_admin_user)):
    await db.coupons.delete_one({"coupon_id": coupon_id})
    return {"message": "Kupon törölve"}

@fastapi_app.post("/api/wallet/redeem-coupon")
async def redeem_coupon(coupon_data: CouponUse, current_user: User = Depends(get_current_user)):
    coupon = await db.coupons.find_one({"code": coupon_data.code.upper()}, {"_id": 0})
    
    if not coupon:
        raise HTTPException(status_code=404, detail="Érvénytelen kuponkód")
    
    if coupon["used_count"] >= coupon["max_uses"]:
        raise HTTPException(status_code=400, detail="A kupon elfogyott")
    
    if current_user.user_id in coupon.get("used_by", []):
        raise HTTPException(status_code=400, detail="Már beváltottad ezt a kupont")
    
    if coupon.get("expires_at"):
        expires = datetime.fromisoformat(coupon["expires_at"])
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(status_code=400, detail="A kupon lejárt")
    
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$inc": {"wallet_balance": coupon["amount"]}}
    )
    
    await db.coupons.update_one(
        {"code": coupon_data.code.upper()},
        {"$inc": {"used_count": 1}, "$push": {"used_by": current_user.user_id}}
    )
    
    return {"message": f"Kupon beváltva! +{coupon['amount']} Ft"}

# ============ ISMERŐS TÖRLÉSE ============
@fastapi_app.delete("/api/friends/{friend_id}")
async def remove_friend(friend_id: str, current_user: User = Depends(get_current_user)):
    result = await db.friend_requests.delete_one({
        "$or": [
            {"from_user_id": current_user.user_id, "to_user_id": friend_id, "status": "accepted"},
            {"from_user_id": friend_id, "to_user_id": current_user.user_id, "status": "accepted"}
        ]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ismerős nem található")
    
    return {"message": "Ismerős törölve"}

@fastapi_app.get("/api/messages/{friend_id}")
async def get_messages(friend_id: str, current_user: User = Depends(get_current_user)):
    messages = await db.messages.find(
        {
            "$or": [
                {"from_user_id": current_user.user_id, "to_user_id": friend_id},
                {"from_user_id": friend_id, "to_user_id": current_user.user_id}
            ]
        },
        {"_id": 0}
    ).sort("timestamp", 1).to_list(1000)

    await db.messages.update_many(
        {"from_user_id": friend_id, "to_user_id": current_user.user_id, "read_status": False},
        {"$set": {"read_status": True}}
    )

    return messages

# ============ MARKETPLACE (PIACTÉR) ============
class ListingCreate(BaseModel):
    title: str
    description: str
    price: float
    category: str
    condition: str  # new / used
    location: str
    images: List[str] = []

class ListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    condition: Optional[str] = None
    location: Optional[str] = None
    images: Optional[List[str]] = None

@fastapi_app.post("/api/marketplace/listings")
async def create_listing(data: ListingCreate, current_user: User = Depends(get_current_user)):
    listing_id = 'listing_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
    doc = {
        "listing_id": listing_id,
        "user_id": current_user.user_id,
        "username": current_user.username,
        "profile_pic": current_user.profile_pic or "",
        "title": data.title,
        "description": data.description,
        "price": data.price,
        "category": data.category,
        "condition": data.condition,
        "location": data.location,
        "images": data.images[:10],
        "status": "approved",
        "views_count": 0,
        "favorites_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.listings.insert_one(doc.copy())
    return {"message": "Hirdetés létrehozva", "listing_id": listing_id}

@fastapi_app.get("/api/marketplace/listings")
async def get_listings(
    category: Optional[str] = None,
    condition: Optional[str] = None,
    location: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    search: Optional[str] = None,
    sort: Optional[str] = "newest",
    current_user: User = Depends(get_current_user)
):
    query = {"status": {"$in": ["approved", "sold"]}}
    if category:
        query["category"] = category
    if condition:
        query["condition"] = condition
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    if min_price is not None:
        query["price"] = {"$gte": min_price}
    if max_price is not None:
        query.setdefault("price", {})["$lte"] = max_price
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]

    sort_field = [("created_at", -1)]
    if sort == "cheapest":
        sort_field = [("price", 1)]
    elif sort == "expensive":
        sort_field = [("price", -1)]
    elif sort == "popular":
        sort_field = [("views_count", -1)]

    listings = await db.listings.find(query, {"_id": 0}).sort(sort_field).limit(100).to_list(100)
    return listings

@fastapi_app.get("/api/marketplace/listings/{listing_id}")
async def get_listing(listing_id: str, current_user: User = Depends(get_current_user)):
    listing = await db.listings.find_one({"listing_id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Hirdetés nem található")
    await db.listings.update_one({"listing_id": listing_id}, {"$inc": {"views_count": 1}})
    listing["views_count"] = listing.get("views_count", 0) + 1

    fav = await db.listing_favorites.find_one({"listing_id": listing_id, "user_id": current_user.user_id}, {"_id": 0})
    listing["is_favorited"] = bool(fav)
    return listing

@fastapi_app.put("/api/marketplace/listings/{listing_id}")
async def update_listing(listing_id: str, data: ListingUpdate, current_user: User = Depends(get_current_user)):
    listing = await db.listings.find_one({"listing_id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Hirdetés nem található")
    if listing["user_id"] != current_user.user_id and current_user.role != 1:
        raise HTTPException(status_code=403, detail="Nincs jogosultság")
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if update:
        await db.listings.update_one({"listing_id": listing_id}, {"$set": update})
    return {"message": "Hirdetés frissítve"}

@fastapi_app.delete("/api/marketplace/listings/{listing_id}")
async def delete_listing(listing_id: str, current_user: User = Depends(get_current_user)):
    listing = await db.listings.find_one({"listing_id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Hirdetés nem található")
    if listing["user_id"] != current_user.user_id and current_user.role != 1:
        raise HTTPException(status_code=403, detail="Nincs jogosultság")
    await db.listings.delete_one({"listing_id": listing_id})
    await db.listing_favorites.delete_many({"listing_id": listing_id})
    return {"message": "Hirdetés törölve"}

@fastapi_app.post("/api/marketplace/listings/{listing_id}/favorite")
async def toggle_favorite(listing_id: str, current_user: User = Depends(get_current_user)):
    existing = await db.listing_favorites.find_one({"listing_id": listing_id, "user_id": current_user.user_id}, {"_id": 0})
    if existing:
        await db.listing_favorites.delete_one({"listing_id": listing_id, "user_id": current_user.user_id})
        await db.listings.update_one({"listing_id": listing_id}, {"$inc": {"favorites_count": -1}})
        return {"message": "Eltávolítva a kedvencekből", "favorited": False}
    else:
        await db.listing_favorites.insert_one({"listing_id": listing_id, "user_id": current_user.user_id, "created_at": datetime.now(timezone.utc).isoformat()})
        await db.listings.update_one({"listing_id": listing_id}, {"$inc": {"favorites_count": 1}})
        return {"message": "Hozzáadva a kedvencekhez", "favorited": True}

@fastapi_app.put("/api/marketplace/listings/{listing_id}/mark-sold")
async def mark_listing_sold(listing_id: str, current_user: User = Depends(get_current_user)):
    listing = await db.listings.find_one({"listing_id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Hirdetés nem található")
    if listing["user_id"] != current_user.user_id and current_user.role != 1:
        raise HTTPException(status_code=403, detail="Nincs jogosultság")
    new_status = "sold" if listing.get("status") != "sold" else "approved"
    await db.listings.update_one({"listing_id": listing_id}, {"$set": {"status": new_status}})
    return {"message": "Eladva jelölés frissítve", "status": new_status}

@fastapi_app.get("/api/marketplace/favorites")
async def get_favorites(current_user: User = Depends(get_current_user)):
    favs = await db.listing_favorites.find({"user_id": current_user.user_id}, {"_id": 0}).to_list(100)
    listing_ids = [f["listing_id"] for f in favs]
    listings = await db.listings.find({"listing_id": {"$in": listing_ids}, "status": "approved"}, {"_id": 0}).to_list(100)
    return listings

@fastapi_app.get("/api/marketplace/user/{user_id}")
async def get_user_listings(user_id: str, current_user: User = Depends(get_current_user)):
    listings = await db.listings.find({"user_id": user_id, "status": "approved"}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return listings

class ListingReport(BaseModel):
    reason: str

@fastapi_app.post("/api/marketplace/listings/{listing_id}/report")
async def report_listing(listing_id: str, data: ListingReport, current_user: User = Depends(get_current_user)):
    report_id = 'report_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(8))
    await db.listing_reports.insert_one({
        "report_id": report_id, "listing_id": listing_id, "user_id": current_user.user_id,
        "reason": data.reason, "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Hirdetés jelentve"}

# Admin marketplace
@fastapi_app.get("/api/admin/marketplace/listings")
async def admin_get_listings(admin: User = Depends(get_admin_user)):
    return await db.listings.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@fastapi_app.delete("/api/admin/marketplace/listings/{listing_id}")
async def admin_delete_listing(listing_id: str, admin: User = Depends(get_admin_user)):
    await db.listings.delete_one({"listing_id": listing_id})
    return {"message": "Hirdetés törölve"}

@fastapi_app.get("/api/admin/marketplace/reports")
async def admin_get_reports(admin: User = Depends(get_admin_user)):
    return await db.listing_reports.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)

# ============ AUTÓS KLUB RENDSZER ============
class ClubCreate(BaseModel):
    name: str
    description: str
    cover_image: Optional[str] = ""
    logo_image: Optional[str] = ""
    is_public: bool = True

class ClubUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    logo_image: Optional[str] = None
    is_public: Optional[bool] = None

class ClubPostCreate(BaseModel):
    content: str
    image_base64: Optional[str] = ""
    video_base64: Optional[str] = ""

@fastapi_app.post("/api/clubs")
async def create_club(data: ClubCreate, current_user: User = Depends(get_current_user)):
    club_id = 'club_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
    doc = {
        "club_id": club_id,
        "owner_id": current_user.user_id,
        "owner_username": current_user.username,
        "name": data.name,
        "description": data.description,
        "cover_image": data.cover_image or "",
        "logo_image": data.logo_image or "",
        "is_public": data.is_public,
        "status": "pending",
        "members_count": 1,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.clubs.insert_one(doc.copy())
    await db.club_members.insert_one({
        "club_id": club_id, "user_id": current_user.user_id, "username": current_user.username,
        "profile_pic": current_user.profile_pic or "", "role": "owner", "status": "approved",
        "joined_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Klub létrehozva, admin jóváhagyásra vár", "club_id": club_id}

@fastapi_app.get("/api/clubs")
async def get_clubs(current_user: User = Depends(get_current_user)):
    # Show approved clubs + user's own pending clubs
    query = {
        "$or": [
            {"status": "approved"},
            {"owner_id": current_user.user_id, "status": {"$in": ["pending", "approved"]}}
        ]
    }
    if current_user.role == 1:
        query = {}  # Admin sees all
    clubs = await db.clubs.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)

    # Batch fetch memberships instead of N+1
    club_ids = [club["club_id"] for club in clubs]
    memberships = await db.club_members.find(
        {"club_id": {"$in": club_ids}, "user_id": current_user.user_id},
        {"_id": 0}
    ).to_list(len(club_ids))
    membership_map = {m["club_id"]: m for m in memberships}

    for club in clubs:
        member = membership_map.get(club["club_id"])
        club["membership_status"] = member["status"] if member else "none"
        club["membership_role"] = member["role"] if member else None
    return clubs

@fastapi_app.get("/api/clubs/{club_id}")
async def get_club(club_id: str, current_user: User = Depends(get_current_user)):
    club = await db.clubs.find_one({"club_id": club_id}, {"_id": 0})
    if not club:
        raise HTTPException(status_code=404, detail="Klub nem található")
    if club["status"] != "approved" and current_user.role != 1 and club["owner_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Klub nem elérhető")
    member = await db.club_members.find_one({"club_id": club_id, "user_id": current_user.user_id}, {"_id": 0})
    club["membership_status"] = member["status"] if member else "none"
    club["membership_role"] = member["role"] if member else None
    return club

@fastapi_app.put("/api/clubs/{club_id}")
async def update_club(club_id: str, data: ClubUpdate, current_user: User = Depends(get_current_user)):
    member = await db.club_members.find_one({"club_id": club_id, "user_id": current_user.user_id, "role": {"$in": ["owner", "admin"]}}, {"_id": 0})
    if not member and current_user.role != 1:
        raise HTTPException(status_code=403, detail="Nincs jogosultság")
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if update:
        await db.clubs.update_one({"club_id": club_id}, {"$set": update})
    return {"message": "Klub frissítve"}

@fastapi_app.post("/api/clubs/{club_id}/join")
async def join_club(club_id: str, current_user: User = Depends(get_current_user)):
    club = await db.clubs.find_one({"club_id": club_id, "status": "approved"}, {"_id": 0})
    if not club:
        raise HTTPException(status_code=404, detail="Klub nem található")
    existing = await db.club_members.find_one({"club_id": club_id, "user_id": current_user.user_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Már tag vagy vagy jelentkeztél")
    status = "approved" if club["is_public"] else "pending"
    await db.club_members.insert_one({
        "club_id": club_id, "user_id": current_user.user_id, "username": current_user.username,
        "profile_pic": current_user.profile_pic or "", "role": "member", "status": status,
        "joined_at": datetime.now(timezone.utc).isoformat()
    })
    if status == "approved":
        await db.clubs.update_one({"club_id": club_id}, {"$inc": {"members_count": 1}})
    msg = "Csatlakoztál a klubhoz!" if status == "approved" else "Jelentkezés elküldve, a klub admin jóváhagyására vár"
    return {"message": msg, "status": status}

@fastapi_app.post("/api/clubs/{club_id}/leave")
async def leave_club(club_id: str, current_user: User = Depends(get_current_user)):
    member = await db.club_members.find_one({"club_id": club_id, "user_id": current_user.user_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Nem vagy tag")
    if member["role"] == "owner":
        raise HTTPException(status_code=400, detail="A tulajdonos nem hagyhatja el a klubot")
    await db.club_members.delete_one({"club_id": club_id, "user_id": current_user.user_id})
    if member["status"] == "approved":
        await db.clubs.update_one({"club_id": club_id}, {"$inc": {"members_count": -1}})
    return {"message": "Kiléptél a klubból"}

@fastapi_app.get("/api/clubs/{club_id}/members")
async def get_club_members(club_id: str, current_user: User = Depends(get_current_user)):
    members = await db.club_members.find({"club_id": club_id, "status": "approved"}, {"_id": 0}).to_list(1000)
    return members

@fastapi_app.get("/api/clubs/{club_id}/pending-members")
async def get_pending_members(club_id: str, current_user: User = Depends(get_current_user)):
    member = await db.club_members.find_one({"club_id": club_id, "user_id": current_user.user_id, "role": {"$in": ["owner", "admin"]}}, {"_id": 0})
    if not member and current_user.role != 1:
        raise HTTPException(status_code=403, detail="Nincs jogosultság")
    pending = await db.club_members.find({"club_id": club_id, "status": "pending"}, {"_id": 0}).to_list(100)
    return pending

@fastapi_app.put("/api/clubs/{club_id}/members/{user_id}/approve")
async def approve_member(club_id: str, user_id: str, current_user: User = Depends(get_current_user)):
    member = await db.club_members.find_one({"club_id": club_id, "user_id": current_user.user_id, "role": {"$in": ["owner", "admin"]}}, {"_id": 0})
    if not member and current_user.role != 1:
        raise HTTPException(status_code=403, detail="Nincs jogosultság")
    await db.club_members.update_one({"club_id": club_id, "user_id": user_id}, {"$set": {"status": "approved"}})
    await db.clubs.update_one({"club_id": club_id}, {"$inc": {"members_count": 1}})
    return {"message": "Tag jóváhagyva"}

@fastapi_app.put("/api/clubs/{club_id}/members/{user_id}/reject")
async def reject_member(club_id: str, user_id: str, current_user: User = Depends(get_current_user)):
    member = await db.club_members.find_one({"club_id": club_id, "user_id": current_user.user_id, "role": {"$in": ["owner", "admin"]}}, {"_id": 0})
    if not member and current_user.role != 1:
        raise HTTPException(status_code=403, detail="Nincs jogosultság")
    await db.club_members.delete_one({"club_id": club_id, "user_id": user_id, "status": "pending"})
    return {"message": "Jelentkezés elutasítva"}

@fastapi_app.put("/api/clubs/{club_id}/members/{user_id}/role")
async def update_member_role(club_id: str, user_id: str, role: str, current_user: User = Depends(get_current_user)):
    if role not in ["admin", "member"]:
        raise HTTPException(status_code=400, detail="Érvénytelen role")
    owner = await db.club_members.find_one({"club_id": club_id, "user_id": current_user.user_id, "role": "owner"}, {"_id": 0})
    if not owner and current_user.role != 1:
        raise HTTPException(status_code=403, detail="Csak a tulajdonos módosíthat role-t")
    await db.club_members.update_one({"club_id": club_id, "user_id": user_id}, {"$set": {"role": role}})
    return {"message": "Tag role frissítve"}

@fastapi_app.post("/api/clubs/{club_id}/posts")
async def create_club_post(club_id: str, data: ClubPostCreate, current_user: User = Depends(get_current_user)):
    member = await db.club_members.find_one({"club_id": club_id, "user_id": current_user.user_id, "status": "approved"}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=403, detail="Nem vagy tag")
    post_id = 'cpost_' + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
    doc = {
        "post_id": post_id, "club_id": club_id, "user_id": current_user.user_id,
        "username": current_user.username, "profile_pic": current_user.profile_pic or "",
        "content": data.content, "image_base64": data.image_base64 or "",
        "video_base64": data.video_base64 or "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.club_posts.insert_one(doc.copy())
    return {"message": "Poszt létrehozva", "post_id": post_id}

@fastapi_app.get("/api/clubs/{club_id}/posts")
async def get_club_posts(club_id: str, current_user: User = Depends(get_current_user)):
    member = await db.club_members.find_one({"club_id": club_id, "user_id": current_user.user_id, "status": "approved"}, {"_id": 0})
    if not member and current_user.role != 1:
        raise HTTPException(status_code=403, detail="Nem vagy tag")
    posts = await db.club_posts.find({"club_id": club_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return posts

@fastapi_app.delete("/api/clubs/{club_id}/posts/{post_id}")
async def delete_club_post(club_id: str, post_id: str, current_user: User = Depends(get_current_user)):
    post = await db.club_posts.find_one({"post_id": post_id, "club_id": club_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Poszt nem található")
    member = await db.club_members.find_one({"club_id": club_id, "user_id": current_user.user_id}, {"_id": 0})
    if post["user_id"] != current_user.user_id and (not member or member["role"] not in ["owner", "admin"]) and current_user.role != 1:
        raise HTTPException(status_code=403, detail="Nincs jogosultság")
    await db.club_posts.delete_one({"post_id": post_id})
    return {"message": "Poszt törölve"}

@fastapi_app.get("/api/clubs/user/{user_id}")
async def get_user_clubs(user_id: str, current_user: User = Depends(get_current_user)):
    memberships = await db.club_members.find({"user_id": user_id, "status": "approved"}, {"_id": 0}).to_list(100)
    club_ids = [m["club_id"] for m in memberships]
    clubs = await db.clubs.find({"club_id": {"$in": club_ids}, "status": "approved"}, {"_id": 0}).to_list(100)
    return clubs

# Admin club endpoints
@fastapi_app.get("/api/admin/clubs")
async def admin_get_clubs(admin: User = Depends(get_admin_user)):
    return await db.clubs.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@fastapi_app.put("/api/admin/clubs/{club_id}/approve")
async def admin_approve_club(club_id: str, admin: User = Depends(get_admin_user)):
    await db.clubs.update_one({"club_id": club_id}, {"$set": {"status": "approved"}})
    return {"message": "Klub jóváhagyva"}

@fastapi_app.put("/api/admin/clubs/{club_id}/reject")
async def admin_reject_club(club_id: str, admin: User = Depends(get_admin_user)):
    await db.clubs.update_one({"club_id": club_id}, {"$set": {"status": "rejected"}})
    return {"message": "Klub elutasítva"}

@fastapi_app.delete("/api/admin/clubs/{club_id}")
async def admin_delete_club(club_id: str, admin: User = Depends(get_admin_user)):
    await db.clubs.delete_one({"club_id": club_id})
    await db.club_members.delete_many({"club_id": club_id})
    await db.club_posts.delete_many({"club_id": club_id})
    return {"message": "Klub törölve"}

@fastapi_app.get("/api/admin/clubs/{club_id}/posts")
async def admin_get_club_posts(club_id: str, admin: User = Depends(get_admin_user)):
    return await db.club_posts.find({"club_id": club_id}, {"_id": 0}).sort("created_at", -1).to_list(100)

scheduler = AsyncIOScheduler()

async def delete_expired_events():
    """Delete events that have passed their end date, or date if end_date is missing."""
    try:
        now = datetime.now(timezone.utc).isoformat()

        result = await db.events.delete_many({
            "$or": [
                {"end_date": {"$ne": None, "$lt": now}},
                {
                    "$and": [
                        {"$or": [{"end_date": None}, {"end_date": {"$exists": False}}]},
                        {"date": {"$lt": now}}
                    ]
                }
            ]
        })

        if result.deleted_count > 0:
            logger.info(f"Deleted {result.deleted_count} expired events")
    except Exception as e:
        logger.error(f"Error deleting expired events: {e}")

scheduler.add_job(
    delete_expired_events,
    "interval",
    seconds=10,
    id="delete_expired_events",
    replace_existing=True
)
@fastapi_app.on_event("startup")
async def startup_event():
    scheduler.start()
    logger.info("Event cleanup scheduler started")
    await delete_expired_events()

    # Create indexes for performance
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username")
    await db.posts.create_index("user_id")
    await db.posts.create_index([("created_at", -1)])
    await db.posts.create_index("status")
    await db.events.create_index([("date", 1)])
    await db.events.create_index("status")
    await db.friend_requests.create_index("from_user_id")
    await db.friend_requests.create_index("to_user_id")
    await db.friend_requests.create_index("status")
    await db.messages.create_index([("from_user_id", 1), ("to_user_id", 1)])
    await db.messages.create_index([("timestamp", 1)])
    await db.listings.create_index("status")
    await db.listings.create_index([("created_at", -1)])
    await db.listings.create_index("user_id")
    await db.listings.create_index("category")
    await db.listing_favorites.create_index([("listing_id", 1), ("user_id", 1)])
    await db.clubs.create_index("status")
    await db.clubs.create_index("owner_id")
    await db.club_members.create_index([("club_id", 1), ("user_id", 1)])
    await db.club_members.create_index("user_id")
    await db.club_posts.create_index("club_id")
    logger.info("Database indexes created")

@fastapi_app.on_event("shutdown")
async def shutdown_db_client():
    scheduler.shutdown()
    client.close()

socket_app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path='/api/socket.io')
app = socket_app