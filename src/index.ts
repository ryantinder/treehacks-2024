import express from "express";
import { addUser, getPrivateKey } from "./db";


const app = express();

app.use(express.json());

app.get("/signin/:id", async (req, res) => {
    let pkey = await getPrivateKey(parseInt(req.params.id))
    if (!pkey) {
        pkey = await addUser(parseInt(req.params.id))
    }
    res.status(200).send("Hello World")
})

app.post("/create-bet", async (req, res) => {
    const { userId, amountBet , side, betName } = req.body;
    // const result = await createBet(userId, amountBet , side, betName);

})

app.post("/join-bet", async (req, res) => {
    const { userId, betId , side } = req.body;
    // const result = await joinBet(userId, betId , side );
    
})

app.post("/vote", async (req, res) => {
    const { userId, betId , side } = req.body;
    // const result = await vote(userId, betId , side );
    
})

app.listen(3000, () => {
    console.log("app listening...")
})