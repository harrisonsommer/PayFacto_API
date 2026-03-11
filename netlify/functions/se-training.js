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
    const body = event.body ? JSON.parse(event.body) : {};

    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Content-Type": "application/json"
    };

    if (method === "OPTIONS") return { statusCode: 200, headers, body: "" };

    try {
        // --- GET: Fetch Training Data & Questions ---
        if (method === "GET") {
            const step = params.step || "intro";

            switch (step) {
                case "intro":
                    return { statusCode: 200, headers, body: JSON.stringify({ snippet: "Module 1: The Power of APIs in Sigma." }) };
                case "progress":
                    return { statusCode: 200, headers, body: JSON.stringify(trainingData.progress) };
                case "questions":
                    // Returns the full list of questions for a Sigma Table
                    return { statusCode: 200, headers, body: JSON.stringify(trainingData.questions) };
                default:
                    return { statusCode: 200, headers, body: JSON.stringify({ snippet: "Welcome to the SE Training Engine." }) };
            }
        }

        // --- POST: Update Progress or Ask Questions ---
        if (method === "POST") {
            const { action, user, text, module_id } = body;

            // Option 1: Log Training Progress
            if (action === "complete_module") {
                trainingData.progress.modules_completed += 1;
                trainingData.progress.last_completed_by = user || "Anonymous";
                trainingData.progress.history.push({ user, module: module_id, time: new Date().toISOString() });
                
                return { statusCode: 200, headers, body: JSON.stringify({ message: "Progress saved!" }) };
            }

            // Option 2: Post a New Question
            if (action === "ask_question") {
                const newQuestion = {
                    id: trainingData.questions.length + 1,
                    user: user || "Anonymous SE",
                    text: text || "No question text provided.",
                    timestamp: new Date().toISOString()
                };
                trainingData.questions.push(newQuestion);

                return { 
                    statusCode: 200, 
                    headers, 
                    body: JSON.stringify({ message: "Question added to the queue!", question: newQuestion }) 
                };
            }

            return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid Action" }) };
        }

    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};