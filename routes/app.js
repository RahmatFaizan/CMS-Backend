const express = require('express');
const {getCountryFips, getEstimate, searchPlans} = require("./healthcarFn");
const planRoute = require("./plans")
const healthIssuersRoute = require("./issuers")
const router = express.Router();

router.use(planRoute);
router.use(healthIssuersRoute);
module.exports = router;