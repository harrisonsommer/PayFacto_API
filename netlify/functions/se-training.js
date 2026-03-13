const querystring = require("querystring");
const { getStore } = require("@netlify/blobs");
// 1. Initialize Blobs Stores
const questionStore = getStore("sigma-training-questions", "a6a3c325-6cd2-4dc2-8dc1-a84bd06d7320", "nfp_c4Mu2KQkMG6QTXbhsxEf4BZ1ruM6FUvk4b09");
const statsStore = getStore("sigma-training-stats");

exports.handler = async (event) => {
    const method = event.httpMethod;
    const params = event.queryStringParameters || {};
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Content-Type": "application/json"
    };

    if (method === "OPTIONS") return { statusCode: 200, headers, body: "" };

    console.log(`[${new Date().toISOString()}] Incoming ${method} request`);

    try {
        let body = {};
        if (method === "POST" && event.body) {
            const contentType = event.headers["content-type"] || "";
            if (contentType.includes("application/json")) {
                body = JSON.parse(event.body);
            } else if (contentType.includes("application/x-www-form-urlencoded")) {
                body = querystring.parse(event.body);
            }
            console.log("Parsed Body Object:", body);
        }

        // --- GET Logic ---
        if (method === "GET") {
            const step = params.step || "intro";

            if (step === "questions") {
                // Fetch all questions from Blobs
                const list = await questionStore.list();
                const questions = await Promise.all(
                    list.blobs.map(async (b) => JSON.parse(await questionStore.get(b.key)))
                );
                // Sort by timestamp so the order stays consistent
                questions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                return { statusCode: 200, headers, body: JSON.stringify(questions) };
            }

            if (step === "progress") {
                // Fetch stats from Blobs or return default
                const stats = await statsStore.get("current_stats", { type: "json" }) || {
                    modules_completed: 0,
                    last_completed_by: "None"
                };
                return { statusCode: 200, headers, body: JSON.stringify(stats) };
            }

            return { statusCode: 200, headers, body: JSON.stringify({ snippet: `Content for ${step}` }) };
        }

        // --- POST Logic ---
        if (method === "POST") {
            const { action, user, text, module_id } = body;

            if (action === "ask_question") {
                const questionId = `q_${Date.now()}`; // Unique key for Blobs
                const newQuestion = {
                    id: questionId,
                    user: user || "Anonymous SE",
                    text: text || "No text",
                    timestamp: new Date().toISOString()
                };
                
                // Save to Blobs
                await questionStore.set(questionId, JSON.stringify(newQuestion));
                console.log("Question saved to Netlify Blobs.");

                return { statusCode: 200, headers, body: JSON.stringify({ message: "Success", question: newQuestion }) };
            }

            if (action === "complete_module") {
                // Update persistent stats
                const stats = await statsStore.get("current_stats", { type: "json" }) || {
                    modules_completed: 0,
                    last_completed_by: "None"
                };

                stats.modules_completed += 1;
                stats.last_completed_by = user || "Anonymous";
                
                await statsStore.setJSON("current_stats", stats);
                return { statusCode: 200, headers, body: JSON.stringify({ message: "Progress updated!", stats }) };
            }

            return { statusCode: 400, headers, body: JSON.stringify({ error: "Action not recognized" }) };
        }

    } catch (error) {
        console.error("Function Error:", error.message);
        return { statusCode: 500, headers, body: JSON.stringify({ error: "Check server logs" }) };
    }
};