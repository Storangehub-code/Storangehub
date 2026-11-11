// Netlify function: look up email and return the correct org subdomain
export default async (event) => {
  // Allow CORS from the marketing site
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const email = (body.email || "").trim().toLowerCase();

    if (!email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Email required" }) };
    }

    // Demo mapping
    const demoOrgs = {
      "spud.w.mann@gmail.com": "responsedx",
      "evan.w.mann@gmail.com": "responsedx",
      "test@example.com": "demo"
    };

    const slug = demoOrgs[email] || "demo";
    const redirect = `https://${slug}.storangehub.com`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        email,
        org: slug,
        redirect,
        message: `Redirecting to ${slug}.storangehub.com`
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || "Server error" })
    };
  }
};
