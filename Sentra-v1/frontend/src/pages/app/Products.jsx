import { DemoHeader } from '../../components/DemoHeader';
import { usePageTelemetry } from '../../lib/usePageTelemetry';

const PRODUCTS = [
  { sku: 'SKU-1001', name: 'Analytics Pro',        price: '$49.00' },
  { sku: 'SKU-1002', name: 'Security Suite',       price: '$99.00' },
  { sku: 'SKU-1003', name: 'Cloud Backup',         price: '$19.00' },
  { sku: 'SKU-1004', name: 'Team Collaboration',   price: '$29.00' },
  { sku: 'SKU-1005', name: 'API Gateway',          price: '$79.00' },
];

export default function Products() {
  usePageTelemetry('/products', { autoApi: '/api/products' });

  return (
    <div className="app-page">
      <DemoHeader />
      <div className="app-hero">
        <div>
          <h2>Products</h2>
          <p>Available plans and add-ons</p>
        </div>
      </div>

      <div className="product-list">
        {PRODUCTS.map((p) => (
          <div className="product-row" key={p.sku}>
            <div>
              <div className="name">{p.name}</div>
              <div className="sku">{p.sku}</div>
            </div>
            <div className="price">{p.price}</div>
          </div>
        ))}
      </div>
    </div>
  );
}