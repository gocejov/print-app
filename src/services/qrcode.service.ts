import { QrCodeModel, IQrCodeDocument } from '../models/qrcode.model';
import { BaseService, IBaseService } from './base.service';
import QRCode, { QRCodeToDataURLOptions } from 'qrcode';
import sharp from 'sharp';
import fs from 'fs/promises';
import { toInteger } from 'lodash';

export interface IQrCodeServie extends IBaseService<IQrCodeDocument> {
  findQrCodesByUserId(userId: string): Promise<IQrCodeDocument[]>
  generateQrCodeBase64Url(id: string, qrCodeOptions?: Object | null): Promise<String | null>
}

export class QrCodeService extends BaseService<IQrCodeDocument> implements IQrCodeServie {
  constructor() {
    super(QrCodeModel);
  }

  async findQrCodesByUserId(userId: string): Promise<IQrCodeDocument[]> {
    return this.model.find({
      createdBy: userId
    });
  }

  async generateQrCodeBase64Url(url: string, qrCodeOptions: Object | null = null): Promise<String | null> {

    // errorCorrectionLevel: 'L', // High error correction level (L, M, Q, H)
    // width: 500,               // Size in pixels
    const WIDTH = 2024
    const LOGO_WIDTH = Math.round((20 / 100) * WIDTH); // 20% of QR code width

    const options: Object = qrCodeOptions ? qrCodeOptions : { errorCorrectionLevel: 'Q', width: WIDTH, };

    try {
      const qrCodeDataBuffer: any = await QRCode.toBuffer(url, options);

      const logoPath = './uploads/images/qr2share-logo-circle.png';
      const logoBuffer = await fs.readFile(logoPath);

      const resizedLogoBuffer = await sharp(logoBuffer)
        .resize({
          width: LOGO_WIDTH,  // Adjust as needed (20% of QR size)
          height: LOGO_WIDTH, // Adjust to maintain aspect ratio
          fit: sharp.fit.inside,
        })
        .toBuffer();

      const qrWithLogoBuffer: Buffer = await sharp(qrCodeDataBuffer)
        .composite([
          {
            input: resizedLogoBuffer,
            gravity: 'center', // Center the logo on the QR code
          },
        ])
        .png()
        .toBuffer();

      // Step 4: Convert the Final QR Code to Base64
      return `data:image/png;base64,${qrWithLogoBuffer.toString('base64')}`;
    } catch (err) {
      console.error('Error generating QR code:', err);
      throw err
    }
  }

}

type EcLevel = "L" | "M" | "Q" | "H";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export class QrCodeServiceNew extends BaseService<IQrCodeDocument> {
  constructor() {
    super(QrCodeModel);
  }

  async findQrCodesByUserId(userId: string): Promise<IQrCodeDocument[]> {
    return this.model.find({
      createdBy: userId
    });
  }

  async generateQrCodeBase64Url(
    url: string,
    qrCodeOptions: QRCode.QRCodeToBufferOptions | null = null
  ): Promise<string> {
    // Prefer shorter content for low-density QR.
    // Ideally pass in a SHORT URL (your own redirect) instead of long URLs.

    const ecLevel: EcLevel = (qrCodeOptions?.errorCorrectionLevel as EcLevel) ?? "Q";

    const options: QRCode.QRCodeToBufferOptions = {
      errorCorrectionLevel: ecLevel,   // Q is a good balance for logo + readability
      margin: 6,                       // quiet zone
      scale: 18,                       // module pixel size (bigger = better distance)
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      // If you *know* you always have short urls, you can try forcing a low version:
      // version: 4,  // lower version = fewer modules, but may fail if url is long
      ...qrCodeOptions,
    };

    const qrCodeDataBuffer = await QRCode.toBuffer(url, options);

    const logoPath = "./uploads/images/qr2share-logo-circle.png";
    const logoBuffer = await fs.readFile(logoPath);

    // Compute logo size relative to QR size (keeps it scannable)
    const qrMeta = await sharp(qrCodeDataBuffer).metadata();
    const qrWidth = qrMeta.width ?? 800;
    const logoSize = clamp(Math.round(qrWidth * 0.14), 70, 160); // ~14% of QR width

    const resizedLogoBuffer = await sharp(logoBuffer)
      .resize({ width: logoSize, height: logoSize, fit: sharp.fit.inside })
      .png()
      .toBuffer();

    // Optional: add a white “plate” behind logo to improve contrast
    const platePadding = Math.round(logoSize * 0.18);
    const plateSize = logoSize + platePadding * 2;

    const plate = await sharp({
      create: {
        width: plateSize,
        height: plateSize,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const logoOnPlate = await sharp(plate)
      .composite([{ input: resizedLogoBuffer, gravity: "center" }])
      .png()
      .toBuffer();

    const qrWithLogoBuffer = await sharp(qrCodeDataBuffer)
      .composite([{ input: logoOnPlate, gravity: "center" }])
      .png()
      .toBuffer();

    return `data:image/png;base64,${qrWithLogoBuffer.toString("base64")}`;
  }
}

