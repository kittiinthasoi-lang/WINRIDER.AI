import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { calculateAppFare } from "./src/core/serverFare";
import { parseQrPayload } from "./src/utils/qrPayload";

dotenv.config();

const app = express();

// FREE-ONLY MODE: never initialize billable Gemini/Maps providers from this server.
// Google AI Studio Starter Tier can publish without a Cloud Billing account.
const FREE_ONLY_MODE = true;

// ROUTES API SAFETY LOCK: keep Google Routes API unreachable until a deliberate re-enable.
// This blocks every server-side request to routes.googleapis.com while leaving other Google APIs intact.
const nativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const target = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (target.includes("routes.googleapis.com")) {
    return new Response(JSON.stringify({ error: "ROUTES_API_DISABLED", message: "Google Routes API is disabled for billing safety." }), {
      status: 503,