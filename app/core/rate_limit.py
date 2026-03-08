from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import FastAPI, Request

# Initialize limiter globally based on standard remote IP Address
limiter = Limiter(key_func=get_remote_address)

def setup_rate_limiting(app: FastAPI):
    """
    Hooks the slowapi limiter into the FastAPI app
    """
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
