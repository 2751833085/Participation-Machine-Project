const { defineSecret } = require("firebase-functions/params");
const { buildAdminPortal } = require("./admin-portal-handlers");
const { validateHeadshot } = require("./headshot-validator");

/** Must match the password used in the web admin login (#/admin). */
const adminDashboardPassword = defineSecret("ADMIN_DASHBOARD_PASSWORD");

exports.adminPortal = buildAdminPortal(adminDashboardPassword);
exports.validateHeadshot = validateHeadshot;
