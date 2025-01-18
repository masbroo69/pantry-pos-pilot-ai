import React from 'react';
import { format } from 'date-fns';

interface ReceiptProps {
  sale: {
    id: string;
    created_at: string;
    total_amount: number;
    payment_method: string;
    items: Array<{
      name: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }>;
  };
}

const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(({ sale }, ref) => {
  return (
    <div 
      ref={ref} 
      className="w-[80mm] bg-white p-4 text-sm" 
      style={{ 
        fontFamily: 'monospace',
        minHeight: '297mm', // A4 height
        margin: '0 auto'
      }}
    >
      <div className="text-center mb-4">
        <h2 className="font-bold text-lg">STORE NAME</h2>
        <p>123 Store Street</p>
        <p>City, State 12345</p>
        <p>Tel: (123) 456-7890</p>
      </div>

      <div className="mb-4">
        <p>Receipt: #{sale.id.slice(0, 8)}</p>
        <p>Date: {format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm')}</p>
        <p>Payment: {sale.payment_method}</p>
      </div>

      <div className="border-t border-b border-black py-2 mb-4">
        <table className="w-full">
          <thead>
            <tr className="text-left">
              <th>Item</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Price</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, index) => (
              <tr key={index}>
                <td>{item.name}</td>
                <td className="text-right">{item.quantity}</td>
                <td className="text-right">${item.unit_price.toFixed(2)}</td>
                <td className="text-right">${item.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-right mb-4">
        <p className="font-bold">Total: ${sale.total_amount.toFixed(2)}</p>
      </div>

      <div className="text-center text-sm">
        <p>Thank you for shopping with us!</p>
        <p>Please come again</p>
      </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';

export default Receipt;