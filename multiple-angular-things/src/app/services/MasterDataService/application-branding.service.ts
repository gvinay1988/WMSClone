import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ParameterService } from './parameter-service';

export interface ApplicationBranding {
  dashboardText: string;
  headerImage: string | null;
}

interface ApplicationBrandingResponse {
  statusCode: number;
  statusMsg: string;
  applicationBrandingData: ApplicationBranding;
}

@Injectable({
  providedIn: 'root',
})
export class ApplicationBrandingService {
  private readonly brandingSubject = new BehaviorSubject<ApplicationBranding>({
    dashboardText: '',
    headerImage: null,
  });

  readonly branding$ = this.brandingSubject.asObservable();
  private loaded = false;
  private loading = false;

  constructor(
    private readonly parameterService: ParameterService,
    private readonly toastr: ToastrService
  ) {}

  load(): void {
    if (this.loaded || this.loading) {
      return;
    }

    this.loading = true;
    this.parameterService.getApplicationBranding().subscribe({
      next: (response: ApplicationBrandingResponse) => {
        if (response.statusCode === 200) {
          this.brandingSubject.next(response.applicationBrandingData);
          this.loaded = true;
        } else {
          this.toastr.error(response.statusMsg || 'Could not load application branding.');
        }
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        this.toastr.error(error?.error?.statusMsg || 'Could not load application branding.');
      },
    });
  }

  save(settings: ApplicationBranding): Observable<ApplicationBrandingResponse> {
    return this.parameterService.saveApplicationBranding(settings).pipe(
      tap((response: ApplicationBrandingResponse) => {
        if (response.statusCode === 200) {
          this.brandingSubject.next(settings);
          this.loaded = true;
        }
      })
    );
  }
}
