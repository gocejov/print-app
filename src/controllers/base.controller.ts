import { Request, Response } from 'express';
import { IBaseService } from '../services/base.service';
import { Document } from 'mongoose';

interface IBaseController {
  getAll(req: Request, res: Response): Promise<void>
  findById(req: Request, res: Response): Promise<void>
  add(req: Request, res: Response): Promise<void>
  update(req: Request, res: Response): Promise<void>
  remove(req: Request, res: Response): Promise<void>
}

export class BaseController<T extends Document> implements IBaseController {
  public service: IBaseService<T>

  constructor(service: IBaseService<T>) {
    this.service = service;
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const items = await this.service.getAll();
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      const item = await this.service.findById(req.params.id,
        [{ path: 'file' },
        { path: 'createdBy' },
        { path: 'owner' }]
      );
      if (!item) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      res.json(item);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async add(req: Request, res: Response): Promise<void> {
    try {
      const newItem = await this.service.add(req.body);
      res.status(201).json(newItem);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const updatedItem = await this.service.update(req.params.id, req.body);
      if (!updatedItem) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      res.json(updatedItem);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      const deletedItem = await this.service.remove(req.params.id);
      if (!deletedItem) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      res.json(deletedItem);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
