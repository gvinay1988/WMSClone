import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';

const EXCEL_EXTENSION = '.xlsx';

@Injectable({

  providedIn: 'root'

})

export class ExcelService {

  private readonly jsonEvent = new BehaviorSubject<any[]>([]);

  jsonData = this.jsonEvent.asObservable();

  data: any[] = [];

  completeCountList: any;

  partialAvailbleList: any;

  UnAvailableList: any;

  public async exportAsExcelFile(
    json: any[],
    excelFileName: string,
    fieldsToDelete: string[] = [],
    forTotals?: any,
    newArrayList: any[] = [],
    columnsToHideByName: string[] = []
  ): Promise<void> {

    const data = await this.formatJSON(json, fieldsToDelete);

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);

    if (forTotals && excelFileName == 'Third Party Space Utilization') {

      XLSX.utils.sheet_add_json(worksheet, [

        { A: 'Total', B: '', C: forTotals.totalIn, D: forTotals.totalOut, E: forTotals.totalOpeningBalance, F: forTotals.totalOccupied, G: '' }

      ], { header: ["A", "B", "C", "D", "E", "F", "G"], skipHeader: true, origin: -1 });

    }

    if (forTotals && excelFileName == 'Shipment History Reports') {

      XLSX.utils.sheet_add_json(worksheet, [

        { A: 'Total', F: forTotals.totalProductWiseQty }

      ], { header: ["A", "B", "C", "D", "E", "F", "G"], skipHeader: true, origin: -1 });

    }

    if (forTotals && excelFileName == 'Shipment-Report') {

      XLSX.utils.sheet_add_json(worksheet, [

        { A: 'Total', I: forTotals.totalDispatchQuantity , J: forTotals.totalQuantity }

      ], { header: ["A", "B", "C", "D", "E", "F", "G" ,"H", "I", "J"], skipHeader: true, origin: -1 });

    }

    if (forTotals && excelFileName == 'Grn-History-Report') {

      XLSX.utils.sheet_add_json(worksheet, [

        { A: 'Total', B: forTotals.totalProductWiseQty }

      ], { header: ["A", "B", "C", "D", "E", "F", "G"], skipHeader: true, origin: -1 });

    }

    if (forTotals && excelFileName == 'Space Utilization Reports') {

      const countByStatus = (status: string): number =>
        Number(newArrayList.find(item => item.locationSpaceStatus === status)?.locationsCount ?? 0);
      this.completeCountList = countByStatus('Completely Available');
      this.partialAvailbleList = countByStatus('Partially Available');
      this.UnAvailableList = countByStatus('UnAvailable');
      const value = this.completeCountList + this.partialAvailbleList + this.UnAvailableList;



      XLSX.utils.sheet_add_json(worksheet, [

        { A: 'Completely Availble', B: this.completeCountList },

        { A: 'Partial Availble', B: this.partialAvailbleList },

        { A: 'Not Availble', B: this.UnAvailableList },



        { A: 'Total Count', B: value },

      ], { header: ["A", "B", "C", "D", "E", "F", "G"], skipHeader: true, origin: -1 });







      XLSX.utils.sheet_add_json(worksheet, [

        { A: 'Total Space', B: forTotals.totalSpace },

        { A: 'Total Usuable Space', B: forTotals.usableSpace }



      ], { header: ["A", "B", "C", "D", "E", "F", "G"], skipHeader: true, origin: -1 });



    }

    if (columnsToHideByName && columnsToHideByName.length > 0) {

      const headers = Object.keys(json[0] || {});

      worksheet['!cols'] = headers.map((colName) =>

        columnsToHideByName.includes(colName)

          ? { hidden: true }

          : { wch: 15 }

      );

    }

    const workbook: XLSX.WorkBook = { Sheets: { data: worksheet }, SheetNames: ['data'] };

    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    this.saveAsExcelFile(excelBuffer, excelFileName);

  }

  /**

   * A sheet written row by row. For templates the JSON export cannot express: a column name used

   * twice (header and line Expected Delivery Date), or a banner row whose cells are merged.

   * merges are zero-based { s: { r, c }, e: { r, c } } ranges.

   */

  exportAsAoaExcelFile(rows: any[][], excelFileName: string, merges?: XLSX.Range[]): void {

    const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(rows);

    if (merges && merges.length) { worksheet['!merges'] = merges; }

    const width = rows.length ? Math.max(...rows.map(row => row.length)) : 0;

    worksheet['!cols'] = Array.from({ length: width }, () => ({ wch: 20 }));

    const workbook: XLSX.WorkBook = { Sheets: { data: worksheet }, SheetNames: ['data'] };

    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    this.saveAsExcelFile(excelBuffer, excelFileName);

  }



  /** The distinct, non-blank values of a list, in first-seen order. */

  distinctValues(values: any[]): string[] {

    const seen: string[] = [];

    (values || []).forEach(value => {

      const text = (value === null || value === undefined) ? '' : String(value).trim();

      if (text && seen.indexOf(text) === -1) { seen.push(text); }

    });

    return seen;

  }



  private saveAsExcelFile(buffer: ArrayBuffer | Uint8Array, fileName: string): void {

    const blobBuffer = buffer instanceof ArrayBuffer ? buffer : Uint8Array.from(buffer).buffer;
    const data: Blob = new Blob([blobBuffer], {

      type: EXCEL_TYPE

    });

    saveAs(data, fileName + '-' + new Date().getTime() + EXCEL_EXTENSION);

  }

  formatJSON(data: any[], fieldsToDelete: string[] = []): Record<string, any>[] {

    const formatedData: Record<string, any>[] = [];

    const fieldsToDate = ['poExpiryDate', 'createdOn', 'createdDate', 'loginTime', 'logoutTime',

      'poDeliveryDate', 'receiptDate', 'eta', 'customClearanceTime', 'mfgDate', 'expiryDate', 'grnDate',

      'contractStartDate', 'contractEndDate'];

    if (Array.isArray(data)) {

      data.forEach(object => {

        const a: any = {};

        for (const key of Object.keys(object)) {
          if (fieldsToDate.includes(key)) {
            const dateValue = object[key];
            const parsedDate = dateValue instanceof Date
              ? dateValue
              : new Date(typeof dateValue === 'number' || /^\d+$/.test(String(dateValue))
                ? Number(dateValue)
                : String(dateValue));
            a[key] = dateValue && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;
          } else if (Array.isArray(object[key])) {
            a[key] = object[key];
          } else if (object[key] instanceof Object) {
            Object.assign(a, object[key]);
          } else {
            const b: Record<string, any> = {};

            b[key] = object[key];

            Object.assign(a, b);

          }

        }

        if (fieldsToDelete) {

          fieldsToDelete.forEach(field => {

            if (field === 'productCategoryName') {

              a['productCategory'] = a[field];

            }

            if (Object.prototype.hasOwnProperty.call(a, field)) {

              delete a[field];

            }

          });

        }

        formatedData.push(a);

      });

    }

    return formatedData;

  }

  async generateJsonUsingExcel(event: Event, inv = false): Promise<any[]> {
    const input = event.target;
    const file = input instanceof HTMLInputElement ? input.files?.[0] : null;
    if (!file) {
      this.setJsonData([]);
      return [];
    }

    const workbook = XLSX.read(await file.arrayBuffer(), {
      type: 'array',
      cellDates: inv,
    });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('The selected workbook does not contain a worksheet.');
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      raw: true,
      defval: null,
    });
    this.setJsonData(jsonData);
    return jsonData;
  }

  /*

   * Date and time cells of an uploaded sheet. The sheets are read without cellDates, so a cell

   * formatted as a date arrives as Excel's day serial (46282 = 17-09-2026, the fraction being the

   * time of day); a cell typed as text arrives as the text; a value exported by the screens

   * arrives as epoch milliseconds. All of them are read here.

   */

  private static readonly EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);



  /** The calendar parts of a date cell - null when it is blank or not a real date. */

  private excelDateParts(value: any): { y: number; m: number; d: number; hh: number; mi: number; ss: number } | null {

    if (value === null || value === undefined || String(value).trim() === '') { return null; }

    const valid = (
      y: number,
      m: number,
      d: number,
      hh = 0,
      mi = 0,
      ss = 0
    ): { y: number; m: number; d: number; hh: number; mi: number; ss: number } | null => {

      const check = new Date(Date.UTC(y, m - 1, d));

      if (isNaN(check.getTime()) || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d

        || hh > 23 || mi > 59 || ss > 59) { return null; }

      return { y, m, d, hh, mi, ss };

    };

    if (value instanceof Date) {

      if (isNaN(value.getTime())) { return null; }

      return valid(value.getFullYear(), value.getMonth() + 1, value.getDate(),

        value.getHours(), value.getMinutes(), value.getSeconds());

    }

    const text = String(value).trim();

    if (/^-?\d+(\.\d+)?$/.test(text)) {

      const numeric = Number(text);

      // Epoch milliseconds are 12+ digits; an Excel serial for any real date is well under that.

      const date = numeric > 100000000000

        ? new Date(numeric)

        : new Date(ExcelService.EXCEL_EPOCH_UTC + Math.round(numeric * 86400) * 1000);

      if (numeric > 100000000000) {

        return valid(date.getFullYear(), date.getMonth() + 1, date.getDate(),

          date.getHours(), date.getMinutes(), date.getSeconds());

      }

      return valid(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(),

        date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());

    }

    const time = (rest: string): [number, number, number] => {

      const t = (rest || '').match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);

      if (!t) { return [0, 0, 0]; }

      let hh = Number(t[1]);

      if (t[4]) { hh = (hh % 12) + (t[4].toLowerCase() === 'pm' ? 12 : 0); }

      return [hh, Number(t[2]), t[3] ? Number(t[3]) : 0];

    };

    let match = text.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(.*)$/);

    if (match) {

      const [hh, mi, ss] = time(match[4]);

      return valid(Number(match[1]), Number(match[2]), Number(match[3]), hh, mi, ss);

    }

    match = text.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})(.*)$/);

    if (match) {

      const [hh, mi, ss] = time(match[4]);

      return valid(Number(match[3]), Number(match[2]), Number(match[1]), hh, mi, ss);

    }

    return null;

  }



  /** A date cell as epoch milliseconds of that day (UTC midnight), or null. */

  excelCellToDateMillis(value: any): number | null {

    const parts = this.excelDateParts(value);

    return parts ? Date.UTC(parts.y, parts.m - 1, parts.d) : null;

  }



  /**

   * A date-and-time cell as an ISO string - 2026-09-20T21:31:00.000Z - or null. A value that

   * already is an instant (a Date, epoch milliseconds from a downloaded sheet) keeps that

   * instant; a time typed or formatted in the sheet is local wall-clock time, read the way the

   * screens' own date-time inputs read it.

   */

  excelCellToIsoDateTime(value: any): string | null {

    if (value instanceof Date) { return isNaN(value.getTime()) ? null : value.toISOString(); }

    if (value !== null && value !== undefined && /^\d+$/.test(String(value).trim())
      && Number(value) > 100000000000) {
      const date = new Date(Number(value));
      return isNaN(date.getTime()) ? null : date.toISOString();

    }

    const parts = this.excelDateParts(value);

    return parts ? new Date(parts.y, parts.m - 1, parts.d, parts.hh, parts.mi, parts.ss).toISOString() : null;

  }



  /** A stored date-time as the local yyyy-MM-dd HH:mm an exported sheet shows, or null. */

  dateTimeToExcelText(value: any): string | null {

    const iso = this.excelCellToIsoDateTime(value);

    if (!iso) { return null; }

    const d = new Date(iso);

    const pad = (n: number) => ('0' + n).slice(-2);

    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())

      + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());

  }



  /** A stored date as the yyyy-MM-dd an exported sheet shows, or null. */

  dateToExcelText(value: any): string | null {

    const millis = this.excelCellToDateMillis(value);

    return millis === null ? null : new Date(millis).toISOString().slice(0, 10);

  }



  setJsonData(jsonData: any[]): void {
    this.data = jsonData;
    this.jsonEvent.next(jsonData);
  }
  getJsonData(): any[] {
    return this.data;
  }

  generateInnerObjs(data: any[], keysToCreate: Record<string, { parent: string; child: string }>): any[] {

    data.forEach(obj => {

      /*  Object.keys(obj).forEach((el, i) => {

         obj[el] = typeof (obj[el]) === 'string' ? obj[el].trim() : obj[el];

       }); */

      Object.keys(keysToCreate).forEach(key => {

        if (Object.keys(obj).includes(key)) {

          obj[keysToCreate[key].parent] = { [keysToCreate[key].child]: obj[key] };

        }

      });

    });

    return data;

  }

  generateInnerProdutObjs(data: any[], keysToCreate: Record<string, { parent: string; child: string }>): any[] {

    data.forEach(obj => {

      /*  Object.keys(obj).forEach((el, i) => {

         obj[el] = typeof (obj[el]) === 'string' ? obj[el].trim() : obj[el];

       }); */

      Object.keys(keysToCreate).forEach(key => {

        if (Object.keys(obj).includes(key)) {

          obj[keysToCreate[key].parent] = { [keysToCreate[key].child]: obj[key] };

        }

      });

    });

    return data;

  }

  deleteUnRequiredParams(a: any[], fieldsToDelete: string[]): any[] {

    if (fieldsToDelete) {

      a.forEach(b => {

        fieldsToDelete.forEach((field: string) => {

          if (Object.prototype.hasOwnProperty.call(b, field)) {

            delete b[field];

          }

        });

      })

      return a;
    }
    return a;
  }

  formatHeaderLine(data: any[], lineArrayName: string): any[] {

    const formattedArray: any[] = [];



    data.forEach(obj => {



      if (obj[lineArrayName] && obj[lineArrayName].length > 0) {



        obj[lineArrayName].forEach((line: any) => {



          const {

            receiptDate,

            termsOfPayment,

            ...filteredLine

          } = line;



          const {

            [lineArrayName]: lines,

            ...header

          } = obj;



          formattedArray.push({

            ...header,

            ...filteredLine

          });



        });



      }



    });



    return formattedArray;

  }

  formatJSONForHeaderLines(data: any[], ...linesArrayNames: string[]): any[] {

    const filteredHeaderArray: Record<string, any>[] = [];



    data.forEach(obj => {

      const b: Record<string, any> = {};



      for (let key in obj) {



        // Remove all passed line arrays from header

        if (!linesArrayNames.includes(key)) {

          b[key] = obj[key];

        }





        if (key == '_id' && linesArrayNames.includes('wareHouseTransferLines')) {

          b['headerId'] = obj._id;

        }



        if (key == '_id' && linesArrayNames.includes('vehicleLines')) {

          b['id'] = obj._id;

        }





        if (key == 'supplierID' && linesArrayNames.includes('productMasterInfos')) {
          const supplier = obj['supplierID'] || {};
          b['finishedSupplierID'] = {
            finishedSupplierID: supplier['supplierID'] ?? '',
            finishedSupplierName: supplier['supplierName'] ?? ''
          };

          delete b['supplierID'];

        }





        if (key == 'productID' && linesArrayNames.includes('customerMasterInfos')) {
          const product = obj['productID'] || {};
          b['finishedProductID'] = {
            finishedProductID: product['productID'] ?? '',
            finishedProductName: product['productName'] ?? ''

          };

          delete b['productID'];

        }





        if (key == 'pickingStrategyName' && linesArrayNames.includes('zoneInfos')) {

          b['finishedPickingStrategyName'] = obj['pickingStrategyName'];

          delete b['pickingStrategyName'];

        }





        if (key == 'putawayStrategyName' && linesArrayNames.includes('zoneInfos')) {

          b['finishedPutawayStrategyName'] = obj['putawayStrategyName'];

          delete b['putawayStrategyName'];

        }





        if (key == 'customerID' && linesArrayNames.includes('productMasterInfos')) {

          b['finishedCustomerID'] = obj['customerID'];

          delete b['customerID'];

        }





        if (key == 'name' && linesArrayNames.includes('products')) {

          b['finishedName'] = obj['name'];

          delete b['name'];

        }





        if (key == 'wareHouseID' && linesArrayNames.includes('allAddresses')) {

          b['finishedwareHouseID'] = obj['wareHouseID'];

          delete b['wareHouseID'];

        }





        if (key == 'supplierID' && linesArrayNames.includes('allAddresses')) {

          b['finishedSupplierID'] = obj['supplierID'];

          delete b['supplierID'];

        }





        if (key == 'customerID' && linesArrayNames.includes('allAddresses')) {

          b['finishedCustomerID'] = obj['customerID'];

          delete b['customerID'];

        }



      }



      filteredHeaderArray.push(b);

    });







    // Keep your existing second header push logic

    data.forEach(obj => {



      const b: Record<string, any> = {};



      for (let key in obj) {



        if (!linesArrayNames.includes(key)) {

          b[key] = obj[key];

        }





        if (key === 'termsOfPayment') {

          b[key] = obj[key];

        }



      }



      filteredHeaderArray.push(b);



    });







    const formattedArray: any[] = [];





    data.forEach((obj, index) => {





      linesArrayNames.forEach(lineArrayName => {





        if (

          obj[lineArrayName] &&

          obj[lineArrayName].length > 0

        ) {





          obj[lineArrayName].forEach((line: any, j: number) => {





            if (j === 0) {



              const {

                receiptDate,

                termsOfPayment,

                ...filteredLine

              } = line;





              formattedArray.push({

                ...filteredHeaderArray[index],

                ...filteredLine

              });





            } else {





              formattedArray.push({

                ...line

              });





            }





          });





        }





      });





    });





    return formattedArray;



  }

  downloadGlobalFiles(res: string, file: string): void {

    var arr = res,

      mime = 'data',

      bstr = atob(arr),

      n = bstr.length,

      u8arr = new Uint8Array(n);

    while (n--) {

      u8arr[n] = bstr.charCodeAt(n);

    }

    const data = new File([u8arr], file, { type: mime })

    saveAs(data, file);



  }

  dataURLtoFile(dataurl: string, filename: string): File {

    const arr = dataurl.split(',');
    const mimeMatch = arr[0]?.match(/:(.*?);/);
    if (!mimeMatch || arr.length < 2) {
      throw new Error('Invalid data URL');
    }

    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {

      u8arr[n] = bstr.charCodeAt(n);

    }

    return new File([u8arr], filename, { type: mimeMatch[1] });

  }

}
