/* All dynamic content uses textContent. Model output is never executed here. */
const $ = (selector) => document.querySelector(selector);
let csrf = '';
let durable = false;
const capabilities = fetch('/api/health')
  .then((response) => response.json())
  .then((health) => {
    durable = health.backend === 'postgres';
    if (durable) {
      $('#backend-label').textContent = 'POSTGRESQL / SHARED INVENTORY / DEMO IDENTITY';
      $('#backend-label').hidden = false;
    }
  })
  .catch(() => {});
let checkoutKey = crypto.randomUUID();
let checkoutFingerprint = '';
const money = (cents) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
function message(text) {
  $('#message').textContent = text;
}
async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, ...options.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please retry.');
  return data;
}
function text(tag, content, className) {
  const element = document.createElement(tag);
  element.textContent = content;
  if (className) element.className = className;
  return element;
}
async function showCart() {
  const cart = await api('/cart');
  $('#cart-count').textContent = cart.count;
  $('#total').textContent = money(cart.total);
  $('#cart-items').replaceChildren();
  if (!cart.items.length)
    $('#cart-items').append(text('p', 'Your bag is waiting for something good.', 'hint'));
  for (const item of cart.items) {
    const row = text('div', '', 'cart-row');
    row.append(text('span', `${item.product.name} × ${item.quantity}`));
    const button = text('button', `Remove ${item.product.name}`);
    button.onclick = async () => {
      try {
        await api(`/cart/${item.productId}`, { method: 'DELETE' });
        await showCart();
        message('Item removed');
      } catch (e) {
        message(e.message);
      }
    };
    row.append(button);
    $('#cart-items').append(row);
  }
}
async function showProducts() {
  const params = new URLSearchParams({ q: $('#search').value, category: $('#category').value });
  const products = await api(`/products?${params}`);
  $('#products').replaceChildren();
  if (!products.length) $('#products').append(text('p', 'No products match your search.'));
  for (const product of products) {
    const article = document.createElement('article');
    const art = text('div', product.glyph, `product-art ${product.color}`);
    art.setAttribute('aria-hidden', 'true');
    article.append(
      art,
      text('p', product.category, 'eyebrow'),
      text('h3', product.name),
      text('p', money(product.price), 'price'),
    );
    const button = text('button', product.stock ? `Add ${product.name}` : 'Sold out');
    button.disabled = !product.stock;
    button.onclick = async () => {
      button.disabled = true;
      try {
        await api('/cart', {
          method: 'POST',
          body: JSON.stringify({ productId: product.id, quantity: 1 }),
        });
        await showCart();
        message(`${product.name} added to your bag`);
      } catch (e) {
        message(e.message);
      } finally {
        button.disabled = false;
      }
    };
    article.append(button);
    $('#products').append(article);
  }
}
async function showOrders() {
  if (!durable) return;
  const orders = await api('/orders');
  const container = $('#order-history');
  container.replaceChildren();
  $('#orders-panel').hidden = false;
  if (!orders.length) container.append(text('p', 'No orders for this customer yet.', 'hint'));
  for (const order of orders) {
    const row = text('article', '', 'order-card');
    row.append(
      text('h3', 'Order ' + order.id),
      text('p', money(order.total) + ' · ' + order.status),
    );
    if (order.status === 'confirmed')
      for (const [action, label] of [
        ['cancel', 'Cancel demo order'],
        ['refund', 'Simulate refund'],
      ]) {
        const button = text('button', label);
        button.onclick = async () => {
          button.disabled = true;
          try {
            await api('/orders/' + order.id + '/' + action, { method: 'POST' });
            await Promise.all([showOrders(), showProducts()]);
            message(
              action === 'cancel'
                ? 'Demo order cancelled; stock restored'
                : 'Demo refund recorded; stock restored',
            );
          } catch (error) {
            message(error.message);
            button.disabled = false;
          }
        };
        row.append(button);
      }
    container.append(row);
  }
}
async function enter(session) {
  await capabilities;
  $('#order-history').replaceChildren();
  csrf = session.csrf;
  $('#login-panel').hidden = true;
  $('#shop').hidden = false;
  $('#logout').hidden = false;
  await Promise.all([showProducts(), showCart(), showOrders()]);
}
$('#login').onsubmit = async (event) => {
  event.preventDefault();
  try {
    const session = await api('/session', {
      method: 'POST',
      body: JSON.stringify({ username: $('#username').value, password: $('#password').value }),
    });
    await enter(session);
    message('Welcome back, Demo Engineer');
  } catch (e) {
    message(e.message);
  }
};
$('#logout').onclick = async () => {
  try {
    await api('/session', { method: 'DELETE' });
    csrf = '';
    $('#shop').hidden = true;
    $('#logout').hidden = true;
    $('#login-panel').hidden = false;
    $('#password').value = '';
    $('#order-history').replaceChildren();
    $('#confirmation').hidden = true;
    message('You are signed out');
  } catch (e) {
    message(e.message);
  }
};
let searchSequence = Promise.resolve();
$('#search').oninput = $('#category').onchange = () => {
  searchSequence = searchSequence.then(showProducts).catch((e) => message(e.message));
};
$('#checkout').onsubmit = async (event) => {
  event.preventDefault();
  const button = $('#checkout button');
  button.disabled = true;
  const payload = JSON.stringify({ name: $('#name').value, address: $('#address').value });
  if (payload !== checkoutFingerprint) {
    checkoutKey = crypto.randomUUID();
    checkoutFingerprint = payload;
  }
  try {
    const order = await api('/orders', {
      method: 'POST',
      headers: { 'Idempotency-Key': checkoutKey },
      body: payload,
    });
    $('#confirmation').hidden = false;
    $('#order-detail').textContent = `Order ${order.id} · ${money(order.total)} · ${order.status}`;
    checkoutKey = crypto.randomUUID();
    checkoutFingerprint = '';
    await Promise.all([showCart(), showProducts(), showOrders()]);
    $('#confirmed-heading').focus();
    message('Your demo order is confirmed');
  } catch (e) {
    message(e.message);
  } finally {
    button.disabled = false;
  }
};
api('/session')
  .then(enter)
  .catch(() => {});
