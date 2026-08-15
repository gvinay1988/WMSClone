import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-supplier-master',
  standalone: true,
   imports: [
    ReactiveFormsModule,
    TableModule
  ],
  templateUrl: './supplier-master.html',
  styleUrl: './supplier-master.scss',
})
export class SupplierMaster {

   supplierForm!:FormGroup;


  constructor(private fb: FormBuilder) {
  }

    ngOnInit() {
      this.createSupplierForm();
    }


  createSupplierForm(){
    this.supplierForm = this.fb.group({
  supplierCode: [''],
  supplierName: [''],
  supplierType: [''],
  contactPerson: [''],
  email: [''],
  phone: [''],
  mobile: [''],
  gstNumber: [''],
  panNumber: [''],
  address: [''],
  city: [''],
  pinCode: ['']
});
  }
  saveSupplier() {
    if (this.supplierForm.valid) {
      const supplierData = this.supplierForm.value;
      console.log('Supplier Data:', supplierData);
      // Perform further actions, such as sending the data to a server
    } else {
      console.log('Form is invalid');
    }




}
clearSupplier() {
  this.supplierForm.reset();
}
}
