const querystring = require("querystring");
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
    // Standard initialization (Credentials are handled by Netlify automatically once enabled)
    const questionStore = getStore({
        name: "sigma-training-questions", 
        siteID: "a6a3c325-6cd2-4dc2-8dc1-a84bd06d7320", 
        token: "nfp_c4Mu2KQkMG6QTXbhsxEf4BZ1ruM6FUvk4b09"});


    const method = event.httpMethod;
    const params = event.queryStringParameters || {};
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Content-Type": "application/json"
    };

    if (method === "OPTIONS") return { statusCode: 200, headers, body: "" };

    console.log(`[${new Date().toISOString()}] Incoming ${method} request`);

    try {
        let body = {};
        // Parse body for POST and DELETE if a body is provided
        if ((method === "POST" || method === "DELETE") && event.body) {
            const contentType = event.headers["content-type"] || "";
            if (contentType.includes("application/json")) {
                body = JSON.parse(event.body);
            } else if (contentType.includes("application/x-www-form-urlencoded")) {
                body = querystring.parse(event.body);
            }
        }

        // --- GET Logic ---
        if (method === "GET") {
            const step = params.step || "intro";
            if (step === "questions") {
                const list = await questionStore.list();
                const questions = await Promise.all(
                    list.blobs.map(async (b) => JSON.parse(await questionStore.get(b.key)))
                );
                questions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                return { statusCode: 200, headers, body: JSON.stringify(questions) };
            }
            return { statusCode: 200, headers, body: JSON.stringify({ snippet: `Content for ${step}` }) };
        }

        // --- POST Logic ---
        if (method === "POST") {
            const { action, user, text } = body;
            if (action === "ask_question") {
                const questionId = `q_${Date.now()}`;
                const newQuestion = { id: questionId, user, text, timestamp: new Date().toISOString() };
                await questionStore.set(questionId, JSON.stringify(newQuestion));
                return { statusCode: 200, headers, body: JSON.stringify({ message: "Question saved!", question: newQuestion }) };
            }
        }

        // --- DELETE Logic ---
        if (method === "DELETE") {
            // We can get the ID from query params (?questionId=q_123) or the body
            const questionId = params.questionId || body.questionId;

            if (!questionId) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing questionId" }) };
            }

            // Check if it exists before deleting (optional but good practice)
            const exists = await questionStore.get(questionId);
            if (!exists) {
                return { statusCode: 404, headers, body: JSON.stringify({ error: "Question not found" }) };
            }

            await questionStore.delete(questionId);
            console.log(`Deleted question: ${questionId}`);

            return { 
                statusCode: 200, 
                headers, 
                body: JSON.stringify({ message: `Question ${questionId} deleted successfully.` }) 
            };
        }

        return { statusCode: 400, headers, body: JSON.stringify({ error: "Method or Action not recognized" }) };

    } catch (error) {
        console.error("Function Error:", error.message);
        return { statusCode: 500, headers, body: JSON.stringify({ error: "Check server logs" }) };
    }
};