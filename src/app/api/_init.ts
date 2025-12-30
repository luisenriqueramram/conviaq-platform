// src/app/api/_init.ts
// Este archivo asegura que el warmup de DB siempre se ejecute en el backend
import { startWarmup } from "@/lib/db-warmup";

startWarmup();
