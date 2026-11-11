'use client';
import { useEffect, useState } from 'react';
import { addToCart } from '@/lib/cart';
import { getCached, setCache } from '@/lib/clientCache';

type S = { id: number; name: string; list_price: number; description: string; image: string; variantId: number };

const WrenchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="60" height="60">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

function ServiceCard({ s }: { s: S }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const add = () => {
    addToCart(s.variantId, s.name, s.list_price, s.image, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };
  return (
    <div className="service-card">
      <div className="card-img">
        {s.image ? <img src={s.image} alt={s.name} /> : <div className="default-icon-container"><WrenchIcon /></div>}
      </div>
      <div className="card-body">
        <h3>{s.name}</h3>
        {s.description && <p style={{ color: 'var(--text-light)', fontSize: '.9rem', flex: 1 }}>{s.description}</p>}
        <span className="price-big">${(s.list_price || 0).toFixed(2)}</span>
        <div className="card-actions">
          <div className="qty-stepper">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span>{qty}</span>
            <button onClick={() => setQty((q) => q + 1)}>+</button>
          </div>
          <button className={`btn-add-round ${added ? 'added' : ''}`} onClick={add}>
            {added ? '✓' : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="22" height="22"><circle cx="9" cy="21" r="1.5" /><circle cx="19" cy="21" r="1.5" /><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L23 7H6" /></svg>}
          </button>
        </div>
      </div>
    </div>
  );
}

const ServiceSkeleton = () => (
  <div className="service-card skeleton">
    <div className="card-img" style={{ background: '#e2e8f0' }}></div>
    <div className="card-body">
      <div style={{ height: '20px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '10px', width: '80%' }}></div>
      <div style={{ height: '24px', background: '#e2e8f0', borderRadius: '4px', width: '40%' }}></div>
    </div>
  </div>
);

export default function Servicios() {
  const [services, setServices] = useState<S[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchServices = async () => {
    setLoading(true);
    setError(false);
    try {
      const cached = getCached('services');
      if (cached && (Date.now() - cached.time < 30000)) {
        setServices(cached.data);
        setLoading(false);
        return;
      }

      const res = await fetch('/api/services');
      const data = await res.json();
      setServices(data.services || []);
      setCache('services', data.services || []);
    } catch {
      setError(true);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  return (
    <main>
      <section className="services-hero">
        <div className="container"><h1>Nuestros Servicios</h1><p>Soluciones profesionales de principio a fin.</p></div>
      </section>
      <div className="container" style={{ paddingBottom: '3rem' }}>
        <div className="services-list">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <ServiceSkeleton key={i} />)
          ) : error ? (
            <div className="error-message">
              <p>Ocurrió un error al cargar los servicios. Intenta de nuevo.</p>
              <button className="btn-primary" onClick={fetchServices}>Reintentar</button>
            </div>
          ) : services.length === 0 ? (
            <div className="empty-message">
              <div className="empty-icon"><WrenchIcon /></div>
              <p>No hay servicios disponibles en este momento. Vuelve más tarde o escríbenos por WhatsApp y te atendemos directamente.</p>
            </div>
          ) : (
            services.map((s) => <ServiceCard key={s.id} s={s} />)
          )}
        </div>
      </div>
    </main>
  );
}