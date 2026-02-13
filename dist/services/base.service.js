"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
;
class BaseService {
    constructor(model) {
        this.model = model;
    }
    getAll(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const _a = options || {}, { populate, aggregate, pagination, sort, select } = _a, queryOptions = __rest(_a, ["populate", "aggregate", "pagination", "sort", "select"]);
            if (aggregate) {
                let query = this.model.aggregate(aggregate);
                if (populate) {
                    const result = yield query;
                    query = this.model.populate(result, populate);
                }
                return query;
            }
            let query = this.model.find(queryOptions);
            if (pagination) {
                query = query.skip(pagination.skip).limit(pagination.limit);
            }
            if (select) {
                query = query.select(select);
            }
            if (sort)
                query = query.populate(sort);
            if (populate)
                query = query.populate(populate);
            return query;
        });
    }
    findById(id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const _a = options || {}, { populate, select } = _a, queryOptions = __rest(_a, ["populate", "select"]);
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                return null;
            }
            let query = this.model.findById(id);
            if (select) {
                query = query.select(select);
            }
            if (populate)
                query = query.populate(populate);
            return query;
        });
    }
    add(data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const _a = options || {}, { populate, select } = _a, queryOptions = __rest(_a, ["populate", "select"]);
            const doc = new this.model(data);
            let query = doc.save();
            // if (select) {
            //   query = query.select(select);
            // }
            // if (populate) query = query.populate(populate)
            return query;
        });
    }
    update(id, data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const _a = options || {}, { populate, select } = _a, queryOptions = __rest(_a, ["populate", "select"]);
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                return null;
            }
            let query = this.model.findByIdAndUpdate(id, data, { new: true });
            // if (select) {
            //   query = query.select(select);
            // }
            // if (populate) query = query.populate(populate)
            return query;
        });
    }
    remove(id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const _a = options || {}, { populate, select } = _a, queryOptions = __rest(_a, ["populate", "select"]);
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                return null;
            }
            let query = this.model.findByIdAndDelete(id);
            // if (select) {
            //   query = query.select(select);
            // }
            // if (populate) query = query.populate(populate)
            return query;
        });
    }
}
exports.BaseService = BaseService;
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
