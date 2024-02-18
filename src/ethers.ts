require('dotenv').config();
import { abi as BetFactoryABI } from "../out/BetFactory.sol/BetFactory.json";
import { abi as BetABI } from "../out/Bet.sol/Bet.json";
import { ContractTransaction, ethers } from "ethers"
import { addBet, getBet, getUser, settleBet } from "./db";
import { nanoid } from "nanoid";
import { formatEther, parseEther } from "ethers/lib/utils";
import { Bet } from "./interface";
import { sendAPNS } from "./apns";

const providerURL = process.env.RPC_URL!;
const privateKey = process.env.PRIVATE_KEY!;

const factoryAddress = "0x5F9b4EF03212fB632097B4F87353995125053E68";
const provider = new ethers.providers.JsonRpcBatchProvider(providerURL);
const deployer = new ethers.Wallet(privateKey, provider);
const factory = new ethers.Contract(factoryAddress, BetFactoryABI, deployer);
const betContract = new ethers.Contract(factoryAddress, BetABI, provider);
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
        const addr = await factory.getDeployed(salt);
        console.log("Bet will be deployed at:", addr)
        // const res = await factory.callStatic.createBet(user, formattedAmount, side, desc, salt);
        const [tx, _] = await Promise.all([ 
            factory.connect(deployer).createBet(formattedAmount, desc, salt, opts),
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
    const wallet = new ethers.Wallet(user.key!, provider);
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
        console.log("Bet is at", bet.address, wallet.address)
        const [approved, balance] = await Promise.all([ 
            factory.allowance(wallet.address, bet.address),
            factory.balanceOf(wallet.address)
        ])

        console.log("approved", formatEther(approved))
        if (approved.lt(parseEther(bet.amount.toString()))) {
            const tx = await factory.connect(wallet).approve(bet.address, ethers.constants.MaxUint256, opts)
            await tx.wait();
            console.log("approved")
        }
        console.log("balance", formatEther(balance))
        const tx = await betContract
            .attach(bet.address)
            .connect(wallet)
            .joinBet(true, opts);
        await tx.wait();
        console.log(" join bet complete", betId, userId, side)
        // await addBet(betId, addr, amount, desc, emoji, expiry);
        // return addr;
    }
    catch (err) {
        console.log(err);
        return "";
    }
}

export const getBatchBetState = async (arr: Bet[]) => {
    const res = await Promise.all(arr.map(async (bet) => {
        return getBetState(bet);
    }))
}

export const getLengths = async (bet: Bet) : Promise<[number, number]> => {
    const [yesBn, noBn] = await betContract.attach(bet.address).lengths();
    const yesLen = yesBn.toNumber();
    const noLen = noBn.toNumber();
    return [yesLen, noLen]
}

export const getBetState = async (bet: Bet) => {
    const yeses: Promise<string>[] = []
    const nos: Promise<string>[] = []
    const [yesLen, noLen] = await getLengths(bet);
    for (let i = 0; i < yesLen; i++) {
        yeses.push(betContract.attach(bet.address).yesBets(i))
    }
    for (let i = 0; i < noLen; i++) {
        nos.push(betContract.attach(bet.address).noBets(i))
    }
    return Promise.all([Promise.all(yeses), Promise.all(nos)])
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
                const user = await getUser(e)
                sendAPNS(user?.deviceToken!, `Bet cashed! You received ${won} tokens!`, '', 'results', { betId: bet.betId, user_side: true, vote: true, change: won })
            } ))
            await Promise.all( noBets.map( async (e) => {
                const user = await getUser(e)
                sendAPNS(user?.deviceToken!, `Bet missed...you lost ${bet.amount} tokens.`, '', 'results', { betId: bet.betId, user_side: false, vote: true, change: bet.amount })
            } ))
        } else {
            await Promise.all( yesBets.map( async (e) => {
                const user = await getUser(e)
                sendAPNS(user?.deviceToken!, `Bet missed...you lost ${bet.amount} tokens.`, '', 'results', { betId: bet.betId, user_side: true, vote: false, change: bet.amount })
            } ))
            await Promise.all( noBets.map( async (e) => {
                const user = await getUser(e)
                sendAPNS(user?.deviceToken!, `Bet cashed! You received ${won} tokens!`, '', 'results', { betId: bet.betId, user_side: false, vote: false, change: won })
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
    const user = await getUser(id);
    if (!user) {
        console.log("user not found")
        return 0;
    }
    const [token] = await Promise.all([
        factory.balanceOf(user.address),
    ])
    return formatEther(token);
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
        const tx = await factory.mint(user.address, formattedAmount, opts);
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
    const bal = await factory.balanceOf("0xa9b95da31C3Be19979611b5deA202F16c7704805")
    console.log(formatEther(bal))
    const desc = await bet.attach("0x147FeE815E679516aafAa398d1bE9ED0ba30611b").desc()
    console.log(desc)
    const betAmount = await bet.attach("0x147FeE815E679516aafAa398d1bE9ED0ba30611b").amountBet()
    // await addBet("xyz", "0x147FeE815E679516aafAa398d1bE9ED0ba30611b", parseFloat(formatEther(betAmount)), desc)
}
// main().then()