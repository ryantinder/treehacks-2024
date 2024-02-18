require('dotenv').config();
import { abi as BetFactoryABI } from "../out/BetFactory.sol/BetFactory.json";
import { abi as BetABI } from "../out/Bet.sol/Bet.json";
import { ethers } from "ethers"
import { addBet, getBet, getPrivateKey, getUserAddress, settleBet } from "./db";
import { nanoid } from "nanoid";
import { formatEther } from "ethers/lib/utils";

const providerURL = process.env.RPC_URL!;
const privateKey = process.env.PRIVATE_KEY!;

const factoryAddress = "0xFD5e73A6804B2370ab9B04202FE3994442B9850b";
const provider = new ethers.providers.JsonRpcProvider(providerURL);
const deployer = new ethers.Wallet(privateKey, provider);
const factory = new ethers.Contract(factoryAddress, BetFactoryABI, deployer);
const bet = new ethers.Contract(factoryAddress, BetABI, provider);

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
        const tx = await factory.connect(deployer).createBet(formattedAmount, desc, salt);
        await tx.wait();
        console.log(" tx complete", betId, addr, amount, desc, emoji, expiry)
        await addBet(betId, addr, amount, desc, emoji, expiry);
        return addr;
    }
    catch (err) {
        console.log(err);
        return "";
    }
}

export const settle = async (_id: string, side: boolean) : Promise<string> => {
    // 1. fetch user private key from convex
    console.log("settle bet, side:", side)
    const addr = await getBet(_id);
    /*
        function settleBet(
            bool _side
        ) external onlyOwner returns (address) {
    */
    try {
        // will fail because approvals aren't set
        const res = await factory.callStatic.settleBet(side);
        const tx = await factory.settleBet(side);
        await settleBet(_id); //db 
        return tx;
    }
    catch (err) {
        console.log(err);
        return err
    }
}

export const tokenBalance = async (id: string) => {
    const user = await getUserAddress(id);
    if (!user) {
        console.log("user not found")
        return 0;
    }
    const [token] = await Promise.all([
        factory.balanceOf(user),
    ])
    return formatEther(token);
}

export const mintTo = async (id: string, amount: number) => {
    // 1. fetch user private key from convex
    const user = await getUserAddress(id);
    console.log("user", user)
    const formattedAmount = ethers.utils.parseEther(amount.toString());
    /*
        function mint(
            address to,
            uint amount,
        ) external onlyOwner {
    */
    try {
        // will fail because approvals aren't set
        // const tx = await contract.getDeployed.staticCall(salt);

        const tx = await factory.mint(user, formattedAmount);
        await tx.wait();
        console.log(tx)
        return tx.hash;
    }
    catch (err) {
        console.log(err);
        return "";
    }
    
}

export const gasTo = async (id: string) => {
    // 1. fetch user private key from convex
    const user = await getUserAddress(id);
    if (!user) {
        console.log("user not found")
        return "";
    }
    console.log("user", user)
    /*
        function mint(
            address to,
            uint amount,
        ) external onlyOwner {
    */
    try {
        // will fail because approvals aren't set
        // const tx = await contract.getDeployed.staticCall(salt);

        const tx = await deployer.sendTransaction({
            to: user!,
            value: ethers.utils.parseEther("0.001")
        })
        await tx.wait();
        return tx.hash;
    }
    catch (err) {
        console.log(err);
        return "";
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