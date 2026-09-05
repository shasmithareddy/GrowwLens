import os
from datetime import date, datetime, time
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")
MARKET_OPEN = time(9, 15)
MARKET_CLOSE = time(15, 30)

# NSE/BSE holidays can be overridden with a comma-separated YYYY-MM-DD list.
_DEFAULT_HOLIDAYS = {
    date(2026, 1, 26), date(2026, 3, 3), date(2026, 3, 26),
    date(2026, 3, 31), date(2026, 4, 3), date(2026, 4, 14),
    date(2026, 5, 1), date(2026, 5, 27), date(2026, 6, 26),
    date(2026, 8, 15), date(2026, 8, 26), date(2026, 9, 14),
    date(2026, 10, 2), date(2026, 10, 20), date(2026, 11, 9),
    date(2026, 11, 10), date(2026, 11, 24), date(2026, 12, 25),
}


def market_holidays(year: int | None = None) -> set[date]:
    configured = os.getenv("INDIAN_MARKET_HOLIDAYS", "")
    if not configured.strip():
        return {holiday for holiday in _DEFAULT_HOLIDAYS if year is None or holiday.year == year}
    holidays = set()
    for value in configured.split(","):
        try:
            holidays.add(date.fromisoformat(value.strip()))
        except ValueError:
            continue
    return holidays


def get_ist_now() -> datetime:
    return datetime.now(IST)


def is_indian_market_open(now: datetime | None = None) -> bool:
    current = now.astimezone(IST) if now else get_ist_now()
    if current.weekday() >= 5 or current.date() in market_holidays(current.year):
        return False
    return MARKET_OPEN <= current.time() <= MARKET_CLOSE


def live_data_allowed(now: datetime | None = None) -> bool:
    return is_indian_market_open(now)
