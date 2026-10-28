import { Component } from '@angular/core';
import { CommonmoduleimportModule } from '../../../commonSharedService/commonmoduleimport/commonmoduleimport-module';

@Component({
  selector: 'app-vehicle-by-transporter',
  standalone: true,
  imports: [CommonmoduleimportModule],
  templateUrl: './vehicle-by-transporter.html',
  styleUrl: './vehicle-by-transporter.scss',
})
export class VehicleByTransporter {}
