
export class Constants {
  roles: any[] = [
    { roleName: 'ROLE_SUPER_ADMIN' },
    { roleName: 'ROLE_ADMIN' },
    { roleName: 'ROLE_CLIENT' },
    { roleName: 'ROLE_USER' }
  ];

  countries: any[] = [
    { name: 'India' },
    { name: 'United States' },
    { name: 'United Kingdom' },
    { name: 'Australia' }
  ];

  static GEN_INNER_OBJS = {
    PRODUCT: 'product',
    CATEGORY: 'category',
    WAREHOUSE: 'warehouse',
    UNIT: 'unit'
  };

  static PRODUCT_INNER_OBJS: Record<string, { parent: string; child: string }> = {
    category: { parent: 'categoryInfo', child: 'category' },
    baseUnit: { parent: 'baseUnitInfo', child: 'baseUnit' },
    purchaseUnit: { parent: 'purchaseUnitInfo', child: 'purchaseUnit' },
    salesUnit: { parent: 'salesUnitInfo', child: 'salesUnit' },
    warehouse: { parent: 'warehouseInfo', child: 'warehouse' }
  };
  static UPLOAD_MANDAT_FIELDS: Record<string, string[]> = {
  PRODUCT: [
    'name',
    'productType',
    'category',
    'baseUnit'
  ],
  CATEGORY: ['categoryName'],
  WAREHOUSE: ['wareHouseName'],
  UNIT: ['unitName']
}
}