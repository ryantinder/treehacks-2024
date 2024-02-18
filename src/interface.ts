export type Bet = {
    _id: string,
    betId: string,
    address: string,
    desc: string,
    createdAt: number,
    expiry: number,
    amount: number,
    isSettled: boolean,
    emoji: string,
    creatorId: string
}

export interface BetWithVotes extends Bet {
    votes: Vote[]
}

export interface BetState extends BetWithVotes {
    yesBets: string[],
    noBets: string[]
}


export type User = {
    _id: string,
    address: string
    deviceToken: string
    id: string,
    key: string,
    name: string,
}
export type Vote = {
    betId: string,
    side: boolean,
    userId: string,
    name: string
}