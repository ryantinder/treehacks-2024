require('dotenv').config();
import { abi as BetFactoryABI } from "../out/BetFactory.sol/BetFactory.json";
import { abi as BetABI } from "../out/Bet.sol/Bet.json";
import { ContractTransaction, ethers } from "ethers"
import { addBet, getBet, getUser, getUserByAddress, settleBet } from "./db";
import { nanoid } from "nanoid";
import { formatEther, parseEther } from "ethers/lib/utils";
import { Bet } from "./interface";
import { sendAPNS } from "./apns";
import { signERC2612Permit } from "eth-permit";

const providerURL = process.env.RPC_URL!;
const privateKey = process.env.PRIVATE_KEY!;

const factoryAddress = "0x5a512B031D4ef2204885c435657F14fA65E6E2a2";
const provider1 = new ethers.providers.JsonRpcBatchProvider("https://opt-mainnet.g.alchemy.com/v2/1sjrag8LgSom-6oUNw7AqKpxRl14dPig");
const provider2 = new ethers.providers.JsonRpcBatchProvider("https://opt-mainnet.g.alchemy.com/v2/qbQlR0HWUXTOGM-ZGtb9v2XFiavC-QDq");
const provider3 = new ethers.providers.JsonRpcBatchProvider("https://opt-mainnet.g.alchemy.com/v2/1sjrag8LgSom-6oUNw7AqKpxRl14dPig");

const deployer = new ethers.Wallet(privateKey, provider1);
const factory = new ethers.Contract(factoryAddress, BetFactoryABI, deployer);
const betContract = new ethers.Contract(factoryAddress, BetABI, provider3);
const opts = {
    maxFeePerGas: ethers.utils.parseUnits("0.015", "gwei"),
    maxPriorityFeePerGas: ethers.utils.parseUnits("0.004", "gwei")
}
/*/////////////////////////////////////////
                Deployer functions
/////////////////////////////////////////*/

/**
 * 
 * @param id user on behalf of whom the bet is being created
 * @param amount amount
 * @param side side of bet
 * @param desc desc of bet
 * @returns 
 */

export const createBet = async (userId: string, amount: number, desc: string, betId: string, emoji: string, expiry: number) : Promise<string> => {
    // 1. fetch user private key from convex
    console.log("createBet")
    const formattedAmount = ethers.utils.parseEther(amount.toString());
    const rand = nanoid()
    const salt = ethers.utils.keccak256(ethers.utils.id(rand));
    /*
        function createBet(
            address user,
            uint amountBet,
            bool side,
            string memory desc,
            bytes32 salt
        ) external onlyOwner returns (address) {
    */
    try {
        // will fail because approvals aren't set
        const _factory = factory.connect(deployer);
        const addr = await _factory.getDeployed(salt);
        console.log("Bet will be deployed at:", addr)
        // const res = await factory.callStatic.createBet(user, formattedAmount, side, desc, salt);
        const [tx, _] = await Promise.all([ 
            _factory.connect(deployer).createBet(formattedAmount, desc, salt, opts),
            addBet(betId, addr, amount, desc, emoji, expiry, userId)
        ])
        await tx.wait();
        console.log(" tx complete", betId, addr, amount, desc, emoji, expiry)
        return addr;
    }
    catch (err) {
        console.log(err);
        return "";
    }
}


export const joinBet = async (userId: string, betId: string, side: boolean) => {
    // 1. fetch user private key from convex
    console.log("joinBet")
    const [bet, user] = await Promise.all([
        getBet(betId),
        getUser(userId)
    ])
    if (!bet || !user) {
        console.log("problem fetching data in join bet")
        return "";
    }
    const wallet = new ethers.Wallet(user.key!, provider1);
    /*
        function createBet(
            address user,
            uint amountBet,
            bool side,
            string memory desc,
            bytes32 salt
        ) external onlyOwner returns (address) {
    */
    try {
        // will fail because approvals aren't set
        const result = await signERC2612Permit(
            wallet,
            factoryAddress,
            wallet.address,
            bet.address,
            parseEther(bet.amount.toString()).toString(),
        )
        const tx = await betContract
            .attach(bet.address)
            .connect(wallet)
            .joinBet(side, result.deadline, result.v, result.r, result.s, opts);
        const balance = await factory.balanceOf(wallet.address);
        console.log("balance", formatEther(balance))
        console.log("tx", tx)
        // await tx.wait();
        console.log(" join bet complete", betId, userId, side)
        // await addBet(betId, addr, amount, desc, emoji, expiry);
        // return addr;
    }
    catch (err) {
        console.log(err);
        return "";
    }
}
// joinBet(
//     "001472.0878450723894b9bb24c0533a618983e.0902",
//     "F9C5FCD3-24F5-4982-B542-EA0575BF90B7",
//     true
// ).then()

export const getBatchBetState = async (arr: Bet[]) => {
    const res = await Promise.all(arr.map(async (bet) => {
        return getBetState(bet);
    }))
}

export const getLengths = async (bet: Bet) : Promise<[number, number]> => {
    const [yesBn, noBn] = await betContract.connect(provider2).attach(bet.address).lengths();
    const yesLen = yesBn.toNumber();
    const noLen = noBn.toNumber();
    return [yesLen, noLen]
}

export const getBetState = async (bet: Bet) => {
    console.log("starting getBetState")
    const yeses: Promise<string>[] = []
    const nos: Promise<string>[] = []
    // const [yesLen, noLen] = await getLengths(bet);
    console.log("got lengths")
    for (let i = 0; i < 10; i++) {
        yeses.push(betContract.connect(provider2).attach(bet.address).yesBets(i).then((e) => e).catch((e) => ethers.constants.AddressZero))
    }
    for (let i = 0; i < 10; i++) {
        nos.push(betContract.connect(provider2).attach(bet.address).noBets(i).then((e) => e).catch((e) => ethers.constants.AddressZero))
    }
    const res = Promise.all([Promise.all(yeses), Promise.all(nos)])
    console.log("ending getBetState")
    return res
}

export const settle = async (bet: Bet, side: boolean) : Promise<string> => {
    // 1. fetch user private key from convex
    console.log("** executing settle bet, ", bet.desc, ", side:", side)
    /*
        function settleBet(
            bool _side
        ) external onlyOwner returns (address) {
    */
    const [[yesBets, noBets], conBal] = await Promise.all([
        getBetState(bet),
        factory.balanceOf(bet.address)
    ])
    const bal = parseFloat(formatEther(conBal))
    console.log("contract balance", formatEther(conBal), " expecting to pay")
    const won = side ? noBets.length * bet.amount / yesBets.length : yesBets.length * bet.amount / noBets.length;
    try {
        // will fail because approvals aren't set
        const tx = await betContract
            .attach(bet.address)
            .connect(deployer)
            .settleBet(side, opts);
        await settleBet(bet._id); //db 
        if (side) {
            await Promise.all( yesBets.map( async (e) => {
                const [user, bal] = await Promise.all([
                    getUserByAddress(e),
                    factory.connect(provider3).balanceOf(e).then(formatEther)
                ])
                sendAPNS(user?.deviceToken!, `Bet cashed! You received ${won} tokens!`, '', 'results', { betId: bet.betId, userside: true, vote: true, change: won, amount: parseFloat(bal) })
            } ))
            await Promise.all( noBets.map( async (e) => {
                const [user, bal] = await Promise.all([
                    getUserByAddress(e),
                    factory.connect(provider3).balanceOf(e).then(formatEther)
                ])
                sendAPNS(user?.deviceToken!, `Bet missed...you lost ${bet.amount} tokens.`, '', 'results', { betId: bet.betId, userside: false, vote: true, change: bet.amount, amount: parseFloat(bal) })
            } ))
        } else {
            await Promise.all( yesBets.map( async (e) => {
                const [user, bal] = await Promise.all([
                    getUserByAddress(e),
                    factory.connect(provider3).balanceOf(e).then(formatEther)
                ])
                sendAPNS(user?.deviceToken!, `Bet missed...you lost ${bet.amount} tokens.`, '', 'results', { betId: bet.betId, userside: true, vote: false, change: bet.amount, amount: parseFloat(bal) })
            } ))
            await Promise.all( noBets.map( async (e) => {
                const [user, bal] = await Promise.all([
                    getUserByAddress(e),
                    factory.connect(provider3).balanceOf(e).then(formatEther)
                ])
                sendAPNS(user?.deviceToken!, `Bet cashed! You received ${won} tokens!`, '', 'results', { betId: bet.betId, userside: false, vote: false, change: won, amount: parseFloat(bal) })
            } ))
        }
        return tx;
    }
    catch (err) {
        console.log(err);
        return err
    }
}

export const tokenBalance = async (id: string) => {
    console.log("tokenBalance", id)
    const user = await getUser(id);
    if (!user) {
        console.log("user not found")
        return 0;
    }
    console.log("tokenBalance", user.name, user.address)
    const bal = await factory.connect(provider3).balanceOf(user.address)
    console.log(`${user.name} bal:`, formatEther(bal))
    return parseFloat(formatEther(bal));
}
export const tokenBalanceAddr = async (addr: string) => {
    const token = await factory.connect(provider3).balanceOf(addr)
    console.log(`${addr} bal:`, formatEther(token))
    return parseFloat(formatEther(token));
}

export const mintTo = async (id: string, amount: number) => {
    // 1. fetch user private key from convex
    const user = await getUser(id);
    if (!user) {
        console.log("user not found")
        return;
    }
    try {
        /*
        function mint(
            address to,
            uint amount,
        ) external onlyOwner {
        */
       console.log("mintTo", user?.name)
       const formattedAmount = ethers.utils.parseEther(amount.toString());
        const tx = await factory.connect(deployer).mint(user.address, formattedAmount, opts);
        await tx.wait();
    }
    catch (err) {
        console.log(err);
    }
    
}

export const gasTo = async (id: string) => {
    // 1. fetch user private key from convex
    const user = await getUser(id);
    if (!user) {
        console.log("user not found")
        return "";
    }
    try {
        /*
        function mint(
            address to,
            uint amount,
        ) external onlyOwner {
        */
       console.log("gasTo", user.name)
        const tx = await deployer.sendTransaction({
            to: user.address,
            value: ethers.utils.parseEther("0.001"),
            ...opts
        })
        await tx.wait();
    }
    catch (err) {
        console.log(err);
    }
    
}

export const main = async () => {
    // await mintTo(2, 100);
    const bal = await factory.balanceOf('0x61e5481a12411Ce31EcdB594d8cb7edE26874DC3')
    console.log("balance", formatEther(bal))

}
// main().then()