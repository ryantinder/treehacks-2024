import { ConvexHttpClient } from "convex/browser"
import { api } from "../convex/_generated/api.js"
import { nanoid } from "nanoid";
import { v4 } from "uuid";
import { Wallet, ethers } from "ethers"
import { gasTo, mintTo } from "./ethers.js";


const client = new ConvexHttpClient("https://neighborly-zebra-498.convex.cloud")


export const getPrivateKey = async (id: string) => {
    const res = await client.query(api.keys.get, {id: id})
    return res ? res.key as string : null
}

export const getUserAddress = async (id: string) => {
    console.log("getUserAddress", id)
    const res = await client.query(api.keys.get, {id: id})
    console.log(res)
    return res ? res.address as string : null
}

export const getBet = async (id: string) => {
    const res = await client.query(api.bets.get, {_id: id})
    console.log(res)
    return res ? res.address as string : null
}

export const getAllBets = async () => {
    const res = await client.query(api.bets.all, {})
    return res.map( res => res.address as string)
}

export const addUser = async (id: string, name: string) => {
    const addr = await getUserAddress(id)
    if (!addr) {
        const wallet = Wallet.createRandom()
        const address = wallet.address
        console.log("new account", wallet.privateKey, address)
    
        await client.mutation(api.keys.create, {id: id, key: wallet.privateKey, address: wallet.address, name: name})
        console.log("done with mutation, fund acct")

        await mintTo(id, 100);
        await gasTo(id);
        

    } else {
        console.log("account alr exists")
    }
}

export const addBet = async (betId: string, address: string, amount: number, desc: string) => {
    const res = await client.mutation(
        api.bets.add, 
        {
            betId, 
            address, 
            desc, 
            createdAt: new Date().toISOString(), 
            deadline: new Date().toISOString(), 
            amount: amount, 
            isSettled: false
        }
    )
    return res
}

export const settleBet = async (id: string) => {
    const res = await client.mutation(api.bets.settle, {_id: id as any})
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