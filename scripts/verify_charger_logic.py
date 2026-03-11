import json
import unittest
from datetime import datetime
from app.core.utils.time_utils import calculate_business_minutes

def calculate_operating_percentage(operating_minutes: int, shift_minutes: int) -> float:
    if shift_minutes <= 0: return 0.0
    return round((operating_minutes / shift_minutes) * 100, 3)

class TestChargerFormulas(unittest.TestCase):
    def test_operating_time_same_day(self):
        # Shift: 08:00 to 18:00 (600 mins) = 10h
        # Active: 10:00 to 12:00 = 2h = 120 mins
        start = datetime(2026, 3, 11, 10, 0)
        end = datetime(2026, 3, 11, 12, 0)
        
        mins = calculate_business_minutes(start, end, "08:00", "18:00", False)
        self.assertEqual(mins, 120)
        
        pct = calculate_operating_percentage(mins, 600)
        self.assertEqual(pct, 20.0)

    def test_idle_time_percentage(self):
        shift_mins = 600
        service_mins = 150 
        idle_mins = shift_mins - service_mins
        
        pct = calculate_operating_percentage(idle_mins, shift_mins)
        self.assertEqual(pct, 75.0)

    def test_out_of_shift_bounds(self):
        # Work done from 06:00 to 07:00, but shift starts at 08:00
        start = datetime(2026, 3, 11, 6, 0)
        end = datetime(2026, 3, 11, 7, 0)
        mins = calculate_business_minutes(start, end, "08:00", "18:00", False)
        
        self.assertEqual(mins, 0)

if __name__ == '__main__':
    unittest.main()
