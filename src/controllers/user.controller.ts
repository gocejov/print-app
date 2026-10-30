import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { IUserDocument, UserModel } from '../models/user.model';
import { UserService } from '../services/user.service';
import { emailInput, HttpError, objectBody, passwordInput, text } from '../utils/http.utils';
import { verifyPassword } from '../utils/password.utils';

export interface IUserController extends UserController {}

export class UserController extends BaseController<IUserDocument> {
  constructor() { super(new UserService()); }

  private async establishSession(req: Request, user: IUserDocument) {
    await new Promise<void>((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
    req.session.userId = String(user._id);
    req.session.authVersion = user.authVersion || 0;
    await new Promise<void>((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
  }

  async add(req: Request, res: Response): Promise<void> {
    const body = objectBody(req.body, ['name', 'lastName', 'email', 'password']);
    const user = await UserModel.create({
      name: text(body.name, 'name'), lastName: text(body.lastName, 'lastName'),
      email: emailInput(body.email), password: passwordInput(body.password)
    });
    await this.establishSession(req, user);
    res.status(201).json(user);
  }

  async login(req: Request, res: Response): Promise<void> {
    const body = objectBody(req.body, ['email', 'password']);
    const email = emailInput(body.email);
    if (typeof body.password !== 'string' || !body.password.length || body.password.length > 128) throw new HttpError(400, 'Invalid password');
    const user = await UserModel.findOne({ email }).select('+password');
    if (!user || !await verifyPassword(body.password, user.password)) throw new HttpError(401, 'Invalid email or password');
    await this.establishSession(req, user);
    res.json(user);
  }

  async logout(req: Request, res: Response): Promise<void> {
    await new Promise<void>((resolve, reject) => req.session.destroy(err => err ? reject(err) : resolve()));
    res.clearCookie('connect.sid', { path: '/' });
    res.status(204).end();
  }

  async update(req: Request, res: Response): Promise<void> {
    const body = objectBody(req.body, ['name', 'lastName', 'email', 'password', 'currentPassword', 'alias', 'useAlias']);
    const user = await UserModel.findById(res.locals.user._id).select('+password');
    if (!user) throw new HttpError(404, 'User not found');
    if (body.email !== undefined || body.password !== undefined) {
      if (typeof body.currentPassword !== 'string' || !await verifyPassword(body.currentPassword, user.password)) throw new HttpError(403, 'Current password is required');
    }
    for (const field of ['name', 'lastName'] as const) if (body[field] !== undefined) user[field] = text(body[field], field);
    if (body.email !== undefined) user.email = emailInput(body.email);
    if (body.alias !== undefined) {
      const alias = text(body.alias, 'alias', 1, 40);
      if (!/^[a-zA-Z0-9_-]+$/.test(alias) || ['api', 'api-docs', 'l', 'crud', 'admin', 'games'].includes(alias)) throw new HttpError(400, 'Invalid alias');
      user.alias = alias;
    }
    if (body.useAlias !== undefined) {
      if (typeof body.useAlias !== 'boolean') throw new HttpError(400, 'Invalid useAlias');
      user.useAlias = body.useAlias;
    }
    if (body.password !== undefined) {
      user.password = passwordInput(body.password);
      user.authVersion = (user.authVersion || 0) + 1;
    }
    await user.save();
    if (body.password !== undefined) await this.establishSession(req, user);
    res.json(user);
  }
}
