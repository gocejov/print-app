import { BaseController } from './base.controller';
import { IQrCode, IQrCodeDocument, QrCodeModel } from '../models/qrcode.model';
import { QrCodeService } from '../services/qrcode.service';
import { Request, Response } from 'express';
import { IProductService, ProductService } from '../services/product.service';
import { IProduct } from '../models/product.model';
import { TypeAlias } from '../constants/alias.constant';
import { IFile, IFileDocument, isIFile } from '../models/file.model';

export interface IQrCodeController extends QrCodeController { }

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

      const populate = { path: 'file' }
      const product = await this.productService.findById(productId, populate)

      const file = product?.file

      if (!isIFile(file) || !product) {
        res.status(406).json({ error: "Incorrect input file" });
        return
      }

      const type = TypeAlias[file.type as string];

      if (!type) {
        res.status(406).json({ error: "Incorrect input type" });
        return
      }

      const url = `${req.protocol}://${req.get('host')}/${product.alias}/${type}/${productId}`

      const qrCodeBase64Url: String | null = await this.qrCodeService.generateQrCodeBase64Url(url)

      if (!qrCodeBase64Url) {
        res.status(500).json({ error: "Can't generate qr code" });
        return
      }

      const qrCodeData: IQrCode = {
        qrCode: qrCodeBase64Url,
        file: file.id,
        url: url,
        alias: product.alias,
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
}
