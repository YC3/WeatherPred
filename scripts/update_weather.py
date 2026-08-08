#!/usr/bin/env python3
"""Fetch latest Tokyo weather data and write the static dashboard JSON."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen


TOKYO_LATITUDE = 35.6762
TOKYO_LONGITUDE = 139.6503
OUTPUT_PATH = Path("site/data/tokyo-weather.json")


def fetch_open_meteo() -> dict:
    params = {
        "latitude": TOKYO_LATITUDE,
        "longitude": TOKYO_LONGITUDE,
        "timezone": "Asia/Tokyo",
        "current": "temperature_2m,precipitation,wind_speed_10m",
        "daily": (
            "temperature_2m_max,temperature_2m_min,"
            "precipitation_sum,wind_speed_10m_max"
        ),
        "forecast_days": "5",
    }
    url = f"https://api.open-meteo.com/v1/forecast?{urlencode(params)}"

    with urlopen(url, timeout=20) as response:
        return json.load(response)


def condition_for_rain(rain_mm: float) -> str:
    if rain_mm > 7:
        return "Rainy"
    if rain_mm > 1:
        return "Showers"
    return "Stable"


def build_dashboard_data(raw: dict) -> dict:
    daily = raw["daily"]
    forecast = []

    for index, date in enumerate(daily["time"]):
        rain_mm = daily["precipitation_sum"][index] or 0
        forecast.append(
            {
                "date": date,
                "highC": daily["temperature_2m_max"][index],
                "lowC": daily["temperature_2m_min"][index],
                "rainMm": rain_mm,
                "windKmh": daily["wind_speed_10m_max"][index],
                "condition": condition_for_rain(rain_mm),
            }
        )

    total_rain = sum(day["rainMm"] for day in forecast)
    max_high = max(day["highC"] for day in forecast)
    is_hot = max_high >= 33
    is_rainy = total_rain >= 10

    return {
        "location": "Tokyo, Japan",
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "model": "Open-Meteo feed + mock ML layer",
        "confidence": 0.64 if is_rainy else 0.76,
        "current": {
            "temperatureC": raw["current"]["temperature_2m"],
            "precipitationMm": raw["current"]["precipitation"],
            "windKmh": raw["current"]["wind_speed_10m"],
        },
        "forecast": forecast,
        "brief": (
            "Tokyo's next five days look "
            f"{'hot' if is_hot else 'mild'} with "
            f"{'meaningful rain risk' if is_rainy else 'limited rain risk'}. "
            "The demo treats the live API forecast as the latest signal and "
            "leaves room for a custom model output beside it."
        ),
        "planningNote": (
            "Prioritize rain planning" if is_rainy else "Heat planning matters most"
        ),
    }


def main() -> None:
    raw = fetch_open_meteo()
    data = build_dashboard_data(raw)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")

    print(f"Updated Tokyo weather data for {len(data['forecast'])} days.")


if __name__ == "__main__":
    main()
