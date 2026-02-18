import { BaseService, IBaseService } from './base.service';
import { IStatisticDocument, StatisticModel } from '../models/statistic.model';

export interface IStatisticService extends IBaseService<IStatisticDocument> {
  findStatisticByQrCode(qrCodeId: string): Promise<IStatisticDocument[]>
}

export class StatisticService extends BaseService<IStatisticDocument> implements IStatisticService {
  constructor() {
    super(StatisticModel);
  }

  async findStatisticByQrCode(qrCodeId: string): Promise<IStatisticDocument[]> {
    return this.model.find({
      qrCode: qrCodeId
    });
  }

}
