const fallbackData = {
  location: "Tokyo, Japan",
  updatedAt: "2026-08-08T14:00:00+09:00",
  model: "Seasonal baseline + lag features",
  confidence: 0.72,
  current: {
    temperatureC: 31.4,
    precipitationMm: 1.2,
    windKmh: 18.6
  },
  forecast: [
    { date: "2026-08-09", highC: 33.1, lowC: 26.1, rainMm: 2.4, windKmh: 19.2, condition: "Humid" },
    { date: "2026-08-10", highC: 32.4, lowC: 25.7, rainMm: 6.8, windKmh: 21.0, condition: "Showers" },
    { date: "2026-08-11", highC: 34.0, lowC: 26.4, rainMm: 1.1, windKmh: 16.7, condition: "Warm" },
    { date: "2026-08-12", highC: 34.6, lowC: 27.2, rainMm: 0.5, windKmh: 15.8, condition: "Hot" },
    { date: "2026-08-13", highC: 33.8, lowC: 26.8, rainMm: 3.7, windKmh: 17.4, condition: "Cloudy" }
  ],
  brief:
    "The mock model expects a warm, humid five-day period with the main rainfall risk early in the window. Temperature predictions are more stable than precipitation because recent rainfall is intermittent.",
  planningNote: "Carry rain cover early week"
};

async function loadWeatherData() {
  try {
    const response = await fetch("./data/tokyo-weather.json", { cache: "no-store" });
    if (!response.ok) throw new Error("No generated data found");
    return await response.json();
  } catch {
    return fallbackData;
  }
}

function formatDate(value, options = {}) {
  return new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Tokyo",
    month: "short",
    day: "numeric",
    ...options
  }).format(new Date(value));
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function renderMetrics(data) {
  setText("last-updated", formatDate(data.updatedAt, { hour: "2-digit", minute: "2-digit" }));
  setText("current-temp", `${data.current.temperatureC.toFixed(1)}C`);
  setText("current-rain", `${data.current.precipitationMm.toFixed(1)} mm`);
  setText("current-wind", `${data.current.windKmh.toFixed(0)} km/h`);
  setText("confidence", `${Math.round(data.confidence * 100)}%`);
  setText("model-name", data.model);
  setText("brief", data.brief);

  const totalRain = data.forecast.reduce((sum, day) => sum + day.rainMm, 0);
  const rainRisk = totalRain > 12 ? "Elevated" : totalRain > 5 ? "Moderate" : "Low";
  setText("rain-risk", rainRisk);
  setText("planning-note", data.planningNote);
}

function renderCards(days) {
  const grid = document.getElementById("forecast-grid");
  grid.innerHTML = days
    .map(
      (day) => `
        <article class="day-card">
          <h3>${formatDate(day.date, { weekday: "short", month: "short", day: "numeric" })}</h3>
          <div class="temp">
            <strong>${day.highC.toFixed(1)}C</strong>
            <span>${day.condition}</span>
          </div>
          <dl>
            <div><dt>Low</dt><dd>${day.lowC.toFixed(1)}C</dd></div>
            <div><dt>Rain</dt><dd>${day.rainMm.toFixed(1)} mm</dd></div>
            <div><dt>Wind</dt><dd>${day.windKmh.toFixed(0)} km/h</dd></div>
          </dl>
        </article>
      `
    )
    .join("");
}

function renderChart(days) {
  const canvas = document.getElementById("forecast-chart");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 34, right: 36, bottom: 48, left: 54 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const values = days.flatMap((day) => [day.highC, day.lowC]);
  const min = Math.floor(Math.min(...values) - 2);
  const max = Math.ceil(Math.max(...values) + 2);
  const xStep = chartWidth / (days.length - 1);
  const yFor = (value) => padding.top + ((max - value) / (max - min)) * chartHeight;
  const xFor = (index) => padding.left + index * xStep;

  ctx.clearRect(0, 0, width, height);
  ctx.font = "22px system-ui";
  ctx.fillStyle = "#14202e";
  ctx.fillText("High / Low temperature", padding.left, 28);

  ctx.strokeStyle = "#d9e2ea";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  drawLine(ctx, days.map((day, index) => [xFor(index), yFor(day.highC)]), "#e05d3d");
  drawLine(ctx, days.map((day, index) => [xFor(index), yFor(day.lowC)]), "#0f8b8d");

  days.forEach((day, index) => {
    const x = xFor(index);
    ctx.fillStyle = "#607086";
    ctx.font = "16px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(formatDate(day.date), x, height - 18);
    drawPoint(ctx, x, yFor(day.highC), "#e05d3d");
    drawPoint(ctx, x, yFor(day.lowC), "#0f8b8d");
  });

  ctx.textAlign = "left";
  ctx.fillStyle = "#e05d3d";
  ctx.fillText("High", width - 135, 30);
  ctx.fillStyle = "#0f8b8d";
  ctx.fillText("Low", width - 76, 30);
}

function drawLine(ctx, points, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function drawPoint(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
}

const data = await loadWeatherData();
renderMetrics(data);
renderCards(data.forecast);
renderChart(data.forecast);
