import stateService from '../services/state.service';
import { Request, Response, NextFunction } from 'express';


export const cacheMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { search } = req.params;
    const key = `${req.route.path}=${search}`
    console.log(req.route.path)
    try {
        const cachedData = await stateService.getState(key);
        if (cachedData) {
            return res.send(JSON.parse(cachedData));
        }
        next();
    } catch (err) {
        console.error('Error checking cache:', err);
        next();
    }
};
