const DEFAULT_PRODUCTS = [
  {
    id: 1,
    title: "Velore Classic Heels",
    price: 39.99,
    category: "Shoes",
    image: "/image/products/shoe-1.jpg",
    description: "Elegant heels with a soft premium finish."
  },
  {
    id: 2,
    title: "Velore Signature Bag",
    price: 74.00,
    category: "Bags",
    image: "/image/products/bag-1.jpg",
    description: "Refined luxury bag for everyday elegance."
  },
  {
    id: 3,
    title: "Velore Soft Perfume",
    price: 29.50,
    category: "Perfume",
    image: "/image/products/perfume-1.jpg",
    description: "A calm, feminine scent with warm notes."
  }
];

function getProducts() {
  return JSON.parse(localStorage.getItem("velore_products") || "null") || DEFAULT_PRODUCTS;
}

const page = document.getElementById("productPage");
const id = window.location.pathname.split("/").pop();
const products = getProducts();
const product = products.find(p => String(p.id) === String(id)) || products[0];

document.title = `VELORÉ | ${product.title}`;

page.innerHTML = `
  <div class="product-page">
    <img src="${product.image}" alt="${product.title}">
    <div class="product-meta">
      <div class="product-category">${product.category}</div>
      <h1>${product.title}</h1>
      <p>${product.description || ""}</p>
      <div class="product-price">${Number(product.price).toFixed(2)} $</div>
      <a href="/" class="primary-btn" style="width:max-content;">Back to Home</a>
    </div>
  </div>
`;