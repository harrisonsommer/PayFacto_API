const jwt = require("jsonwebtoken");
const { v4: uuid } = require("uuid");

exports.handler = async (event) => {
  try {
    // 1. Get parameters from the URL (e.g., ?mode=link_sharing)
    const mode = event.queryStringParameters.mode || "";
    const query = event.queryStringParameters;

    const now = Math.floor(Date.now() / 1000);
    const expirationTime = now + (parseInt(process.env.SESSION_LENGTH) || 3600);
    const modePrefix = mode ? `${mode.toUpperCase()}_` : "";

    // 2. Fetch Config from Netlify Environment Variables
    const baseUrl = process.env[`${modePrefix}BASE_URL` ] || process.env.BASE_URL;
    if (!baseUrl) {
      return { statusCode: 400, body: JSON.stringify({ error: "BASE_URL not found" }) };
    }

    const email = process.env[`${modePrefix}EMAIL`] || process.env.EMAIL;
    const accountType = process.env[`${modePrefix}ACCOUNT_TYPE`] || process.env.ACCOUNT_TYPE;
    
    // Process Teams
    const rawTeams = process.env[`${modePrefix}TEAMS`] || process.env.TEAMS;
    const teamsArray = rawTeams ? rawTeams.split(",").map((t) => t.trim()) : [];

    // 3. Create the Sigma JWT Payload
    const payload = {
      sub: email,
      iss: process.env.CLIENT_ID,
      jti: uuid(),
      iat: now,
      exp: expirationTime,
      account_type: accountType,
      teams: teamsArray,
    };

    // 4. Sign the Token
    const token = jwt.sign(payload, process.env.SECRET, {
      algorithm: "HS256",
      keyid: process.env.CLIENT_ID,
    });

    // 5. Build the Final URL
    let finalUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}:embed=true&:jwt=${encodeURIComponent(token)}`;
    
    if (query.exploreKey) finalUrl += `&:explore=${encodeURIComponent(query.exploreKey)}`;
    if (query.bookmarkId) finalUrl += `&:bookmark=${encodeURIComponent(query.bookmarkId)}`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embedUrl: finalUrl }),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};