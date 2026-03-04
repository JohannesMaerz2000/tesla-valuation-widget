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

// Helper Functions for cleaning
function determineVariant(row) {
    const model = row.model;
    const kw = Number(row.power_kw);

    if (model === 'Model 3') {
        if (kw >= 208 && kw <= 239) return 'm3_sr';
        if (kw >= 324 && kw <= 366) return 'm3_lr';
        if (kw >= 377) return 'm3_p';
    } else if (model === 'Model Y') {
        if (kw >= 220 && kw <= 255) return 'my_sr';
        if (kw >= 370 && kw <= 385) return 'my_lr'; // typical LR range
        if (kw >= 390) return 'my_p';
    }
    return 'unknown';
}

function determineTaxType(row) {
    if (row.seller_type === 'company' || row.taxation === 'vat_deductible') return 'vat';
    return 'margin';
}

function parseTires(tyres) {
    if (!tyres || !Array.isArray(tyres)) return 'unknown';
    if (tyres.length === 2) return '8_tires';
    if (tyres.length === 1) {
        const type = tyres[0].type ? tyres[0].type.toLowerCase() : 'unknown';
        if (type.includes('summer')) return '4_summer';
        if (type.includes('winter')) return '4_winter';
        if (type.includes('season')) return '4_all_season';
    }
    return 'unknown';
}

function determineTrustTier(status, bids) {
    const nBids = Number(bids) || 0;
    if (status && (status.includes('sold') || status.includes('accepted'))) return 'Tier 1';
    if (status && status.includes('declined')) {
        return nBids > 1 ? 'Tier 2' : 'Tier 3';
    }
    return 'Tier 3';
}

async function runEtl() {
    console.log('🚀 Starting Optimized ETL Process...');
    const deals = new Map();

    console.log(`📥 Reading deals from ${DEAL_SQL_PATH}...`);
    const dealStream = readline.createInterface({
        input: fs.createReadStream(DEAL_SQL_PATH),
        crlfDelay: Infinity
    });

    for await (const line of dealStream) {
        if (!line.startsWith('INSERT INTO public.deal')) continue;
        if (!line.includes("'Tesla'")) continue;

        const valuesPartMatch = line.match(/VALUES\s*(.*);$/);
        if (!valuesPartMatch) continue;

        const fields = parsePostgresValues(valuesPartMatch[1] + ';');
        if (fields && fields[dealColumns.indexOf('make')] === 'Tesla') {
            const model = fields[dealColumns.indexOf('model')];
            if (model === 'Model 3' || model === 'Model Y') {
                const rawDeal = {};
                dealColumns.forEach((col, i) => rawDeal[col] = fields[i]);

                // Clean/Transform for the Algorithm
                const cleanDeal = {
                    id: rawDeal.id,
                    model: rawDeal.model,
                    variant_clean: determineVariant(rawDeal),
                    is_highland: String(rawDeal.variant).includes('Highland'),
                    tax_type: determineTaxType(rawDeal),
                    is_accident_free: rawDeal.accident_free_seller === 'true' && rawDeal.accident_free_cardentity === 'true',
                    tire_strategy: parseTires(rawDeal.tyres ? JSON.parse(rawDeal.tyres) : null),
                    has_hitch: rawDeal.trailer_hitch_seller === 'true',
                    autopilot: (rawDeal.tesla_autopilot === 'Full self driving' ? 'FSD' :
                        rawDeal.tesla_autopilot === 'Enhanced' ? 'EAP' : 'Standard'),
                    has_heatpump: rawDeal.heatpump === 'true',
                    mileage: Number(rawDeal.mileage),
                    first_registration: rawDeal.first_registration
                };

                if (cleanDeal.variant_clean !== 'unknown') {
                    deals.set(cleanDeal.id, cleanDeal);
                }
            }
        }
    }

    console.log(`📥 Linking auctions...`);
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
            const deal = deals.get(dealId);
            const status = fields[auctionColumns.indexOf('status')];
            const numBids = Number(fields[auctionColumns.indexOf('number_of_bids')]);
            const endTime = fields[auctionColumns.indexOf('end_time')];

            dataset.push({
                ...deal,
                auction_id: fields[auctionColumns.indexOf('id')],
                final_price: Number(fields[auctionColumns.indexOf('highest_bid_amount')]),
                status: status,
                number_of_bids: numBids,
                end_time: endTime,
                trust_tier: determineTrustTier(status, numBids),
                age_at_auction_months: Math.round((new Date(endTime) - new Date(deal.first_registration)) / (1000 * 60 * 60 * 24 * 30.44))
            });
        }
    }

    console.log(`💾 Writing ${dataset.length} cleaned records to ${OUTPUT_JSON_PATH}...`);
    fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(dataset, null, 2));
    console.log('🎉 ETL Complete.');
}

runEtl().catch(err => console.error('Fatal Error:', err));

