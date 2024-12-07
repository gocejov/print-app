import { query } from 'express';
import mongoose, { Model, Document } from 'mongoose';
import { QueryOptions as MongooseQueryOptions } from "mongoose";


export interface IBaseService<T> {
  model: Model<T>;
  getAll(options?: ExtendedQueryOptions): Promise<T[]>
  findById(id: string, options?: ExtendedQueryOptions): Promise<T | null>
  add(data: Partial<T>): Promise<T>
  update(id: string, data: Partial<T>, options?: ExtendedQueryOptions): Promise<T | null>
  remove(id: string, options?: ExtendedQueryOptions): Promise<T | null>
}

export interface ExtendedQueryOptions extends MongooseQueryOptions {
  populate?: any
}

export class BaseService<T extends Document> implements IBaseService<T> {
  model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  async getAll(options?: ExtendedQueryOptions): Promise<T[]> {

    const { populate, ...queryOptions } = options || {};

    let query = this.model.find(queryOptions)
    if (populate)
      query = query.populate(populate)
    return query
  }

  async findById(id: string, options?: ExtendedQueryOptions): Promise<T | null> {

    const { populate } = options || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    let query = this.model.findById(id);;
    if (populate)
      query = query.populate(populate)
    return query
  }

  async add(data: Partial<T>): Promise<T> {
    const doc = new this.model(data);
    return doc.save();
  }

  async update(id: string, data: Partial<T>, options?: ExtendedQueryOptions): Promise<T | null> {

    const { populate } = options || {}

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    let query = this.model.findByIdAndUpdate(id, data, { new: true });
    if (populate) query = query.populate(populate)
    return query
  }

  async remove(id: string, options?: ExtendedQueryOptions): Promise<T | null> {

    const { populate } = options || {}

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    let query = this.model.findByIdAndDelete(id);
    if (populate) query = query.populate(populate)
    return query
  }
}
