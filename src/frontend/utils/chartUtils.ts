/**
 * Utilities for chart data formatting and visualization
 */

export interface ChartDataPoint {
  name: string;
  value: number;
  percentage?: number;
}

export const formatExpenseChartData = (expenses: any[]): ChartDataPoint[] => {
  const byCategory: { [key: string]: number } = {};

  expenses.forEach(expense => {
    const categoryName = expense.category_name || 'Unknown';
    byCategory[categoryName] = (byCategory[categoryName] || 0) + expense.amount;
  });

  const total = Object.values(byCategory).reduce((sum, val) => sum + val, 0);

  return Object.entries(byCategory).map(([name, value]) => ({
    name,
    value: parseFloat(value.toFixed(2)),
    percentage: total > 0 ? parseFloat(((value / total) * 100).toFixed(1)) : 0,
  }));
};

export const formatProfitChartData = (sales: any[], expenses: any[]): ChartDataPoint[] => {
  const monthlyData: { [key: string]: { sales: number; expenses: number } } = {};

  // Process sales
  sales.forEach(sale => {
    const month = sale.sale_date.slice(0, 7);
    if (!monthlyData[month]) monthlyData[month] = { sales: 0, expenses: 0 };
    monthlyData[month].sales += sale.total_amount;
  });

  // Process expenses
  expenses.forEach(expense => {
    const month = expense.date.slice(0, 7);
    if (!monthlyData[month]) monthlyData[month] = { sales: 0, expenses: 0 };
    monthlyData[month].expenses += expense.amount;
  });

  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      name: month,
      value: parseFloat((data.sales - data.expenses).toFixed(2)),
    }));
};

export const formatPaymentMethodChartData = (payments: any[]): ChartDataPoint[] => {
  const byMethod: { [key: string]: number } = {};

  payments.forEach(payment => {
    const method = payment.payment_method_name || 'Unknown';
    byMethod[method] = (byMethod[method] || 0) + payment.amount;
  });

  const total = Object.values(byMethod).reduce((sum, val) => sum + val, 0);

  return Object.entries(byMethod).map(([name, value]) => ({
    name,
    value: parseFloat(value.toFixed(2)),
    percentage: total > 0 ? parseFloat(((value / total) * 100).toFixed(1)) : 0,
  }));
};

export const formatSalesPerformanceData = (sales: any[]): ChartDataPoint[] => {
  const byEmployee: { [key: string]: number } = {};

  sales.forEach(sale => {
    const empName = `Employee #${sale.employee_id || 'N/A'}`;
    byEmployee[empName] = (byEmployee[empName] || 0) + sale.total_amount;
  });

  return Object.entries(byEmployee)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
    }));
};

export const formatStockAlertData = (alerts: any[]): ChartDataPoint[] => {
  const byType: { [key: string]: number } = {};

  alerts.forEach(alert => {
    const type = alert.alert_type === 'low_stock' ? 'Low Stock' : 'Expiry Warning';
    byType[type] = (byType[type] || 0) + 1;
  });

  return Object.entries(byType).map(([name, value]) => ({
    name,
    value,
  }));
};

export const calculateMetrics = (sales: any[], expenses: any[]) => {
  const totalSales = sales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const profit = totalSales - totalExpenses;
  const profitMargin = totalSales > 0 ? (profit / totalSales) * 100 : 0;

  return {
    totalSales: parseFloat(totalSales.toFixed(2)),
    totalExpenses: parseFloat(totalExpenses.toFixed(2)),
    profit: parseFloat(profit.toFixed(2)),
    profitMargin: parseFloat(profitMargin.toFixed(2)),
    transactionCount: sales.length,
    averageTransaction: sales.length > 0 ? parseFloat((totalSales / sales.length).toFixed(2)) : 0,
  };
};

export const formatCurrency = (amount: number, currency: string = 'Rs.'): string => {
  return `${currency} ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatPercentage = (value: number, decimals: number = 2): string => {
  return `${value.toFixed(decimals)}%`;
};
