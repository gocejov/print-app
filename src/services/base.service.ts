import { query } from 'express';
import mongoose, { Model, Document } from 'mongoose';
import { QueryOptions as MongooseQueryOptions } from "mongoose";


export interface IBaseService<T> {
  model: Model<T>;
  getAll(options?: IExtendedQueryOptions): Promise<T[]>
  findById(id: string, options?: IExtendedQueryOptions): Promise<T | null>
  add(data: Partial<T>): Promise<T>
  update(id: string, data: Partial<T>, options?: IExtendedQueryOptions): Promise<T | null>
  remove(id: string, options?: IExtendedQueryOptions): Promise<T | null>
}

export interface IPagination {
  limit: number;
  skip: number;
};

export interface IExtendedQueryOptions extends MongooseQueryOptions {
  populate?: any,
  aggregate?: any,
  pagination?: IPagination,
  sort?: any,
  select?: any
}

export class BaseService<T extends Document> implements IBaseService<T> {
  model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  async getAll(options?: IExtendedQueryOptions): Promise<T[]> {

    const { populate, aggregate, pagination, sort, select, ...queryOptions } = options || {};

    if (aggregate) {
      let query: any = this.model.aggregate(aggregate);

      if (populate) {
        const result = await query;
        query = this.model.populate(result, populate);
      }

      return query;
    }

    let query: any = this.model.find(queryOptions);

    if (pagination) {
      query = query.skip(pagination.skip).limit(pagination.limit);
    }

    if (select) {
      query = query.select(select);
    }

    if (sort) query = query.populate(sort)

    if (populate) query = query.populate(populate)

    return query;
  }

  async findById(id: string, options?: IExtendedQueryOptions): Promise<T | null> {

    const { populate, select, ...queryOptions } = options || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    let query: any = this.model.findById(id);

    if (select) {
      query = query.select(select);
    }

    if (populate) query = query.populate(populate)

    return query

  }

  async add(data: Partial<T>, options?: IExtendedQueryOptions): Promise<T> {

    const { populate, select, ...queryOptions } = options || {};

    const doc = new this.model(data);

    let query: any = doc.save();

    if (select) {
      query = query.select(select);
    }

    if (populate) query = query.populate(populate)

    return query

  }

  async update(id: string, data: Partial<T>, options?: IExtendedQueryOptions): Promise<T | null> {

    const { populate, select, ...queryOptions } = options || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    let query: any = this.model.findByIdAndUpdate(id, data, { new: true });

    if (select) {
      query = query.select(select);
    }

    if (populate) query = query.populate(populate)

    return query
  }

  async remove(id: string, options?: IExtendedQueryOptions): Promise<T | null> {

    const { populate, select, ...queryOptions } = options || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    let query: any = this.model.findByIdAndDelete(id);

    if (select) {
      query = query.select(select);
    }

    if (populate) query = query.populate(populate)

    return query
  }
}



/**
 * 
 * 
 * Example of using pagination, population search and agregation
 * 
 * const aggregationOptions: ExtendedQueryOptions = {
    $or: [
        { name: 'John Doe' },
        { email: 'john@example.com' }
    ],
    status: 'active',  // Adding AND condition in aggregation pipeline
    aggregate: [
        {
            $match: {
                $or: [
                    { name: 'John Doe' },
                    { email: 'john@example.com' }
                ],
                status: 'active'  // Adding AND condition in aggregation pipeline
            }
        },
        {
            $lookup: {
                from: 'profiles',
                localField: 'profileId',
                foreignField: '_id',
                as: 'profile'
            }
        },
        {
            $unwind: '$profile'
        },
        {
            $skip: 0,  // Pagination (skip 0 items)
            $limit: 10 // Pagination (limit 10 items)
        }
    ],
    populate: 'profile.address', // Populate address field from profile
    pagination: {
        limit: 10,
        skip: 0
    }
};

 */
