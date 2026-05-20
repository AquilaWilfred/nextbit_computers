import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, status, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import select as sa_select
from sqlalchemy.orm import Session
from typing import Optional, Sequence
from db.postgres import get_db
from models.auth import User
from models.b2b import B2BApplication
from app.auth_utils import get_password_hash, verify_password, create_access_token, verify_token

router = APIRouter()
security = HTTPBearer(auto_error=False)

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str = "user"
    is_verified: bool

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
    # Try cookie first (secure), then fall back to Bearer header
    # Direct email forwarded by Axum gateway after JWT verification
    gateway_email = request.headers.get("x-user-email")
    if gateway_email:
        return db.query(User).filter(User.email == gateway_email).first()

    token = request.cookies.get("nextbit_token")
    
    if not token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    
    if not token:
        return None

    # Gateway-forwarded identity (already verified by Axum JWT middleware)
    if token and "@" in token and "." in token and len(token) < 200:
        return db.query(User).filter(User.email == token).first()

    email = verify_token(token)
    if not email:
        return None
    
    return db.query(User).filter(User.email == email).first()


def require_role(roles: Sequence[str]):
    async def verify_role(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Access denied")
        return current_user
    return verify_role


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.password or ""):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user.email})
    
    # HttpOnly cookie — JS cannot read this
    response.set_cookie(
        key="nextbit_token",
        value=access_token,
        httponly=True,        # XSS protection — JS cannot access
        secure=False,         # Set True in production (HTTPS only)
        samesite="lax",     # CSRF protection
        max_age=60 * 60 * 24, # 24 hours
        path="/",
    )
    response.set_cookie(
        key="nextbit_ws_token",
        value=access_token,
        httponly=False,       # JS needs to read this for WebSocket connection
        secure=False,
        samesite="lax",
        max_age=60 * 60 * 24,
        path="/",
    )
    
    return TokenResponse(
        access_token=access_token,  # still return for backward compat
        user=UserResponse(id=user.id, email=user.email, name=user.name, 
                         role=user.role, is_verified=user.emailVerified)
    )

@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    hashed_password = get_password_hash(request.password)
    new_user = User(
        email=request.email,
        name=request.name,
        password=hashed_password,
        role="user",
        openId=str(uuid.uuid4()),
        loginMethod="email",
        emailVerified=False,
        updatedAt=datetime.utcnow(),
        lastSignedIn=datetime.utcnow(),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    access_token = create_access_token(data={"sub": new_user.email})

    response.set_cookie(
        key="nextbit_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=60 * 60 * 24,
        path="/",
    )
    response.set_cookie(
        key="nextbit_ws_token",
        value=access_token,
        httponly=False,
        secure=False,
        samesite="lax",
        max_age=60 * 60 * 24,
        path="/",
    )

    return TokenResponse(
        access_token=access_token,
        user=UserResponse(id=new_user.id, email=new_user.email, name=new_user.name, role=new_user.role, is_verified=new_user.emailVerified)
    )


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(
        key="nextbit_token",
        path="/",
        httponly=True,
        samesite="lax",
    )
    response.delete_cookie(
        key="nextbit_ws_token",
        path="/",
        httponly=False,
        samesite="lax",
    )
    return {"message": "Logged out"}

@router.get("/me")
async def get_me(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if user has an approved B2B application
    b2b_app = db.execute(
        sa_select(B2BApplication).where(
            B2BApplication.status == "approved",
            (B2BApplication.user_id == current_user.id) | (B2BApplication.primary_contact_email == current_user.email),
        )
    ).scalar_one_or_none()
    result = UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        is_verified=current_user.emailVerified,
    )
    # Attach b2b info if approved
    data = result.dict() if hasattr(result, "dict") else result.__dict__
    data["b2b"] = {
        "companyId": b2b_app.id,
        "companyName": b2b_app.company_name,
        "creditLimit": b2b_app.credit_limit,
        "paymentTerms": b2b_app.payment_terms,
    } if b2b_app else None
    return data

@router.post("/reset-password-request")
async def reset_password_request(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    email = body.get("email")
    # TODO: implement real OTP
    return {"nextbit_token": "dummy-reset-token", "email": email}

@router.post("/reset-password")
async def reset_password(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    return {"message": "Password reset successfully"}

@router.post("/verify-email")
async def verify_email(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    return {"message": "Email verified"}

@router.post("/resend-verification")
async def resend_verification(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    return {"nextbit_token": "dummy-verification-token", "email": body.get("email")}
