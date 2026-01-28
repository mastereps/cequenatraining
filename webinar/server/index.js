import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`PayMongo server listening on http://localhost:${PORT}`);
});
