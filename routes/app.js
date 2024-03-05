const express = require('express');
const {getCountryFips, getEstimate, searchPlans} = require("./healthcarFn");
const router = express.Router();
const cache = require('node-cache');
const client = new cache();

const {body, validationResult} = require('express-validator');
const validate = validations => {
    return async (req, res, next) => {
        for (let validation of validations) {
            const result = await validation.run(req);
            if (result.errors.length) break;
        }

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        res.status(400).json({errors: "Incorrect data structure or missing data"}); /* errors.array() */
    };
};


const issuers = ["Aetna CVS Health", "Blue Cross and Blue Shield of Texas", "UnitedHealthcare", "Molina Healthcare", "Oscar Insurance Company", "Cigna Healthcare", "Anthem Blue Cross and Blue Shield", "Ambetter from Superior HealthPlan"];
router.post('/api/v1/healthcare/plans', validate([
    body('zipcode').notEmpty().withMessage('zipcode is required'),
    body("uses_tobacco").notEmpty().isBoolean(),
    body("income").notEmpty().withMessage('income is required'),
    body("age").notEmpty().withMessage('age is required').isNumeric().withMessage('age must be a numeric value'),
    body("gender").notEmpty().isString().withMessage('gender is required')
]), async (req, res) => {
    try {
        let cacheError = false;
        let {zipcode, uses_tobacco, income, age, gender} = req.body;
        let contact = {zipcode, uses_tobacco, income, age, gender};

        const cacheKey = `processData_${JSON.stringify(contact)}`;

        try {

            const cachedData = client.get(cacheKey);

            if (cachedData) {
                console.log('Serving data from cache:', cacheKey);
                const data = JSON.parse(cachedData);
                data.cached = true;
                return res.json(data);
            }

        } catch (e) {
            cacheError = true;
            console.log(e.message);
        }

        let fips = await getCountryFips(zipcode);
        fips.countyfips = fips.fips;
        if (fips.error) {
            return res.status(400).json({error: fips.error});
        }

        let estimates = await getEstimate(contact, fips);
        if (estimates.error) {
            return res.status(400).json({error: estimates.error});
        }

        let aptc_override = estimates.aptc;
        let plans = await searchPlans(contact, fips, aptc_override, issuers);
        if (plans.status) {
            let json = {errors: "Invalid request has been made to marketplace."};
            try {
                json = {...plans};
            } catch (err) {

            }
            return res.status(+plans.status).json(json)
        }

        plans.estimates = estimates;
        try {
            client.set(cacheKey, JSON.stringify(plans), 600);
        } catch (e) {
            console.log(e);
            cacheError = true;
        }
        plans.cacheError = cacheError;
        res.status(200).json(plans)
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
})

module.exports = router;