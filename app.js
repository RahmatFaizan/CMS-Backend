const express = require('express');
const app = express();
const Routes = require('./routes/app');
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const bodyParser = require("body-parser");
const port = process.env.PORT || 5000;
if(process.env.NODE_ENV !== 'production'){
    require("dotenv").config();
}

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan("dev"));
app.use(cors());
app.use(helmet());
app.use(Routes);

app.get("*",(_, res)=>{
    res.status(200).send("OK!");
})

app.listen(port, () => {
    console.log(`Server running on port http://localhost:${port}`)
});