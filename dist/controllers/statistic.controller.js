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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticController = void 0;
const base_controller_1 = require("./base.controller");
const statistic_service_1 = require("../services/statistic.service");
class StatisticController extends base_controller_1.BaseController {
    constructor() {
        super(new statistic_service_1.StatisticService());
        this.statisticService = this.service;
    }
    getAllWithOptions(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const statistic = yield this.service.getAll(res.locals.scope);
            res.json(statistic);
        });
    }
    findStatisticByQrCode(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { qid } = req.params;
            const statistics = yield this.statisticService.findStatisticByQrCode(qid);
            res.json({ count: statistics.length, statistics: statistics });
        });
    }
    findTotalStatisticByQrCode(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { qid } = req.params;
            const count = yield this.statisticService.countByQrCode(qid);
            res.send({ count });
        });
    }
}
exports.StatisticController = StatisticController;
