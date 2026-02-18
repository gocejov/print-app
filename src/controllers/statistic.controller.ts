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
import { IExtendedQueryOptions } from '../services/base.service';
import { ParsedQs } from 'qs';
import { IStatisticDocument } from '../models/statistic.model';
import { StatisticService, IStatisticService } from '../services/statistic.service';


export interface IStatisticController extends BaseController<IStatisticDocument> {
  getAllWithOptions(req: Request, res: Response): Promise<void>
  findStatisticByQrCode(req: Request, res: Response): Promise<void>
  findTotalStatisticByQrCode(req: Request, res: Response): Promise<void>
}

export class StatisticController extends BaseController<IStatisticDocument> implements IStatisticController {
  private statisticService: IStatisticService
  constructor() {
    super(new StatisticService());
    this.statisticService = this.service as IStatisticService
  }

  async getAllWithOptions(req: Request, res: Response): Promise<void> {
    const statistic = await this.service.getAll()
    res.json(statistic);
  }

  async findStatisticByQrCode(req: Request, res: Response): Promise<void> {
    const { qid } = req.params
    const statistics: IStatisticDocument[] = await this.statisticService.findStatisticByQrCode(qid)
    res.json({ count: statistics.length, statistics: statistics });
  }

  async findTotalStatisticByQrCode(req: Request, res: Response): Promise<void> {
    const { qid } = req.params
    const statistics: IStatisticDocument[] = await this.statisticService.findStatisticByQrCode(qid)
    res.json({ count: statistics.length });
  }
}
