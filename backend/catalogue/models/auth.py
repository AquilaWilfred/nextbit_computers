from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.sql import func
from db.postgres import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password = Column("password", String, nullable=True)
    role = Column(String, default="user")
    openId = Column("openId", String, nullable=True)
    phone = Column(String, nullable=True)
    loginMethod = Column("loginMethod", String, nullable=True)
    emailVerified = Column("emailVerified", Boolean, default=False)
    createdAt = Column("createdAt", DateTime, server_default=func.now())
    updatedAt = Column("updatedAt", DateTime, onupdate=func.now())
    lastSignedIn = Column("lastSignedIn", DateTime, nullable=True)

    # Aliases for catalogue code compatibility
    @property
    def hashed_password(self):
        return self.password

    @property
    def is_verified(self):
        return self.emailVerified or False

    @property
    def is_active(self):
        return True
