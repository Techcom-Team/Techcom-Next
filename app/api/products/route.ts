import { NextResponse } from 'next/server';
import { odooCall } from '@/lib/odoo';

export const dynamic = 'force-dynamic';

let tmplNameCache: Record<number, string> = {};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    if (searchParams.get('max_price_only') === 'true') {
      const ids = await odooCall<number[]>('product.product', 'search', [
        [['type', '!=', 'service'], ['list_price', '>', 0]]
      ], { order: 'list_price desc', limit: 1 });
      let maxPrice = 5000;
      if (ids && ids.length > 0) {
        const products = await odooCall<any[]>('product.product', 'read', [ids], { fields: ['list_price'] });
        if (products && products[0]) maxPrice = Math.ceil(products[0].list_price);
      }
      return NextResponse.json({ maxPrice });
    }

    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '24');
    const cats = searchParams.get('cats');
    const min = searchParams.get('min');
    const max = searchParams.get('max');
    const sort = searchParams.get('sort') || 'newest';
    const attrs = searchParams.get('attrs'); 

    // --- 1. FILTROS ---
    let allowedTemplateIds: number[] | null = null;
    if (cats) {
      try {
        const catIds = cats.split(',').map(Number);
        allowedTemplateIds = await odooCall<number[]>('product.template', 'search', [
          [['public_categ_ids', 'in', catIds]]
        ]);
        if (allowedTemplateIds && allowedTemplateIds.length === 0) return NextResponse.json({ products: [], hasMore: false });
      } catch (e) { allowedTemplateIds = null; }
    }

    const domain: any[] = [['type', '!=', 'service'], ['website_published', '=', true]];
    if (allowedTemplateIds) domain.push(['product_tmpl_id', 'in', allowedTemplateIds]);
    if (min) domain.push(['list_price', '>=', parseFloat(min)]);
    if (max) domain.push(['list_price', '<=', parseFloat(max)]);

    let order = 'create_date desc';
    if (sort === 'price_asc') order = 'list_price asc';
    if (sort === 'price_desc') order = 'list_price desc';

    // Traemos más si hay filtros de atributos para filtrar en memoria
    const fetchLimit = attrs ? 100 : limit; 
    const ids = await odooCall<number[]>('product.product', 'search', [domain], { order, limit: fetchLimit });
    if (!ids || ids.length === 0) return NextResponse.json({ products: [], hasMore: false });

    // --- 2. LEER DATOS ---
    let products: any[] = [];
    let attrFieldWorks = true;
    
    try {
      products = await odooCall<any[]>('product.product', 'read', [ids], {
        fields: ['id', 'name', 'list_price', 'description_sale', 'image_1920', 'product_tmpl_id', 'type', 'product_template_attribute_value_ids'],
      });
    } catch (e) {
      console.warn('⚠️ Leyendo sin atributos detallados');
      attrFieldWorks = false;
      products = await odooCall<any[]>('product.product', 'read', [ids], {
        fields: ['id', 'name', 'list_price', 'description_sale', 'image_1920', 'product_tmpl_id', 'type'],
      });
    }

    // --- 3. ENRIQUECER Y FILTRAR ---
    const tmplIds = [...new Set(products.map((p: any) => Array.isArray(p.product_tmpl_id) ? p.product_tmpl_id[0] : p.product_tmpl_id))];
    const missingTmplIds = tmplIds.filter(id => !tmplNameCache[id]);
    if (missingTmplIds.length > 0) {
      try {
        const tmpls = await odooCall<any[]>('product.template', 'read', [missingTmplIds], { fields: ['name'] });
        tmpls.forEach((t: any) => tmplNameCache[t.id] = t.name);
      } catch (e) {}
    }

    let ptavToPavMap: Record<number, number> = {};
    let pavNamesMap: Record<number, string> = {};
    
    if (attrFieldWorks) {
      const allPtavIds = [...new Set(products.flatMap((p: any) => p.product_template_attribute_value_ids || []))];
      if (allPtavIds.length > 0) {
        try {
          const ptavs = await odooCall<any[]>('product.template.attribute.value', 'read', [allPtavIds], { fields: ['product_attribute_value_id'] });
          const allPavIds = new Set<number>();
          ptavs.forEach((ptav: any) => {
            const pavId = Array.isArray(ptav.product_attribute_value_id) ? ptav.product_attribute_value_id[0] : ptav.product_attribute_value_id;
            ptavToPavMap[ptav.id] = pavId;
            if (pavId) allPavIds.add(pavId);
          });

          if (allPavIds.size > 0) {
            const pavs = await odooCall<any[]>('product.attribute.value', 'read', [Array.from(allPavIds)], { fields: ['name'] });
            pavs.forEach((pav: any) => pavNamesMap[pav.id] = pav.name);
          }
        } catch (e) { console.warn('Error mapeando atributos', e); }
      }
    }

    // Filtrado en memoria por atributos
    if (attrs && attrFieldWorks && Object.keys(ptavToPavMap).length > 0) {
      const requiredPavIds = attrs.split(',').map(Number);
      products = products.filter(p => {
        if (!p.product_template_attribute_value_ids) return false;
        const productPavIds = p.product_template_attribute_value_ids.map((ptavId: number) => ptavToPavMap[ptavId]).filter(Boolean);
        return requiredPavIds.every(reqId => productPavIds.includes(reqId));
      });
    }

    const totalFiltered = products.length;
    const paginatedProducts = products.slice(offset, offset + limit);

    // --- 4. RESULTADO CON NOMBRE INTELIGENTE ---
    const result = paginatedProducts.map((p: any) => {
      const tmplId = Array.isArray(p.product_tmpl_id) ? p.product_tmpl_id[0] : p.product_tmpl_id;
      const baseName = tmplNameCache[tmplId] || p.name;
      
      let attrNames: string[] = [];
      if (p.product_template_attribute_value_ids && attrFieldWorks) {
        attrNames = p.product_template_attribute_value_ids
          .map((ptavId: number) => {
            const pavId = ptavToPavMap[ptavId];
            return pavId ? pavNamesMap[pavId] : null;
          })
          .filter(Boolean) as string[];
      }

      // ✅ FORMATO: "Base, Attr1, Attr2"
      let displayName = baseName;
      if (attrNames.length > 0) {
        displayName = `${baseName}, ${attrNames.join(', ')}`;
      } else {
        displayName = p.name !== baseName ? p.name : baseName;
      }

      return {
        id: p.id, 
        name: displayName, 
        list_price: p.list_price,
        description: p.description_sale || '',
        image: p.image_1920 ? `${process.env.ODOO_URL}/web/image/product.product/${p.id}/image_1920/512x512` : '',
        variantId: p.id, 
        type: p.type,
        attributes: attrNames 
      };
    });

    return NextResponse.json({ products: result, hasMore: (offset + limit) < totalFiltered });

  } catch (e: any) {
    console.error('❌ ERROR API:', e);
    return NextResponse.json({ products: [], hasMore: false }, { status: 200 });
  }
}