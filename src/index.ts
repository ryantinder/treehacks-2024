import express from "express";
import { addUser, getAllBets, getBet, addVote, getVotesByUserId, getUser, updateDeviceToken, getVotesByBetId } from "./db";
import { createBet, getBetState, joinBet, tokenBalance } from "./ethers";
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

app.get('/join-bet/:user_id/:bet_id', async (req, res) => {
    const { user_id, bet_id } = req.params;
    res.status(200).send('Success')
    const [user, bet] = await Promise.all([getUser(user_id), getBet(bet_id)]);
    const creator = await getUser(bet!.creatorId);
    const result = await sendAPNS(creator?.deviceToken!, `${user?.name} has joined your bet!`, user?.name!, 'join', {});
})

app.get('/test-settle', async (req, res) => {
    const bet = await getBet('A46FC92D-AE1B-46BC-B078-B4D7A65475DC')
    await sendAPNS(
        "68c9526cbd9d8665c27c7adac6b3b8cd0fb13a217bb7d3de7e38530fc66d4f3b",
        `Bet cashed! You received ${10} tokens!`,
        '',
        'results', 
        { betId: bet.betId, user_side: true, vote: true, change: 10 })
    res.status(200).send('Success')
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

app.get("/votes/:id", async (req, res) => {
    const result = await getVotesByUserId(req.params.id);
    return res.status(200).json({ "result" : result.map((v) => v.betId) })
})
// TODO
app.get("/bets", async (req, res) => {
    // const result = await vote(userId, betId , side );
    const bets = await getAllBets();
    const fullBets = await Promise.all(bets.map(async (bet) : Promise<BetState> => {
        const [[yeses, nos], votes] = await Promise.all([
            getBetState(bet),
            getVotesByBetId(bet.betId)
        ])
        console.log("here", yeses, nos)
        return {
            ...bet,
            yesBets: await Promise.all(yeses),
            noBets: await Promise.all(nos),
            votes: votes
        }
    }))
    return res.status(200).json({ "bets" : fullBets })
})
app.get("/bets/:id", async (req, res) => {
    // const result = await vote(userId, betId , side );
    const [bets, user] = await Promise.all([getAllBets(), getUser(req.params.id)]);
    if (!user) {
        return res.status(400).json({ "error" : "user not found" })
    }
    const fullBets = await Promise.all(bets.map(async (bet) : Promise<BetState> => {
        const [[yeses, nos], votes] = await Promise.all([
            getBetState(bet),
            getVotesByBetId(bet.betId)
        ])
        return {
            ...bet,
            yesBets: await Promise.all(yeses),
            noBets: await Promise.all(nos),
            votes: votes
        }
    }))
    const filteredBets = fullBets.filter((bet) => bet.yesBets.includes(user.address) || bet.noBets.includes(user.address));
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
        const balance = await tokenBalance(req.params.id);
        return res.status(200).send(balance)
    } catch (e) {
        return res.status(400).json({ "error" : e })
    }
})

app.listen(3000, () => {
    console.log("app listening...")
})