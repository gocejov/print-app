import { BaseController } from './base.controller';
import { IProduct, IProductDocument, ProductModel } from '../models/product.model';
import { IProductService, ProductService } from '../services/product.service';
import path from 'path';
import { Request, Response } from 'express';
import QRCode, { QRCodeToDataURLOptions } from 'qrcode';
import sharp from 'sharp';
import fs from 'fs/promises';
import { FileService, IFileServie } from '../services/file.service';
import { IFileDocument, isIFile } from '../models/file.model';
import { TypeAlias } from '../constants/alias.constant';


export interface IProductController extends BaseController<IProductDocument> {
  createProduct(req: Request, res: Response): any
  getVideo(req: Request, res: Response): any
  playVideo(req: Request, res: Response): any
}

export class ProductController extends BaseController<IProductDocument> implements IProductController {

  private fileService: IFileServie

  constructor() {
    super(new ProductService());
    this.fileService = new FileService()
  }

  async createProduct(req: Request, res: Response) {
    const { userId, fileId } = req.body

    try {
      const file: IFileDocument | null = await this.fileService.findById(fileId)

      if (!file) {
        res.status(404).json({ message: 'File not found' });
        return
      }

      const productData: IProduct = {
        qrcode: 'qrcode',
        file: file.id,
        url: file.path,
        owner: userId,
        createdBy: userId,
        created_at: new Date(),
        updated_at: new Date(),
      }

      const product = await this.service.add(new ProductModel(productData))
      res.status(200).json({ message: 'Product created successfully', product: product });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async getVideo(req: Request, res: Response) {
    const { alias, type, pid } = req.params
    // Define the video file path

    ///:alias/:type/:pid


    const populate = { path: 'file' }
    const product = await this.service.findById(pid, populate)

    const file = product?.file

    if (!isIFile(file) || !product) {
      res.status(406).json({ error: "Incorrect url" });
      return
    }

    const typeKey = TypeAlias[file.type as string];

    if (!type || type !== typeKey) {
      res.status(406).json({ error: "Incorrect url" });
      return
    }

    const videoPath: string = product.url as string

    const fullVideoPath = path.resolve(videoPath);

    console.error("fullVideoPath", fullVideoPath)

    // Check if the video file exists (optional)
    res.sendFile(fullVideoPath, (err: any) => {
      if (err) {
        console.error('Error sending video:', err);
        res.status(404).send('Video not found');
      }
    })
  }

  async playVideo(req: Request, res: Response) {
    const { alias, pid } = req.params

    const populate = { path: 'file' }
    const product = await this.service.findById(pid, populate)

    const file = product?.file

    if (!isIFile(file) || !product) {
      res.status(406).json({ error: "Incorrect url" });
      return
    }

    const type = TypeAlias[file.type as string];

    const videoPath = `${req.protocol}://${req.get('host')}/l/${alias}/${type}/${pid}`

    // Check if the video file exists (optional)
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Video Stream</title>
        <style>
          body {
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f0f0f0; /* Light background for better visibility */
          }

          video {
            height: 100vh; /* Full height of the viewport */
            width: auto;    /* Adjust width to maintain aspect ratio */
            border: none;   /* Optional: Remove border */
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Optional shadow for aesthetics */
          }
        </style>
      </head>
      <body>
        <video controls>
          <source src="${videoPath}" type="video/mp4">
          Your browser does not support the video tag.
        </video>
      </body>
      </html>

      `)
  }
}
