```javascript
const STORAGE_KEY = "smartInventoryProducts";
const INVOICE_KEY = "smartInventoryInvoice";

let products = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || [
    { id: 1, name: "LED Bulb", price: 120, stock: 40 },
    { id: 2, name: "Copper Wire", price: 35, stock: 100 },
    { id: 3, name: "Switch", price: 85, stock: 30 },
    { id: 4, name: "Ceiling Fan", price: 1850, stock: 8 }
];

let cart = [];
let currentBill = null;

const $ = id => document.getElementById(id);

const money = amount =>
    "₹" + Number(amount).toFixed(2);

function saveProducts() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function renderInventory() {
    $("inventoryList").innerHTML = products.map(product => `
        <tr>
            <td>${escapeHTML(product.name)}</td>
            <td>${money(product.price)}</td>
            <td>${product.stock}</td>
        </tr>
    `).join("");

    const available = products.filter(product => product.stock > 0);

    $("productSelect").innerHTML = available.map(product => `
        <option value="${product.id}">
            ${escapeHTML(product.name)} - ${money(product.price)}
            (Stock: ${product.stock})
        </option>
    `).join("") || `<option value="">No stock available</option>`;
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

$("productForm").addEventListener("submit", event => {
    event.preventDefault();

    const name = $("productName").value.trim();
    const price = Number($("productPrice").value);
    const stock = Number($("productStock").value);

    if (!name || !Number.isFinite(price) || price <= 0 ||
        !Number.isInteger(stock) || stock < 0) {
        alert("Enter valid product details.");
        return;
    }

    products.push({
        id: Date.now(),
        name,
        price,
        stock
    });

    saveProducts();
    renderInventory();
    event.target.reset();

    alert("Product added successfully.");
});

$("addItem").addEventListener("click", () => {
    const id = Number($("productSelect").value);
    const product = products.find(item => item.id === id);
    const quantity = Number($("quantity").value);

    if (!product || !Number.isInteger(quantity) || quantity < 1) {
        alert("Select a product and enter a valid quantity.");
        return;
    }

    const existing = cart.find(item => item.id === id);
    const newQuantity = quantity + (existing ? existing.quantity : 0);

    if (newQuantity > product.stock) {
        alert(`Only ${product.stock} unit(s) are available.`);
        return;
    }

    if (existing) {
        existing.quantity = newQuantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity
        });
    }

    renderCart();
});

function renderCart() {
    $("billItems").innerHTML = cart.map(item => `
        <tr>
            <td>${escapeHTML(item.name)}</td>
            <td>${money(item.price)}</td>
            <td>${item.quantity}</td>
            <td>${money(item.price * item.quantity)}</td>
            <td>
                <button class="remove-item"
                    data-remove="${item.id}" type="button">×</button>
            </td>
        </tr>
    `).join("");

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    $("grandTotal").textContent = money(total);
    currentBill = null;
    $("billPreview").innerHTML = "";
}

$("billItems").addEventListener("click", event => {
    const button = event.target.closest("[data-remove]");
    if (!button) return;

    cart = cart.filter(item => item.id !== Number(button.dataset.remove));
    renderCart();
});

$("generateBill").addEventListener("click", () => {
    if (cart.length === 0) {
        alert("Add at least one product to the bill.");
        return;
    }

    for (const item of cart) {
        const product = products.find(p => p.id === item.id);

        if (!product || item.quantity > product.stock) {
            alert(`Please check stock for ${item.name}.`);
            return;
        }
    }

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    currentBill = {
        number: "INV-" + Date.now(),
        date: new Date().toLocaleString("en-IN"),
        customer: $("customerName").value.trim() || "Walk-in Customer",
        phone: $("customerPhone").value.trim(),
        items: cart.map(item => ({ ...item })),
        total
    };

    $("billPreview").innerHTML = `
        <div class="invoice">
            <h2>INVOICE</h2>
            <p><b>Invoice No:</b> ${escapeHTML(currentBill.number)}</p>
            <p><b>Date:</b> ${escapeHTML(currentBill.date)}</p>
            <p><b>Customer:</b> ${escapeHTML(currentBill.customer)}</p>
            <table>
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Qty</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${currentBill.items.map(item => `
                        <tr>
                            <td>${escapeHTML(item.name)}</td>
                            <td>${money(item.price)}</td>
                            <td>${item.quantity}</td>
                            <td>${money(item.price * item.quantity)}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
            <h3>Grand Total: ${money(currentBill.total)}</h3>
            <p>Thank you for your purchase!</p>
        </div>
    `;

    localStorage.setItem(INVOICE_KEY, JSON.stringify(currentBill));
    alert("Bill generated successfully.");
});

$("printBill").addEventListener("click", () => {
    if (!currentBill) {
        alert("Generate the bill first.");
        return;
    }

    window.print();
});

$("whatsappBill").addEventListener("click", () => {
    if (!currentBill) {
        alert("Generate the bill first.");
        return;
    }

    const phone = $("customerPhone").value.replace(/\D/g, "");

    if (phone.length < 8 || phone.length > 15) {
        alert("Enter a valid WhatsApp number with country code, e.g. 91XXXXXXXXXX.");
        return;
    }

    const message = [
        `*INVOICE ${currentBill.number}*`,
        `Date: ${currentBill.date}`,
        `Customer: ${currentBill.customer}`,
        "",
        "*Products:*",
        ...currentBill.items.map(item =>
            `${item.name} - ${item.quantity} x ${money(item.price)} = ${money(item.price * item.quantity)}`
        ),
        "",
        `*Grand Total: ${money(currentBill.total)}*`,
        "",
        "Thank you for your purchase!"
    ].join("\n");

    const url =
        "https://wa.me/" + phone + "?text=" + encodeURIComponent(message);

    window.open(url, "_blank", "noopener,noreferrer");
});

renderInventory();
renderCart();
```
