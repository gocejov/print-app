import { query } from 'express';
import mongoose, { Model, Document } from 'mongoose';


export interface IBaseService<T> {
  model: Model<T>;
  getAll(populate?: any | null): Promise<T[]>
  findById(id: string, populate?: any | null): Promise<T | null>
  add(data: Partial<T>): Promise<T>
  update(id: string, data: Partial<T>, populate?: any | null): Promise<T | null>
  remove(id: string, populate?: any | null): Promise<T | null>
}

export class BaseService<T extends Document> implements IBaseService<T> {
  model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  async getAll(populate = null): Promise<T[]> {
    let query = this.model.find();
    if (populate)
      query = query.populate(populate)
    return query
  }

  async findById(id: string, populate = null): Promise<T | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    console.error("populate", populate)
    let query = this.model.findById(id);;
    if (populate)
      query = query.populate(populate)
    return query
  }

  async add(data: Partial<T>): Promise<T> {
    const doc = new this.model(data);
    return doc.save();
  }

  async update(id: string, data: Partial<T>, populate = null): Promise<T | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    let query = this.model.findByIdAndUpdate(id, data, { new: true });
    if (populate) query = query.populate(populate)
    return query
  }

  async remove(id: string, populate = null): Promise<T | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    let query = this.model.findByIdAndDelete(id);
    if (populate) query = query.populate(populate)
    return query
  }
}
