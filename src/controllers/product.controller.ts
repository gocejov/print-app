import { BaseController } from './base.controller';
import { IProduct, IProductDocument } from '../models/product.model';
import { ProductService } from '../services/product.service';
import path from 'path';
import { Request, Response } from 'express';
import QRCode, { QRCodeToDataURLOptions } from 'qrcode';
import sharp from 'sharp';
import fs from 'fs/promises';


export interface IProductController extends ProductController { }

export class ProductController extends BaseController<IProductDocument> implements IProductController {
  constructor() {
    super(new ProductService());
  }

  async getVideo(req: Request, res: Response) {
    const { id } = req.params
    // Define the video file path

    const product: IProduct | null = await this.service.findById(id)
    if (!product) {
      res.status(404).send('Product not found');
      return
    }
    const videoPath: string = product.url
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
    const videoPath = `https://turl.world/p/v/${id}`;

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

  // Route to generate the QR code
  async getQrCode(req: Request, res: Response) {
    const { id } = req.params; // Get the URL from query parameter (e.g., ?url=https://example.com)

    if (!id) {
      res.status(400).send('URL query parameter is required');
      return
    }

    const url = `https://turl.world/api/products/play-video/${id}`

    const options: any = {
      errorCorrectionLevel: 'L', // High error correction level (L, M, Q, H)
      width: 500,               // Size in pixels
    };

    // Generate the QR code as a data URL (image)

    try {
      const qrCodeDataURL = await QRCode.toDataURL(url, options);
      const qrCodeDataBuffer: any = await QRCode.toBuffer(url, options);

      const logoPath = './uploads/images/qr2share-logo-no-slogan-border.png'; // Replace with your logo file path
      const logoBuffer = await fs.readFile(logoPath);

      const resizedLogoBuffer = await sharp(logoBuffer)
        .resize({
          width: 100,  // Adjust as needed (20% of QR size)
          height: 100, // Adjust to maintain aspect ratio
          fit: sharp.fit.inside,
        })
        .toBuffer();

      const qrWithLogoBuffer: Buffer = await sharp(qrCodeDataBuffer)
        .composite([
          {
            input: resizedLogoBuffer,
            gravity: 'center', // Center the logo on the QR code
          },
        ])
        .png()
        .toBuffer();

      // Step 4: Convert the Final QR Code to Base64
      const qrBase64Url = `data:image/png;base64,${qrWithLogoBuffer.toString('base64')}`;


      res.send(`
        <html>
          <head>
          <style>
            body {
              margin: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              background-color: #f0f0f0; /* Light background for better visibility */
            }
            .qr-code {
              max-width: 100%;  /* Scale to fit horizontally with some margin */
              max-height: 100%; /* Scale to fit vertically with some margin */
              //border: 2px solid #333; /* Optional border for better visibility */
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Optional shadow for aesthetics */
            }
          </style>
          </head>
          <body>
            <img class="qr-code" src="${qrBase64Url}" alt="QR Code" style="max-width: 100%; height: auto;" />
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
