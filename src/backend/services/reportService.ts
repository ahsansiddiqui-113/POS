import { getDatabase } from '../database/db';
import { salesService } from './salesService';
import { purchaseService } from './purchaseService';
import { returnsService } from './returnsService';
import { productService } from './productService';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';

export interface ReportData {
  title: string;
  generatedAt: string;
  startDate: string;
  endDate: string;
  data: any;
}

export class ReportService {
  private db = getDatabase();

  // Get daily sales data with detailed transaction info
  getDailySalesReport(startDate: string, endDate: string): any {
    const transactions = this.db
      .prepare(`
        SELECT
          s.id as sale_id,
          s.sale_date,
          s.payment_method,
          s.total_amount,
          u.username as user_name,
          p.name as product_name,
          si.quantity,
          si.unit_price,
          si.discount_percentage,
          si.discounted_price
        FROM sales s
        JOIN users u ON s.user_id = u.id
        JOIN sale_items si ON s.id = si.sale_id
        JOIN products p ON si.product_id = p.id
        WHERE DATE(s.sale_date) BETWEEN ? AND ?
        ORDER BY s.sale_date DESC
      `)
      .all(startDate, endDate) as any[];

    return transactions;
  }

  // Get monthly sales summary
  getMonthlySalesReport(year: string): any {
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    return months.map((month) => {
      const monthStr = String(month).padStart(2, '0');
      const monthKey = `${year}-${monthStr}`;

      const total = salesService.getMonthlySalesTotal(monthKey);
      const count = salesService.getSalesCount(
        `${year}-${monthStr}-01`,
        `${year}-${monthStr}-31`
      );

      const purchases = purchaseService.getTotalPurchases(
        `${year}-${monthStr}-01`,
        `${year}-${monthStr}-31`
      );

      const profit = total - purchases;

      return {
        month: monthNames[month - 1],
        sales: total,
        profit,
        costOfGoods: purchases,
        transactions: count,
      };
    });
  }

  // Get profit analysis
  getProfitReport(startDate: string, endDate: string): any {
    const sales = salesService.getSalesByDateRange(startDate, endDate);
    const totalSales = sales.reduce((sum, s) => sum + s.total_amount, 0);

    const totalPurchases = purchaseService.getTotalPurchases(startDate, endDate);
    const totalReturns = returnsService.getTotalRefunds(startDate, endDate);

    const totalProfit = totalSales - totalPurchases - totalReturns;
    const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

    return {
      totalSales,
      costOfGoods: totalPurchases,
      returns: totalReturns,
      totalProfit,
      profitMargin: profitMargin.toFixed(2),
      transactionCount: sales.length,
      averageTransactionValue: sales.length > 0
        ? (totalSales / sales.length).toFixed(2)
        : 0,
    };
  }

  // Get inventory value report
  getInventoryValueReport(): any {
    const result = this.db
      .prepare(
        `SELECT
          category,
          COUNT(*) as productCount,
          SUM(quantity_available) as totalQuantity,
          SUM(quantity_available * purchase_price_per_unit) as value
        FROM products
        GROUP BY category
        ORDER BY value DESC`
      )
      .all() as any[];

    const totalValue = result.reduce((sum, row) => sum + (row.value || 0), 0);

    return {
      byCategory: result.map((row) => ({
        ...row,
        percentOfTotal: totalValue > 0 ? ((row.value / totalValue) * 100).toFixed(2) : 0,
      })),
      totalInventoryValue: totalValue.toFixed(2),
      totalProducts: result.reduce((sum, row) => sum + row.productCount, 0),
      totalQuantity: result.reduce((sum, row) => sum + row.totalQuantity, 0),
    };
  }

  // Get category performance
  getCategoryPerformanceReport(): any {
    return salesService.getCategoryPerformance();
  }

  // Get best sellers
  getBestSellersReport(limit: number = 10): any {
    return salesService.getBestSellingProducts(limit);
  }

  // Generate PDF report
  async generatePdfReport(
    reportType: string,
    reportData: any,
    startDate: string,
    endDate: string
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          bufferPages: true,
          margin: 50,
        });

        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('POS System Report', { align: 'center' });
        doc.fontSize(12).font('Helvetica').text(
          `Generated: ${new Date().toLocaleString()}`,
          { align: 'center' }
        );
        doc.text(`Period: ${startDate} to ${endDate}`, { align: 'center' });
        doc.moveDown();

        // Report type title
        doc.fontSize(16).font('Helvetica-Bold').text(this.getReportTitle(reportType));
        doc.moveDown();

        // Report content based on type
        switch (reportType) {
          case 'daily_sales':
            this.addDailySalesTable(doc, reportData);
            break;
          case 'monthly_sales':
            this.addMonthlySalesTable(doc, reportData);
            break;
          case 'profit':
            this.addProfitTable(doc, reportData);
            break;
          case 'inventory':
            this.addInventoryTable(doc, reportData);
            break;
          case 'category':
            this.addCategoryTable(doc, reportData);
            break;
          case 'best_sellers':
            this.addBestSellersTable(doc, reportData);
            break;
        }

        // Footer
        doc.moveDown();
        doc.fontSize(8).fillColor('#999999').text('Confidential - For Internal Use Only', {
          align: 'center',
        }).fillColor('black');

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Generate Excel report
  async generateExcelReport(
    reportType: string,
    reportData: any,
    startDate: string,
    endDate: string
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // Add header info
    worksheet.addRow(['POS System Report']);
    worksheet.addRow([`Generated: ${new Date().toLocaleString()}`]);
    worksheet.addRow([`Period: ${startDate} to ${endDate}`]);
    worksheet.addRow([]);

    // Add report title
    worksheet.addRow([this.getReportTitle(reportType)]);
    worksheet.addRow([]);

    // Add report data based on type
    switch (reportType) {
      case 'daily_sales':
        this.addDailySalesExcel(worksheet, reportData);
        break;
      case 'monthly_sales':
        this.addMonthlySalesExcel(worksheet, reportData);
        break;
      case 'profit':
        this.addProfitExcel(worksheet, reportData);
        break;
      case 'inventory':
        this.addInventoryExcel(worksheet, reportData);
        break;
      case 'category':
        this.addCategoryExcel(worksheet, reportData);
        break;
      case 'best_sellers':
        this.addBestSellersExcel(worksheet, reportData);
        break;
    }

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? String(cell.value).length : 0;
        if (cellLength > maxLength) {
          maxLength = cellLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    return workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }

  private getReportTitle(reportType: string): string {
    const titles: { [key: string]: string } = {
      daily_sales: 'Daily Sales Report',
      monthly_sales: 'Monthly Sales Summary',
      profit: 'Profit Analysis Report',
      inventory: 'Inventory Value Report',
      category: 'Category Performance Report',
      best_sellers: 'Best Sellers Report',
    };
    return titles[reportType] || 'Report';
  }

  private addDailySalesTable(doc: any, data: any[]): void {
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Date', 50, doc.y, { width: 80 });
    doc.text('User', 130, doc.y, { width: 70 });
    doc.text('Product', 200, doc.y, { width: 100 });
    doc.text('Qty', 300, doc.y, { width: 40, align: 'right' });
    doc.text('Price', 340, doc.y, { width: 60, align: 'right' });
    doc.text('Total', 400, doc.y, { width: 70, align: 'right' });

    doc.moveTo(50, doc.y + 5).lineTo(530, doc.y + 5).stroke();
    doc.moveDown();

    doc.font('Helvetica').fontSize(8);

    let totalAmount = 0;

    for (const row of data) {
      const saleDate = row.sale_date.split(' ')[0];
      const finalPrice = row.discounted_price || row.unit_price;
      const lineTotal = finalPrice * row.quantity;

      doc.text(saleDate, 50, doc.y, { width: 80 });
      doc.text(row.user_name, 130, doc.y, { width: 70 });
      doc.text(row.product_name, 200, doc.y, { width: 100 });
      doc.text(row.quantity.toString(), 300, doc.y, { width: 40, align: 'right' });
      doc.text(`₱${finalPrice.toFixed(2)}`, 340, doc.y, { width: 60, align: 'right' });
      doc.text(`₱${lineTotal.toFixed(2)}`, 400, doc.y, { width: 70, align: 'right' });

      totalAmount += lineTotal;
      doc.moveDown();

      if (doc.y > 700) {
        doc.addPage();
      }
    }

    doc.moveTo(50, doc.y).lineTo(530, doc.y).stroke();
    doc.font('Helvetica-Bold');
    doc.text('TOTAL', 50, doc.y + 5, { width: 300 });
    doc.text(`₱${totalAmount.toFixed(2)}`, 400, doc.y, { width: 70, align: 'right' });
  }

  private addMonthlySalesTable(doc: any, data: any[]): void {
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Month', 50, doc.y, { width: 100 });
    doc.text('Sales', 150, doc.y, { width: 80, align: 'right' });
    doc.text('Cost', 230, doc.y, { width: 80, align: 'right' });
    doc.text('Profit', 310, doc.y, { width: 100, align: 'right' });

    doc.moveTo(50, doc.y + 5).lineTo(500, doc.y + 5).stroke();
    doc.moveDown();

    doc.font('Helvetica').fontSize(9);

    for (const row of data) {
      doc.text(row.month, 50, doc.y, { width: 100 });
      doc.text(`₱${row.sales.toFixed(2)}`, 150, doc.y, { width: 80, align: 'right' });
      doc.text(`₱${row.costOfGoods.toFixed(2)}`, 230, doc.y, { width: 80, align: 'right' });
      doc.text(`₱${row.profit.toFixed(2)}`, 310, doc.y, { width: 100, align: 'right' });
      doc.moveDown();
    }
  }

  private addProfitTable(doc: any, data: any): void {
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Financial Summary');
    doc.moveDown();

    doc.font('Helvetica').fontSize(10);
    const lineHeight = 20;
    let y = doc.y;

    const rows = [
      ['Total Sales', `₱${data.totalSales.toFixed(2)}`],
      ['Cost of Goods Sold', `₱${data.costOfGoods.toFixed(2)}`],
      ['Total Returns', `₱${data.returns.toFixed(2)}`],
      ['Net Profit', `₱${data.totalProfit.toFixed(2)}`],
      ['Profit Margin', `${data.profitMargin}%`],
      ['Average Transaction', `₱${data.averageTransactionValue}`],
      ['Total Transactions', data.transactionCount.toString()],
    ];

    for (const [label, value] of rows) {
      doc.text(label, 50, y, { width: 200 });
      doc.font('Helvetica-Bold').text(value, 300, y, { width: 150, align: 'right' });
      doc.font('Helvetica');
      y += lineHeight;
    }
  }

  private addInventoryTable(doc: any, data: any): void {
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Category', 50, doc.y, { width: 150 });
    doc.text('Items', 200, doc.y, { width: 80, align: 'right' });
    doc.text('Qty', 280, doc.y, { width: 80, align: 'right' });
    doc.text('Value', 360, doc.y, { width: 100, align: 'right' });

    doc.moveTo(50, doc.y + 5).lineTo(530, doc.y + 5).stroke();
    doc.moveDown();

    doc.font('Helvetica').fontSize(9);

    for (const row of data.byCategory) {
      doc.text(row.category, 50, doc.y, { width: 150 });
      doc.text(row.productCount.toString(), 200, doc.y, { width: 80, align: 'right' });
      doc.text(row.totalQuantity.toString(), 280, doc.y, { width: 80, align: 'right' });
      doc.text(`₱${row.value.toFixed(2)}`, 360, doc.y, { width: 100, align: 'right' });
      doc.moveDown();
    }

    doc.font('Helvetica-Bold');
    doc.text(`Total Inventory Value: ₱${data.totalInventoryValue}`, { align: 'right' });
  }

  private addCategoryTable(doc: any, data: any[]): void {
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Category', 50, doc.y, { width: 120 });
    doc.text('Sales', 170, doc.y, { width: 80, align: 'right' });
    doc.text('Items', 250, doc.y, { width: 80, align: 'right' });
    doc.text('Revenue', 330, doc.y, { width: 100, align: 'right' });

    doc.moveTo(50, doc.y + 5).lineTo(530, doc.y + 5).stroke();
    doc.moveDown();

    doc.font('Helvetica').fontSize(9);

    for (const row of data) {
      doc.text(row.category || 'Uncategorized', 50, doc.y, { width: 120 });
      doc.text(row.sales_count.toString(), 170, doc.y, { width: 80, align: 'right' });
      doc.text(row.total_items.toString(), 250, doc.y, { width: 80, align: 'right' });
      doc.text(`₱${row.total_revenue.toFixed(2)}`, 330, doc.y, {
        width: 100,
        align: 'right',
      });
      doc.moveDown();
    }
  }

  private addBestSellersTable(doc: any, data: any[]): void {
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Product', 50, doc.y, { width: 180 });
    doc.text('Qty Sold', 230, doc.y, { width: 80, align: 'right' });
    doc.text('Revenue', 310, doc.y, { width: 100, align: 'right' });

    doc.moveTo(50, doc.y + 5).lineTo(500, doc.y + 5).stroke();
    doc.moveDown();

    doc.font('Helvetica').fontSize(9);

    for (const product of data) {
      doc.text(product.name, 50, doc.y, { width: 180 });
      doc.text(product.total_quantity.toString(), 230, doc.y, {
        width: 80,
        align: 'right',
      });
      doc.text(`₱${product.total_revenue.toFixed(2)}`, 310, doc.y, {
        width: 100,
        align: 'right',
      });
      doc.moveDown();
    }
  }

  private addDailySalesExcel(worksheet: ExcelJS.Worksheet, data: any[]): void {
    worksheet.addRow(['Date', 'User', 'Product', 'Quantity', 'Unit Price', 'Discount %', 'Final Price', 'Total']);
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    let totalAmount = 0;
    for (const row of data) {
      const saleDate = row.sale_date.split(' ')[0];
      const finalPrice = row.discounted_price || row.unit_price;
      const lineTotal = finalPrice * row.quantity;
      totalAmount += lineTotal;

      worksheet.addRow([
        saleDate,
        row.user_name,
        row.product_name,
        row.quantity,
        row.unit_price,
        row.discount_percentage || 0,
        finalPrice,
        lineTotal,
      ]);
    }

    worksheet.addRow([]);
    worksheet.addRow(['TOTAL', '', '', '', '', '', '', totalAmount]);
    worksheet.getRow(worksheet.rowCount).font = { bold: true };
  }

  private addMonthlySalesExcel(worksheet: ExcelJS.Worksheet, data: any[]): void {
    worksheet.addRow(['Month', 'Sales', 'Cost', 'Profit']);
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    for (const row of data) {
      worksheet.addRow([row.month, row.sales, row.costOfGoods, row.profit]);
    }
  }

  private addProfitExcel(worksheet: ExcelJS.Worksheet, data: any): void {
    worksheet.addRow(['Metric', 'Value']);
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    worksheet.addRow(['Total Sales', data.totalSales]);
    worksheet.addRow(['Cost of Goods', data.costOfGoods]);
    worksheet.addRow(['Returns', data.returns]);
    worksheet.addRow(['Net Profit', data.totalProfit]);
    worksheet.addRow(['Profit Margin %', data.profitMargin]);
    worksheet.addRow(['Avg Transaction', data.averageTransactionValue]);
    worksheet.addRow(['Transactions', data.transactionCount]);
  }

  private addInventoryExcel(worksheet: ExcelJS.Worksheet, data: any): void {
    worksheet.addRow(['Category', 'Products', 'Quantity', 'Value', '% of Total']);
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    for (const row of data.byCategory) {
      worksheet.addRow([
        row.category,
        row.productCount,
        row.totalQuantity,
        row.value,
        row.percentOfTotal,
      ]);
    }

    worksheet.addRow([]);
    worksheet.addRow(['Total Inventory Value', data.totalInventoryValue]);
  }

  private addCategoryExcel(worksheet: ExcelJS.Worksheet, data: any[]): void {
    worksheet.addRow(['Category', 'Sales Count', 'Items Sold', 'Revenue']);
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    for (const row of data) {
      worksheet.addRow([row.category, row.sales_count, row.total_items, row.total_revenue]);
    }
  }

  private addBestSellersExcel(worksheet: ExcelJS.Worksheet, data: any[]): void {
    worksheet.addRow(['Product', 'SKU', 'Category', 'Qty Sold', 'Revenue']);
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    for (const product of data) {
      worksheet.addRow([
        product.name,
        product.sku,
        product.category,
        product.total_quantity,
        product.total_revenue,
      ]);
    }
  }

  // Get comprehensive sales analytics
  getSalesAnalytics(): any {
    const today = new Date();
    const thisYear = today.getFullYear();
    const thisMonth = String(today.getMonth() + 1).padStart(2, '0');
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());

    // Today's sales
    const todayStr = today.toISOString().split('T')[0];
    const todaySales = salesService.getSalesByDateRange(todayStr, todayStr);
    const todayTotal = todaySales.reduce((sum, s) => sum + s.total_amount, 0);

    // This week's sales
    const weekEndDate = new Date(thisWeekStart);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const weekStartStr = thisWeekStart.toISOString().split('T')[0];
    const weekEndStr = weekEndDate.toISOString().split('T')[0];
    const weekSales = salesService.getSalesByDateRange(weekStartStr, weekEndStr);
    const weekTotal = weekSales.reduce((sum, s) => sum + s.total_amount, 0);

    // This month's sales
    const monthStart = `${thisYear}-${thisMonth}-01`;
    const monthEnd = new Date(thisYear, parseInt(thisMonth), 0).toISOString().split('T')[0];
    const monthSales = salesService.getSalesByDateRange(monthStart, monthEnd);
    const monthTotal = monthSales.reduce((sum, s) => sum + s.total_amount, 0);

    // This year's sales
    const yearStart = `${thisYear}-01-01`;
    const yearEnd = `${thisYear}-12-31`;
    const yearSales = salesService.getSalesByDateRange(yearStart, yearEnd);
    const yearTotal = yearSales.reduce((sum, s) => sum + s.total_amount, 0);

    // All time sales
    const allSales = this.db
      .prepare(`SELECT SUM(total_amount) as total FROM sales`)
      .get() as any;
    const allTimeTotal = allSales?.total || 0;

    // Daily totals for last 30 days
    const dailyTotals = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const daySales = salesService.getSalesByDateRange(dateStr, dateStr);
      const dayTotal = daySales.reduce((sum, s) => sum + s.total_amount, 0);
      dailyTotals.push({
        date: dateStr,
        total: dayTotal,
      });
    }

    // Weekly totals for last 12 weeks
    const weeklyTotals = [];
    for (let i = 11; i >= 0; i--) {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);

      const wStartStr = weekStart.toISOString().split('T')[0];
      const wEndStr = weekEnd.toISOString().split('T')[0];
      const wSales = salesService.getSalesByDateRange(wStartStr, wEndStr);
      const wTotal = wSales.reduce((sum, s) => sum + s.total_amount, 0);

      weeklyTotals.push({
        week: `${wStartStr} to ${wEndStr}`,
        total: wTotal,
      });
    }

    // Monthly totals for last 12 months
    const monthlyTotals = [];
    for (let i = 11; i >= 0; i--) {
      const mDate = new Date(today);
      mDate.setMonth(mDate.getMonth() - i);
      const mYear = mDate.getFullYear();
      const mMonth = String(mDate.getMonth() + 1).padStart(2, '0');
      const mStart = `${mYear}-${mMonth}-01`;
      const mEnd = new Date(mYear, mDate.getMonth() + 1, 0).toISOString().split('T')[0];

      const mSales = salesService.getSalesByDateRange(mStart, mEnd);
      const mTotal = mSales.reduce((sum, s) => sum + s.total_amount, 0);

      const monthName = new Date(`${mYear}-${mMonth}-01`).toLocaleString('en-US', { month: 'long', year: 'numeric' });
      monthlyTotals.push({
        month: monthName,
        total: mTotal,
      });
    }

    // Yearly totals (all years with sales)
    const yearlyTotals = [];
    const yearsWithSales = this.db
      .prepare(`SELECT DISTINCT STRFTIME('%Y', sale_date) as year FROM sales ORDER BY year`)
      .all() as any[];

    for (const row of yearsWithSales) {
      const yYear = row.year;
      const yStart = `${yYear}-01-01`;
      const yEnd = `${yYear}-12-31`;
      const ySales = salesService.getSalesByDateRange(yStart, yEnd);
      const yTotal = ySales.reduce((sum, s) => sum + s.total_amount, 0);

      yearlyTotals.push({
        year: yYear,
        total: yTotal,
      });
    }

    return {
      today: todayTotal,
      thisWeek: weekTotal,
      thisMonth: monthTotal,
      thisYear: yearTotal,
      allTime: allTimeTotal,
      dailyTotals,
      weeklyTotals,
      monthlyTotals,
      yearlyTotals,
    };
  }
}

export const reportService = new ReportService();
