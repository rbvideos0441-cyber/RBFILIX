import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Middleware to ensure API Key exists
  const checkApiKey = (req: any, res: any, next: any) => {
    let key = process.env.TMDB_API_KEY;
    if (key) {
      // Remove any surrounding single/double quotes, and trim spaces/newlines
      key = key.trim().replace(/^['"]|['"]$/g, '');
    }
    if (!key || key === "YOUR_TMDB_API_KEY" || key === "") {
      return res.status(401).json({ 
        error: "TMDB_API_KEY_MISSING",
        message: "A chave da API do TMDB não foi configurada. Por favor, adicione TMDB_API_KEY aos segredos (Secrets) do projeto."
      });
    }
    req.tmdbKey = key;
    next();
  };

  // Specifically for details which has a path like /movie/123 - Specific routes FIRST
  app.get("/api/movies/details/:type/:id", checkApiKey, async (req: any, res) => {
    try {
      const { type, id } = req.params;
      const response = await axios.get(`${TMDB_BASE_URL}/${type}/${id}`, {
        params: {
          api_key: req.tmdbKey,
          language: "pt-BR",
          append_to_response: "videos,credits,similar",
        },
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("TMDB Details Error:", error.response?.data || error.message);
      const is401 = error.response?.status === 401;
      const respData = is401 ? {
        error: "TMDB_API_KEY_INVALID",
        message: "A chave da API do TMDB configurada é inválida ou expirou. Por favor, de uma olhada nas configurações (Secrets) do projeto se copiou a chave correta."
      } : (error.response?.data || { error: "Failed to fetch details" });
      res.status(error.response?.status || 500).json(respData);
    }
  });

  // Generic proxy route for simple endpoints like trending or search
  app.get("/api/movies/:endpoint", checkApiKey, async (req: any, res) => {
    try {
      const { endpoint } = req.params;
      const query = req.query;
      
      const response = await axios.get(`${TMDB_BASE_URL}/${endpoint.replace(/-/g, '/')}`, {
        params: {
          api_key: req.tmdbKey,
          language: "pt-BR",
          ...query,
        },
      });

      res.json(response.data);
    } catch (error: any) {
      console.error("TMDB Proxy Error:", error.response?.data || error.message);
      const is401 = error.response?.status === 401;
      const respData = is401 ? {
        error: "TMDB_API_KEY_INVALID",
        message: "A chave da API do TMDB configurada é inválida ou expirou. Por favor, de uma olhada nas configurações (Secrets) do projeto se copiou a chave correta."
      } : (error.response?.data || { error: "Failed to fetch from TMDB" });
      res.status(error.response?.status || 500).json(respData);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
