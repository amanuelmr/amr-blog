// The user fields safe to show anyone: what a byline, comment or profile
// needs, never email or auth state. Used wherever a user is populated into a
// public response.
const PUBLIC_USER_FIELDS = "name avatarUrl";

module.exports = { PUBLIC_USER_FIELDS };
