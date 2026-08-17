export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use GET.' });
  }

  const configured = Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET
  );
  const authenticated = Boolean(process.env.GOOGLE_OAUTH_REFRESH_TOKEN);

  return res.status(200).json({
    configured,
    authenticated,
    authUrl: null,
  });
}
