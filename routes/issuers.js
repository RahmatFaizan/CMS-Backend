const express = require('express');
const {listIssuers} = require("./healthcarFn");
const router = express.Router();

router.get("/api/v1/healthcare/issuers", async (req, res) => {
    try {
        let {state = '', page = 0} = req.query;
        if (state === '' && typeof state !== "string") {
            res.status(400).send({msg: "Bad Request"});
        }
        console.log({listIssuers});
        let data = await listIssuers(state, page);
        let statusCode = data.error ? +data.status || 500 : 200;
        res.status(statusCode).json(data);
    }catch (e) {
        console.log(e);
        res.status(500).send("Internal Server Error.")
    }
})

module.exports = router;