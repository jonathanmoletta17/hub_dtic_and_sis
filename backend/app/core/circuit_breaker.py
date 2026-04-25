import pybreaker
import logging

logger = logging.getLogger(__name__)

class CircuitBreakerListener(pybreaker.CircuitBreakerListener):
    def state_change(self, cb, old_state, new_state):
        msg = f"Circuit Breaker state changed from {old_state.name} to {new_state.name}"
        logger.warning(msg)

# Global Circuit Breaker configuration for GLPI API calls
# Fails after 5 consecutive errors, resets after 60 seconds
glpi_circuit_breaker = pybreaker.CircuitBreaker(
    fail_max=5,
    reset_timeout=60,
    listeners=[CircuitBreakerListener()]
)
