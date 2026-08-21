import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../Environment/environment';
import { HttpReq } from '../../Entities/app.entity';
import { Storage } from '../../Utils/Storage';
 
@Injectable({
    providedIn: 'root'
})
export class HttpService {
    private CONTENT_APPLICATION_URLENCODED = 'application/x-www-form-urlencoded';
    private CONTENT_APPLICATION_JSON = 'application/json';
    API_ENDPOINT = environment.apiUrl;
    constructor(private http: HttpClient) { }
    
    postMethod(httpReq: HttpReq): Observable<any> {
  const url = environment.apiUrl + (httpReq.url || '');
  let headers: HttpHeaders | undefined;
  if (httpReq.contentType === 'multipart/form-data') {
    headers = new HttpHeaders({
      'Authorization': `Bearer ${this.getAccessToken()}`
    });
  } else if (httpReq.contentType === 'formEncoded') {
    headers = new HttpHeaders({
      'Authorization': `Bearer ${this.getAccessToken()}`,
      'Content-Type': this.CONTENT_APPLICATION_URLENCODED
    });

  } else {
    headers = new HttpHeaders({
      'Authorization': `Bearer ${this.getAccessToken()}`,
      'Content-Type': this.CONTENT_APPLICATION_JSON
    });
  }
  console.log('Access Token:', this.getAccessToken());
  console.log('Request URL:', url);
  
  return this.http.post(url,httpReq.body,{ headers }).pipe(map((response: any) => {
      return response;
    }),
    catchError((error) => {
      console.error('POST Error:', error);
      return throwError(() => error);
    })

  );
}
    restCall(httpReq: HttpReq): Observable<any> {
        if (httpReq.showLoader === true) {
            // this.showLoader(true);
        }
        return this.restService(httpReq);
    }

    restService(httpReq: HttpReq): Observable<any> {
        if (httpReq.type === 'POST') {
            return this.postMethod(httpReq);
        }
        if (httpReq.type === 'GET') {
            return this.getMethod(httpReq);
        }
        return throwError(() =>
            new Error(`Unsupported HTTP method: ${httpReq.type}`)
        );
    }

    getMethod(httpReq: HttpReq): Observable<any> {
        const url = environment.apiUrl + (httpReq.url || '');
        return this.http.get(
            url,
            {
                headers: this.getHeaders(httpReq)
            }
        ).pipe(
            map((resp: any) => {
                if (httpReq.showLoader === true) {
                    // this.showLoader(false);
                }
                return resp;
            }),
            catchError((error) => {
                if (httpReq.showLoader === true) {
                    // this.showLoader(false);
                }
                return throwError(() => error);
            })
        );
    }

    private getHeaders(httpReq: HttpReq): HttpHeaders | undefined {
        if (httpReq.contentType === 'multipart/form-data') {
            return new HttpHeaders({
                'Authorization': `Bearer ${this.getAccessToken()}`
            });
        }
        if (httpReq.contentType === 'formEncoded') {
            return new HttpHeaders({
                'Authorization': `Bearer ${this.getAccessToken()}`,
                'Content-Type': this.CONTENT_APPLICATION_URLENCODED
            });
        }
        return new HttpHeaders({
            'Authorization': `Bearer ${this.getAccessToken()}`,
            'Content-Type': this.CONTENT_APPLICATION_JSON
        });
    }

  getAccessToken(): string | null {
  return sessionStorage.getItem('jwt_token');
}
}