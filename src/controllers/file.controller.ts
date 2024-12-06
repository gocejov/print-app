import { BaseController } from './base.controller';
import { IFileDocument } from '../models/file.model';
import { FileService } from '../services/file.service';

export interface IFileController extends FileController { }

export class FileController extends BaseController<IFileDocument> implements IFileController {
  constructor() {
    super(new FileService());
  }
}
