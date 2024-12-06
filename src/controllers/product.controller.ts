import { BaseController } from './base.controller';
import { IProductDocument } from '../models/product.model';
import { ProductService } from '../services/product.service';
import path from 'path';
import { Request, Response } from 'express';

export interface IProductController extends ProductController { }

export class ProductController extends BaseController<IProductDocument> implements IProductController {
  constructor() {
    super(new ProductService());
  }

  getVideo(req: Request, res: Response) {
    const { id } = req.params
    // Define the video file path
    const videoPath = path.join(__dirname, 'uploads', 'videos', id);

    // Check if the video file exists (optional)
    res.sendFile(videoPath, (err: any) => {
      if (err) {
        console.error('Error sending video:', err);
        res.status(404).send('Video not found');
      }
    })
  }
}
