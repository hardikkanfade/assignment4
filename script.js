const API_KEY = "5166a1616f503a5cce359fb109d18e7b";
let charts = {};

async function getWeather() {
    const city = cityInput.value;
    const days = parseInt(daysInput.value);

    results.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading weather data...</p>
        </div>
    `;

    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${API_KEY}`
        );

        if (!response.ok) throw new Error("City not found");

        const data = await response.json();
        displayWeather(data, days);

    } catch (err) {
        results.innerHTML = `<div class="loading">${err.message}</div>`;
    }
}

function displayWeather(data, numDays) {
    const daily = {};

    data.list.forEach(item => {
        const day = new Date(item.dt * 1000).toDateString();
        if (!daily[day]) {
            daily[day] = { temp: [], humidity: [], pressure: [], rain: 0 };
        }
        daily[day].temp.push(item.main.temp);
        daily[day].humidity.push(item.main.humidity);
        daily[day].pressure.push(item.main.pressure);
        if (item.rain?.["3h"]) daily[day].rain += item.rain["3h"];
    });

    const labels = Object.keys(daily).slice(0, numDays);
    const avgTemp = labels.map(d => avg(daily[d].temp));
    const minTemp = labels.map(d => Math.min(...daily[d].temp).toFixed(1));
    const maxTemp = labels.map(d => Math.max(...daily[d].temp).toFixed(1));
    const humidity = labels.map(d => avg(daily[d].humidity));
    const pressure = labels.map(d => avg(daily[d].pressure));
    const rain = labels.map(d => daily[d].rain.toFixed(1));

    results.innerHTML = `
        <div class="city-name">${data.city.name}, ${data.city.country}</div>

        <div class="badge-row">
            <span class="badge">🌡 Temperature</span>
            <span class="badge">💧 Humidity</span>
            <span class="badge">🌬 Pressure</span>
            <span class="badge">🌧 Rainfall</span>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">🌡</div>
                <div class="stat-label">Avg Temperature</div>
                <div class="stat-value">${avg(avgTemp)} °C</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🌧</div>
                <div class="stat-label">Total Rainfall</div>
                <div class="stat-value">${sum(rain)} mm</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">💧</div>
                <div class="stat-label">Avg Humidity</div>
                <div class="stat-value">${avg(humidity)} %</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🌬</div>
                <div class="stat-label">Avg Pressure</div>
                <div class="stat-value">${avg(pressure)} mb</div>
            </div>
        </div>

        <div class="summary-card">
            <h3>Weather Summary</h3>
            <p>
                The forecast shows stable atmospheric conditions with
                moderate temperature variation and consistent humidity levels.
            </p>
        </div>

        <div class="charts-grid">
            <div class="chart-card">
                <h3 class="chart-title">Average Temperature</h3>
                <canvas id="tempChart"></canvas>
            </div>

            <div class="chart-card">
                <h3 class="chart-title">Rainfall</h3>
                <canvas id="rainChart"></canvas>
            </div>

            <div class="chart-card">
                <h3 class="chart-title">Humidity Trend</h3>
                <canvas id="humidityChart"></canvas>
            </div>

            <div class="chart-card">
                <h3 class="chart-title">Pressure Trend</h3>
                <canvas id="pressureChart"></canvas>
            </div>

            <div class="chart-card">
                <h3 class="chart-title">Temperature Range (Min–Max)</h3>
                <canvas id="tempRangeChart"></canvas>
            </div>
        </div>
    `;

    destroyCharts();

    drawLine("tempChart", labels, avgTemp, "°C");
    drawBar("rainChart", labels, rain, "mm");
    drawLine("humidityChart", labels, humidity, "%");
    drawLine("pressureChart", labels, pressure, "mb");
    drawTempRangeChart(labels, minTemp, maxTemp);
}

function drawLine(id, labels, data, unit) {
    charts[id] = new Chart(document.getElementById(id), {
        type: "line",
        data: { labels, datasets: [{ label: unit, data, borderWidth: 2 }] },
        options: { responsive: true }
    });
}

function drawBar(id, labels, data, unit) {
    charts[id] = new Chart(document.getElementById(id), {
        type: "bar",
        data: { labels, datasets: [{ label: unit, data }] },
        options: { responsive: true }
    });
}

function drawTempRangeChart(labels, minData, maxData) {
    charts.range = new Chart(document.getElementById("tempRangeChart"), {
        type: "line",
        data: {
            labels,
            datasets: [
                { label: "Min Temp (°C)", data: minData, borderWidth: 2 },
                { label: "Max Temp (°C)", data: maxData, borderWidth: 2 }
            ]
        },
        options: { responsive: true }
    });
}

function destroyCharts() {
    Object.values(charts).forEach(c => c.destroy());
    charts = {};
}

function avg(arr) {
    return (arr.reduce((a, b) => a + Number(b), 0) / arr.length).toFixed(1);
}

function sum(arr) {
    return arr.reduce((a, b) => a + Number(b), 0).toFixed(1);
}

window.onload = getWeather;
