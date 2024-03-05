if (process.env.NODE_ENV !== 'production') {
    require("dotenv").config();
}

const cache = require('node-cache');
const client = new cache();
const axios = require('axios');
const axiosRateLimit = require('axios-rate-limit');

const axiosInstance = axiosRateLimit(axios.create(), {
    maxRequests: 65,            // Maximum requests in the time window (1 second)
    perMilliseconds: 1000,      // Time window in milliseconds (1 second)
    maxRPS: 65,                 // Maximum requests per second
});

const YEAR = 2024;

const getCountryFips = async (zipcode) => {
    const cacheKey = "zip_" + zipcode;
    try {
        const cachedData = client.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
    } catch (e) {
        console.log(e);
    }

    let url = process.env.API_MAIN_URL + `counties/by/zip/${zipcode}?apikey=${process.env.API_KEY}`;

    try {
        let req = await axiosInstance.get(url);
        let {counties = []} = req.data;
        let res = counties[0];
        try {
            client.set(cacheKey, JSON.stringify(res), 600);
        } catch (e) {
            console.log(e);
        }

        return res;
    } catch (error) {
        console.log(error);
        return {error: error.message};
    }
}

const getHouseholdJSON = (contact, aptc_eligible = true) => {
    return {
        "income": contact.income,
        "people": [
            {
                "aptc_eligible": aptc_eligible,
                "age": contact.age,
                "has_mec": false,
                "is_pregnant": false,
                "is_parent": false,
                "uses_tobacco": false,
                "gender": contact.gender
            }
        ],
        "has_married_couple": false,
        "unemployment_received": "None"
    }
}


const getEstimate = async (contact, fips) => {
    let postData = {
        "household": getHouseholdJSON(contact, false),
        "place": fips,
        "year": YEAR
    }
    let url = process.env.API_MAIN_URL + `households/eligibility/estimates?year=${YEAR}&apikey=${process.env.API_KEY}`;

    try {
        let req = await axiosInstance.post(url, postData);
        let {estimates} = req.data;
        return estimates || {};
    } catch (error) {
        console.log(error);
        return {error: error.message}
    }
}

const searchPlans = async (contact, fips, aptc_override, issuers) => {
    const householdJSON = {
        "household": getHouseholdJSON(contact),
        "market": "Individual",
        "place": fips,
        "year": YEAR,
        "filter": {
            "division": "HealthCare",
            "metal_design_types": null,
            "issuers": issuers
        },
        "limit": 10,
        "offset": 0,
        "order": "asc",
        "suppressed_plan_ids": [],
        "sort": "premium",
        "aptc_override": aptc_override
    }

    let url = process.env.API_MAIN_URL + `plans/search?apikey=${process.env.API_KEY}`;
    try {
        let req = await axiosInstance.post(url, householdJSON)
        return (req.data);
    } catch (er) {
        return {error: er.message};
    }
}

module.exports = {getCountryFips, getEstimate, searchPlans};