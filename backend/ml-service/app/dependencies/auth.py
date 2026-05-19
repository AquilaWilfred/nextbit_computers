from app.core.security import verify_internal_key

# Re-export for use in routes via Depends()
__all__ = ["verify_internal_key"]
