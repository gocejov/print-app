import { BaseController } from './base.controller';
import { IUser, IUserDocument } from '../models/user.model';
import { UserService } from '../services/user.service';
import { QueryOptions } from 'mongoose';
import { Request, Response } from 'express';

export interface IUserController extends UserController {
  login(): any
}

export class UserController extends BaseController<IUserDocument> implements IUserController {
  constructor() {
    super(new UserService());
  }

  login() {
    throw new Error('Method not implemented.');
  }
}
