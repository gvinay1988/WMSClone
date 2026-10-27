import { FormControl } from '@angular/forms';
import { ProductRecord } from '../../../services/MasterDataService/product-master.service';

export interface ProductFormControls {
  id: FormControl<string>;
  name: FormControl<string>;
  product: FormControl<string>;
  description: FormControl<string>;
  category: FormControl<string>;
  hsnCode: FormControl<string>;
  category1: FormControl<string>;
  category2: FormControl<string>;
  category3: FormControl<string>;
  productImage: FormControl<string>;
}

export type ProductFormFieldKey = keyof ProductFormControls;
export type ProductTableFieldKey = keyof ProductRecord;

export interface ProductDropdownOption {
  label: string;
  value: string;
}

export interface ProductFormFieldConfig {
  key: ProductFormFieldKey;
  id: string;
  label: string;
  type: 'text' | 'select' | 'image';
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  errorText?: string;
  options?: ProductDropdownOption[];
}

export interface ProductTableColumnConfig {
  field: ProductTableFieldKey;
  label: string;
  type: 'text' | 'image';
  sortable?: boolean;
  headerClass?: string;
}

export const PRODUCT_CATEGORIES: ProductDropdownOption[] = [
  { label: 'Category A', value: 'a' },
  { label: 'Category B', value: 'b' },
  { label: 'Electronics', value: 'electronics' },
  { label: 'Office Supplies', value: 'office-supplies' },
  { label: 'Furniture', value: 'furniture' },
  { label: 'Consumables', value: 'consumables' },
  { label: 'Raw Materials', value: 'raw-materials' },
];

export const PRODUCT_DETAIL_FIELDS: ProductFormFieldConfig[] = [
  {
    key: 'id',
    id: 'productId',
    label: 'Product ID',
    type: 'text',
    placeholder: 'Product ID',
    required: true,
    maxLength: 100,
    errorText: 'Product ID is required.',
  },
  {
    key: 'name',
    id: 'productName',
    label: 'Product Name',
    type: 'text',
    placeholder: 'Product Name',
    required: true,
    maxLength: 255,
    errorText: 'Product name is required.',
  },
  {
    key: 'product',
    id: 'product',
    label: 'Product',
    type: 'text',
    placeholder: 'Product',
  },
  {
    key: 'description',
    id: 'description',
    label: 'Product Description',
    type: 'text',
    placeholder: 'Product Description',
  },
  {
    key: 'category',
    id: 'category',
    label: 'Category',
    type: 'select',
    placeholder: '--Select--',
    options: PRODUCT_CATEGORIES,
  },
  {
    key: 'hsnCode',
    id: 'hsnCode',
    label: 'HSN Code',
    type: 'text',
    placeholder: 'HSN Code',
  },
  {
    key: 'productImage',
    id: 'productImageFile',
    label: 'Product Image',
    type: 'image',
  },
];

export const PRODUCT_CATEGORY_FIELDS: ProductFormFieldConfig[] = [
  {
    key: 'category1',
    id: 'category1',
    label: 'Category 1',
    type: 'select',
    placeholder: '--Select--',
    options: PRODUCT_CATEGORIES,
  },
  {
    key: 'category2',
    id: 'category2',
    label: 'Category 2',
    type: 'select',
    placeholder: '--Select--',
    options: PRODUCT_CATEGORIES,
  },
  {
    key: 'category3',
    id: 'category3',
    label: 'Category 3',
    type: 'select',
    placeholder: '--Select--',
    options: PRODUCT_CATEGORIES,
  },
];

export const PRODUCT_TABLE_COLUMNS: ProductTableColumnConfig[] = [
  {
    field: 'id',
    label: 'Product ID',
    type: 'text',
    sortable: true,
    headerClass: 'product-id-header',
  },
  {
    field: 'name',
    label: 'Product Name',
    type: 'text',
    sortable: true,
    headerClass: 'product-name-header',
  },
  { field: 'productImage', label: 'Image', type: 'image', sortable: true },
  { field: 'product', label: 'Product', type: 'text', sortable: true },
  { field: 'description', label: 'Description', type: 'text', sortable: true },
  { field: 'category', label: 'Category', type: 'text', sortable: true },
  { field: 'hsnCode', label: 'HSN Code', type: 'text', sortable: true },
  { field: 'category1', label: 'Category 1', type: 'text', sortable: true },
  { field: 'category2', label: 'Category 2', type: 'text', sortable: true },
  { field: 'category3', label: 'Category 3', type: 'text', sortable: true },
];
