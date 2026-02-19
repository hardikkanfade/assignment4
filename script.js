window.onload = function () {
    processData(pharmacyData);
}

function processData(data) {

    // 1. Category Distribution
    let categoryCount = {};
    data.forEach(p => {
        let cat = p.categoryName || "Unknown";
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    // 2. City-wise Stats (Avg Rating & Total Reviews)
    let cityStats = {};
    data.forEach(p => {
        let city = p.city || "Unknown";
        if (!cityStats[city]) {
            cityStats[city] = { totalRating: 0, count: 0, totalReviews: 0 };
        }
        if (p.totalScore) {
            cityStats[city].totalRating += p.totalScore;
            cityStats[city].count++;
        }
        if (p.reviewsCount) {
            cityStats[city].totalReviews += p.reviewsCount;
        }
    });

    let cityRatings = [];
    let cityReviews = [];
    for (let city in cityStats) {
        let avg = cityStats[city].count > 0 ? (cityStats[city].totalRating / cityStats[city].count).toFixed(2) : 0;
        cityRatings.push({ label: city, value: avg });
        cityReviews.push({ label: city, value: cityStats[city].totalReviews });
    }

    // 3. Rating Distribution
    let ratingDist = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    data.forEach(p => {
        if (p.totalScore) {
            let r = Math.floor(p.totalScore);
            if (r >= 1 && r <= 5) ratingDist[r]++;
        }
    });

    // 4. Services Availability
    let services = { delivery: 0, driveThrough: 0, wheelchair: 0 };
    data.forEach(p => {
        let info = p.additionalInfo || {};
        if (info["Service options"]) {
            info["Service options"].forEach(s => {
                if (s.Delivery) services.delivery++;
                if (s["Drive-through"]) services.driveThrough++;
            });
        }
        if (info.Accessibility) {
            info.Accessibility.forEach(a => {
                if (a["Wheelchair accessible parking lot"]) services.wheelchair++;
            });
        }
    });

    // 5. Aggregate Popular Times (Average Occupancy per Hour)
    let hourlyOccupancy = Array(24).fill(0);
    let hourlyCounts = Array(24).fill(0);

    data.forEach(p => {
        if (p.popularTimesHistogram && p.popularTimesHistogram.Mo) {
            p.popularTimesHistogram.Mo.forEach(slot => {
                let hour = slot.hour;
                if (hour >= 0 && hour < 24) {
                    hourlyOccupancy[hour] += slot.occupancyPercent;
                    hourlyCounts[hour]++;
                }
            });
        }
    });

    let avgHourlyData = hourlyOccupancy.map((total, hour) => {
        let count = hourlyCounts[hour];
        let avg = count > 0 ? Math.round(total / count) : 0;
        return { label: formatHour(hour), value: avg };
    });


    drawCharts(categoryCount, cityRatings, ratingDist, cityReviews, avgHourlyData, services);
}

function drawCharts(categoryCount, cityRatings, ratingDist, cityReviews, avgHourlyData, services) {

    // 1. Category Pie Chart
    new FusionCharts({
        type: "pie2d",
        renderAt: "categoryChart",
        width: "100%",
        height: "300",
        dataFormat: "json",
        dataSource: {
            chart: { caption: "Category Distribution", theme: "fusion" },
            data: Object.entries(categoryCount).map(([l, v]) => ({ label: l, value: v }))
        }
    }).render();

    // 2. Average Rating by City (Bar Chart)
    new FusionCharts({
        type: "bar2d",
        renderAt: "cityRatingChart",
        width: "100%",
        height: "300",
        dataFormat: "json",
        dataSource: {
            chart: { caption: "Avg Rating by City", xAxisName: "City", yAxisName: "Rating (1-5)", theme: "fusion" },
            data: cityRatings
        }
    }).render();

    // 3. Rating Distribution (Column Chart)
    new FusionCharts({
        type: "column2d",
        renderAt: "ratingChart",
        width: "100%",
        height: "300",
        dataFormat: "json",
        dataSource: {
            chart: { caption: "Rating Distribution", xAxisName: "Stars", yAxisName: "Count", theme: "fusion" },
            data: Object.entries(ratingDist).map(([l, v]) => ({ label: l + "★", value: v }))
        }
    }).render();

    // 4. Total Reviews by City (Column Chart)
    new FusionCharts({
        type: "column2d",
        renderAt: "cityReviewsChart",
        width: "100%",
        height: "300",
        dataFormat: "json",
        dataSource: {
            chart: { caption: "Total Reviews Volume", xAxisName: "City", yAxisName: "Total Reviews", theme: "fusion" },
            data: cityReviews
        }
    }).render();

    // 5. Popular Time Line Chart
    new FusionCharts({
        type: "spline",
        renderAt: "timeChart",
        width: "100%",
        height: "300",
        dataFormat: "json",
        dataSource: {
            chart: { caption: "Avg Daily Footfall (Monday)", xAxisName: "Time", yAxisName: "Occupancy %", theme: "fusion" },
            data: avgHourlyData
        }
    }).render();

    // 6. Services Stacked Column
    new FusionCharts({
        type: "stackedcolumn2d",
        renderAt: "serviceChart",
        width: "100%",
        height: "300",
        dataFormat: "json",
        dataSource: {
            chart: { caption: "Service Availability", theme: "fusion" },
            categories: [{
                category: [
                    { label: "Delivery" },
                    { label: "Drive-Through" },
                    { label: "Wheelchair Access" }
                ]
            }],
            dataset: [
                {
                    seriesname: "Available",
                    data: [
                        { value: services.delivery },
                        { value: services.driveThrough },
                        { value: services.wheelchair }
                    ]
                }
            ]
        }
    }).render();
}

function formatHour(h) {
    if (h === 0) return "12 AM";
    if (h === 12) return "12 PM";
    return h < 12 ? h + " AM" : (h - 12) + " PM";
}
