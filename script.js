// Auto-load JSON file if available
window.addEventListener('DOMContentLoaded', function() {
    console.log('Script loaded successfully');
    
    // Try to auto-load indian_pharmacies.json from the same directory
    fetch('indian_pharmacies.json')
        .then(response => {
            if (!response.ok) throw new Error('File not found');
            return response.json();
        })
        .then(data => {
            console.log('Auto-loaded indian_pharmacies.json successfully');
            console.log('Total pharmacies:', data.length);
            processData(data);
        })
        .catch(error => {
            showError('Could not auto-load dataset. Please use the Load Dataset button.');
            document.getElementById('dashboardGrid').style.display = 'none';
            showLoading(false);
            console.log('Auto-load failed, waiting for manual upload:', error.message);
        });
});

// Make loadJSON globally accessible
window.loadJSON = function() {
    const fileInput = document.getElementById("jsonFile");
    const file = fileInput.files[0];

    if (!file) {
        showError("Please select a JSON file to upload");
        return;
    }

    showLoading(true);
    hideError();

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            processData(data);
        } catch (error) {
            showError("Error parsing JSON file: " + error.message);
            showLoading(false);
        }
    };
    reader.onerror = function() {
        showError("Error reading file");
        showLoading(false);
    };
    reader.readAsText(file);
};

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('error').style.display = 'block';
}

function hideError() {
    document.getElementById('error').style.display = 'none';
}

function processData(data) {
    showLoading(true);
    hideError();

    if (!Array.isArray(data) || data.length === 0) {
        showError("Invalid data format or empty dataset");
        document.getElementById('dashboardGrid').style.display = 'none';
        showLoading(false);
        return;
    }

    let categoryCount = {};
    let claimed = { claimed: 0, unclaimed: 0 };
    let ratingDist = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    let reviews = [];
    let ratings = [];
    let pharmacyNames = [];

    let services = {
        delivery: 0,
        driveThrough: 0,
        wheelchair: 0
    };

    // Popular times aggregation (average across all days and pharmacies)
    let popularTimesData = {};
    for (let hour = 0; hour < 24; hour++) {
        popularTimesData[hour] = { total: 0, count: 0 };
    }

    data.forEach(pharmacy => {
        // Store pharmacy name
        pharmacyNames.push(pharmacy.title || "Unknown");

        // Category
        const cat = pharmacy.categoryName || "Unknown";
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;

        // Claimed
        pharmacy.claimThisBusiness ? claimed.claimed++ : claimed.unclaimed++;

        // Rating
        if (pharmacy.totalScore) {
            const rating = Math.floor(pharmacy.totalScore);
            if (rating >= 1 && rating <= 5) {
                ratingDist[rating]++;
            }
            ratings.push(pharmacy.totalScore);
        } else {
            ratings.push(0);
        }

        // Reviews
        reviews.push(pharmacy.reviewsCount || 0);

        // Services
        const info = pharmacy.additionalInfo || {};
        if (info["Service options"]) {
            info["Service options"].forEach(s => {
                if (s.Delivery === true) services.delivery++;
                if (s["Drive-through"] === true) services.driveThrough++;
            });
        }
        if (info.Accessibility) {
            info.Accessibility.forEach(a => {
                if (a["Wheelchair accessible parking lot"] === true) {
                    services.wheelchair++;
                }
            });
        }

        // Popular Times Histogram
        if (pharmacy.popularTimesHistogram) {
            const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
            days.forEach(day => {
                if (pharmacy.popularTimesHistogram[day]) {
                    pharmacy.popularTimesHistogram[day].forEach(timeSlot => {
                        const hour = timeSlot.hour;
                        const occupancy = timeSlot.occupancyPercent || 0;
                        if (hour >= 0 && hour < 24) {
                            popularTimesData[hour].total += occupancy;
                            popularTimesData[hour].count++;
                        }
                    });
                }
            });
        }
    });

    // Calculate average popular times
    const popularTimes = Object.keys(popularTimesData).map(hour => {
        const data = popularTimesData[hour];
        return {
            hour: parseInt(hour),
            avgOccupancy: data.count > 0 ? Math.round(data.total / data.count) : 0
        };
    }).filter(item => item.avgOccupancy > 0);

    console.log('Data processed:', {
        totalPharmacies: data.length,
        categories: Object.keys(categoryCount).length,
        withRatings: ratings.filter(r => r > 0).length,
        withPopularTimes: popularTimes.length
    });

    drawCharts(categoryCount, claimed, ratingDist, reviews, ratings, services, pharmacyNames, popularTimes);
    
    // Show dashboard
    document.getElementById('dashboardGrid').style.display = 'grid';
    showLoading(false);
}

function drawCharts(categoryCount, claimed, ratingDist, reviews, ratings, services, pharmacyNames, popularTimes) {
    // Destroy existing charts if any
    if (window.categoryChartObj) window.categoryChartObj.destroy();
    if (window.claimedChartObj) window.claimedChartObj.destroy();
    if (window.ratingChartObj) window.ratingChartObj.destroy();
    if (window.reviewChartObj) window.reviewChartObj.destroy();
    if (window.ratingsChartObj) window.ratingsChartObj.destroy();
    if (window.serviceChartObj) window.serviceChartObj.destroy();

    // Category Pie Chart
    window.categoryChartObj = new Chart(document.getElementById('categoryChart').getContext('2d'), {
        type: 'pie',
        data: {
            labels: Object.keys(categoryCount),
            datasets: [{
                data: Object.values(categoryCount),
                backgroundColor: [
                    '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                title: { display: true, text: 'Pharmacy Categories' }
            }
        }
    });

    // Claimed vs Unclaimed Doughnut
    window.claimedChartObj = new Chart(document.getElementById('claimedChart').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Claimed', 'Unclaimed'],
            datasets: [{
                data: [claimed.claimed, claimed.unclaimed],
                backgroundColor: ['#62B58F', '#E15759']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                title: { display: true, text: 'Business Claims' }
            }
        }
    });

    // Rating Distribution Bar Chart
    window.ratingChartObj = new Chart(document.getElementById('ratingChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: Object.keys(ratingDist).map(l => l + ' ★'),
            datasets: [{
                label: 'Number of Pharmacies',
                data: Object.values(ratingDist),
                backgroundColor: '#4e79a7'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Rating Distribution' }
            },
            scales: {
                x: { title: { display: true, text: 'Rating' } },
                y: { title: { display: true, text: 'Number of Pharmacies' }, beginAtZero: true }
            }
        }
    });

    // Reviews Count Bar Chart (top 20)
    const reviewData = reviews
        .map((count, index) => ({
            label: pharmacyNames[index].substring(0, 20),
            value: count
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 20);

    window.reviewChartObj = new Chart(document.getElementById('reviewChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: reviewData.map(d => d.label),
            datasets: [{
                label: 'Reviews',
                data: reviewData.map(d => d.value),
                backgroundColor: '#f28e2b'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Top 20 Pharmacies by Review Count' }
            },
            scales: {
                x: { title: { display: true, text: 'Pharmacy' } },
                y: { title: { display: true, text: 'Number of Reviews' }, beginAtZero: true }
            }
        }
    });

    // Popular Times Line Chart
    const timeLabels = {
        0: '12 AM', 1: '1 AM', 2: '2 AM', 3: '3 AM', 4: '4 AM', 5: '5 AM',
        6: '6 AM', 7: '7 AM', 8: '8 AM', 9: '9 AM', 10: '10 AM', 11: '11 AM',
        12: '12 PM', 13: '1 PM', 14: '2 PM', 15: '3 PM', 16: '4 PM', 17: '5 PM',
        18: '6 PM', 19: '7 PM', 20: '8 PM', 21: '9 PM', 22: '10 PM', 23: '11 PM'
    };
    const popularTimesChartData = popularTimes.map(item => ({
        label: timeLabels[item.hour],
        value: item.avgOccupancy
    }));
    window.ratingsChartObj = new Chart(document.getElementById('ratingsChart').getContext('2d'), {
        type: 'line',
        data: {
            labels: popularTimesChartData.map(d => d.label),
            datasets: [{
                label: 'Avg Occupancy (%)',
                data: popularTimesChartData.map(d => d.value),
                borderColor: '#e15759',
                backgroundColor: 'rgba(225,87,89,0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true },
                title: { display: true, text: 'Average Customer Activity by Hour' }
            },
            scales: {
                x: { title: { display: true, text: 'Time of Day' } },
                y: { title: { display: true, text: 'Average Occupancy (%)' }, beginAtZero: true }
            }
        }
    });

    // Services Stacked Bar Chart
    const totalPharmacies = pharmacyNames.length;
    const servicesNotAvailable = {
        delivery: totalPharmacies - services.delivery,
        driveThrough: totalPharmacies - services.driveThrough,
        wheelchair: totalPharmacies - services.wheelchair
    };
    window.serviceChartObj = new Chart(document.getElementById('serviceChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Delivery', 'Drive-Through', 'Wheelchair Access'],
            datasets: [
                {
                    label: 'Available',
                    data: [services.delivery, services.driveThrough, services.wheelchair],
                    backgroundColor: '#62B58F'
                },
                {
                    label: 'Not Available',
                    data: [servicesNotAvailable.delivery, servicesNotAvailable.driveThrough, servicesNotAvailable.wheelchair],
                    backgroundColor: '#E15759'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                title: { display: true, text: 'Service Availability' }
            },
            scales: {
                x: { stacked: true, title: { display: true, text: 'Service Type' } },
                y: { stacked: true, title: { display: true, text: 'Number of Pharmacies' }, beginAtZero: true }
            }
        }
    });
}