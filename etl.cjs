const fs = require('fs');
const readline = require('readline');
const path = require('path');

const DEAL_SQL_PATH = '/tmp/deal.sql';
const AUCTION_SQL_PATH = '/tmp/auction.sql';
const OUTPUT_JSON_PATH = path.join(__dirname, 'tesla_data.json');

const dealColumns = [
    'id', 'created_at', 'updated_at', 'pipedrive_deal_id', 'cardetails_id', 'selling_details_id', 'short_name',
    'make', 'model', 'variant', 'first_registration', 'mileage', 'battery_capacity_brutto', 'battery_capacity_netto',
    'power_kw', 'power_ps', 'vin', 'tuv_until', 'selling_country', 'seller_type', 'accident_free_seller',
    'accident_free_cardentity', 'list_price', 'special_equipment_price', 'number_of_keys', 'service_maintained',
    'smoker_car', 'pet_car', 'pre_owner', 'paint_color_name', 'paint_color', 'upholstery_name', 'upholstery',
    'tesla_autopilot', 'heatpump', 'acc', 'panorama_roof', 'number_of_seats', 'electric_seats', 'leather_seats',
    'head_up_display', 'trailer_hitch', 'trailer_hitch_seller', 'drive_type', 'heated_steering_wheel',
    'sport_steering_wheel', 'leather_steering_wheel', 'image_names', 'thumbnail_names', 'charging_cables',
    'document_type', 'documents', 'sport_seat_type', 'seat_heating', 'camera_type', 'conditions', 'tyres',
    'equipment', 'form_of_ownership', 'taxation', 'valuation_range', 'dat_ecode'
];

const auctionColumns = [
    'id', 'deal_id', 'start_time', 'end_time', 'status', 'created_at', 'updated_at', 'highest_bider_id',
    'auction_sequence', 'activated_at', 'highest_bid_amount', 'number_of_bids', 'highest_bid_at', 'short_id', 'lost_reason'
];

function parsePostgresValues(valuesString) {
    const inner = valuesString.trim();
    if (!inner.startsWith('(') || !inner.endsWith(');')) return null;
    const data = inner.slice(1, -2);

    let inString = false;
    const fields = [];
    let currentField = '';

    for (let i = 0; i < data.length; i++) {
        const char = data[i];
        if (char === "'") {
            if (inString && data[i + 1] === "'") {
                currentField += "'";
                i++;
            } else {
                inString = !inString;
            }
        } else if (char === ',' && !inString) {
            fields.push(currentField.trim());
            currentField = '';
        } else {
            currentField += char;
        }
    }
    fields.push(currentField.trim());
    return fields.map(f => f === 'NULL' ? null : f);
}

async function runEtl() {
    console.log('🚀 Starting ETL Process...');
    const deals = new Map();

    // 1. Process Deals
    console.log(`📥 Reading deals from ${DEAL_SQL_PATH}...`);
    const dealStream = readline.createInterface({
        input: fs.createReadStream(DEAL_SQL_PATH),
        crlfDelay: Infinity
    });

    let teslaCount = 0;
    for await (const line of dealStream) {
        if (!line.startsWith('INSERT INTO public.deal')) continue;

        // Quick short-circuit specifically for Tesla (efficiency)
        if (!line.includes("'Tesla'")) continue;

        const valuesPartMatch = line.match(/VALUES\s*(.*);$/);
        if (!valuesPartMatch) continue;

        const rawValues = valuesPartMatch[1] + ';';
        const fields = parsePostgresValues(rawValues);

        if (fields && fields[dealColumns.indexOf('make')] === 'Tesla') {
            const model = fields[dealColumns.indexOf('model')];
            if (model === 'Model 3' || model === 'Model Y') {
                const dealData = {};
                // Only map fields we actually care about to keep JSON tiny
                const keepFields = [
                    'id', 'model', 'variant', 'first_registration', 'mileage', 'power_kw',
                    'taxation', 'accident_free_seller', 'accident_free_cardentity',
                    'tesla_autopilot', 'heatpump', 'trailer_hitch', 'trailer_hitch_seller',
                    'tyres', 'equipment'
                ];

                for (let i = 0; i < dealColumns.length; i++) {
                    const col = dealColumns[i];
                    if (keepFields.includes(col)) {
                        let val = fields[i];
                        if (val === 'true') val = true;
                        if (val === 'false') val = false;
                        if (col === 'mileage' || col === 'power_kw') val = Number(val);
                        if (col === 'tyres' && val) val = JSON.parse(val);
                        dealData[col] = val;
                    }
                }
                deals.set(dealData.id, dealData);
                teslaCount++;
            }
        }
    }
    console.log(`✅ Loaded ${teslaCount} Tesla Model 3 / Model Y deals.`);

    // 2. Process Auctions (Only for the extracted Teslas)
    console.log(`📥 Reading auctions from ${AUCTION_SQL_PATH}...`);
    const auctionStream = readline.createInterface({
        input: fs.createReadStream(AUCTION_SQL_PATH),
        crlfDelay: Infinity
    });

    const dataset = [];

    for await (const line of auctionStream) {
        if (!line.startsWith('INSERT INTO public.auction')) continue;

        const valuesPartMatch = line.match(/VALUES\s*(.*);$/);
        if (!valuesPartMatch) continue;

        const fields = parsePostgresValues(valuesPartMatch[1] + ';');
        if (!fields) continue;

        const dealId = fields[auctionColumns.indexOf('deal_id')];
        if (deals.has(dealId)) {
            const auctionData = {};
            const keepFields = [
                'id', 'deal_id', 'start_time', 'end_time', 'status',
                'highest_bid_amount', 'number_of_bids'
            ];

            for (let i = 0; i < auctionColumns.length; i++) {
                const col = auctionColumns[i];
                if (keepFields.includes(col)) {
                    let val = fields[i];
                    if (col === 'highest_bid_amount' || col === 'number_of_bids') val = Number(val);
                    auctionData[col] = val;
                }
            }

            // Merge Deal and Auction Data
            const deal = deals.get(dealId);
            dataset.push({
                ...deal, // All the Deal metrics
                auction: auctionData
            });
        }
    }

    console.log(`✅ Linked ${dataset.length} auctions to Tesla deals.`);

    // 3. Write Output
    console.log(`💾 Writing JSON output to ${OUTPUT_JSON_PATH}...`);
    fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(dataset, null, 2));

    const stats = fs.statSync(OUTPUT_JSON_PATH);
    console.log(`🎉 Done! Created tesla_data.json (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
}

runEtl().catch(err => {
    console.error('Fatal Error:', err);
});
