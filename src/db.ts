import { ConvexHttpClient } from "convex/browser"
import { api } from "../convex/_generated/api.js"
import { nanoid } from "nanoid";
import { v4 } from "uuid";
import { Wallet, ethers, getBytes, keccak256 } from "ethers"


const client = new ConvexHttpClient("https://neighborly-zebra-498.convex.cloud")


export const getPrivateKey = async (id: number) => {
    const res = await client.query(api.keys.get, {id: id})
    return res ? res.key as string : null
}

export const addUser = async (id: number) => {
    const [pkey, addr] = await CreateNewAccount(id)
    await client.mutation(api.keys.create, {id: id, key: pkey, address: addr})
    return pkey
}



const CreateNewAccount = async (user_id: number) => {
    // account creation methodology
    // sample 3 sources of entropy, username, and timestamp. Hash for private key
    // const ent1 = v4()
    // const ent2 = nanoid()

    // create private key by double hashing
    // const private_key = keccak256(keccak256(getBytes(ent2 + user_id.toString())))

    // encrypt private key
    // const enc_private_key = encrypt(private_key)
    const wallet = Wallet.createRandom()
    const address = wallet.address
    console.log("new account", wallet.privateKey, address)
    // add account to db
    // const [_, id] = await Promise.all([
    //     AddKey(user_id, enc_private_key, address), 
    //     AddUser(user_id, username, address)
    // ])
    return [wallet.privateKey, address]
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