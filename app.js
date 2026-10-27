
const $ = id => document.getElementById(id);

function loadData(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return Array.isArray(fallback) && !Array.isArray(value)
            ? fallback : value ?? fallback;
    } catch {
        return fallback;
    }
}

let inventory = loadData("smartStockProducts", []);
let cart = [];
let totalSales = Number(localStorage.getItem("smartStockSales")) || 0;

function saveData() {
    localStorage.setItem("smartStockProducts", JSON.stringify(inventory));
    localStorage.setItem("smartStockSales", String(totalSales));
}

function money(amount) {
    return "₹" + amount.toFixed(2);
}

function makeCell(row, text) {
    const cell = document.createElement("td");
    cell.textContent = text;
    row.appendChild(cell);
    return cell;
}

function renderInventory() {
    const list = $("productList");
    const search = $("search").value.toLowerCase();

    list.replaceChildren();

    const filtered = inventory.filter(product =>
        (product.name + " " + product.category)
            .toLowerCase().includes(search)
    );

    filtered.forEach(product => {
        const row = document.createElement("tr");
        makeCell(row, product.name);
        makeCell(row, product.category);
        makeCell(row, money(product.price));
        makeCell(row, String(product.stock));

        const action = makeCell(row, "");
        const button = document.createElement("button");
        button.className = "delete-btn";
        button.textContent = "Delete";

        button.addEventListener("click", () => {
            if (cart.some(item => item.id === product.id)) {
                showMessage("Remove this product from the bill first.", true);
                return;
            }

            inventory = inventory.filter(item => item.id !== product.id);
            saveData();
            renderAll();
        });

        action.appendChild(button);
        list.appendChild(row);
    });

    $("emptyInventory").hidden = filtered.length > 0;
    $("totalProducts").textContent = inventory.length;
    $("totalStock").textContent = inventory.reduce(
        (sum, item) => sum + item.stock, 0
    );
    $("inventoryValue").textContent = money(inventory.reduce(
        (sum, item) => sum + item.price * item.stock, 0
    ));
    $("totalSales").textContent = money(totalSales);

    renderProductOptions();
}

function renderProductOptions() {
    const select = $("billProduct");
    const previous = select.value;

    select.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a product";
    select.appendChild(placeholder);

    inventory.filter(item => item.stock > 0).forEach(item => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent =
            `${item.name} — ${money(item.price)} (${item.stock} available)`;
        select.appendChild(option);
    });

    if ([...select.options].some(option => option.value === previous)) {
        select.value = previous;
    }
}

function renderCart() {
    const list = $("cartList");
    list.replaceChildren();

    cart.forEach(item => {
        const row = document.createElement("tr");
        makeCell(row, item.name);
        makeCell(row, money(item.price));
        makeCell(row, String(item.quantity));
        makeCell(row, money(item.price * item.quantity));

        const action = makeCell(row, "");
        const button = document.createElement("button");
        button.className = "delete-btn";
        button.textContent = "Remove";

        button.addEventListener("click", () => {
            cart = cart.filter(entry => entry.id !== item.id);
            renderCart();
            renderProductOptions();
            showMessage("");
        });

        action.appendChild(button);
        list.appendChild(row);
    });

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    $("billTotal").textContent = money(total);
}

function renderAll() {
    renderInventory();
    renderCart();
}

function showMessage(message, error = false) {
    $("message").textContent = message;
    $("message").style.color = error ? "#b91c1c" : "#15803d";
}

$("productForm").addEventListener("submit", event => {
    event.preventDefault();

    const name = $("productName").value.trim();
    const category = $("category").value.trim();
    const price = Number($("price").value);
    const stock = Number($("stock").value);

    if (!name || !category || !Number.isFinite(price) ||
        price <= 0 || !Number.isSafeInteger(stock) || stock < 0) {
        showMessage("Enter valid product details.", true);
        return;
    }

    inventory.push({
        id: crypto.randomUUID(),
        name,
        category,
        price,
        stock
    });

    saveData();
    renderAll();
    event.target.reset();
    showMessage("Product added successfully.");
});

$("search").addEventListener("input", renderInventory);

$("billingForm").addEventListener("submit", event => {
    event.preventDefault();

    const id = $("billProduct").value;
    const quantity = Number($("billQuantity").value);
    const product = inventory.find(item => item.id === id);

    if (!product || !Number.isSafeInteger(quantity) || quantity < 1) {
        showMessage("Select a product and enter a valid quantity.", true);
        return;
    }

    const existing = cart.find(item => item.id === id);
    const alreadyAdded = existing ? existing.quantity : 0;

    if (quantity + alreadyAdded > product.stock) {
        showMessage("Quantity exceeds available stock.", true);
        return;
    }

    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity
        });
    }

    renderCart();
    renderProductOptions();
    showMessage("Product added to bill.");
});

$("checkout").addEventListener("click", () => {
    if (cart.length === 0) {
        showMessage("Add products to the bill first.", true);
        return;
    }

    // Validate stock again before completing the sale.
    for (const item of cart) {
        const product = inventory.find(entry => entry.id === item.id);

        if (!product || product.stock < item.quantity) {
            showMessage("Insufficient stock. Please update your bill.", true);
            return;
        }
    }

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    inventory.forEach(product => {
        const sold = cart.find(item => item.id === product.id);
        if (sold) product.stock -= sold.quantity;
    });

    totalSales += total;
    cart = [];

    saveData();
    renderAll();
    showMessage("Sale completed! Total: " + money(total));
});

$("clearCart").addEventListener("click", () => {
    cart = [];
    renderCart();
    renderProductOptions();
    showMessage("Bill cleared.");
});

renderAll();
