import { X, Printer, Store } from 'lucide-react'
import { formatCurrency } from '../../utils/currency'

export default function ReceiptModal({ receipt, onClose }) {
    const discountAmount = Number(receipt.discountAmount || 0)
    const cgstRate = Number(receipt.cgstRate || 0)
    const sgstRate = Number(receipt.sgstRate || 0)
    const igstRate = Number(receipt.igstRate || 0)
    const cgstAmount = Number(receipt.cgstAmount || 0)
    const sgstAmount = Number(receipt.sgstAmount || 0)
    const igstAmount = Number(receipt.igstAmount || 0)
    const totalTax = Number(receipt.totalTax || (cgstAmount + sgstAmount + igstAmount))

    const itemRowsHtml = receipt.items.map(i => `
        <div class="row"><span>${i.name} x${i.qty}</span><span>${formatCurrency(i.price * i.qty)}</span></div>
    `).join('')

    const handlePrint = () => {
        const w = window.open('', '', 'width=400,height=700')
        w.document.write(`
      <html>
        <head>
          <title>Receipt ${receipt.id}</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 13px; padding: 20px; max-width: 380px; margin: auto; }
            h2 { text-align: center; font-size: 18px; margin-bottom: 4px; }
            .center { text-align: center; }
            hr { border: none; border-top: 1px dashed #999; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .bold { font-weight: bold; }
            .total { font-size: 16px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>RetailTouch POS</h2>
          <div class="center" style="font-size:11px; color:#666;">Receipt #${receipt.id}</div>
          <div class="center" style="font-size:11px; color:#666;">${receipt.date}</div>
          <hr/>
          ${itemRowsHtml}
          <hr/>
          <div class="row"><span>Subtotal</span><span>${formatCurrency(receipt.subtotal)}</span></div>
          ${discountAmount > 0 ? `<div class="row"><span>Discount</span><span>-${formatCurrency(discountAmount)}</span></div>` : ''}
          ${igstAmount > 0
            ? `<div class="row"><span>IGST (${igstRate}%)</span><span>${formatCurrency(igstAmount)}</span></div>`
            : `<div class="row"><span>CGST (${cgstRate}%)</span><span>${formatCurrency(cgstAmount)}</span></div><div class="row"><span>SGST (${sgstRate}%)</span><span>${formatCurrency(sgstAmount)}</span></div>`
          }
          <div class="row"><span>Total GST</span><span>${formatCurrency(totalTax)}</span></div>
          <div class="row total"><span>TOTAL</span><span>${formatCurrency(receipt.total)}</span></div>
          <hr/>
          <div class="row"><span>Payment</span><span>${receipt.method.toUpperCase()}</span></div>
          ${receipt.method === 'cash' ? `<div class="row"><span>Tendered</span><span>${formatCurrency(receipt.tendered)}</span></div><div class="row bold"><span>Change</span><span>${formatCurrency(receipt.change)}</span></div>` : ''}
          <hr/>
          <div class="center" style="margin-top:12px; font-size:12px;">Thank you for shopping with us!</div>
        </body>
      </html>
    `)
        w.document.close()
        w.focus()
        w.print()
        w.close()
    }

    return (
        <div className="modal-overlay">
            <div className="modal-box max-w-sm">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="font-bold dark:text-white">Receipt Preview</h2>
                    <button className="btn-ghost p-2" onClick={onClose}><X className="w-5 h-5" /></button>
                </div>
                <div className="p-5 font-mono text-xs text-gray-800 dark:text-gray-200 space-y-1">
                    <div className="text-center space-y-0.5 mb-3">
                        <div className="flex items-center justify-center gap-2 font-bold text-base">
                            <Store className="w-4 h-4" /> RetailTouch POS
                        </div>
                        <div className="text-gray-500 text-[11px]">Receipt #{receipt.id}</div>
                        <div className="text-gray-500 text-[11px]">{receipt.date}</div>
                        {receipt.customer && <div className="text-primary-600 text-[11px]">Customer: {receipt.customer.name}</div>}
                    </div>
                    <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-2" />
                    {receipt.items.map((item, i) => (
                        <div key={i} className="flex justify-between">
                            <span>{item.name} x{item.qty}</span>
                            <span>{formatCurrency(item.price * item.qty)}</span>
                        </div>
                    ))}
                    <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-2" />
                    <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(receipt.subtotal)}</span></div>
                    {discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-600">
                            <span>Discount</span>
                            <span>-{formatCurrency(discountAmount)}</span>
                        </div>
                    )}
                    {igstAmount > 0 ? (
                        <div className="flex justify-between"><span>IGST ({igstRate}%)</span><span>{formatCurrency(igstAmount)}</span></div>
                    ) : (
                        <>
                            <div className="flex justify-between"><span>CGST ({cgstRate}%)</span><span>{formatCurrency(cgstAmount)}</span></div>
                            <div className="flex justify-between"><span>SGST ({sgstRate}%)</span><span>{formatCurrency(sgstAmount)}</span></div>
                        </>
                    )}
                    <div className="flex justify-between"><span>Total GST</span><span>{formatCurrency(totalTax)}</span></div>
                    <div className="flex justify-between font-bold text-base mt-1">
                        <span>TOTAL</span><span>{formatCurrency(receipt.total)}</span>
                    </div>
                    <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-2" />
                    <div className="flex justify-between"><span>Payment</span><span>{receipt.method.toUpperCase()}</span></div>
                    {receipt.method === 'cash' && (
                        <>
                            <div className="flex justify-between"><span>Tendered</span><span>{formatCurrency(receipt.tendered)}</span></div>
                            <div className="flex justify-between font-semibold"><span>Change</span><span>{formatCurrency(receipt.change)}</span></div>
                        </>
                    )}
                    <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-2" />
                    <div className="text-center text-gray-500 text-[11px] mt-2">Thank you for shopping with us!</div>
                </div>
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                    <button className="btn-primary btn flex-1 gap-2" onClick={handlePrint}>
                        <Printer className="w-4 h-4" /> Print Receipt
                    </button>
                    <button className="btn-secondary btn flex-1" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    )
}
