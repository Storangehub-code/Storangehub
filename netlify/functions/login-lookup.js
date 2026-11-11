export default async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const email = String(body.email || "").trim().toLowerCase();

    // Hard-coded demo mapping
    let slug = "demo";
    if (email === "spud.w.mann@gmail.com" || email === "evan.w.mann@gmail.com") {
      slug = "responsedx";
    }

    const redirect = "https://" + slug + ".storangehub.com";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        email: email,
        org: slug,
        redirect: redirect,
        message: "Redirecting to " + slug + ".storangehub.com"
      })
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: "Lookup failed: " + (err.message || "unknown"),
        redirect: "https://demo.storangehub.com"
      })
    };
  }
};
