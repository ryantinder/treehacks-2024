require('dotenv').config();
import { abi as BetFactoryABI } from "../out/BetFactory.sol/BetFactory.json";
import { abi as BetABI } from "../out/Bet.sol/Bet.json";
import { ethers } from "ethers";
import { addBet, getBet, getUser, getUserByAddress, settleBet } from "./db";
import { nanoid } from "nanoid";
import { formatEther, parseEther } from "ethers/lib/utils";
import { Bet } from "./interface";
import { sendAPNS } from "./apns";
import { signERC2612Permit } from "eth-permit";

const privateKey = process.env.PRIVATE_KEY!;

// OPTIMISM
const factoryAddress = "0x5a512B031D4ef2204885c435657F14fA65E6E2a2";

const RPC_URLS = [
    process.env.RPC_URL1,
    process.env.RPC_URL2,
    process.env.RPC_URL3,
    process.env.RPC_URL4,
    process.env.RPC_URL5
]

const PROVIDERS = [
    new ethers.providers.JsonRpcProvider(RPC_URLS[0]), // WRITE ONLY
    new ethers.providers.JsonRpcProvider(RPC_URLS[1]), // FACTORY READ (balanceOf, getDeployed, etc.)
    new ethers.providers.JsonRpcProvider(RPC_URLS[2]), // FACTORY READ 
    new ethers.providers.JsonRpcProvider(RPC_URLS[3]), // BET READ
    new ethers.providers.JsonRpcProvider(RPC_URLS[4])  // ETH READ
]

const deployer = new ethers.Wallet(privateKey, PROVIDERS[0]);
const BET_FACTORY = new ethers.Contract(factoryAddress, BetFactoryABI, PROVIDERS[1]);
const BET_CONTRACT = new ethers.Contract(factoryAddress, BetABI, PROVIDERS[3]);

const opts = {
    maxFeePerGas: ethers.utils.parseUnits("0.015", "gwei"),
    maxPriorityFeePerGas: ethers.utils.parseUnits("0.004", "gwei")
}
/*/////////////////////////////////////////
                Deployer functions
/////////////////////////////////////////*/

export const createBet = async (userId: string, amount: number, desc: string, betId: string, emoji: string, expiry: number) => {
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
        // const res = await factory.callStatic.createBet(user, formattedAmount, side, desc, salt);
        const [addr, tx] = await Promise.all([ 
            BET_FACTORY.getDeployed(salt),
            BET_FACTORY.connect(deployer).createBet(formattedAmount, desc, salt, opts),
        ])
        addBet(betId, addr, amount, desc, emoji, expiry, userId)
        await tx.wait();
        console.log("CREATE BET COMPLETE", betId, desc, emoji)
    }
    catch (err) {
        console.log(err);
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
        const wallet = new ethers.Wallet(user.key!, PROVIDERS[0]);

        const [result, gas_balance, token_balance] = await Promise.all([
            signERC2612Permit(wallet, factoryAddress, wallet.address, bet.address, parseEther(bet.amount.toString()).toString()),
            gasBalanceAddr(wallet.address),
            tokenBalanceAddr(wallet.address)
        ])
        const tx = await BET_CONTRACT
            .attach(bet.address)
            .connect(wallet)
            .joinBet(side, result.deadline, result.v, result.r, result.s, opts);
        await tx.wait();
        console.log("JOIN BET complete", betId, userId, side)
    }
    catch (err) {
        console.log(err);
    }
}

export const getBatchBetState = async (arr: Bet[]) => {
    const res = await Promise.all(arr.map(async (bet) => {
        return getBetState(bet);
    }))
}

export const getLengths = async (bet: Bet) : Promise<[number, number]> => {
    const [yesBn, noBn] = await BET_CONTRACT.connect(PROVIDERS[3]).attach(bet.address).lengths();
    const yesLen = yesBn.toNumber();
    const noLen = noBn.toNumber();
    return [yesLen, noLen]
}

export const getBetState = (bet: Bet) => {
    console.log("starting getBetState")
    const yeses: Promise<string>[] = []
    const nos: Promise<string>[] = []
    // const [yesLen, noLen] = await getLengths(bet);
    console.log("got lengths")
    const _BET_CONTRACT = BET_CONTRACT.attach(bet.address).connect(PROVIDERS[3]);
    for (let i = 0; i < 10; i++) {
        yeses.push(_BET_CONTRACT.yesBets(i).then((e) => e).catch((e) => ethers.constants.AddressZero))
    }
    for (let i = 0; i < 10; i++) {
        nos.push(_BET_CONTRACT.noBets(i).then((e) => e).catch((e) => ethers.constants.AddressZero))
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
    const [yesBets, noBets] = await getBetState(bet)

    const won = side ? noBets.length * bet.amount / yesBets.length : yesBets.length * bet.amount / noBets.length;
    try {
        // will fail because approvals aren't set
        const tx = await BET_CONTRACT
            .attach(bet.address)
            .connect(deployer)
            .settleBet(side, opts);
        await settleBet(bet._id); //db 
        if (side) {
            await Promise.all([
                ...yesBets.map((addr) => {
                    return Promise.all([
                        getUserByAddress(addr),
                        tokenBalanceAddr(addr)
                    ]).then(([user, bal]) => {
                        sendAPNS(user?.deviceToken!, `Bet cashed! You received ${won} tokens!`, '', 'results', { betId: bet.betId, userside: true, vote: true, change: won, amount: bal })
                    })
                }),
                ...noBets.map((addr) => {
                    return Promise.all([
                        getUserByAddress(addr),
                        tokenBalanceAddr(addr)
                    ]).then(([user, bal]) => {
                        sendAPNS(user?.deviceToken!, `Bet missed...you lost ${bet.amount} tokens.`, '', 'results', { betId: bet.betId, userside: false, vote: true, change: bet.amount, amount: bal })
                    })
                })
            ])
        } else {
            await Promise.all([
                ...yesBets.map((addr) => {
                    return Promise.all([
                        getUserByAddress(addr),
                        tokenBalanceAddr(addr)
                    ]).then(([user, bal]) => {
                        sendAPNS(user?.deviceToken!, `Bet missed...you lost ${bet.amount} tokens.`, '', 'results', { betId: bet.betId, userside: true, vote: false, change: bet.amount, amount: bal })
                    })
                }),
                ...noBets.map((addr) => {
                    return Promise.all([
                        getUserByAddress(addr),
                        tokenBalanceAddr(addr)
                    ]).then(([user, bal]) => {
                        sendAPNS(user?.deviceToken!, `Bet cashed! You received ${won} tokens!`, '', 'results', { betId: bet.betId, userside: false, vote: false, change: won, amount: bal })
                    })
                })
            ])
        }
        return tx;
    }
    catch (err) {
        console.log(err);
        return err
    }
}

export const tokenBalanceUser = async (id: string) : Promise<number> => {
    console.log("tokenBalance", id)
    const user = await getUser(id);
    if (!user) {
        console.log("user not found")
        return 0;
    }
    console.log("tokenBalance", user.name, user.address)
    const bal = await BET_FACTORY.connect(PROVIDERS[2]).balanceOf(user.address)
    console.log(`${user.name} bal:`, formatEther(bal))
    return parseFloat(formatEther(bal));
}
export const tokenBalanceAddr = async (addr: string) : Promise<number> => {
    const token = await BET_FACTORY.connect(PROVIDERS[2]).balanceOf(addr)
    console.log(`${addr} bal:`, formatEther(token))
    return parseFloat(formatEther(token));
}
export const gasBalanceAddr = async (addr: string) : Promise<number> => {
    const gas = await PROVIDERS[4].getBalance(addr)
    console.log(`${addr} gas:`, formatEther(gas))
    return parseFloat(formatEther(gas));

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
        const tx = await BET_FACTORY.connect(deployer).mint(user.address, formattedAmount, opts);
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
    // const bal = await factory.balanceOf('0x61e5481a12411Ce31EcdB594d8cb7edE26874DC3')
    // console.log("balance", formatEther(bal))

}
// main().then()