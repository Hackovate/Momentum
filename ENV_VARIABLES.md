# Environment Variables Reference

Quick reference for all environment variables needed for deployment.

## Backend (Render)

```bash
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
CLIENT_URL=https://your-app.vercel.app
AI_SERVICE_URL=https://momentum-ai-service.onrender.com
```

## AI Service (Render)

```bash
PORT=10000
GEMINI_API_KEY=your-gemini-api-key
VECTOR_DIR=/opt/render/project/src/chroma_db
CORS_ORIGINS=https://your-app.vercel.app,https://momentum-backend.onrender.com
GEMINI_MODEL=gemini-2.5-flash
TEMPERATURE=0.1
```

## Frontend (Vercel)

```bash
VITE_API_URL=https://momentum-backend.onrender.com/api
```

## Notes

- Replace placeholder values with your actual URLs and keys
- Set these in each platform's dashboard (Render/Vercel)
- Never commit actual secrets to git
- See `DEPLOYMENT.md` for detailed setup instructions

