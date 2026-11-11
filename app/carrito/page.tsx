'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCart, updateQty, removeFromCart, clearCart, CartItem } from '@/lib/cart';

export default function CarritoPage() {
  const [lines, setLines] = useState<CartItem[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());

  useEffect(() => { setLines(getCart()); }, []);
  const refresh = () => setLines(getCart());
  const total = lines.reduce((a, l) => a + l.qty * l.price, 0);
  const toggle = (v: string) => { const n = new Set(sel); n.has(v) ? n.delete(v) : n.add(v); setSel(n); };

  return (
    <main className="cart-page">
      <div className="container">
        <h2 style={{ color: 'var(--primary)', marginBottom: '2rem', fontSize: '2rem' }}>Tu Carrito</h2>
        <div className="cart-layout">
          <div className="cart-list">
            {lines.length === 0 ? (
              <p className="empty-msg">Tu carrito está vacío. <Link href="/tienda" style={{ color: 'var(--primary)' }}>Ir a la tienda</Link></p>
            ) : lines.map((l) => (
              <div className="cart-item" key={l.id}>
                <input type="checkbox" checked={sel.has(String(l.id))} onChange={() => toggle(String(l.id))} />
                {l.image ? <img src={l.image} alt={l.name} /> : <span className="no-img-sm">📦</span>}
                <div className="item-info"><h4>{l.name}</h4><span className="item-price">${l.price.toFixed(2)}</span></div>
                <div className="item-controls">
                  <button onClick={() => { updateQty(l.id, -1); refresh(); }}>−</button>
                  <span>{l.qty}</span>
                  <button onClick={() => { updateQty(l.id, 1); refresh(); }}>+</button>
                </div>
                <button className="delete-item" onClick={() => { removeFromCart(l.id); refresh(); }}>✕</button>
              </div>
            ))}
            {lines.length > 0 && (
              <div className="cart-actions" style={{ marginTop: '1rem' }}>
                <button className="btn-danger" disabled={sel.size === 0}
                  onClick={() => { sel.forEach((v) => removeFromCart(Number(v))); setSel(new Set()); refresh(); }}>
                  Borrar seleccionados ({sel.size})
                </button>
                <button className="btn-outline" onClick={() => { clearCart(); setSel(new Set()); refresh(); }}>Vaciar carrito</button>
              </div>
            )}
          </div>
          <div className="cart-summary">
            <h3 style={{ marginBottom: '1rem' }}>Resumen</h3>
            <div className="cart-total"><span>Total:</span><span className="total-price">${total.toFixed(2)}</span></div>
            <Link href="/checkout" className="btn-primary full-width">Finalizar Compra</Link>
          </div>
        </div>
      </div>
    </main>
  );
}