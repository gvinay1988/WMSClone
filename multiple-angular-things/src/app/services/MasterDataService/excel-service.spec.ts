import { ExcelService } from './excel-service';
import * as XLSX from 'xlsx';

describe('ExcelService', () => {
  let service: ExcelService;

  beforeEach(() => {
    service = new ExcelService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('formats rows for Excel and removes excluded fields', () => {
    const rows = service.formatJSON(
      [{ id: 'state-1', stateName: 'Ontario', createdDate: 1789603200000 }],
      ['id']
    );

    expect(rows[0]['id']).toBeUndefined();
    expect(rows[0]['stateName']).toBe('Ontario');
    expect(rows[0]['createdDate'] instanceof Date).toBeTrue();
  });

  it('reads workbook rows and publishes them through jsonData', async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet([
      { 'State Code': 'ON', 'State Name': 'Ontario', Country: 'Canada', Capital: 'Toronto' },
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'States');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const file = new File([buffer], 'states.xlsx');
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });

    let emittedRows: any[] = [];
    const subscription = service.jsonData.subscribe(rows => {
      emittedRows = rows;
    });
    const importPromise = new Promise<any[]>(resolve => {
      input.addEventListener('change', event => {
        resolve(service.generateJsonUsingExcel(event));
      }, { once: true });
    });
    input.dispatchEvent(new Event('change'));
    const importedRows = await importPromise;
    subscription.unsubscribe();

    expect(importedRows).toEqual([
      { 'State Code': 'ON', 'State Name': 'Ontario', Country: 'Canada', Capital: 'Toronto' },
    ]);
    expect(emittedRows).toEqual(importedRows);
  });

  it('converts Excel serial dates to UTC calendar dates', () => {
    expect(service.excelCellToDateMillis('46282')).toBe(Date.UTC(2026, 8, 17));
  });
});
