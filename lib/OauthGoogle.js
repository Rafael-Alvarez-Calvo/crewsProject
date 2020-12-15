const {google} = require("googleapis");
const fetch = require("node-fetch");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const oauth2Client = new google.auth.OAuth2(
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	/*id_token
   * This is where Google will redirect the user after they
   * give permission to your application
   */
	"http://localhost:8888/google-login"
);

function getGoogleAuthURL() {
	/*
     * Generate a url that asks permissions to the user's email and profile
     */
	const scopes = [
		"https://www.googleapis.com/auth/userinfo.profile",
		"https://www.googleapis.com/auth/userinfo.email",
	];

	return oauth2Client.generateAuthUrl({
		"access_type": "offline",
		"prompt": "consent",
		"scope": scopes
	});
}

async function getGoogleUser(code) {
	if (code) {
		const { tokens } = await oauth2Client.getToken(code);
		oauth2Client.setCredentials(tokens);
		if (tokens.id_token && tokens.access_token) {
			// Fetch the user's profile with the access token and bearer
			try {
				const res = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${tokens.access_token}`, {
					"headers": {
						"Authorization": `Bearer ${tokens.id_token}`
					}
				});
				const googleUser = await res.json();
				return googleUser;
			} catch (error) {
				// eslint-disable-next-line no-console
				console.log(error);
				// throw new Error(error.message);
			}
		}
	}
	return null;
	//JWT
}

module.exports = {"getGoogleAuthURL" : getGoogleAuthURL, "getGoogleUser" : getGoogleUser};