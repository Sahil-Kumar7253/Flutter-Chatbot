const express = require("express");
app = express();
const cors = require("cors");
const messRouter = require("./routes/chatRoutes");

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({extended:true}));

app.use("/api/chat", messRouter);

app.get("/", (req ,res) => {
    return res.send("Hello World")
})

module.exports = app
