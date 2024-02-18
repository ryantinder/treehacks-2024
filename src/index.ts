import express from "express";
import { getPrivateKey, addUser, getAllBets } from "./db";
import { createBet, tokenBalance } from "./ethers";


const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.status(200).send("Hello Worl")
})

// app.get("/signin/:id", async (req, res) => {
//     let pkey = await getPrivateKey(parseInt(req.params.id))
//     if (!pkey) {
//         pkey = await addUser(parseInt(req.params.id))
//     }
//     res.status(200).send("Hello World")
// })

app.post("/create-user", async (req, res) => {
    const { name, userId} = req.body;
    console.log("** index: creating user", name, userId)
    const result = await addUser(userId, name);
    return res.status(200).send('Success')
})

app.post("/create-bet", async (req, res) => {
    const { userId, amountBet , side, betName, betId } = req.body;
    console.log("** index: creating bet", userId, amountBet , side, betName)
    const result = await createBet(userId, amountBet, side, betName, betId);
})

app.post("/join-bet", async (req, res) => {
    const { userId, betId , side } = req.body;
    // const result = await joinBet(userId, betId , side );
    
})

app.post("/vote", async (req, res) => {
    const { userId, betId , side } = req.body;
    // const result = await vote(userId, betId , side );
    
})

app.get("/get-all-bets", async (req, res) => {
    // const result = await vote(userId, betId , side );
    const bets = await getAllBets();
    return res.status(200).json({ "bets" : bets })
})

app.get("/get-balance/:id", async (req, res) => {
    try {
        const balance = await tokenBalance(req.params.id);
        return res.status(200).json({ "token_balance" : balance })
    } catch (e) {
        return res.status(400).json({ "error" : e })
    }
})

app.listen(3000, () => {
    console.log("app listening...")
})