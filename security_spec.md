# Security Specification for Eliza Sorvetes POS

## 1. Data Invariants
- **Authentication**: Write operations require an authenticated operator (`request.auth != null`). Read operations for products, stock, and sales are accessible to authenticated staff.
- **Product Entity Invariants**:
  - `id` must be a valid alphanumeric/hyphen string (<= 128 chars).
  - `name` must be non-empty string <= 120 chars.
  - `category` must be one of `['sorvete', 'picole', 'bebida', 'sobremesa']`.
  - `price` must be a non-negative number.
  - `requiresFlavors` must be a boolean.
- **StockItem Entity Invariants**:
  - `id` must be a valid alphanumeric/hyphen string (<= 128 chars).
  - `name` must be string <= 120 chars.
  - `category` must be one of `['Sorvete', 'Picolé', 'Bebida', 'Sobremesa']`.
  - `quantity` must be a number >= 0.
  - `minQuantity` must be a number >= 1.
  - `unit` must be string <= 50 chars.
- **Sale Entity Invariants**:
  - `id` must be valid string <= 128 chars.
  - `timestamp` must be string <= 100 chars.
  - `items` must be a non-empty list of max 50 items.
  - `total` must be >= 0.
  - `paymentMethod` must be one of `['dinheiro', 'pix', 'cartao_debito', 'cartao_credito']`.

## 2. The "Dirty Dozen" Payloads (All MUST be rejected)
1. **Unauthenticated Write**: Creating a product with `request.auth == null`.
2. **Unverified Email**: Creating a product with `request.auth.token.email_verified == false`.
3. **Invalid Document ID (Path Injection)**: Writing to `/products/../../../etc/passwd` or oversized ID > 128 chars.
4. **Product Negative Price**: `{ id: "p1", name: "Cone", price: -10, category: "sorvete", requiresFlavors: false }`.
5. **Product Category Spoof**: `{ id: "p2", name: "Item", price: 5, category: "electronics" }`.
6. **Product Ghost Field (Shadow Update)**: `{ id: "p3", name: "Açaí", price: 10, category: "sorvete", isAdmin: true }`.
7. **Oversized Product Description**: Description string > 500 characters.
8. **Stock Negative Quantity**: `{ id: "s1", name: "Chocolate", category: "Sorvete", quantity: -5, minQuantity: 5, unit: "bolas" }`.
9. **Stock Invalid Category**: `{ id: "s2", name: "Test", category: "InvalidCategory", quantity: 10 }`.
10. **Sale Empty Items Array**: `{ id: "sale1", items: [], total: 0, paymentMethod: "pix" }`.
11. **Sale Invalid Payment Method**: `{ id: "sale2", items: [{...}], total: 10, paymentMethod: "crypto" }`.
12. **Sale Giant Array Denial-of-Wallet**: Items array with 5,000 objects.
