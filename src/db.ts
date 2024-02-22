import { ConvexHttpClient } from "convex/browser"
import { api } from "../convex/_generated/api.js"
import { Wallet } from "ethers"
import { gasTo, getLengths, mintTo, settle } from "./ethers.ts";
import { Bet, BetWithVotes, User, Vote } from "./interface.ts";


const client = new ConvexHttpClient(process.env.CONVEX_URL!)

export const getUser = async (id: string) => {
    console.log("getUser", id)
    const res = await client.query(api.keys.get, {id: id})
    return res ? res as User : null
}
export const getUserByAddress = async (address: string) => {
    console.log("getUser", address)
    const res = await client.query(api.keys.byAddress, {address: address})
    return res ? res as User : null
}
export const getVotesByUserId = async (id: string) => {
    const res = await client.query(api.vote.byUserId, {userId: id})
    return res as Vote[]
}
export const getVotesByBetId = async (id: string) => {
    const res = await client.query(api.vote.byBetId, {betId: id})
    return res as Vote[]
}
export const getBet = async (id: string) : Promise<BetWithVotes> => {
    const res = await client.query(api.bets.get, {_id: id})
    const votes = await getVotesByBetId(id)
    return res ? {...res, votes: votes} : null
}

export const getAllBets = async () => {
    const res = await client.query(api.bets.all, {})
    return res as Bet[]
}

export const addUser = async (id: string, name: string, deviceToken: string) => {
    const user = await getUser(id)
    if (!user) {
        const wallet = Wallet.createRandom()
        const address = wallet.address
        console.log("new account")
    
        await client.mutation(api.keys.create, {id: id, key: wallet.privateKey, address: wallet.address, name: name, deviceToken: deviceToken})
        console.log("fund acct")

        await mintTo(id, 100);
        await gasTo(id);
    } else {
        console.log("account alr exists")
    }
}

export const addBet = async (betId: string, address: string, amount: number, desc: string, emoji: string, expiry: number, userId: string) => {
    console.log("addBet", betId, address, amount, desc, emoji, expiry, userId)
    const res = await client.mutation(
        api.bets.add, 
        {
            betId, 
            address, 
            desc, 
            createdAt: Math.floor(Date.now() / 1000), 
            expiry: expiry, 
            amount: amount, 
            isSettled: false,
            emoji: emoji,
            creatorId: userId
        }
    )
    return res
}

export const addVote = async (betId: string, userId: string, side: boolean) => {
    const user = await getUser(userId)
    if (!user) {
        console.log("user not found")
        return
    }
    console.log("addVote", betId, side, user.name, user.id)
    const votes = await getVotesByUserId(userId)
    if (votes.find(v => v.betId === betId)) {
        console.log("user already voted")
        return
    }
    const res = await client.mutation(
        api.vote.add, 
        {
            betId, 
            side,
            userId,
            name: user.name!
        }
    )

    await checkSettle(betId);
}

export const checkSettle = async (id: string) => {
    // get how many votes have been cast
    const [bet, votes] = await Promise.all([
        getBet(id),
        getVotesByBetId(id),
    ])
    console.log(votes)
    const yesVotes = votes.filter(v => v.side)
    const noVotes = votes.filter(v => !v.side)
    // get how many participants there are
    const [yesLen, noLen] = await getLengths(bet);
    const participants = yesLen + noLen;
    console.log("checkSettle", id, yesVotes.length, "to", noVotes.length, "total:", participants)
    // if half the participants have voted, settle the bet
    if (yesVotes.length >= participants / 2) {
        console.log("settle bet", id, true)
        await settle(bet, true);
    } else if (noVotes.length >= participants / 2) {
        console.log("settle bet", id, false)
        await settle(bet, false);
    } else {
        console.log("not enough votes to settle")
    }
}

export const settleBet = async (id: string) => {
    const res = await client.mutation(api.bets.settle, {_id: id as any})
}

export const updateDeviceToken = async (userId: string, deviceToken: string) => {
    const user = await client.query(api.keys.get, {id: userId})!
    console.log("updateDeviceToken", user.deviceToken)
    const res = await client.mutation(api.keys.updateDeviceToken, {id: user._id as any, deviceToken: deviceToken})
    const new_user = await client.query(api.keys.get, {id: userId})!
    console.log("updateDeviceToken", new_user.deviceToken)
    return res
}

// export const encrypt = (data: string) => {
//     if (!process.env.ENC_KEY) throw new Error("Missing encryption key")

//     return AES.encrypt(data, process.env.ENC_KEY!).toString()
// }

// export const decrypt = (data: string) => {
//     if (!process.env.ENC_KEY) throw new Error("Missing encryption key")
//     const bytes = AES.decrypt(data, process.env.ENC_KEY!)
//     return bytes.toString(enc.Utf8);
// }