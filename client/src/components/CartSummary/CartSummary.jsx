import './CartSummary.css';

const CartSummary = ({
    subtotal,
    tax = 0,
    grandTotal,
    paymentMethod,
    setPaymentMethod,
    handlePlaceOrder,
    isPlacingOrder,
    cartLength
}) => {
    return (
        <div className="cart-summary-box">
            <div className="summary-row">
                <span>Items Subtotal:</span>
                <span>&#8377;{Number(subtotal || 0).toFixed(2)}</span>
            </div>
            <div className="summary-row">
                <span>Tax (0%):</span>
                <span>&#8377;{Number(tax || 0).toFixed(2)}</span>
            </div>
            <div className="summary-row total-row">
                <span>Grand Total:</span>
                <span>&#8377;{Number(grandTotal || 0).toFixed(2)}</span>
            </div>

            {/* Payment Method Selector (Cash or UPI) */}
            <div className="payment-method-selector">
                <div className="payment-method-label">Payment Method</div>
                <div className="payment-options-grid">
                    <button
                        type="button"
                        className={`payment-option-btn ${paymentMethod === "CASH" ? "active" : ""}`}
                        onClick={() => setPaymentMethod("CASH")}
                    >
                        <i className="bi bi-cash-stack"></i>
                        <span>Cash</span>
                    </button>
                    <button
                        type="button"
                        className={`payment-option-btn ${paymentMethod === "UPI" ? "active" : ""}`}
                        onClick={() => setPaymentMethod("UPI")}
                    >
                        <i className="bi bi-qr-code-scan"></i>
                        <span>UPI</span>
                    </button>
                </div>
            </div>

            {/* Place Order Button */}
            <button
                type="button"
                className="btn-place-order"
                disabled={cartLength === 0 || isPlacingOrder}
                onClick={handlePlaceOrder}
            >
                {isPlacingOrder ? (
                    <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        Placing Order...
                    </>
                ) : (
                    <>
                        <i className="bi bi-check-circle-fill"></i>
                        Place Order (&#8377;{Number(grandTotal || 0).toFixed(2)})
                    </>
                )}
            </button>
        </div>
    );
};

export default CartSummary;
