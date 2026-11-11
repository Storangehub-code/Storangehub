// Netlify function: look up email and return the correct org subdomain
// Later this will query Supabase for the user's organization

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { email } = JSON.parse(event.body || "{}");
    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: "Email required" }) };
    }

    // TODO: Query Supabase for the user's organization
    // For now, hard-coded demo mapping
    const demoOrgs = {
      "spud.w.mann@gmail.com": "responsedx",
      "evan.w.mann@gmail.com": "responsedx",
      "test@example.com": "demo"
    };

    const slug = demoOrgs[email.toLowerCase()] || "demo";
    const subdomain = `${slug}.storangehub.com`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        org: slug,
        redirect: `https://${subdomain}`,
        message: `Redirecting to ${slug} CRM`
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
