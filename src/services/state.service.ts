import { IUser } from '@/models/user.model';
import Redis from 'ioredis';

const redis = new Redis();

export interface State {
    [key: string]: string;
}

const setState = async (key: string, value: any, time: number | null = null): Promise<void> => {
    if (!time) {
        await redis.set(key, JSON.stringify(value));
    } else {
        await redis.setex(key, time, JSON.stringify(value));
    }
};

const getState = async (key: string): Promise<any | null> => {
    const data = await redis.get(key);
    if (data) return JSON.parse(data);
    return null;
};

const setPlayerOfTheDayState = async (key: string, value: IUser): Promise<void> => {
    await redis.set(key, JSON.stringify(value));
};

const getPlayerOfTheDayState = async (key: string): Promise<IUser | null> => {
    return await getState(key)
};

const setSearchPlayerState = async (key: string, value: any, time: number | null = null): Promise<void> => {
    await setState(key, JSON.stringify(value), time);
};

const getSearchPlayerState = async (key: string): Promise<any | null> => {
    return getState(key);
};

export const getAllStates = async (): Promise<Record<string, string>> => {
    const keys = await redis.keys('*');
    const state: Record<string, string> = {};

    for (const key of keys) {
        const value = await redis.get(key);
        if (value !== null) {
            state[key] = value;
        }
    }

    return state;
};

export const cleaAllStates = async (): Promise<string> => {
    return redis.flushall();
};

export default { setState, getState, setPlayerOfTheDayState, getPlayerOfTheDayState, setSearchPlayerState, getSearchPlayerState, getAllStates, cleaAllStates }
