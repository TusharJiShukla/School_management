require('dotenv').config();
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MySQL Connection based on workbench, credentials of database in .env
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to MySQL database');
    }
});

// Add School API
app.post('/addSchool', (req, res) => {
    const { name, address, latitude, longitude } = req.body;

    if (!name || !address || !latitude || !longitude) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const sql = 'INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)';
    db.query(sql, [name, address, latitude, longitude], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Database insertion failed' });
        }
        res.status(201).json({ message: 'School added successfully', schoolId: result.insertId });
    });
});

// Listing of Schools API (Sorted by Distance) 
app.get("/listSchools", (req, res) => {
    const userLat = parseFloat(req.query.latitude);
    const userLon = parseFloat(req.query.longitude);

    if (!userLat || !userLon) {
        console.error("Invalid coordinates:", req.query);
        return res.status(400).json({ error: "Latitude and Longitude are required" });
    }

    const query = "SELECT id, name, address, latitude, longitude FROM schools";
    db.query(query, (err, results) => {
        if (err) {
            console.error("Database query failed:", err);
            return res.status(500).json({ error: "Database query failed" });
        }

        if (!results || results.length === 0) {
            console.warn("No schools found in the database.");
            return res.status(404).json({ error: "No schools found" });
        }

        // Function to calculate distance using Haversine formula - commonly used to calculate distance when in latitudes and longitudes
        function getDistance(lat1, lon1, lat2, lon2) {
            const toRad = x => (x * Math.PI) / 180;
            const R = 6371; // Earth's radius in km
            const dLat = toRad(lat2 - lat1);
            const dLon = toRad(lon2 - lon1);
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                      Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        }

        // Sorting of schools by distance which based on user's location
        results.forEach(school => {
            school.distance = getDistance(userLat, userLon, school.latitude, school.longitude);
        });
        results.sort((a, b) => a.distance - b.distance);

        res.status(200).json(results);
    });
});

// Starting the Server at port 3000 or 5000 if 3000 is busy
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
