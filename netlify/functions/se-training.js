const querystring = require("querystring");

// In-memory store (resets when the function "goes cold")
let trainingData = {
    progress: {
        modules_completed: 0,
        last_completed_by: "None",
        history: []
    },
    questions: [
        { id: 1, user: "Example User", text: "How do I handle API timeouts in Sigma?", timestamp: new Date().toISOString() }
    ]
};

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

    // --- LOGGING THE REQUEST ---
    // This will show up in your Netlify Function Logs
    console.log(`[${new Date().toISOString()}] Incoming ${method} request`);
    if (method === "POST") {
        console.log("Headers:", JSON.stringify(event.headers));
        console.log("Raw Body:", event.body);
    }

    try {
        let body = {};
        if (method === "POST" && event.body) {
            const contentType = event.headers["content-type"] || "";
            
            // Handle JSON vs Form-Data
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
                return { statusCode: 200, headers, body: JSON.stringify(trainingData.questions) };
            }
            return { statusCode: 200, headers, body: JSON.stringify({ snippet: `Content for ${step}` }) };
        }

        // --- POST Logic ---
        if (method === "POST") {
            const { action, user, text } = body;
            console.log("Action: ", action);
            console.log("User: ", user);
            console.log("Text: ", text);
            if (action === "ask_question") {
                const newQuestion = {
                    id: trainingData.questions.length + 1,
                    user: user || "Anonymous SE",
                    text: text || "No text",
                    timestamp: new Date().toISOString()
                };
                trainingData.questions.push(newQuestion);
                console.log("New question added to internal store.");

                return { statusCode: 200, headers, body: JSON.stringify({ message: "Success", question: newQuestion }) };
            }
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Action not recognized" }) };
        }

    } catch (error) {
        console.error("Function Error:", error.message);
        return { statusCode: 500, headers, body: JSON.stringify({ error: "Check server logs" }) };
    }
};