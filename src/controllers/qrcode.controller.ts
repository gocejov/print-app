import { BaseController } from './base.controller';
import { IQrCode, IQrCodeDocument, QrCodeModel } from '../models/qrcode.model';
import { QrCodeService } from '../services/qrcode.service';
import { Request, Response } from 'express';
import { IProductService, ProductService } from '../services/product.service';
import { IProduct } from '../models/product.model';
import { TypeAlias } from '../constants/alias.constant';
import { IFile, IFileDocument, isIFile } from '../models/file.model';
import { IUserDocument } from '@/models/user.model';

export interface IQrCodeController extends QrCodeController {
  getQrCode(req: Request, res: Response): any
}

export class QrCodeController extends BaseController<IQrCodeDocument> implements IQrCodeController {
  private productService: IProductService
  private qrCodeService: QrCodeService
  constructor() {
    super(new QrCodeService());
    this.productService = new ProductService()
    this.qrCodeService = this.service as QrCodeService
  }

  async add(req: Request, res: Response): Promise<void> {
    const { productId, userId } = req.body
    try {

      const populate = [{ path: 'file' }, { path: 'owner' }]
      const product = await this.productService.findById(productId, populate)

      const file = product?.file
      const user = product?.owner as IUserDocument

      if (!isIFile(file) || !product || !user) {
        res.status(406).json({ error: "Incorrect input file" });
        return
      }

      const alias = user.useAlias ? user.alias : 'q'

      const url = `${req.protocol}://${req.get('host')}/${alias}/${productId}`

      const qrCodeBase64Url: String | null = await this.qrCodeService.generateQrCodeBase64Url(url)

      if (!qrCodeBase64Url) {
        res.status(500).json({ error: "Can't generate qr code" });
        return
      }

      const qrCodeData: IQrCode = {
        qrCode: qrCodeBase64Url,
        file: file.id,
        url: url,
        owner: userId,
        product: productId,
        createdBy: userId
      }

      const qrCode = await this.service.add(new QrCodeModel(qrCodeData));
      res.status(201).json(qrCode);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Route to generate the QR code
  async getQrCode(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      res.status(400).send('URL query parameter is required');
      return
    }

    const qrCode = await this.service.findById(id)
    if (!qrCode?.qrCode) {
      res.status(400).send('QrCode not found');
      return
    }
    const qrBase64Url = qrCode?.qrCode
    // Generate the QR code as a data URL (image)

    try {
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
  }
}
