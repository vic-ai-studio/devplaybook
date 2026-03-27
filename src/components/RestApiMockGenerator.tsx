import { useState, useMemo, useCallback } from 'preact/hooks';

// ─── Types ───────────────────────────────────────────────────────────────────

type ResourceType = 'user' | 'product' | 'order' | 'article' | 'comment' | 'company' | 'invoice' | 'event' | 'custom';
type IdFormat = 'uuid' | 'integer' | 'slug';
type HttpStatus = 200 | 201 | 400 | 401 | 403 | 404 | 422 | 500;

interface FieldDef {
  key: string;
  label: string;
  defaultOn: boolean;
}

interface ResourceDef {
  label: string;
  fields: FieldDef[];
  supportsNested: boolean;
}

// ─── Resource Templates ───────────────────────────────────────────────────────

const RESOURCES: Record<ResourceType, ResourceDef> = {
  user: {
    label: 'User',
    supportsNested: false,
    fields: [
      { key: 'id',         label: 'id',        defaultOn: true  },
      { key: 'firstName',  label: 'firstName',  defaultOn: true  },
      { key: 'lastName',   label: 'lastName',   defaultOn: true  },
      { key: 'email',      label: 'email',      defaultOn: true  },
      { key: 'role',       label: 'role',       defaultOn: true  },
      { key: 'avatar',     label: 'avatar',     defaultOn: false },
      { key: 'isActive',   label: 'isActive',   defaultOn: true  },
      { key: 'phone',      label: 'phone',      defaultOn: false },
      { key: 'bio',        label: 'bio',        defaultOn: false },
    ],
  },
  product: {
    label: 'Product',
    supportsNested: true,
    fields: [
      { key: 'id',        label: 'id',        defaultOn: true  },
      { key: 'name',      label: 'name',      defaultOn: true  },
      { key: 'slug',      label: 'slug',      defaultOn: true  },
      { key: 'price',     label: 'price',     defaultOn: true  },
      { key: 'currency',  label: 'currency',  defaultOn: true  },
      { key: 'stock',     label: 'stock',     defaultOn: true  },
      { key: 'category',  label: 'category',  defaultOn: true  },
      { key: 'imageUrl',  label: 'imageUrl',  defaultOn: false },
      { key: 'sku',       label: 'sku',       defaultOn: false },
      { key: 'rating',    label: 'rating',    defaultOn: false },
    ],
  },
  order: {
    label: 'Order',
    supportsNested: true,
    fields: [
      { key: 'id',              label: 'id',              defaultOn: true  },
      { key: 'userId',          label: 'userId',          defaultOn: true  },
      { key: 'status',          label: 'status',          defaultOn: true  },
      { key: 'total',           label: 'total',           defaultOn: true  },
      { key: 'currency',        label: 'currency',        defaultOn: true  },
      { key: 'items',           label: 'items (array)',   defaultOn: true  },
      { key: 'shippingAddress', label: 'shippingAddress', defaultOn: true  },
      { key: 'trackingNumber',  label: 'trackingNumber',  defaultOn: false },
      { key: 'notes',           label: 'notes',           defaultOn: false },
    ],
  },
  article: {
    label: 'Article / Post',
    supportsNested: true,
    fields: [
      { key: 'id',          label: 'id',          defaultOn: true  },
      { key: 'title',       label: 'title',       defaultOn: true  },
      { key: 'slug',        label: 'slug',        defaultOn: true  },
      { key: 'excerpt',     label: 'excerpt',     defaultOn: true  },
      { key: 'author',      label: 'author (obj)',defaultOn: true  },
      { key: 'tags',        label: 'tags (array)',defaultOn: true  },
      { key: 'publishedAt', label: 'publishedAt', defaultOn: true  },
      { key: 'readTime',    label: 'readTime',    defaultOn: false },
      { key: 'views',       label: 'views',       defaultOn: false },
      { key: 'coverImage',  label: 'coverImage',  defaultOn: false },
    ],
  },
  comment: {
    label: 'Comment',
    supportsNested: true,
    fields: [
      { key: 'id',       label: 'id',           defaultOn: true  },
      { key: 'postId',   label: 'postId',       defaultOn: true  },
      { key: 'author',   label: 'author (obj)', defaultOn: true  },
      { key: 'body',     label: 'body',         defaultOn: true  },
      { key: 'likes',    label: 'likes',        defaultOn: true  },
      { key: 'parentId', label: 'parentId',     defaultOn: false },
      { key: 'isPinned', label: 'isPinned',     defaultOn: false },
    ],
  },
  company: {
    label: 'Company',
    supportsNested: false,
    fields: [
      { key: 'id',         label: 'id',         defaultOn: true  },
      { key: 'name',       label: 'name',       defaultOn: true  },
      { key: 'industry',   label: 'industry',   defaultOn: true  },
      { key: 'employees',  label: 'employees',  defaultOn: true  },
      { key: 'website',    label: 'website',    defaultOn: true  },
      { key: 'country',    label: 'country',    defaultOn: true  },
      { key: 'founded',    label: 'founded',    defaultOn: false },
      { key: 'revenue',    label: 'revenue',    defaultOn: false },
      { key: 'description',label: 'description',defaultOn: false },
    ],
  },
  invoice: {
    label: 'Invoice',
    supportsNested: true,
    fields: [
      { key: 'id',        label: 'id',             defaultOn: true  },
      { key: 'invoiceNo', label: 'invoiceNumber',  defaultOn: true  },
      { key: 'customerId',label: 'customerId',     defaultOn: true  },
      { key: 'status',    label: 'status',         defaultOn: true  },
      { key: 'amount',    label: 'amount',         defaultOn: true  },
      { key: 'currency',  label: 'currency',       defaultOn: true  },
      { key: 'dueDate',   label: 'dueDate',        defaultOn: true  },
      { key: 'lineItems', label: 'lineItems (arr)',defaultOn: false },
      { key: 'taxRate',   label: 'taxRate',        defaultOn: false },
      { key: 'paidAt',    label: 'paidAt',         defaultOn: false },
    ],
  },
  event: {
    label: 'Event',
    supportsNested: true,
    fields: [
      { key: 'id',          label: 'id',             defaultOn: true  },
      { key: 'title',       label: 'title',          defaultOn: true  },
      { key: 'description', label: 'description',    defaultOn: true  },
      { key: 'startDate',   label: 'startDate',      defaultOn: true  },
      { key: 'endDate',     label: 'endDate',        defaultOn: true  },
      { key: 'location',    label: 'location',       defaultOn: true  },
      { key: 'organizer',   label: 'organizer (obj)',defaultOn: true  },
      { key: 'capacity',    label: 'capacity',       defaultOn: false },
      { key: 'isOnline',    label: 'isOnline',       defaultOn: false },
      { key: 'tags',        label: 'tags (array)',   defaultOn: false },
    ],
  },
  custom: {
    label: 'Custom',
    supportsNested: false,
    fields: [],
  },
};

// ─── Mock Data Generators ─────────────────────────────────────────────────────

const FIRST_NAMES = ['Alice', 'Bob', 'Carol', 'David', 'Eva', 'Frank', 'Grace', 'Henry', 'Iris', 'James', 'Kate', 'Leo', 'Mia', 'Noah', 'Olivia', 'Paul', 'Quinn', 'Rachel', 'Sam', 'Tara'];
const LAST_NAMES  = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Young', 'Allen', 'King'];
const INDUSTRIES  = ['Technology', 'Healthcare', 'Finance', 'Retail', 'Education', 'Manufacturing', 'Media', 'Real Estate', 'Transportation', 'Energy'];
const COUNTRIES   = ['US', 'GB', 'CA', 'DE', 'FR', 'JP', 'AU', 'SG', 'NL', 'SE'];
const CATEGORIES  = ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports', 'Beauty', 'Toys', 'Food & Beverage', 'Automotive', 'Office Supplies'];
const ORDER_STATUS = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
const INVOICE_STATUS = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
const ROLES       = ['admin', 'user', 'editor', 'viewer', 'moderator'];
const CURRENCIES  = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];
const ARTICLE_TAGS = [['javascript', 'webdev'], ['react', 'frontend'], ['nodejs', 'backend'], ['typescript', 'dev'], ['api', 'rest'], ['docker', 'devops'], ['css', 'design'], ['testing', 'qa']];
const BLOG_TITLES = [
  'Getting Started with Modern Web Development',
  'Understanding RESTful API Design Principles',
  'A Deep Dive into Async/Await in JavaScript',
  'Building Scalable Microservices with Docker',
  'The Complete Guide to TypeScript Generics',
  'Best Practices for Database Indexing',
  'Introduction to GraphQL: Beyond REST',
  'Mastering CSS Grid and Flexbox Layouts',
  'Authentication Patterns for Modern Applications',
  'Optimizing React Performance at Scale',
  'CI/CD Pipelines: From Zero to Production',
  'Designing Fault-Tolerant Distributed Systems',
];
const EXCERPTS = [
  'Explore the foundational concepts and modern tooling that every developer needs to know.',
  'Learn how to design clean, consistent, and developer-friendly APIs that scale.',
  'Dive into asynchronous programming patterns and master non-blocking code execution.',
  'A step-by-step walkthrough for containerizing and deploying production workloads.',
  'Unlock the full power of the TypeScript type system with real-world examples.',
];
const EVENT_TITLES = ['DevConf 2025', 'Tech Summit', 'Hackathon Spring', 'API World', 'Frontend Meetup', 'CloudExpo', 'Open Source Day', 'Security Conference'];
const CITIES = ['San Francisco', 'New York', 'London', 'Berlin', 'Tokyo', 'Sydney', 'Toronto', 'Amsterdam', 'Singapore', 'Paris'];
const PRODUCT_NAMES = ['Ergonomic Keyboard', 'Wireless Headphones', 'Standing Desk', 'USB-C Hub', 'Mechanical Watch', 'Smart Water Bottle', 'Laptop Stand', 'Noise-Cancelling Earbuds', 'LED Monitor', 'Webcam Pro'];

let _seed = 42;
function seededRand(max: number, salt = 0): number {
  _seed = (_seed * 1664525 + 1013904223 + salt) & 0xffffffff;
  return Math.abs(_seed) % max;
}

function resetSeed() { _seed = 1337; }

function pick<T>(arr: T[], salt = 0): T { return arr[seededRand(arr.length, salt)]; }

function genUuid(i: number): string {
  const hex = (n: number, len: number) => n.toString(16).padStart(len, '0');
  const a = seededRand(0xffffffff, i);
  const b = seededRand(0xffff, i + 1);
  const c = seededRand(0xffff, i + 2);
  const d = seededRand(0xffff, i + 3);
  const e = seededRand(0xffffffffffff, i + 4);
  return `${hex(a,8)}-${hex(b,4)}-4${hex(c & 0x0fff, 3)}-${hex((d & 0x3fff) | 0x8000, 4)}-${hex(e,12)}`;
}

function genId(format: IdFormat, index: number): string | number {
  if (format === 'uuid') return genUuid(index);
  if (format === 'integer') return index + 1;
  return `${pick(['item','record','entry','obj'], index)}-${(index + 1).toString().padStart(3, '0')}`;
}

function isoDate(daysOffset = 0): string {
  const d = new Date('2025-06-15T10:00:00Z');
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString();
}

function genNestedAuthor(i: number, idFmt: IdFormat) {
  const firstName = pick(FIRST_NAMES, i + 100);
  const lastName  = pick(LAST_NAMES, i + 200);
  return { id: genId(idFmt, i + 50), name: `${firstName} ${lastName}`, email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com` };
}

function genNestedOrganizer(i: number, idFmt: IdFormat) {
  const firstName = pick(FIRST_NAMES, i + 300);
  const lastName  = pick(LAST_NAMES, i + 400);
  return { id: genId(idFmt, i + 70), name: `${firstName} ${lastName}`, role: 'organizer' };
}

function genRecord(type: ResourceType, index: number, enabledFields: Set<string>, nested: boolean, timestamps: boolean, idFmt: IdFormat): Record<string, unknown> {
  const rec: Record<string, unknown> = {};
  const i = index * 17; // salt multiplier for variety

  const addTs = () => {
    if (timestamps) {
      rec.createdAt = isoDate(-seededRand(30, i + 90));
      rec.updatedAt = isoDate(-seededRand(10, i + 91));
    }
  };

  if (type === 'user') {
    const fn = pick(FIRST_NAMES, i);
    const ln = pick(LAST_NAMES, i + 1);
    if (enabledFields.has('id'))        rec.id        = genId(idFmt, index);
    if (enabledFields.has('firstName')) rec.firstName = fn;
    if (enabledFields.has('lastName'))  rec.lastName  = ln;
    if (enabledFields.has('email'))     rec.email     = `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`;
    if (enabledFields.has('role'))      rec.role      = pick(ROLES, i + 2);
    if (enabledFields.has('avatar'))    rec.avatar    = `https://api.dicebear.com/7.x/initials/svg?seed=${fn}${ln}`;
    if (enabledFields.has('isActive'))  rec.isActive  = seededRand(10, i + 3) > 2;
    if (enabledFields.has('phone'))     rec.phone     = `+1-555-${String(seededRand(900, i + 4) + 100)}-${String(seededRand(9000, i + 5) + 1000)}`;
    if (enabledFields.has('bio'))       rec.bio       = 'Software engineer passionate about building great products.';
    addTs();
    return rec;
  }

  if (type === 'product') {
    const name = pick(PRODUCT_NAMES, i);
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const price = (seededRand(19900, i + 1) + 100) / 100;
    const cat = pick(CATEGORIES, i + 2);
    const catSlug = cat.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (enabledFields.has('id'))       rec.id       = genId(idFmt, index);
    if (enabledFields.has('name'))     rec.name     = name;
    if (enabledFields.has('slug'))     rec.slug     = slug;
    if (enabledFields.has('price'))    rec.price    = price;
    if (enabledFields.has('currency')) rec.currency = pick(CURRENCIES, i + 3);
    if (enabledFields.has('stock'))    rec.stock    = seededRand(500, i + 4);
    if (enabledFields.has('category')) {
      rec.category = nested
        ? { id: genId(idFmt, index + 100), name: cat, slug: catSlug }
        : cat;
    }
    if (enabledFields.has('imageUrl')) rec.imageUrl = `https://picsum.photos/seed/${slug}/400/300`;
    if (enabledFields.has('sku'))      rec.sku      = `SKU-${String(seededRand(90000, i + 5) + 10000)}`;
    if (enabledFields.has('rating'))   rec.rating   = { average: Math.round((3 + seededRand(20, i + 6) / 10) * 10) / 10, count: seededRand(500, i + 7) };
    addTs();
    return rec;
  }

  if (type === 'order') {
    const itemCount = seededRand(3, i) + 1;
    const items = Array.from({ length: itemCount }, (_, j) => ({
      productId: genId(idFmt, j + index * 10),
      name:      pick(PRODUCT_NAMES, i + j),
      qty:       seededRand(4, i + j * 3) + 1,
      price:     (seededRand(9900, i + j * 7) + 100) / 100,
    }));
    const total = items.reduce((s, it) => s + it.qty * it.price, 0);
    if (enabledFields.has('id'))              rec.id             = genId(idFmt, index);
    if (enabledFields.has('userId'))          rec.userId         = genId(idFmt, index + 200);
    if (enabledFields.has('status'))          rec.status         = pick(ORDER_STATUS, i + 1);
    if (enabledFields.has('total'))           rec.total          = Math.round(total * 100) / 100;
    if (enabledFields.has('currency'))        rec.currency       = pick(CURRENCIES, i + 2);
    if (enabledFields.has('items'))           rec.items          = items;
    if (enabledFields.has('shippingAddress')) rec.shippingAddress = nested
      ? { street: `${seededRand(999, i + 3) + 1} Main St`, city: pick(CITIES, i + 4), country: pick(COUNTRIES, i + 5), zip: `${String(seededRand(90000, i + 6) + 10000)}` }
      : `${seededRand(999, i + 3) + 1} Main St, ${pick(CITIES, i + 4)}`;
    if (enabledFields.has('trackingNumber')) rec.trackingNumber = `TRK${String(seededRand(9000000, i + 7) + 1000000)}`;
    if (enabledFields.has('notes'))          rec.notes          = null;
    addTs();
    return rec;
  }

  if (type === 'article') {
    const title = pick(BLOG_TITLES, i);
    const slug  = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (enabledFields.has('id'))          rec.id          = genId(idFmt, index);
    if (enabledFields.has('title'))       rec.title       = title;
    if (enabledFields.has('slug'))        rec.slug        = slug;
    if (enabledFields.has('excerpt'))     rec.excerpt     = pick(EXCERPTS, i + 1);
    if (enabledFields.has('author'))      rec.author      = nested ? genNestedAuthor(index, idFmt) : genId(idFmt, index + 50);
    if (enabledFields.has('tags'))        rec.tags        = pick(ARTICLE_TAGS, i + 2);
    if (enabledFields.has('publishedAt')) rec.publishedAt = isoDate(-seededRand(60, i + 3));
    if (enabledFields.has('readTime'))    rec.readTime    = `${seededRand(12, i + 4) + 3} min`;
    if (enabledFields.has('views'))       rec.views       = seededRand(50000, i + 5) + 100;
    if (enabledFields.has('coverImage'))  rec.coverImage  = `https://picsum.photos/seed/${slug}/800/400`;
    addTs();
    return rec;
  }

  if (type === 'comment') {
    const fn = pick(FIRST_NAMES, i);
    const ln = pick(LAST_NAMES, i + 1);
    if (enabledFields.has('id'))       rec.id       = genId(idFmt, index);
    if (enabledFields.has('postId'))   rec.postId   = genId(idFmt, index + 300);
    if (enabledFields.has('author'))   rec.author   = nested ? genNestedAuthor(index, idFmt) : `${fn} ${ln}`;
    if (enabledFields.has('body'))     rec.body     = pick(['Great article, very helpful!', 'Thanks for sharing this.', 'I had the same issue and this solved it.', 'Could you expand on this topic?', 'Really well written, bookmarked.', 'I disagree with the last point, but overall solid post.'], i + 2);
    if (enabledFields.has('likes'))    rec.likes    = seededRand(200, i + 3);
    if (enabledFields.has('parentId')) rec.parentId = seededRand(5, i + 4) === 0 ? genId(idFmt, seededRand(100, i + 5)) : null;
    if (enabledFields.has('isPinned')) rec.isPinned = false;
    addTs();
    return rec;
  }

  if (type === 'company') {
    const name = `${pick(['Acme', 'Globex', 'Initech', 'Umbrella', 'Oscorp', 'Stark', 'Wayne', 'Aperture', 'Black Mesa', 'Weyland-Yutani', 'Vault-Tec', 'Cyberdyne'], i)} ${pick(['Corp', 'Inc', 'Ltd', 'Technologies', 'Systems', 'Solutions', 'Group', 'Holdings'], i + 1)}`;
    if (enabledFields.has('id'))          rec.id          = genId(idFmt, index);
    if (enabledFields.has('name'))        rec.name        = name;
    if (enabledFields.has('industry'))    rec.industry    = pick(INDUSTRIES, i + 2);
    if (enabledFields.has('employees'))   rec.employees   = (seededRand(50, i + 3) + 1) * 100;
    if (enabledFields.has('website'))     rec.website     = `https://www.${name.split(' ')[0].toLowerCase()}.com`;
    if (enabledFields.has('country'))     rec.country     = pick(COUNTRIES, i + 4);
    if (enabledFields.has('founded'))     rec.founded     = 1980 + seededRand(44, i + 5);
    if (enabledFields.has('revenue'))     rec.revenue     = `$${seededRand(900, i + 6) + 100}M`;
    if (enabledFields.has('description')) rec.description = `${name} is a leading provider of innovative solutions in the ${pick(INDUSTRIES, i + 2).toLowerCase()} sector.`;
    addTs();
    return rec;
  }

  if (type === 'invoice') {
    const amount = (seededRand(99900, i) + 1000) / 100;
    const tax    = Math.round(amount * 0.1 * 100) / 100;
    const dueOffset = seededRand(30, i + 1) + 7;
    if (enabledFields.has('id'))         rec.id            = genId(idFmt, index);
    if (enabledFields.has('invoiceNo'))  rec.invoiceNumber = `INV-${new Date().getFullYear()}-${String(index + 1).padStart(4, '0')}`;
    if (enabledFields.has('customerId')) rec.customerId    = genId(idFmt, index + 400);
    if (enabledFields.has('status'))     rec.status        = pick(INVOICE_STATUS, i + 2);
    if (enabledFields.has('amount'))     rec.amount        = amount;
    if (enabledFields.has('currency'))   rec.currency      = pick(CURRENCIES, i + 3);
    if (enabledFields.has('dueDate'))    rec.dueDate       = isoDate(dueOffset).split('T')[0];
    if (enabledFields.has('lineItems'))  rec.lineItems     = nested
      ? [{ description: pick(PRODUCT_NAMES, i + 4), quantity: seededRand(5, i + 5) + 1, unitPrice: (seededRand(9900, i + 6) + 100) / 100 }]
      : undefined;
    if (enabledFields.has('taxRate'))    rec.taxRate       = 0.1;
    if (enabledFields.has('paidAt'))     rec.paidAt        = rec.status === 'paid' ? isoDate(-seededRand(5, i + 7)) : null;
    addTs();
    return rec;
  }

  if (type === 'event') {
    const title = pick(EVENT_TITLES, i);
    const start = isoDate(seededRand(60, i + 1) + 7);
    const end   = new Date(new Date(start).getTime() + (seededRand(3, i + 2) + 1) * 86400000).toISOString();
    if (enabledFields.has('id'))          rec.id          = genId(idFmt, index);
    if (enabledFields.has('title'))       rec.title       = `${title} ${2025 + seededRand(2, i + 3)}`;
    if (enabledFields.has('description')) rec.description = `Join us for ${title}, the premier gathering of industry professionals and innovators.`;
    if (enabledFields.has('startDate'))   rec.startDate   = start;
    if (enabledFields.has('endDate'))     rec.endDate     = end;
    if (enabledFields.has('location'))    rec.location    = nested
      ? { city: pick(CITIES, i + 4), country: pick(COUNTRIES, i + 5), venue: `${pick(CITIES, i + 4)} Convention Center` }
      : `${pick(CITIES, i + 4)}, ${pick(COUNTRIES, i + 5)}`;
    if (enabledFields.has('organizer'))   rec.organizer   = nested ? genNestedOrganizer(index, idFmt) : `${pick(FIRST_NAMES, i + 6)} ${pick(LAST_NAMES, i + 7)}`;
    if (enabledFields.has('capacity'))    rec.capacity    = (seededRand(20, i + 8) + 1) * 50;
    if (enabledFields.has('isOnline'))    rec.isOnline    = seededRand(4, i + 9) === 0;
    if (enabledFields.has('tags'))        rec.tags        = pick(ARTICLE_TAGS, i + 10);
    addTs();
    return rec;
  }

  return rec;
}

function buildErrorResponse(status: HttpStatus): Record<string, unknown> {
  const map: Record<number, Record<string, unknown>> = {
    400: { error: { code: 'BAD_REQUEST', message: 'The request was invalid or cannot be served.', details: [{ field: 'email', message: 'Must be a valid email address.' }] } },
    401: { error: { code: 'UNAUTHORIZED', message: 'Authentication credentials were missing or incorrect.' } },
    403: { error: { code: 'FORBIDDEN', message: 'You do not have permission to access this resource.' } },
    404: { error: { code: 'NOT_FOUND', message: 'The requested resource could not be found.' } },
    422: { error: { code: 'UNPROCESSABLE_ENTITY', message: 'Validation failed.', errors: { name: ['Name is required.'], price: ['Price must be a positive number.'] } } },
    500: { error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred. Please try again later.' } },
  };
  return map[status] ?? { error: { code: 'UNKNOWN_ERROR', message: 'Something went wrong.' } };
}

// ─── Component ────────────────────────────────────────────────────────────────

const DEFAULT_CUSTOM_SCHEMA = `{
  "id": 1,
  "name": "Example Record",
  "value": 42,
  "active": true,
  "tags": ["foo", "bar"],
  "meta": {
    "source": "api",
    "version": "1.0"
  }
}`;

const SUCCESS_STATUSES: HttpStatus[] = [200, 201];
const ERROR_STATUSES: HttpStatus[]   = [400, 401, 403, 404, 422, 500];

export default function RestApiMockGenerator() {
  const [resourceType, setResourceType] = useState<ResourceType>('user');
  const [count, setCount]               = useState(3);
  const [useWrapper, setUseWrapper]     = useState(true);
  const [httpStatus, setHttpStatus]     = useState<HttpStatus>(200);
  const [nested, setNested]             = useState(true);
  const [timestamps, setTimestamps]     = useState(true);
  const [idFormat, setIdFormat]         = useState<IdFormat>('uuid');
  const [customSchema, setCustomSchema] = useState(DEFAULT_CUSTOM_SCHEMA);
  const [customSchemaError, setCustomSchemaError] = useState('');
  const [copied, setCopied]             = useState(false);
  const [downloaded, setDownloaded]     = useState(false);

  // Per-resource enabled fields — initialised from defaultOn
  const [enabledFields, setEnabledFields] = useState<Record<ResourceType, Set<string>>>(() => {
    const init = {} as Record<ResourceType, Set<string>>;
    for (const [rt, def] of Object.entries(RESOURCES) as [ResourceType, ResourceDef][]) {
      init[rt] = new Set(def.fields.filter(f => f.defaultOn).map(f => f.key));
    }
    return init;
  });

  const toggleField = useCallback((field: string) => {
    setEnabledFields(prev => {
      const next = new Set(prev[resourceType]);
      next.has(field) ? next.delete(field) : next.add(field);
      return { ...prev, [resourceType]: next };
    });
  }, [resourceType]);

  const isError = !SUCCESS_STATUSES.includes(httpStatus);

  const output = useMemo((): string => {
    if (isError) {
      const body = buildErrorResponse(httpStatus);
      return JSON.stringify({ status: httpStatus, ...body }, null, 2);
    }

    if (resourceType === 'custom') {
      try {
        const parsed = JSON.parse(customSchema);
        const records = Array.from({ length: count }, (_, i) => {
          if (typeof parsed !== 'object' || Array.isArray(parsed)) return parsed;
          const rec: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(parsed)) {
            // Vary numeric values slightly per record
            if (typeof v === 'number') rec[k] = i === 0 ? v : v + i;
            else if (typeof v === 'string' && !isNaN(Number(v))) rec[k] = String(Number(v) + i);
            else rec[k] = v;
          }
          if (timestamps) {
            rec.createdAt = isoDate(-i * 3);
            rec.updatedAt = isoDate(-i);
          }
          return rec;
        });
        const data = count === 1 ? records[0] : records;
        if (useWrapper && count > 1) {
          return JSON.stringify({ data: records, meta: { total: count, page: 1, limit: 20 } }, null, 2);
        }
        return JSON.stringify(data, null, 2);
      } catch {
        return '// Invalid JSON schema — please fix the editor above.';
      }
    }

    resetSeed();
    const fields = enabledFields[resourceType];
    const records = Array.from({ length: count }, (_, i) =>
      genRecord(resourceType, i, fields, nested, timestamps, idFormat)
    );

    if (useWrapper) {
      return JSON.stringify({ data: records, meta: { total: count, page: 1, limit: 20 } }, null, 2);
    }
    return JSON.stringify(records, null, 2);
  }, [resourceType, count, useWrapper, httpStatus, isError, nested, timestamps, idFormat, enabledFields, customSchema]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = output;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `mock-${resourceType}-${httpStatus}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  const handleCustomSchemaChange = (val: string) => {
    setCustomSchema(val);
    try { JSON.parse(val); setCustomSchemaError(''); } catch (e: unknown) { setCustomSchemaError(String(e)); }
  };

  const resDef = RESOURCES[resourceType];

  return (
    <div class="space-y-5">

      {/* ── Row 1: Resource + Count ── */}
      <div class="bg-bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 class="text-sm font-semibold text-text-muted uppercase tracking-wide">Configuration</h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Resource type */}
          <div>
            <label class="block text-xs text-text-muted mb-1.5">Resource Type</label>
            <div class="grid grid-cols-3 gap-1.5">
              {(Object.entries(RESOURCES) as [ResourceType, ResourceDef][]).map(([rt, def]) => (
                <button
                  key={rt}
                  onClick={() => setResourceType(rt)}
                  class={`text-xs px-2 py-1.5 rounded-lg border transition-colors truncate ${
                    resourceType === rt
                      ? 'bg-primary/20 border-primary text-primary font-medium'
                      : 'bg-bg border-border text-text-muted hover:border-primary/50'
                  }`}
                >
                  {def.label}
                </button>
              ))}
            </div>
          </div>

          {/* Count + ID format */}
          <div class="space-y-3">
            <div>
              <label class="block text-xs text-text-muted mb-1.5">
                Record Count: <span class="text-text font-semibold">{count}</span>
              </label>
              <input
                type="range" min={1} max={20} value={count}
                class="w-full accent-primary"
                onInput={(e) => setCount(Number((e.target as HTMLInputElement).value))}
              />
              <div class="flex justify-between text-xs text-text-muted mt-0.5">
                <span>1</span><span>10</span><span>20</span>
              </div>
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1.5">ID Format</label>
              <div class="flex gap-1.5">
                {(['uuid', 'integer', 'slug'] as IdFormat[]).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setIdFormat(fmt)}
                    class={`flex-1 text-xs px-2 py-1.5 rounded-lg border transition-colors ${
                      idFormat === fmt
                        ? 'bg-primary/20 border-primary text-primary font-medium'
                        : 'bg-bg border-border text-text-muted hover:border-primary/50'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Toggles row */}
        <div class="flex flex-wrap gap-4 pt-1">
          {[
            { label: 'Response Wrapper', sub: '{ data: [...], meta: {...} }', val: useWrapper, set: setUseWrapper, disabled: isError },
            { label: 'Nested Objects',   sub: 'author: { id, name, email }',  val: nested,     set: setNested,     disabled: isError || resourceType === 'custom' || !resDef.supportsNested },
            { label: 'Timestamps',       sub: 'createdAt / updatedAt',         val: timestamps, set: setTimestamps, disabled: isError || resourceType === 'custom' },
          ].map(({ label, sub, val, set, disabled }) => (
            <label
              key={label}
              class={`flex items-start gap-2.5 cursor-pointer group ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
            >
              <button
                role="switch"
                aria-checked={val}
                onClick={() => set(!val)}
                class={`mt-0.5 relative flex-shrink-0 w-9 h-5 rounded-full transition-colors ${val ? 'bg-primary' : 'bg-border'}`}
              >
                <span class={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${val ? 'translate-x-4' : ''}`} />
              </button>
              <span>
                <span class="text-sm font-medium block">{label}</span>
                <span class="text-xs text-text-muted">{sub}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* ── Row 2: HTTP Status + Field Checkboxes ── */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* HTTP Status */}
        <div class="bg-bg-card border border-border rounded-xl p-4">
          <label class="block text-xs text-text-muted mb-3 font-semibold uppercase tracking-wide">HTTP Status Code</label>
          <div class="space-y-2">
            <div class="flex gap-1.5 flex-wrap">
              {SUCCESS_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => setHttpStatus(s)}
                  class={`text-xs px-3 py-1.5 rounded-lg border transition-colors font-mono ${
                    httpStatus === s
                      ? 'bg-green-500/20 border-green-500/60 text-green-400'
                      : 'bg-bg border-border text-text-muted hover:border-green-500/40'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div class="flex gap-1.5 flex-wrap">
              {ERROR_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => setHttpStatus(s)}
                  class={`text-xs px-3 py-1.5 rounded-lg border transition-colors font-mono ${
                    httpStatus === s
                      ? 'bg-red-500/20 border-red-500/60 text-red-400'
                      : 'bg-bg border-border text-text-muted hover:border-red-500/40'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {isError && (
              <p class="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mt-1">
                Error status selected — showing appropriate error response format. Field/count settings are ignored.
              </p>
            )}
          </div>
        </div>

        {/* Field checkboxes */}
        <div class="bg-bg-card border border-border rounded-xl p-4">
          <label class="block text-xs text-text-muted mb-3 font-semibold uppercase tracking-wide">
            Fields to Include
          </label>
          {resourceType === 'custom' ? (
            <p class="text-xs text-text-muted">Define your schema in the editor below.</p>
          ) : (
            <div class="grid grid-cols-2 gap-1.5">
              {resDef.fields.map(f => (
                <label key={f.key} class={`flex items-center gap-2 cursor-pointer group ${isError ? 'opacity-40 pointer-events-none' : ''}`}>
                  <input
                    type="checkbox"
                    class="accent-primary w-3.5 h-3.5"
                    checked={enabledFields[resourceType].has(f.key)}
                    onChange={() => toggleField(f.key)}
                  />
                  <span class="text-xs font-mono text-text-muted group-hover:text-text transition-colors">{f.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Custom Schema Editor ── */}
      {resourceType === 'custom' && (
        <div class="bg-bg-card border border-border rounded-xl p-4">
          <label class="block text-xs text-text-muted mb-2 font-semibold uppercase tracking-wide">Custom JSON Schema (single record template)</label>
          <textarea
            class={`w-full bg-bg border rounded-lg p-3 font-mono text-xs text-text resize-y min-h-[160px] focus:ring-2 focus:ring-primary outline-none transition-colors ${customSchemaError ? 'border-red-500/60' : 'border-border'}`}
            value={customSchema}
            onInput={(e) => handleCustomSchemaChange((e.target as HTMLTextAreaElement).value)}
            spellcheck={false}
          />
          {customSchemaError && (
            <p class="text-xs text-red-400 mt-1">{customSchemaError}</p>
          )}
          <p class="text-xs text-text-muted mt-1">Define the shape of a single record. Multiple records are generated from this template.</p>
        </div>
      )}

      {/* ── Output ── */}
      <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 border-b border-border bg-bg">
          <div class="flex items-center gap-3">
            <span class="text-xs font-semibold text-text-muted uppercase tracking-wide">Generated JSON</span>
            <span class={`text-xs font-mono px-2 py-0.5 rounded border font-semibold ${
              isError
                ? 'bg-red-500/10 border-red-500/40 text-red-400'
                : 'bg-green-500/10 border-green-500/40 text-green-400'
            }`}>
              HTTP {httpStatus}
            </span>
            {!isError && (
              <span class="text-xs text-text-muted">
                {count} record{count !== 1 ? 's' : ''} · {RESOURCES[resourceType].label}
              </span>
            )}
          </div>
          <div class="flex gap-2">
            <button
              onClick={handleCopy}
              class={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                copied
                  ? 'bg-green-500/20 border-green-500/60 text-green-400'
                  : 'bg-bg border-border text-text-muted hover:border-primary hover:text-text'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              class={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                downloaded
                  ? 'bg-green-500/20 border-green-500/60 text-green-400'
                  : 'bg-bg border-border text-text-muted hover:border-primary hover:text-text'
              }`}
            >
              {downloaded ? 'Saved!' : 'Download .json'}
            </button>
          </div>
        </div>
        <pre class="overflow-auto p-4 text-xs font-mono leading-relaxed text-text max-h-[520px]"><code>{output}</code></pre>
      </div>

    </div>
  );
}
