import express from "express";
import { addUser, getAllBets, getBet, addVote, getVotesByUserId, getUser, updateDeviceToken, getVotesByBetId } from "./db";
import { createBet, getBetState, joinBet, tokenBalanceUser, tokenBalanceAddr } from "./ethers";
import { sendAPNS } from "./apns";
import { BetState } from "./interface";


const app = express();

app.use(express.json());

/*/////////////////////////////////////////
                POST
/////////////////////////////////////////*/
app.post("/create-user", async (req, res) => {
    const { name, userId, deviceToken } = req.body;
    console.log("** index: creating user", name, userId, deviceToken)
    res.status(200).send('Success')
    const result = await addUser(userId, name, deviceToken);
})

app.post("/create-bet", async (req, res) => {
    const { userId, amountBet, betName, betID, emoji, expiry } = req.body;
    console.log("** index: creating bet", userId, amountBet, betID, betName, emoji, expiry)
    res.status(200).send('Success')
    const result = await createBet(userId, amountBet, betName, betID, emoji, expiry);
})

app.post("/set-side", async (req, res) => {
    const { userId, betId, side } = req.body;
    console.log("** index: joining bet", userId, betId, side)
    res.status(200).send('Success')
    const result = await joinBet(userId, betId , side );
})

app.post('/update-device-token', async (req, res) => {
    const { userId, deviceToken } = req.body;
    res.status(200).send('Success')
    console.log("** index: updating device token", userId, deviceToken)
    const result = await updateDeviceToken(userId, deviceToken);
})

app.post("/vote", async (req, res) => {
    const { userId, betId , side } = req.body;
    res.status(200).send('Success')
    console.log("** index: voting", userId, betId, side)
    const result = await addVote( betId, userId, side );
})
/*/////////////////////////////////////////
                GET
/////////////////////////////////////////*/
app.get('/join-bet/:user_id/:bet_id', async (req, res) => {
    const { user_id, bet_id } = req.params;
    res.status(200).send('Success')
    const [user, bet] = await Promise.all([getUser(user_id), getBet(bet_id)]);
    const creator = await getUser(bet!.creatorId);
    const result = await sendAPNS(creator?.deviceToken!, `${user?.name} has joined your bet!`, user?.name!, 'join', {});
})

app.get("/votes/:id", async (req, res) => {
    const result = await getVotesByUserId(req.params.id);
    return res.status(200).json({ "result" : result.map((v) => v.betId) })
})
// TODO
app.get("/bets", async (req, res) => {
    // const result = await vote(userId, betId , side );
    const bets = await getAllBets();
    const fullBets = await Promise.all(bets.map(async (bet) : Promise<BetState> => {
        const [[yeses, nos], votes, bal] = await Promise.all([
            getBetState(bet),
            getVotesByBetId(bet.betId),
            tokenBalanceAddr(bet.address)
        ])
        console.log("here", yeses, nos)
        return {
            ...bet,
            yesBets: yeses,
            noBets: nos,
            votes: votes,
            balance: bal
        }
    }))
    return res.status(200).json({ "bets" : fullBets })
})
app.get("/bets/:id", async (req, res) => {
    // const result = await vote(userId, betId , side );
    console.log("here")
    const [bets, user] = await Promise.all([getAllBets(), getUser(req.params.id)]);
    if (!user) {
        return res.status(400).json({ "error" : "user not found" })
    }
    console.log("there")
    const fullBets = await Promise.all(
        bets.map(async (bet) : Promise<BetState> => Promise.all([
            getBetState(bet),
            getVotesByBetId(bet.betId),
            tokenBalanceAddr(bet.address)
        ]).then(([[yeses, nos], votes, bal]) => {
            return {
                ...bet,
                yesBets: yeses,
                noBets: nos,
                votes: votes,
                balance: bal
            }
    })))
    const filteredBets = fullBets.filter((bet) => bet.yesBets.includes(user.address) || bet.noBets.includes(user.address) || bet.creatorId === user.id);
    console.log("bets returning", filteredBets.length)
    return res.status(200).json({ "bets" : filteredBets })
})

app.get("/bet/:id", async (req, res) => {
    // const result = await vote(userId, betId , side );
    const bet = await getBet(req.params.id);
    if (!bet) {
        return res.status(400).json({ "error" : "bet not found" })
    }
    const [yeses, nos] = await getBetState(bet);
    console.log("here", yeses, nos)
    return res.status(200).json({ id : {
        ...bet,
        yesBets: yeses,
        noBets: nos
    } })
})

app.get("/get-balance/:id", async (req, res) => {
    try {
        console.log("getting balance")
        const balance = await tokenBalanceUser(req.params.id);
        console.log("sending bal", balance)
        res.header("application/text")
        return res.status(200).json({balance})
    } catch (e) {
        console.log("error", e)
        return res.status(400).json({ "error" : e })
    }
})

app.listen(3000, () => {
    console.log("app listening...")
})