export interface ValidationError {
  field: string;
  message: string;
}

export class ValidationException extends Error {
  constructor(public errors: ValidationError[]) {
    super('Validation failed');
    this.name = 'ValidationException';
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUsername(username: string): boolean {
  return username && username.length >= 3 && username.length <= 50;
}

export function validatePassword(password: string): boolean {
  return password && password.length >= 6;
}

export function validateSKU(sku: string): boolean {
  return sku && sku.length > 0 && sku.length <= 50;
}

export function validateBarcode(barcode: string): boolean {
  return barcode && barcode.length > 0;
}

export function validatePrice(price: number): boolean {
  return !isNaN(price) && price >= 0;
}

export function validateQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= 0;
}

export function validateProductInput(data: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.sku || !validateSKU(data.sku)) {
    errors.push({ field: 'sku', message: 'Invalid SKU' });
  }

  if (!data.barcode || !validateBarcode(data.barcode)) {
    errors.push({ field: 'barcode', message: 'Invalid barcode' });
  }

  if (!data.name || data.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Product name is required' });
  }

  if (!data.category || data.category.trim().length === 0) {
    errors.push({ field: 'category', message: 'Category is required' });
  }

  if (!validatePrice(data.purchase_price_per_unit)) {
    errors.push({
      field: 'purchase_price_per_unit',
      message: 'Invalid purchase price',
    });
  }

  if (!validatePrice(data.sale_price_per_unit)) {
    errors.push({
      field: 'sale_price_per_unit',
      message: 'Invalid sale price',
    });
  }

  if (!validateQuantity(data.quantity_available)) {
    errors.push({
      field: 'quantity_available',
      message: 'Invalid quantity',
    });
  }

  return errors;
}

export function validateLoginInput(data: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.username || !validateUsername(data.username)) {
    errors.push({ field: 'username', message: 'Invalid username' });
  }

  if (!data.password || !validatePassword(data.password)) {
    errors.push({ field: 'password', message: 'Invalid password' });
  }

  return errors;
}

export function validateSaleInput(data: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!Array.isArray(data.items) || data.items.length === 0) {
    errors.push({ field: 'items', message: 'At least one item required' });
  }

  for (const item of data.items || []) {
    if (!item.product_id || item.product_id <= 0) {
      errors.push({
        field: 'items',
        message: 'Invalid product in cart',
      });
    }

    if (!validateQuantity(item.quantity)) {
      errors.push({
        field: 'items',
        message: 'Invalid quantity in cart',
      });
    }

    if (!validatePrice(item.unit_price)) {
      errors.push({
        field: 'items',
        message: 'Invalid price in cart',
      });
    }
  }

  if (!validatePrice(data.total_amount) || data.total_amount < 0) {
    errors.push({
      field: 'total_amount',
      message: 'Invalid total amount',
    });
  }

  return errors;
}
