import { FileModel, IFileDocument } from '../models/file.model';
import { BaseService, IBaseService } from './base.service';

export interface IFileServie extends IBaseService<IFileDocument> {
  findFilesByUserId(userId: string): Promise<IFileDocument[]>
}

export class FileService extends BaseService<IFileDocument> implements IFileServie {
  constructor() {
    super(FileModel);
  }

  async findFilesByUserId(userId: string): Promise<IFileDocument[]> {
    return this.model.find({
      createdBy: userId
    });
  }

}
