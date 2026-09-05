"""Geographic data and distance utilities."""

from typing import Dict, Tuple

# City coordinates (lat, lng) for impossible-travel calculations
CITY_COORDS: Dict[str, Tuple[float, float]] = {
    "New York": (40.7128, -74.0060),
    "Los Angeles": (34.0522, -118.2437),
    "Chicago": (41.8781, -87.6298),
    "Miami": (25.7617, -80.1918),
    "Seattle": (47.6062, -122.3321),
    "Austin": (30.2672, -97.7431),
}
