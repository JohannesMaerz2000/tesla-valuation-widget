import fs from 'fs';
import path from 'path';
import { calculateValuation, calculateDealerInsights, calculateNeighborAverages } from '../src/utils/valuationAlgorithm.js';

let cachedData = null;

export default async function handler(req, res) {
    // Set CORS headers for Webflow to be able to access the endpoint
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed. Please use POST.' });
        return;
    }

    try {
        const targetCar = req.body;

        // Load static JSON data lazily
        if (!cachedData) {
            const dataPath = path.join(process.cwd(), 'tesla_data.json');
            const fileContents = fs.readFileSync(dataPath, 'utf8');
            cachedData = JSON.parse(fileContents);
        }

        // Call the valuation algorithm
        const valuation = calculateValuation(targetCar, cachedData);

        const response = {
            valuation
        };

        // Include extra insights if valuation succeeded
        if (valuation.estimated_value) {
            response.dealerInsights = calculateDealerInsights(valuation);
            response.neighborAverages = calculateNeighborAverages(valuation);
        }

        res.status(200).json(response);

    } catch (error) {
        console.error('Valuation Error:', error);
        res.status(500).json({ error: 'Internal Server Error calculating valuation.', details: error.message });
    }
}
