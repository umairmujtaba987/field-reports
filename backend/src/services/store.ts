import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Report, ReportImage } from '../types';

export class Store {
  private dataDir: string;
  private filePath: string;
  private uploadsDir: string;
  private reports: Map<string, Report> = new Map();
  private clientIndex: Map<string, string> = new Map(); // clientReportId -> server report id

  constructor() {
    const baseDir = process.env.VERCEL ? '/tmp' : process.cwd();
    this.dataDir = path.resolve(baseDir, 'data');
    this.uploadsDir = path.resolve(baseDir, 'uploads');
    this.filePath = path.join(this.dataDir, 'reports.json');

    this.ensureDirs();
    this.load();
  }

  private ensureDirs() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const list: Report[] = JSON.parse(raw);
        for (const item of list) {
          this.reports.set(item.id, item);
          if (item.clientReportId) {
            this.clientIndex.set(item.clientReportId, item.id);
          }
        }
        console.log(`[STORE] Loaded ${this.reports.size} reports from disk.`);
      }
    } catch (err) {
      console.error('[STORE] Failed to load reports from disk, starting empty:', err);
    }
  }

  private persist() {
    try {
      this.ensureDirs();
      const list = Array.from(this.reports.values());
      fs.writeFileSync(this.filePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[STORE] Failed to persist reports:', err);
    }
  }

  public getAll(): Report[] {
    return Array.from(this.reports.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getById(id: string): Report | undefined {
    return this.reports.get(id);
  }

  public getByClientId(clientReportId: string): Report | undefined {
    const reportId = this.clientIndex.get(clientReportId);
    if (!reportId) return undefined;
    return this.reports.get(reportId);
  }

  public create(data: { clientReportId: string; description: string; images: ReportImage[] }): Report {
    const now = new Date().toISOString();
    const id = uuidv4();
    const report: Report = {
      id,
      clientReportId: data.clientReportId,
      description: data.description,
      images: data.images,
      createdAt: now,
      updatedAt: now,
    };

    this.reports.set(id, report);
    this.clientIndex.set(data.clientReportId, id);
    this.persist();
    return report;
  }

  public reset(): void {
    this.reports.clear();
    this.clientIndex.clear();
    this.persist();

    // Clean uploads directory
    try {
      if (fs.existsSync(this.uploadsDir)) {
        const files = fs.readdirSync(this.uploadsDir);
        for (const file of files) {
          try {
            fs.unlinkSync(path.join(this.uploadsDir, file));
          } catch (e) {
            // Ignore individual file unlink errors
          }
        }
      }
      console.log('[STORE] Reset complete: reports and uploaded files wiped.');
    } catch (err) {
      console.error('[STORE] Error cleaning uploads directory during reset:', err);
    }
  }
}

export const store = new Store();

