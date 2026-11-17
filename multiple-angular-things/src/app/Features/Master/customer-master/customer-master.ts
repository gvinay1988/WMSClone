
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { CommonmoduleimportModule } from '../../../commonSharedService/commonmoduleimport/commonmoduleimport-module';
import { CustomerMasterService } from '../../../services/MasterDataService/customer-master-service';
import { Component, ChangeDetectorRef } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TabsModule } from 'primeng/tabs';

interface CustomerAddress {
  city?: string | null;
  town?: string | null;
  district?: string | null;
  state?: string | null;
  postalCode?: string | null;
  landmark?: string | null;
  nearbyAddress?: string | null;
}

interface CustomerRecord {
  customerId?: string | null;
  customerName?: string | null;
  customerIdName?: string | null;
  customerType?: string | null;
  addresses?: CustomerAddress[] | null;
}

@Component({
  selector: 'app-customer-master',
  standalone: true,
 imports: [CommonmoduleimportModule, ButtonModule, ConfirmDialogModule, TabsModule],
  providers: [ConfirmationService],
  templateUrl: './customer-master.html',
  styleUrl: './customer-master.scss',
})
export class CustomerMaster {
  customerForm!: FormGroup;
  customerList: CustomerRecord[] = [];
  addressRows = 5;
  customerRows = 10;
  customerSearchText = '';

constructor(
  private formbuilder: FormBuilder,
  private customerService: CustomerMasterService,
  private cdr: ChangeDetectorRef
) {}

  ngOnInit() {
    this.createCustomerForm();
    this.fetchAllCustomers();
  }
 createCustomerForm() {
  this.customerForm = this.formbuilder.group({
    customerId: [''],
    customerName: [''],
    customerIdName: [''],
    customerType: [''],
    addresses: this.formbuilder.array([
      this.addAddress()
    ]),
  });
}
  addAddress() {
   return this.formbuilder.group({
      city: [''],
      town: [''],
      district: [''],
      state: [''],
      postalCode: [''],
      landmark: [''],
      nearbyAddress: [''],
    })
  }
 addCustomerAddress() {
   this.addressesArray.push(this.addAddress());
  }

  get addressesArray() {
    return this.customerForm.get('addresses') as FormArray;
  }
  confirmDelete(customer: CustomerRecord) {
    if (customer.customerId) {
      this.customerService.deleteCustomer(customer.customerId).subscribe(
        (response) => {
          console.log('Customer deleted successfully:', response);
          this.fetchAllCustomers();
        },
        (error) => {
          console.error('Error deleting customer:', error);
        }
      );
    }
  }
clearForm() {
  this.customerForm.reset();
  this.addressesArray.clear();
  this.addressesArray.push(this.addAddress());
}
  saveCustomer() {
    if (this.customerForm.valid) {
      const customerData = this.customerForm.value;
      console.log('Customer Data:', customerData);
    } else {
      console.log('Form is invalid');
    }
    this.customerService.saveCustomerMaster(this.customerForm.value).subscribe(
      (response) => {
        console.log('Customer saved successfully:', response);
      },
      (error) => {
        console.error('Error saving customer:', error);
      }
    );
    
  }
fetchAllCustomers() {
  this.customerService.findAllCustomer().subscribe(
    (response) => {
      if (response.statusCode === 200 && response.customers) {
        this.customerList = [...response.customers];

        this.cdr.detectChanges();

        console.log('Fetched customers:', this.customerList);
      }
    },
    (error) => {
      console.error('Error fetching customers:', error);
    }
  );
}
get filteredCustomers(): CustomerRecord[] {
  const search = this.customerSearchText.trim().toLowerCase();
  if (!search) {
    return this.customerList;
  }

  return this.customerList.filter(customer =>
    [
      customer.customerId,
      customer.customerName,
      customer.customerIdName,
      customer.customerType,
      ...(customer.addresses || []).flatMap(address => [
        address.city,
        address.town,
        address.district,
        address.state,
        address.postalCode,
        address.landmark,
        address.nearbyAddress,
      ]),
    ].some(value => String(value ?? '').toLowerCase().includes(search))
  );
}

edit(customer: CustomerRecord) {
  this.customerForm.patchValue({
    customerId: customer.customerId,
    customerName: customer.customerName,
    customerIdName: customer.customerIdName,
    customerType: customer.customerType,
  });
  const addressesArray = this.customerForm.get('addresses') as FormArray;
  addressesArray.clear();
  if (customer.addresses && customer.addresses.length > 0) {
    customer.addresses.forEach((address: any) => {
      addressesArray.push(this.formbuilder.group({
        city: address.city,
        town: address.town,
        district: address.district,
        state: address.state,
        postalCode: address.postalCode,
        landmark: address.landmark,
        nearbyAddress: address.nearbyAddress,
      }));
    })
  }
}
}