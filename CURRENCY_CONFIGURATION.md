# POS System - Currency Configuration

## Current Configuration: Pakistani Rupee (PKR)

### **Currency Symbol: Rs.**

All prices throughout the Walmart POS system are displayed in Pakistani Rupee (PKR) using the standard notation **Rs.**

### **Price Display Locations**

1. **Inventory Management Page**
   - Purchase Price per Unit: `Rs. XXXX.XX`
   - Sale Price per Unit: `Rs. XXXX.XX`

2. **POS Sales Screen**
   - Unit Price: `Rs. XXXX.XX`
   - Subtotal: `Rs. XXXX.XX`
   - Tax (10%): `Rs. XXXX.XX`
   - **Final Total: `Rs. XXXX.XX`**
   - Checkout Button: `CHECKOUT (Rs. XXXX.XX)`

3. **Reports & Analytics**
   - All financial reports displayed in Rs.

4. **Audit Logs**
   - Historical price records in Rs.

### **Regional Configuration**
- **Country**: Pakistan 🇵🇰
- **Currency Code**: PKR
- **Symbol**: Rs.
- **Decimal Places**: 2 (Standard for currency)

### **Key Financial Features**
- ✅ Purchase Price Enforcement
- ✅ 20% Minimum Markup Rule (Enforced in PKR)
- ✅ Sales Tax Calculation (10% default)
- ✅ Real-time Price Tracking
- ✅ Multi-user Price Verification

### **Example Pricing Structure**

```
Purchase Price:        Rs. 1,000.00
Minimum Sale Price:    Rs. 1,200.00 (20% markup)
Example Sale Price:    Rs. 1,500.00
Tax (10%):            Rs. 150.00
Final Customer Total: Rs. 1,650.00
```

### **How to Modify Currency (Future)**

If you need to change the currency in the future:

1. **Update Frontend Files:**
   - Search for `Rs.` in all `.tsx` files
   - Replace with desired currency symbol

2. **Update Format Function:**
   - All prices use `.toFixed(2)` for consistent decimal formatting
   - This ensures proper display regardless of currency

3. **Files with Price Display:**
   - `src/frontend/pages/Inventory.tsx` - Inventory management
   - `src/frontend/pages/POS.tsx` - Point of Sale screen
   - `src/frontend/pages/Reports.tsx` - Financial reports
   - `src/frontend/pages/Backup.tsx` - Backup data

### **Currency Formatting**

All prices follow this format:
```javascript
`Rs. ${amount.toFixed(2)}`
// Example: Rs. 1,234.50
```

### **Compliance Notes**

- ✅ Pakistani Rupee standard notation
- ✅ Consistent formatting across application
- ✅ Proper decimal handling (2 places)
- ✅ Easy to modify for other currencies
- ✅ Audit trail captures prices in PKR

---

**Developed by Ahsan** ❤️  
*Enterprise POS System for Pakistan*
