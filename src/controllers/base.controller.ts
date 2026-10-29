import { Request, Response } from 'express';
import { IBaseService } from '../services/base.service';
import { Document } from 'mongoose';

export class BaseController<T extends Document> {
  constructor(public service: IBaseService<T>) {}

  async getAll(_req: Request, res: Response): Promise<void> {
    res.json(await this.service.getAll(res.locals.scope));
  }

  async findById(req: Request, res: Response): Promise<void> {
    const item = await this.service.findById(req.params.id, res.locals.scope);
    if (!item) { res.status(404).json({ error: 'Item not found' }); return; }
    res.json(item);
  }

  async add(req: Request, res: Response): Promise<void> {
    res.status(201).json(await this.service.add(req.body));
  }

  async update(req: Request, res: Response): Promise<void> {
    const item = await this.service.update(req.params.id, req.body, res.locals.scope);
    if (!item) { res.status(404).json({ error: 'Item not found' }); return; }
    res.json(item);
  }

  async remove(req: Request, res: Response): Promise<void> {
    const item = await this.service.remove(req.params.id, res.locals.scope);
    if (!item) { res.status(404).json({ error: 'Item not found' }); return; }
    res.json(item);
  }
}
