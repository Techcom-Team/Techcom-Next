'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { addToCart } from '@/lib/cart';
import { getCached, setCache } from '@/lib/clientCache';

type Product = { id: number; name: string; list_price: number; image: string; variantId: number };
type Category = { id: number; name: string };
type AttributeValue = { id: number; name: string };
type Attribute = { id: number; name: string; values: AttributeValue[] };

// Categorías exclusivas (solo una opción)
const SINGLE_SELECT_CATEGORIES = [
  'microprocesador', 'cpu', 'procesador', 
  'fabricante', 'marca', 'brand',
  'sistema operativo', 'os', 'so',
  'tipo de disco', 'storage type',
  'condición', 'condition'
];

const BoxIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="60" height="60">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const ProductSkeleton = () => (
  <div className="product-card skeleton">
    <div className="card-img" style={{ background: '#e2e8f0' }}></div>
    <div className="card-body">
      <div style={{ height: '20px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '10px', width: '80%' }}></div>
      <div style={{ height: '24px', background: '#e2e8f0', borderRadius: '4px', width: '40%' }}></div>
    </div>
  </div>
);

function ProductCard({ p }: { p: Product }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart(p.variantId, p.name, p.list_price, p.image, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="product-card">
      <div className="card-img">
        <Link href={`/producto/${p.id}`} aria-label={p.name}>
          {p.image ? (
            <img src={p.image} alt={p.name} loading="lazy" />
          ) : (
            <div className="default-icon-container"><BoxIcon /></div>
          )}
        </Link>
      </div>
      <div className="card-body">
        <h3><Link href={`/producto/${p.id}`} className="product-card-link">{p.name}</Link></h3>
        <span className="price-big">${(p.list_price || 0).toFixed(2)}</span>
        <div className="card-actions">
          <div className="qty-stepper">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span>{qty}</span>
            <button type="button" onClick={() => setQty((q) => q + 1)}>+</button>
          </div>
          
          <button 
            type="button" 
            className={`btn-add-round ${added ? 'added' : ''}`} 
            onClick={handleAdd}
          >
            {added ? <CheckIcon /> : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function TiendaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [selectedAttrs, setSelectedAttrs] = useState<number[]>([]);
  const [maxPriceLimit, setMaxPriceLimit] = useState(5000);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(5000);
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);

  const debounceRef = useRef<NodeJS.Timeout>();

  // Carga Inicial (Robusta)
  useEffect(() => {
    const loadData = async () => {
      try {
        const catKey = 'categories';
        const filterKey = 'filters';
        const priceKey = 'products_max_price';

        const catCache = getCached<Category[]>(catKey);
        const filterCache = getCached<Attribute[]>(filterKey);
        const priceCache = getCached<number>(priceKey);

        const now = Date.now();

        let catsData = catCache && (now - catCache.time < 30000) ? { categories: catCache.data } : null;
        let filtersData = filterCache && (now - filterCache.time < 30000) ? { attributes: filterCache.data } : null;
        let priceData = priceCache && (now - priceCache.time < 30000) ? { maxPrice: priceCache.data } : null;

        const promises = [];
        if (!catsData) promises.push(fetch('/api/categories').then(r => r.json()).then(d => { setCache(catKey, d.categories || []); return { type: 'cats', data: d }; }));
        if (!filtersData) promises.push(fetch('/api/filters').then(r => r.json()).then(d => { setCache(filterKey, d.attributes || []); return { type: 'filters', data: d }; }));
        if (!priceData) promises.push(fetch('/api/products?max_price_only=true').then(r => r.json()).then(d => { setCache(priceKey, d.maxPrice || 5000); return { type: 'price', data: d }; }));

        const results = await Promise.all(promises);
        results.forEach(res => {
          if (res.type === 'cats') catsData = res.data;
          if (res.type === 'filters') filtersData = res.data;
          if (res.type === 'price') priceData = res.data;
        });

        if (catsData) setCategories(catsData.categories || []);
        if (filtersData) setAttributes(filtersData.attributes || []);
        if (priceData) {
          setMaxPriceLimit(priceData.maxPrice || 5000);
          setMaxPrice(priceData.maxPrice || 5000);
        }
      } catch (err) {
        console.error("Error carga inicial", err);
      }
    };
    loadData();
  }, []);

  // Sincronizar URL
  useEffect(() => {
    const cat = searchParams.get('cat');
    setSelectedCats(cat ? [Number(cat)] : []);
    const attrs = searchParams.get('attrs');
    setSelectedAttrs(attrs ? attrs.split(',').map(Number) : []);
  }, [searchParams]);

  // Carga Productos (Con Debounce y Manejo de Errores)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (selectedCats.length > 0) params.set('cats', selectedCats.join(','));
        if (selectedAttrs.length > 0) params.set('attrs', selectedAttrs.join(','));
        params.set('min', String(minPrice));
        params.set('max', String(maxPrice));
        params.set('sort', sortBy);
        
        const cacheKey = `products?${params.toString()}`;
        const cached = getCached<Product[]>(cacheKey);
        if (cached && (Date.now() - cached.time < 30000)) {
          setProducts(cached.data);
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/products?${params.toString()}`);
        const data = await res.json();
        const prods = Array.isArray(data.products) ? data.products : [];
        setProducts(prods);
        setCache(cacheKey, prods);
      } catch (err) {
        console.error("Error cargando productos", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [selectedCats, selectedAttrs, minPrice, maxPrice, sortBy]);

  const updateFilters = (newCats: number[], newAttrs: number[]) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newCats.length > 0) params.set('cat', newCats[0].toString()); else params.delete('cat');
    if (newAttrs.length > 0) params.set('attrs', newAttrs.join(',')); else params.delete('attrs');
    router.push(`${pathname}?${params.toString()}`);
  };

  const toggleCategory = (id: number) => {
    const newCats = selectedCats.includes(id) ? [] : [id];
    updateFilters(newCats, selectedAttrs);
  };

  // Lógica Inteligente de Atributos
  const toggleAttribute = (attrId: number, valId: number) => {
    const attributeGroup = attributes.find(a => a.id === attrId);
    if (!attributeGroup) return;

    const groupName = attributeGroup.name.toLowerCase();
    const isSingleSelect = SINGLE_SELECT_CATEGORIES.some(singleName => groupName.includes(singleName));

    let newAttrs: number[];

    if (isSingleSelect) {
      if (selectedAttrs.includes(valId)) {
        newAttrs = selectedAttrs.filter(id => id !== valId);
      } else {
        const groupValueIds = attributeGroup.values.map(v => v.id);
        const otherGroupsAttrs = selectedAttrs.filter(id => !groupValueIds.includes(id));
        newAttrs = [...otherGroupsAttrs, valId];
      }
    } else {
      if (selectedAttrs.includes(valId)) {
        newAttrs = selectedAttrs.filter(id => id !== valId);
      } else {
        newAttrs = [...selectedAttrs, valId];
      }
    }

    updateFilters(selectedCats, newAttrs);
  };

  return (
    <div className="container store-layout">
      <aside className="store-filters">
        <h3 style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>Filtros</h3>

        <div className="filter-group">
          <h4>Categoría</h4>
          {categories.map((cat) => (
            <label key={cat.id} className="checkbox-label">
              <input type="checkbox" checked={selectedCats.includes(cat.id)} onChange={() => toggleCategory(cat.id)} />
              {cat.name}
            </label>
          ))}
        </div>

        <div className="filter-group">
          <h4>Precio</h4>
          <div className="range-label">
            ${minPrice} - {maxPrice >= maxPriceLimit ? `$${maxPriceLimit}+` : `$${maxPrice}`}
          </div>
          <div className="range-wrap">
            <div className="range-track"></div>
            <div className="range-fill" style={{ left: `${(minPrice / maxPriceLimit) * 100}%`, width: `${((maxPrice - minPrice) / maxPriceLimit) * 100}%` }}></div>
            <input type="range" min="0" max={maxPriceLimit} step="10" value={minPrice} className="input-range" onChange={(e) => setMinPrice(Math.min(Number(e.target.value), maxPrice - 10))} />
            <input type="range" min="0" max={maxPriceLimit} step="10" value={maxPrice} className="input-range" onChange={(e) => setMaxPrice(Math.max(Number(e.target.value), minPrice + 10))} />
          </div>
        </div>

        {attributes.map((attr) => (
          <div key={attr.id} className="filter-group">
            <h4>{attr.name}</h4>
            <div style={{ maxHeight: '150px', overflowY: 'auto', paddingRight: '5px' }}>
              {attr.values.map((val) => (
                <label key={val.id} className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={selectedAttrs.includes(val.id)} 
                    onChange={() => toggleAttribute(attr.id, val.id)} 
                  />
                  {val.name}
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="filter-group">
          <h4>Ordenar por</h4>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Más recientes</option>
            <option value="price_asc">Precio: menor a mayor</option>
            <option value="price_desc">Precio: mayor a menor</option>
          </select>
        </div>
      </aside>

      <div className="store-grid">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <ProductSkeleton key={i} />)
        ) : products.length === 0 ? (
          <div className="end-message">No hay productos para este filtro.</div>
        ) : (
          products.map((p) => <ProductCard key={p.id} p={p} />)
        )}
      </div>
    </div>
  );
}

export default function TiendaPage() {
  return (
    <Suspense fallback={<div className="loading-spinner" style={{ padding: '4rem 0' }}>Cargando tienda...</div>}>
      <TiendaContent />
    </Suspense>
  );
}