// Simple in-memory store (Reset when the function goes cold)
let inventory = {
    current_kegs: 15,
    pints_per_keg: 88,
    total_pints: 1320,
    last_updated: new Date().toISOString()
};

exports.handler = async (event) => {
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};

    // CORS Headers to allow Sigma to call this from their domain
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Content-Type": "application/json"
    };

    // Handle Preflight OPTIONS request
    if (method === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }

    try {
        // --- GET: Fetch Current Inventory ---
        if (method === "GET") {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(inventory)
            };
        }

        // --- POST: Update Inventory ---
        if (method === "POST") {
            const { action, amount = 1 } = body;

            if (action === "order_pint") {
                // Decrease inventory by 1 pint
                inventory.total_pints -= amount;
                inventory.current_kegs = (inventory.total_pints / inventory.pints_per_keg).toFixed(2);
                inventory.last_updated = new Date().toISOString();
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ message: "Sláinte! Pint poured.", new_total: inventory.total_pints })
                };
            }

            if (action === "restock_kegs") {
                // Increase inventory by kegs (88 pints each)
                const addedPints = amount * inventory.pints_per_keg;
                inventory.total_pints += addedPints;
                inventory.current_kegs = (inventory.total_pints / inventory.pints_per_keg).toFixed(2);
                inventory.last_updated = new Date().toISOString();

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ message: "Truck arrived! Inventory replenished.", new_total: inventory.total_pints })
                };
            }

            return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid Action" }) };
        }

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Server Error", details: error.message })
        };
    }
};