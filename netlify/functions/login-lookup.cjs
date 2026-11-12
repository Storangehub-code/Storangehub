exports.handler = async (event) => {
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

    // Default everyone to responsedx. Add specific exceptions only if needed.
    let slug = "responsedx";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        email: email,
        org: slug,
        redirect: "https://" + slug + ".storangehub.com",
        message: "Redirecting to " + slug + ".storangehub.com"
      })
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: String(err.message || err),
        redirect: "https://responsedx.storangehub.com"
      })
    };
  }
};
