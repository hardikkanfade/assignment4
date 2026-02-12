window.onload = function() {
    processData(pharmacyData);
}

function processData(data) {

    let categoryCount = {};
    let claimed = { claimed: 0, unclaimed: 0 };
    let ratingDist = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    let reviews = [];
    let ratings = [];

    let services = {
        delivery: 0,
        driveThrough: 0,
        wheelchair: 0
    };

    data.forEach(pharmacy => {

        // Category
        const cat = pharmacy.categoryName || "Unknown";
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;

        // Claimed
        pharmacy.claimThisBusiness ? claimed.claimed++ : claimed.unclaimed++;

        // Rating
        if (pharmacy.totalScore) {
            ratingDist[Math.floor(pharmacy.totalScore)]++;
            ratings.push(pharmacy.totalScore);
        }

        // Reviews
        reviews.push(pharmacy.reviewsCount || 0);

        // Services
        const info = pharmacy.additionalInfo || {};
        if (info["Service options"]) {
            info["Service options"].forEach(s => {
                if (s.Delivery) services.delivery++;
                if (s["Drive-through"]) services.driveThrough++;
            });
        }
        if (info.Accessibility) {
            info.Accessibility.forEach(a => {
                if (a["Wheelchair accessible parking lot"]) {
                    services.wheelchair++;
                }
            });
        }
    });

    drawCharts(categoryCount, claimed, ratingDist, reviews, ratings, services);
}

function drawCharts(categoryCount, claimed, ratingDist, reviews, ratings, services) {

    // Category Pie
    new FusionCharts({
        type: "pie2d",
        renderAt: "categoryChart",
        width: "100%",
        height: "300",
        dataFormat: "json",
        dataSource: {
            chart: { theme: "fusion" },
            data: Object.entries(categoryCount).map(([l, v]) => ({ label: l, value: v }))
        }
    }).render();

    // Claimed Doughnut
    new FusionCharts({
        type: "doughnut2d",
        renderAt: "claimedChart",
        width: "100%",
        height: "300",
        dataFormat: "json",
        dataSource: {
            chart: { theme: "fusion" },
            data: [
                { label: "Claimed", value: claimed.claimed },
                { label: "Unclaimed", value: claimed.unclaimed }
            ]
        }
    }).render();

    // Rating Column
    new FusionCharts({
        type: "column2d",
        renderAt: "ratingChart",
        width: "100%",
        height: "300",
        dataFormat: "json",
        dataSource: {
            chart: { caption: "Ratings", theme: "fusion" },
            data: Object.entries(ratingDist).map(([l, v]) => ({ label: l + "★", value: v }))
        }
    }).render();

    // Reviews vs Ratings
    new FusionCharts({
        type: "mscolumn2d",
        renderAt: "reviewChart",
        width: "100%",
        height: "300",
        dataFormat: "json",
        dataSource: {
            chart: { theme: "fusion" },
            categories: [{
                category: dataLabels(reviews.length)
            }],
            dataset: [
                {
                    seriesname: "Reviews",
                    data: reviews.map(v => ({ value: v }))
                },
                {
                    seriesname: "Ratings",
                    data: ratings.map(v => ({ value: v }))
                }
            ]
        }
    }).render();

    // Popular Time Line
    new FusionCharts({
        type: "line",
        renderAt: "timeChart",
        width: "100%",
        height: "300",
        dataFormat: "json",
        dataSource: {
            chart: { caption: "Customer Activity", theme: "fusion" },
            data: [
                { label: "Morning", value: 40 },
                { label: "Noon", value: 65 },
                { label: "Evening", value: 85 },
                { label: "Night", value: 70 }
            ]
        }
    }).render();

    // Services Stacked
    new FusionCharts({
        type: "stackedcolumn2d",
        renderAt: "serviceChart",
        width: "100%",
        height: "300",
        dataFormat: "json",
        dataSource: {
            chart: { theme: "fusion" },
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

function dataLabels(n) {
    return Array.from({ length: n }, (_, i) => ({ label: "P" + (i + 1) }));
}
