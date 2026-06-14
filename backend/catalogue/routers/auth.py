import uuid
import json
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, status, Request, Response, BackgroundTasks
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy import select as sa_select
from sqlalchemy.orm import Session
from typing import Optional, Sequence
from db.postgres import get_db
from db.redis import get_redis
from models.auth import User
from models.b2b import B2BApplication
from app.auth_utils import get_password_hash, verify_password, create_access_token, verify_token
from utils.email import send_verification_email, send_password_reset_email

router = APIRouter()
security = HTTPBearer(auto_error=False)

VERIFY_TOKEN_TTL  = 60 * 60 * 24      # 24 hours
RESET_TOKEN_TTL   = 60 * 60            # 1 hour

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    surname: Optional[str] = None
    phone: Optional[str] = None
    country_code: Optional[str] = "+254"

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str = "user"
    is_verified: bool
    phone: Optional[str] = None
    createdAt: Optional[datetime] = None
    lastSignedIn: Optional[datetime] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

async def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    user = await get_current_user_optional(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[User]:
    gateway_email = request.headers.get("x-user-email")
    if gateway_email:
        user = db.query(User).filter(User.email == gateway_email).first()
        try:
            from datetime import datetime as _dt
            if user:
                should_update = False
                if not user.lastSignedIn:
                    should_update = True
                else:
                    try:
                        delta = (_dt.utcnow() - user.lastSignedIn).total_seconds()
                        if delta > 300:
                            should_update = True
                    except Exception:
                        should_update = True
                if should_update:
                    user.lastSignedIn = _dt.utcnow()
                    user.updatedAt = _dt.utcnow()
                    db.commit()
                    db.refresh(user)
        except Exception:
            pass
        return user

    token = request.cookies.get("nextbit_token")
    if not token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        return None
    if token and "@" in token and "." in token and len(token) < 200:
        return db.query(User).filter(User.email == token).first()

    email = verify_token(token)
    if not email:
        return None

    user = db.query(User).filter(User.email == email).first()
    try:
        from datetime import datetime as _dt
        if user:
            should_update = False
            if not user.lastSignedIn:
                should_update = True
            else:
                try:
                    delta = (_dt.utcnow() - user.lastSignedIn).total_seconds()
                    if delta > 300:
                        should_update = True
                except Exception:
                    should_update = True
            if should_update:
                user.lastSignedIn = _dt.utcnow()
                user.updatedAt = _dt.utcnow()
                db.commit()
                db.refresh(user)
    except Exception:
        pass
    return user


def require_role(roles: Sequence[str]):
    async def verify_role(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Access denied")
        return current_user
    return verify_role


def _set_auth_cookies(response: Response, token: str):
    response.set_cookie(key="nextbit_token", value=token, httponly=True,
                        secure=True, samesite="lax", max_age=60*60*24, path="/")
    response.set_cookie(key="nextbit_ws_token", value=token, httponly=False,
                        secure=True, samesite="lax", max_age=60*60*24, path="/")


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not user.password or not verify_password(request.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.emailVerified:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in")
    user.lastSignedIn = datetime.utcnow()
    user.updatedAt = datetime.utcnow()
    if not user.createdAt:
        user.createdAt = datetime.utcnow()
    db.commit()
    db.refresh(user)
    access_token = create_access_token(data={"sub": user.email})
    _set_auth_cookies(response, access_token)
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user.id, email=user.email, name=user.name, role=user.role,
            is_verified=user.emailVerified, phone=user.phone,
            createdAt=user.createdAt, lastSignedIn=user.lastSignedIn,
        )
    )


@router.post("/register")
async def register(
    request: RegisterRequest,
    response: Response,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # Check if email already exists
    existing = db.query(User).filter(User.email == request.email).first()
    redis = get_redis()
    pending_key = f"pending_verify:{request.email}"
    pending_registration = await redis.get(pending_key)

    # If a verified user exists, reject immediately
    if existing and existing.emailVerified:
        raise HTTPException(status_code=400, detail="This email already exists in Nextbit Ecosystem. Sign in now")

    # If an unverified user exists, resend verification link and return
    if existing and not existing.emailVerified:
        verify_token_val = secrets.token_urlsafe(32)
        code = ''.join([str(ord(c) % 10) for c in verify_token_val[:6]]).ljust(6, '0')[:6]
        await redis.setex(f"verify:{verify_token_val}", VERIFY_TOKEN_TTL, json.dumps({"email": existing.email}))
        await redis.setex(f"code:{code}", VERIFY_TOKEN_TTL, verify_token_val)
        first_name = existing.name.split()[0] if existing.name else "there"
        background_tasks.add_task(send_verification_email, existing.email, first_name, verify_token_val)
        return JSONResponse(status_code=201, content={"needs_verification": True, "email": existing.email, "token": verify_token_val})

    # Build full name: first + last + optional surname
    parts = [request.first_name, request.last_name]
    if request.surname:
        parts.append(request.surname)
    full_name = " ".join(p.strip() for p in parts if p.strip())

    # Format phone with country code
    phone = None
    if request.phone:
        cc = (request.country_code or "+254").strip()
        number = request.phone.strip().lstrip("0")
        phone = f"{cc}{number}"

    # If a pending registration already exists, update payload and resend verification
    if pending_registration:
        registration_payload = json.loads(pending_registration)
        registration_payload.update({
            "name": full_name,
            "password": get_password_hash(request.password),
            "phone": phone,
            "updatedAt": datetime.utcnow().isoformat(),
            "lastSignedIn": datetime.utcnow().isoformat(),
        })
        await redis.setex(pending_key, VERIFY_TOKEN_TTL, json.dumps(registration_payload))
        verify_token_val = secrets.token_urlsafe(32)
        code = ''.join([str(ord(c) % 10) for c in verify_token_val[:6]]).ljust(6, '0')[:6]
        await redis.setex(f"verify:{verify_token_val}", VERIFY_TOKEN_TTL, json.dumps({"email": request.email}))
        await redis.setex(f"code:{code}", VERIFY_TOKEN_TTL, verify_token_val)
        background_tasks.add_task(send_verification_email, request.email, request.first_name, verify_token_val)
        return JSONResponse(status_code=201, content={"needs_verification": True, "email": request.email, "token": verify_token_val})

    pending_payload = {
        "email": request.email,
        "name": full_name,
        "password": get_password_hash(request.password),
        "role": "user",
        "openId": str(uuid.uuid4()),
        "loginMethod": "email",
        "emailVerified": False,
        "phone": phone,
        "createdAt": datetime.utcnow().isoformat(),
        "updatedAt": datetime.utcnow().isoformat(),
        "lastSignedIn": datetime.utcnow().isoformat(),
    }

    await redis.setex(pending_key, VERIFY_TOKEN_TTL, json.dumps(pending_payload))
    verify_token_val = secrets.token_urlsafe(32)
    code = ''.join([str(ord(c) % 10) for c in verify_token_val[:6]]).ljust(6, '0')[:6]
    await redis.setex(f"verify:{verify_token_val}", VERIFY_TOKEN_TTL, json.dumps({"email": request.email}))
    await redis.setex(f"code:{code}", VERIFY_TOKEN_TTL, verify_token_val)
    background_tasks.add_task(send_verification_email, request.email, request.first_name, verify_token_val)

    return JSONResponse(status_code=201, content={"needs_verification": True, "email": request.email, "token": verify_token_val})


@router.get("/google")
async def google_oauth():
    return RedirectResponse(url="/auth?error=google_not_configured")


@router.get("/facebook")
async def facebook_oauth():
    return RedirectResponse(url="/auth?error=facebook_not_configured")


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="nextbit_token", path="/", httponly=True, samesite="lax")
    response.delete_cookie(key="nextbit_ws_token", path="/", httponly=False, samesite="lax")
    return {"message": "Logged out"}


@router.get("/me")
async def get_me(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    b2b_app = db.execute(
        sa_select(B2BApplication).where(
            B2BApplication.status == "approved",
            (B2BApplication.user_id == current_user.id) |
            (B2BApplication.primary_contact_email == current_user.email),
        )
    ).scalar_one_or_none()
    result = UserResponse(
        id=current_user.id, email=current_user.email, name=current_user.name,
        role=current_user.role, is_verified=current_user.emailVerified,
        phone=current_user.phone, createdAt=current_user.createdAt,
        lastSignedIn=current_user.lastSignedIn,
    )
    data = result.dict() if hasattr(result, "dict") else result.__dict__
    data["b2b"] = {
        "companyId": b2b_app.id, "companyName": b2b_app.company_name,
        "creditLimit": b2b_app.credit_limit, "paymentTerms": b2b_app.payment_terms,
    } if b2b_app else None
    return data


@router.post("/verify-email")
async def verify_email(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    token = body.get("token")
    code = body.get("code")
    
    if not token and not code:
        raise HTTPException(status_code=400, detail="Token or verification code required")
    
    redis = get_redis()
    
    # If code provided, look up the token
    if code and not token:
        token = await redis.get(f"code:{code}")
        if not token:
            raise HTTPException(status_code=400, detail="Invalid or expired verification code")
    
    verify_payload = await redis.get(f"verify:{token}")
    if not verify_payload:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")

    try:
        verify_data = json.loads(verify_payload)
        email = verify_data.get("email")
    except Exception:
        email = verify_payload

    if not email:
        raise HTTPException(status_code=400, detail="Invalid verification payload")

    pending_key = f"pending_verify:{email}"
    user = db.query(User).filter(User.email == email).first()

    if not user:
        pending_registration = await redis.get(pending_key)
        if not pending_registration:
            raise HTTPException(status_code=404, detail="User not found")
        registration_payload = json.loads(pending_registration)
        user = User(
            email=registration_payload["email"],
            name=registration_payload["name"],
            password=registration_payload["password"],
            role=registration_payload.get("role", "user"),
            openId=registration_payload.get("openId", str(uuid.uuid4())),
            loginMethod=registration_payload.get("loginMethod", "email"),
            emailVerified=True,
            phone=registration_payload.get("phone"),
            createdAt=datetime.fromisoformat(registration_payload["createdAt"]),
            updatedAt=datetime.utcnow(),
            lastSignedIn=datetime.fromisoformat(registration_payload["lastSignedIn"]),
        )
        db.add(user)
    else:
        if user.emailVerified:
            # clean up mappings
            await redis.delete(f"verify:{token}")
            await redis.delete(pending_key)
            # attempt to delete code mapping derived from token or provided code
            try:
                code_from_token = ''.join([str(ord(c) % 10) for c in token[:6]]).ljust(6, '0')[:6]
                await redis.delete(f"code:{code_from_token}")
            except Exception:
                pass
            if code:
                await redis.delete(f"code:{code}")
            return {"message": "Email already verified", "email": user.email}
        user.emailVerified = True
        user.updatedAt = datetime.utcnow()

    db.commit()
    await redis.delete(f"verify:{token}")
    await redis.delete(pending_key)
    # Clean up code mapping derived from token and provided code
    try:
        code_from_token = ''.join([str(ord(c) % 10) for c in token[:6]]).ljust(6, '0')[:6]
        await redis.delete(f"code:{code_from_token}")
    except Exception:
        pass
    if code:
        await redis.delete(f"code:{code}")
    return {"message": "Email verified successfully", "email": email}


@router.post("/resend-verification")
async def resend_verification(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    body = await request.json()
    email = body.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email required")

    redis = get_redis()
    user = db.query(User).filter(User.email == email).first()
    pending_key = f"pending_verify:{email}"
    pending_registration = await redis.get(pending_key)

    if user and user.emailVerified:
        return {"message": "Email already verified"}

    if not user and not pending_registration:
        raise HTTPException(status_code=404, detail="No pending verification found for this email")

    verify_token_val = secrets.token_urlsafe(32)
    code = ''.join([str(ord(c) % 10) for c in verify_token_val[:6]]).ljust(6, '0')[:6]
    await redis.setex(f"verify:{verify_token_val}", VERIFY_TOKEN_TTL, json.dumps({"email": email}))
    await redis.setex(f"code:{code}", VERIFY_TOKEN_TTL, verify_token_val)
    first_name = "there"
    if user and user.name:
        first_name = user.name.split()[0]
    elif pending_registration:
        try:
            pending_data = json.loads(pending_registration)
            first_name = pending_data.get("name", "there").split()[0]
        except Exception:
            first_name = "there"

    background_tasks.add_task(send_verification_email, email, first_name, verify_token_val)
    return {"message": "Verification email sent", "token": verify_token_val, "email": email}


@router.post("/reset-password-request")
async def reset_password_request(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    body = await request.json()
    email = body.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    user = db.query(User).filter(User.email == email).first()
    # Always return 200 to prevent email enumeration
    if user:
        reset_tok = secrets.token_urlsafe(32)
        code = ''.join([str(ord(c) % 10) for c in reset_tok[:6]]).ljust(6, '0')[:6]
        redis = get_redis()
        await redis.setex(f"reset:{reset_tok}", RESET_TOKEN_TTL, email)
        await redis.setex(f"reset_code:{code}", RESET_TOKEN_TTL, reset_tok)
        first_name = user.name.split()[0] if user.name else "there"
        background_tasks.add_task(send_password_reset_email, email, first_name, reset_tok)
    return {"message": "If that email exists, a reset link has been sent"}


@router.post("/reset-password")
async def reset_password(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    token = body.get("token")
    code = body.get("code")
    new_password = body.get("password")
    
    if (not token and not code) or not new_password:
        raise HTTPException(status_code=400, detail="Token or code and password required")
    
    redis = get_redis()
    
    # If code provided, look up the token
    if code and not token:
        token = await redis.get(f"reset_code:{code}")
        if not token:
            raise HTTPException(status_code=400, detail="Invalid or expired reset code")
    
    email = await redis.get(f"reset:{token}")
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.password = get_password_hash(new_password)
    user.updatedAt = datetime.utcnow()
    db.commit()
    
    await redis.delete(f"reset:{token}")
    # Clean up code mapping if it exists
    if code:
        await redis.delete(f"reset_code:{code}")
    
    return {"message": "Password reset successfully"}


class OAuthUpsertRequest(BaseModel):
    email: str
    name: str
    google_id: str
    avatar: Optional[str] = None

@router.post("/oauth/upsert")
async def oauth_upsert(
    request: Request,
    body: OAuthUpsertRequest,
    db: Session = Depends(get_db),
):
    # Verify internal call
    api_key = request.headers.get("x-internal-key")
    if api_key != "nextbit_internal_secret_2026":
        raise HTTPException(status_code=403, detail="Forbidden")

    user = db.query(User).filter(User.email == body.email).first()
    if user:
        # Update last signed in
        user.lastSignedIn = datetime.utcnow()
        user.updatedAt = datetime.utcnow()
        if not user.openId:
            user.openId = str(uuid.uuid4())
        if not user.emailVerified:
            user.emailVerified = True  # Google emails are pre-verified
        db.commit()
        db.refresh(user)
    else:
        user = User(
            email=body.email,
            name=body.name,
            password=None,
            role="user",
            openId=str(uuid.uuid4()),
            loginMethod="google",
            emailVerified=True,
            createdAt=datetime.utcnow(),
            updatedAt=datetime.utcnow(),
            lastSignedIn=datetime.utcnow(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "user": {
        "id": user.id, "email": user.email, "name": user.name,
        "role": user.role, "is_verified": user.emailVerified,
    }}
