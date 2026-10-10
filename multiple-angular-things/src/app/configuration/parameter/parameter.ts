import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TagInputModule } from 'ngx-chips';

import { CommonmoduleimportModule } from '../../commonSharedService/commonmoduleimport/commonmoduleimport-module';
import { ParameterService } from '../../services/MasterDataService/parameter-service';
import { ToastrService } from 'ngx-toastr';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DeleteServiceAPI } from '../../services/DeleteService/delete-service-api';

@Component({
  selector: 'app-parameter',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CommonmoduleimportModule,
    TagInputModule
  ],providers: [ConfirmationService, MessageService],
  templateUrl: './parameter.html',
  styleUrl: './parameter.scss'
})
export class Parameter implements OnInit {

  @Input() title = 'Parameters';
  @Input() collapsed = false;

  countryList: any[] = [];

  constructor(
    private parameterService: ParameterService,
    private deleteService :DeleteServiceAPI,
    private confirmationService: ConfirmationService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.findAllCountryList();
  }

  togglePanel(): void {
    this.collapsed = !this.collapsed;
  }

  saveParameter(event: any, typeName: string): void {
    switch (typeName) {
      case 'country':
        this.parameterService.saveCountryParameterData({countryName: event.countryName})
          .subscribe({next: (response: any) => {
            if (response && response.statusCode === 200) {
              this.toastr.success(response.statusMsg);
                this.findAllCountryList();
              }
            },
            error: (error: any) => {
              console.log('Save error:', error);
            }
          });
        break;
    }
  }

  findAllCountryList(): void {
    this.parameterService.findALLCountryList().subscribe({
        next: (response: any) => {
          if (response &&  response.statusCode === 200 ) {
            this.countryList = response.countryParameterData;
            this.cdr.detectChanges();
          }
        },
        error: (error: any) => {
        }
      });
  }
  
deleteInfo = false;
selectedCountry: any = null;

openDeletePopup(item: any, typeName: string): void {
  this.selectedCountry = item;
  this.deleteInfo = true;
}
deleteCountry(): void {
  if (!this.selectedCountry) {
    return;
  }
  const payload = {
    id: this.selectedCountry.id
  };
  console.log('Delete payload:', payload);
  this.deleteService.deleteCountryData(payload).subscribe({
    next: (response: any) => {
      console.log('Delete response:', response);
      if (response && response.statusCode === 200) {
        this.toastr.success(response.statusMsg);
        this.findAllCountryList();
        this.deleteInfo = false;
        this.selectedCountry = null;
      }
    },
    error: (error: any) => {
      console.error('Delete API error:', error);
      console.error('HTTP status:', error.status);
      console.error('Response body:', error.error);
    }
  });
}
}