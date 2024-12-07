import { BaseController } from './base.controller';
import { IProduct, IProductDocument, ProductModel } from '../models/product.model';
import { IProductService, ProductService } from '../services/product.service';
import path from 'path';
import { Request, Response } from 'express';
import QRCode, { QRCodeToDataURLOptions } from 'qrcode';
import sharp from 'sharp';
import fs from 'fs/promises';
import { FileService, IFileService } from '../services/file.service';
import { IFileDocument, isIFile } from '../models/file.model';
import { TypeAlias } from '../constants/alias.constant';


export interface IProductController extends BaseController<IProductDocument> {
  createProduct(req: Request, res: Response): any
}

export class ProductController extends BaseController<IProductDocument> implements IProductController {

  private fileService: IFileService

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
}
