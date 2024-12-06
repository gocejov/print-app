import { BaseService, IBaseService } from './base.service';
import { IUserDocument } from '../models/user.model';
import { UserModel } from '../models/user.model';

export interface IUserService extends IBaseService<IUserDocument> { }

export class UserService extends BaseService<IUserDocument> {
  constructor() {
    super(UserModel);
  }
}
