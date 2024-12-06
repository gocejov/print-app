import { BaseController } from './base.controller';
import { IProductDocument } from '../models/product.model';
import { ProductService } from '../services/product.service';
import path from 'path';
import { Request, Response } from 'express';
import QRCode from 'qrcode';

export interface IProductController extends ProductController { }

export class ProductController extends BaseController<IProductDocument> implements IProductController {
  constructor() {
    super(new ProductService());
  }

  getVideo(req: Request, res: Response) {
    const { id } = req.params
    // Define the video file path
    const videoPath = path.resolve('uploads', 'videos', id);

    // Check if the video file exists (optional)
    res.sendFile(videoPath, (err: any) => {
      if (err) {
        console.error('Error sending video:', err);
        res.status(404).send('Video not found');
      }
    })
  }


  playVideo(req: Request, res: Response) {
    const { id } = req.params
    // Define the video file path
    const videoPath = `https://turl.world/api/products/videos/${id}`;

    // Check if the video file exists (optional)
    res.send(`
      <video controls>
        <source src="${videoPath}" type="video/mp4">
        Your browser does not support the video tag.
      </video>
      `)
  }

  // Route to generate the QR code
  async getQrCode(req: Request, res: Response) {
    const { id } = req.params; // Get the URL from query parameter (e.g., ?url=https://example.com)

    if (!id) {
      res.status(400).send('URL query parameter is required');
      return
    }

    const url = `https://turl.world/api/products/play-video/${id}`

    // Generate the QR code as a data URL (image)
    try {
      const qrCodeDataURL = await QRCode.toDataURL(url);
      res.send(`
        <html>
          <body>
            <img src="${qrCodeDataURL}" alt="QR Code" />
          </body>
        </html>
      `);
    }
    catch (err) {
      console.error('Error generating QR code:', err);
      res.status(500).send('Error generating QR code');
    }

    // Send the QR code image as a response

  }
}
