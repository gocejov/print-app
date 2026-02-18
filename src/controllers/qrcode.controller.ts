import { BaseController } from './base.controller';
import { IQrCode, IQrCodeDocument, QrCodeModel } from '../models/qrcode.model';
import { QrCodeService } from '../services/qrcode.service';
import { Request, Response } from 'express';
import { IProductService, ProductService } from '../services/product.service';
import { IFileService, FileService } from '../services/file.service';
import { IProduct, IProductDocument } from '../models/product.model';
import { TypeAlias } from '../constants/alias.constant';
import { IFile, IFileDocument, isIFile } from '../models/file.model';
import { IUserDocument } from '../models/user.model';
import path from 'path';
import QRCode, { QRCodeToDataURLOptions } from 'qrcode';
import sharp from 'sharp';
import fs from 'fs/promises';
import { IExtendedQueryOptions } from '../services/base.service';
import { error } from 'console';
import mongoose from 'mongoose';
import { StatisticService } from '../services/statistic.service';
import { IStatistic, StatisticModel } from '../models/statistic.model';

export interface IQrCodeController extends QrCodeController {
  getAllWithOptions(req: Request, res: Response): Promise<void>
  getQrCode(req: Request, res: Response): any
  getVideo(req: Request, res: Response): any
  playVideo(req: Request, res: Response): any
}

export class QrCodeController extends BaseController<IQrCodeDocument> implements IQrCodeController {
  private productService: IProductService
  private fileService: IFileService
  private qrCodeService: QrCodeService
  private statisticService: StatisticService
  constructor() {
    super(new QrCodeService());
    this.productService = new ProductService()
    this.statisticService = new StatisticService()
    this.fileService = new FileService()
    this.qrCodeService = this.service as QrCodeService
  }

  async add(req: Request, res: Response): Promise<void> {
    const { productId, userId } = req.body
    try {

      const queryOptions: IExtendedQueryOptions = { populate: [{ path: 'file' }, { path: 'owner' }] }
      const product = await this.productService.findById(productId, queryOptions)

      const file = product?.file
      const user = product?.owner as IUserDocument

      if (!isIFile(file) || !product || !user) {
        res.status(406).json({ error: "Incorrect input file" });
        return
      }

      const qrCodeData: IQrCode = {
        file: file.id,
        owner: userId,
        product: productId,
        createdBy: userId
      }

      const qrCode = await this.service.add(new QrCodeModel(qrCodeData));

      const alias = user.useAlias ? user.alias : 'q'
      const url = `${req.protocol}://${req.get('host')}/${alias}/${qrCode.id}`
      const qrCodeBase64Url: String | null = await this.qrCodeService.generateQrCodeBase64Url(url)

      if (!qrCodeBase64Url) {
        res.status(404).json({ error: "Can't generate qr code" });
        return
      }

      const updateCodeData = {
        qrCode: qrCodeBase64Url,
        url: url
      }

      const qrUpdateCode = await this.service.update(qrCode.id, updateCodeData);

      res.status(201).json(qrUpdateCode);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async getAllWithOptions(req: Request, res: Response): Promise<void> {

    try {

      const id = '6753972793a2442b1fa32'

      const $or = [
        { alias: 'qr-goce-code' },
        { _id: id }
      ]
      const pagination = {
        limit: 1,
        skip: 0
      }

      const options: IExtendedQueryOptions = {
        populate: ['owner', 'createdBy', 'file', 'product'],
        pagination
      }
      const alias = 'c'
      const queryOptions = mongoose.Types.ObjectId.isValid(id) ? { $or, ...options } : { alias, ...options }

      const qrcodes = await this.service.getAll(queryOptions)
      res.json(qrcodes)
    } catch (err) {
      res.status(500).json({ error: err })
    }
  }

  // Route to generate the QR code
  async getQrCode(req: Request, res: Response) {
    const { id } = req.params;

    try {


      if (!id) {
        return res.status(400).send('URL query parameter is required');
      }

      const $or = [
        { alias: 'qr-goce-code' },
        { _id: id }
      ]
      const pagination = {
        limit: 1,
        skip: 0
      }

      const options: IExtendedQueryOptions = {
        populate: ['owner', 'createdBy', 'file', 'product'],
        pagination
      }
      const alias = id
      const queryOptions = mongoose.Types.ObjectId.isValid(id) ? { $or, ...options } : { alias, ...options }

      const qrCodes = await this.service.getAll(queryOptions)
      const qrCode = qrCodes[0]
      if (!qrCode?.qrCode) {
        return res.status(400).send('QrCode not found');
      }
      const qrBase64Url = qrCode?.qrCode
      // Generate the QR code as a data URL (image)


      return res.send(`
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
      return res.status(500).json({ mesage: 'Error generating QR code', err });
    }
  }

  async getVideo(req: Request, res: Response) {
    const { type, qid } = req.params
    // Define the video file path

    ///:alias/:type/:pid

    const $or = [
      { alias: 'qr-goce-code' },
      { _id: qid }
    ]
    const pagination = {
      limit: 1,
      skip: 0
    }

    const options: IExtendedQueryOptions = {
      populate: ['owner', 'createdBy', 'file', 'product'],
      pagination
    }
    const alias = qid
    const queryOptions = mongoose.Types.ObjectId.isValid(qid) ? { $or, ...options } : { alias, ...options }

    const qrCodes = await this.service.getAll(queryOptions)

    const qrCode = qrCodes[0]

    const product = qrCode?.product as IProductDocument | null

    if (!product) {
      res.status(406).json({ error: "Incorrect url" });
      return
    }

    const f = product?.file

    const file = await this.fileService.findById(f as string)

    if (!file) {
      res.status(406).json({ error: "Incorrect url" });
      return
    }

    const typeKey = TypeAlias[file.type as string];

    if (!type || type !== typeKey) {
      res.status(406).json({ error: "Incorrect url" });
      return
    }

    if (file.type === 'web-url') {
      res.redirect(product.url as string);
      return;
    }

    const videoPath: string = product.url as string

    const fullVideoPath = path.resolve(videoPath);

    // Check if the video file exists (optional)
    res.sendFile(fullVideoPath, (err: any) => {
      if (err) {
        console.error('Error sending video:', err);
        res.status(404).send('Video not found');
      }
    })
  }

  async playVideo(req: Request, res: Response) {
    const { qid } = req.params

    const $or = [
      { alias: 'qr-goce-code' },
      { _id: qid }
    ]
    const pagination = {
      limit: 1,
      skip: 0
    }

    const options: IExtendedQueryOptions = {
      populate: ['owner', 'createdBy', 'file', 'product'],
      pagination
    }
    const alias = qid
    const queryOptions = mongoose.Types.ObjectId.isValid(qid) ? { $or, ...options } : { alias, ...options }

    const qrCodes = await this.service.getAll(queryOptions)

    const qrCode = qrCodes[0]

    const product = qrCode?.product as IProductDocument | null

    if (!product) {
      res.status(406).json({ error: "Incorrect url" });
      return
    }

    const f = product?.file
    const file = await this.fileService.findById(f as string)

    if (!file) {
      res.status(406).json({ error: "Incorrect url" });
      return
    }
    const { fingerprint, fingerprintData } = res.locals;

    const statistic: IStatistic = {
      qrCode: qrCode._id,
      data: { fingerprintData, fingerprint }
    }

    this.statisticService.add(statistic).catch((err) => {
      console.error("Error saving statistic:", err);
    });

    if (file.type === 'web-url') {
      res.redirect(product.url as string);
      return;
    }

    const type = TypeAlias[file.type as string];

    const videoPath = `${req.protocol}://${req.get('host')}/l/${alias}/${type}/${qid}`

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
