import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { query, pool } from "./db.js"; // keep .js if db.js is still JS
import paymentsRouter from "./routes/payments.js";
import webhooksRouter from "./routes/webhooks.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../webinar/.env") });

const app = express();

// middleware
app.use(cors());
app.use(
  express.json({
    verify: (req, _res, buf) => {
      if (buf?.length) req.rawBody = buf;
    },
  })
);

const toPositiveInt = (value, fallback) => {
  const num = Number(value);
  return Number.isInteger(num) && num >= 0 ? num : fallback;
};

const toRequiredPositiveInt = (value) => {
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : null;
};

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/payments", paymentsRouter);
app.use("/api/webhooks", webhooksRouter);

// get ALL events (limit 4 for homepage, you can change/remove LIMIT)
app.get("/api/events", async (req, res) => {
  try {
    const result = await query(
      `
      SELECT
        id,
        banner_image_url,
        title,
        description,
        event_date,
        start_time,
        end_time,
        cta_label,
        cta_url,
        duration_hours
      FROM events
      ORDER BY id ASC
       
      `,
    );

    res.json(result.rows); // <-- array
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// get ALL books
app.get("/api/books", async (req, res) => {
  const limit = toPositiveInt(req.query.limit, 50);
  const offset = toPositiveInt(req.query.offset, 0);

  try {
    const result = await query(
      `
      SELECT
        id,
        slug,
        title,
        price_cents,
        currency,
        cover_image_url,
        short_description,
        details
      FROM books
      WHERE is_active = true
      ORDER BY id ASC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching books:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// get one book by slug
app.get("/api/books/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    const bookResult = await query(
      `
      SELECT
        id,
        slug,
        title,
        price_cents,
        currency,
        cover_image_url,
        short_description,
        details
      FROM books
      WHERE slug = $1
        AND is_active = true
      LIMIT 1
      `,
      [slug],
    );

    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    const book = bookResult.rows[0];
    const imagesResult = await query(
      `
      SELECT image_url
      FROM book_images
      WHERE book_id = $1
      ORDER BY sort_order ASC, id ASC
      `,
      [book.id],
    );

    res.json({
      ...book,
      images: imagesResult.rows.map((row) => row.image_url),
    });
  } catch (err) {
    console.error("Error fetching book:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// get related books
app.get("/api/books/:slug/related", async (req, res) => {
  const { slug } = req.params;

  try {
    const bookResult = await query(
      `
      SELECT id
      FROM books
      WHERE slug = $1
        AND is_active = true
      LIMIT 1
      `,
      [slug],
    );

    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    const bookId = bookResult.rows[0].id;

    const manualResult = await query(
      `
      SELECT
        b.id,
        b.slug,
        b.title,
        b.price_cents,
        b.currency,
        b.cover_image_url
      FROM related_books rb
      JOIN books b ON b.id = rb.related_book_id
      WHERE rb.book_id = $1
        AND b.is_active = true
      ORDER BY rb.sort_order ASC, rb.related_book_id ASC
      LIMIT 8
      `,
      [bookId],
    );

    if (manualResult.rows.length > 0) {
      return res.json(manualResult.rows);
    }

    const categoryResult = await query(
      `
      SELECT DISTINCT
        b.id,
        b.slug,
        b.title,
        b.price_cents,
        b.currency,
        b.cover_image_url
      FROM book_categories bc
      JOIN book_categories bc2 ON bc2.category_id = bc.category_id
      JOIN books b ON b.id = bc2.book_id
      WHERE bc.book_id = $1
        AND b.id <> $1
        AND b.is_active = true
      ORDER BY b.id ASC
      LIMIT 8
      `,
      [bookId],
    );

    if (categoryResult.rows.length > 0) {
      return res.json(categoryResult.rows);
    }

    const fallbackResult = await query(
      `
      SELECT
        id,
        slug,
        title,
        price_cents,
        currency,
        cover_image_url
      FROM books
      WHERE id <> $1
        AND is_active = true
      ORDER BY id ASC
      LIMIT 8
      `,
      [bookId],
    );

    res.json(fallbackResult.rows);
  } catch (err) {
    console.error("Error fetching related books:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// create a new cart
app.post("/api/cart", async (req, res) => {
  try {
    const result = await query(
      `
      INSERT INTO carts DEFAULT VALUES
      RETURNING id, status, created_at, updated_at
      `,
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating cart:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// get cart and items
app.get("/api/cart/:cartId", async (req, res) => {
  const { cartId } = req.params;

  try {
    const cartResult = await query(
      `
      SELECT id, status, created_at, updated_at
      FROM carts
      WHERE id = $1
      `,
      [cartId],
    );

    if (cartResult.rows.length === 0) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const itemsResult = await query(
      `
      SELECT
        ci.id,
        ci.book_id,
        ci.quantity,
        ci.unit_price_cents,
        ci.currency,
        b.slug,
        b.title,
        b.cover_image_url
      FROM cart_items ci
      JOIN books b ON b.id = ci.book_id
      WHERE ci.cart_id = $1
      ORDER BY ci.id ASC
      `,
      [cartId],
    );

    res.json({
      cart: cartResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (err) {
    console.error("Error fetching cart:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// add item to cart (increments quantity if exists)
app.post("/api/cart/:cartId/items", async (req, res) => {
  const { cartId } = req.params;
  const bookId = toRequiredPositiveInt(req.body?.book_id);
  const quantity = toRequiredPositiveInt(req.body?.quantity ?? 1);

  if (!bookId || !quantity) {
    return res.status(400).json({ error: "Invalid book_id or quantity" });
  }

  try {
    const cartResult = await query(
      `
      SELECT id
      FROM carts
      WHERE id = $1
      `,
      [cartId],
    );

    if (cartResult.rows.length === 0) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const result = await query(
      `
      INSERT INTO cart_items (cart_id, book_id, quantity, unit_price_cents, currency)
      SELECT $1, b.id, $2, b.price_cents, b.currency
      FROM books b
      WHERE b.id = $3
        AND b.is_active = true
      ON CONFLICT (cart_id, book_id) DO UPDATE
      SET
        quantity = cart_items.quantity + EXCLUDED.quantity,
        unit_price_cents = EXCLUDED.unit_price_cents,
        currency = EXCLUDED.currency
      RETURNING id, cart_id, book_id, quantity, unit_price_cents, currency
      `,
      [cartId, quantity, bookId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding cart item:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// update item quantity
app.put("/api/cart/:cartId/items/:bookId", async (req, res) => {
  const { cartId, bookId } = req.params;
  const quantity = toRequiredPositiveInt(req.body?.quantity);
  const bookIdNum = toRequiredPositiveInt(bookId);

  if (!bookIdNum || quantity === null) {
    return res.status(400).json({ error: "Invalid book_id or quantity" });
  }

  try {
    if (quantity <= 0) {
      const deleted = await query(
        `
        DELETE FROM cart_items
        WHERE cart_id = $1 AND book_id = $2
        RETURNING id
        `,
        [cartId, bookIdNum],
      );
      if (deleted.rows.length === 0) {
        return res.status(404).json({ error: "Cart item not found" });
      }
      return res.json({ removed: true });
    }

    const result = await query(
      `
      UPDATE cart_items
      SET quantity = $1
      WHERE cart_id = $2 AND book_id = $3
      RETURNING id, cart_id, book_id, quantity, unit_price_cents, currency
      `,
      [quantity, cartId, bookIdNum],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating cart item:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// remove item from cart
app.delete("/api/cart/:cartId/items/:bookId", async (req, res) => {
  const { cartId, bookId } = req.params;
  const bookIdNum = toRequiredPositiveInt(bookId);

  if (!bookIdNum) {
    return res.status(400).json({ error: "Invalid book_id" });
  }

  try {
    const result = await query(
      `
      DELETE FROM cart_items
      WHERE cart_id = $1 AND book_id = $2
      RETURNING id
      `,
      [cartId, bookIdNum],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    res.json({ removed: true });
  } catch (err) {
    console.error("Error removing cart item:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// checkout cart -> create order and order_items
app.post("/api/cart/:cartId/checkout", async (req, res) => {
  const { cartId } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const cartResult = await client.query(
      `
      SELECT id, status
      FROM carts
      WHERE id = $1
      FOR UPDATE
      `,
      [cartId],
    );

    if (cartResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Cart not found" });
    }

    if (cartResult.rows[0].status !== "active") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Cart is not active" });
    }

    const itemsResult = await client.query(
      `
      SELECT book_id, quantity, unit_price_cents, currency
      FROM cart_items
      WHERE cart_id = $1
      ORDER BY id ASC
      `,
      [cartId],
    );

    if (itemsResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Cart is empty" });
    }

    const subtotalCents = itemsResult.rows.reduce(
      (sum, item) => sum + item.unit_price_cents * item.quantity,
      0,
    );
    const currency = itemsResult.rows[0].currency || "PHP";

    const orderResult = await client.query(
      `
      INSERT INTO orders (cart_id, status, subtotal_cents, currency)
      VALUES ($1, 'pending', $2, $3)
      RETURNING id, status, subtotal_cents, currency, created_at
      `,
      [cartId, subtotalCents, currency],
    );

    const orderId = orderResult.rows[0].id;

    for (const item of itemsResult.rows) {
      await client.query(
        `
        INSERT INTO order_items (order_id, book_id, quantity, unit_price_cents, currency)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          orderId,
          item.book_id,
          item.quantity,
          item.unit_price_cents,
          item.currency,
        ],
      );
    }

    await client.query(
      `
      UPDATE carts
      SET status = 'ordered', updated_at = now()
      WHERE id = $1
      `,
      [cartId],
    );

    await client.query("COMMIT");
    res.status(201).json({ order: orderResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error during checkout:", err);
    res.status(500).json({ error: "Database error" });
  } finally {
    client.release();
  }
});

// // NEW: get one event card by id
// app.get("/api/events/:id", async (req, res) => {
//   const { id } = req.params;
//   const idNum = Number(id);

//   if (!Number.isInteger(idNum) || idNum <= 0) {
//     return res.status(400).json({ error: "Invalid event id" });
//   }

//   try {
//     const result = await query(
//       `
//       SELECT
//         id,
//         banner_image_url,
//         title,
//         description,
//         event_date,
//         start_time,
//         end_time,
//         cta_label,
//         cta_url,
//         duration_hours
//       FROM events
//       WHERE id = $1
//       LIMIT 1
//       `,
//       [idNum]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: "Event not found" });
//     }

//     res.json(result.rows[0]);
//   } catch (err) {
//     console.error("Error fetching event:", err);
//     res.status(500).json({ error: "Database error" });
//   }
// });

const port = process.env.PORT || 5001;

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
