/**
 * Astra Rate Guard & Multi-API-Key Rolling Engine
 * Enforces:
 * 1. Multi-API-Key Rolling: Rotates between configured API keys on every turn (read, write, update, tool call, prompt)
 * 2. Instant Key Switch on Quota Exhaustion / Rate Limit (429 / 503 / RESOURCE_EXHAUSTED)
 * 3. Sliding Window Cap: max 14 RPM per key buffer
 * 4. Burst Protection: minimum interval between calls
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export class AstraRateGuard {
  static timestamps = [];
  static lastCallTime = 0;
  static maxRpm = 14;
  static minIntervalMs = 1500;
  static keys = [];
  static currentIndex = -1;
  static initialized = false;

  static initKeys() {
    if (this.initialized) return;
    this.initialized = true;

    const rawKeys = [];
    // 1. Check GEMINI_API_KEYS env var (comma / semicolon / newline separated)
    if (process.env["GEMINI_API_KEYS"]) {
      const parts = process.env["GEMINI_API_KEYS"].split(/[,;\n\r]+/);
      for (const p of parts) {
        const trimmed = p.trim();
        if (trimmed && !rawKeys.includes(trimmed)) rawKeys.push(trimmed);
      }
    }

    // 2. Check GEMINI_API_KEY env var (might also contain comma-separated keys or single key)
    if (process.env["GEMINI_API_KEY"]) {
      const parts = process.env["GEMINI_API_KEY"].split(/[,;\n\r]+/);
      for (const p of parts) {
        const trimmed = p.trim();
        if (trimmed && !rawKeys.includes(trimmed)) rawKeys.push(trimmed);
      }
    }

    // 3. Check config.json / ~/.gemini/config.json / .env
    try {
      const candidatePaths = [
        path.join(os.homedir(), ".gemini", "config.json"),
        "/usr/local/share/astra-cli/.env",
        path.join(process.cwd(), "config.json"),
      ];
      for (const cp of candidatePaths) {
        if (fs.existsSync(cp)) {
          if (cp.endsWith(".json")) {
            const data = JSON.parse(fs.readFileSync(cp, "utf8"));
            if (Array.isArray(data.apiKeys)) {
              for (const k of data.apiKeys) {
                const trimmed = String(k || "").trim();
                if (trimmed && !rawKeys.includes(trimmed)) rawKeys.push(trimmed);
              }
            } else if (data.apiKey) {
              const trimmed = String(data.apiKey).trim();
              if (trimmed && !rawKeys.includes(trimmed)) rawKeys.push(trimmed);
            }
          }
        }
      }
    } catch (_) {}

    this.keys = rawKeys;
    if (this.keys.length > 0) {
      this.currentIndex = 0;
    }
  }

  static maskKey(k) {
    if (!k || typeof k !== "string") return "****";
    const trimmed = k.trim();
    if (trimmed.length <= 8) return trimmed.slice(0, 3) + "...";
    return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
  }

  static getActiveKey() {
    this.initKeys();
    if (this.keys.length === 0) {
      return process.env["GEMINI_API_KEY"] || "";
    }
    return this.keys[this.currentIndex >= 0 ? this.currentIndex : 0];
  }

  static rotateKey(modelsInstance) {
    this.initKeys();
    if (this.keys.length <= 1) {
      return this.getActiveKey();
    }

    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    const nextKey = this.keys[this.currentIndex];

    // Apply to modelsInstance & apiClient & auth
    try {
      if (modelsInstance) {
        if (modelsInstance.apiClient) {
          if (modelsInstance.apiClient.clientOptions) {
            modelsInstance.apiClient.clientOptions.apiKey = nextKey;
            if (modelsInstance.apiClient.clientOptions.auth) {
              modelsInstance.apiClient.clientOptions.auth.apiKey = nextKey;
            }
          }
          modelsInstance.apiClient.apiKey = nextKey;
        }
      }
    } catch (_) {}

    process.env["GEMINI_API_KEY"] = nextKey;

    if (typeof process !== "undefined" && process.stderr?.write && process.env["ASTRA_DEBUG"]) {
      process.stderr.write(`[Astra Key Rolling] Turn API Key #${this.currentIndex + 1}/${this.keys.length} active (${this.maskKey(nextKey)})\n`);
    }

    return nextKey;
  }

  static async waitIfNeeded() {
    this.initKeys();
    const interval = this.keys.length > 1 ? Math.max(500, Math.floor(this.minIntervalMs / this.keys.length)) : this.minIntervalMs;
    const now = Date.now();
    const timeSinceLast = now - this.lastCallTime;
    if (this.lastCallTime > 0 && timeSinceLast < interval) {
      const burstWait = interval - timeSinceLast;
      await new Promise(res => setTimeout(res, burstWait));
    }

    // Sliding window check
    const effectiveRpm = this.keys.length > 1 ? this.maxRpm * this.keys.length : this.maxRpm;
    while (true) {
      const currentTime = Date.now();
      this.timestamps = this.timestamps.filter(t => currentTime - t < 60000);
      if (this.timestamps.length < effectiveRpm) {
        this.timestamps.push(Date.now());
        this.lastCallTime = Date.now();
        break;
      }
      const oldest = this.timestamps[0];
      const waitTime = Math.max(100, 60000 - (currentTime - oldest) + 100);
      await new Promise(res => setTimeout(res, waitTime));
    }
  }

  static async executeWithRetry(fn, modelsInstance, maxRetries = 5) {
    this.initKeys();
    
    // Automatically roll key before each turn / call if multiple keys configured
    if (this.keys.length > 1 && modelsInstance) {
      this.rotateKey(modelsInstance);
    }

    let attempt = 0;
    while (true) {
      await this.waitIfNeeded();
      try {
        return await fn();
      } catch (err) {
        attempt++;
        const errMsg = err?.message || String(err);
        const status = err?.status || err?.statusCode || (errMsg.includes("429") ? 429 : errMsg.includes("503") ? 503 : (errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) ? 429 : null);
        
        if ((status === 429 || status === 503 || err?.code === 429 || err?.code === 503 || errMsg.includes("RESOURCE_EXHAUSTED")) && attempt <= maxRetries) {
          // If we have multiple keys, immediately roll to next key without long sleep!
          if (this.keys.length > 1 && modelsInstance) {
            const currentFailedKey = this.maskKey(this.getActiveKey());
            this.rotateKey(modelsInstance);
            const newKey = this.maskKey(this.getActiveKey());
            if (typeof process !== "undefined" && process.stderr?.write) {
              process.stderr.write(`[Astra RateGuard] Quota limit encountered on Key (${currentFailedKey}). Immediately rolling to next Key (${newKey}) (Attempt ${attempt}/${maxRetries})...\n`);
            }
            await new Promise(res => setTimeout(res, 500));
            continue;
          }

          const backoff = Math.min(30000, 3000 * Math.pow(2, attempt - 1)) + Math.random() * 1000;
          if (typeof process !== "undefined" && process.stderr?.write) {
            process.stderr.write(`[Astra RateGuard] API rate limit (${status || 429}) encountered. Cooling down for ${(backoff/1000).toFixed(1)}s (Attempt ${attempt}/${maxRetries})...\n`);
          }
          await new Promise(res => setTimeout(res, backoff));
          continue;
        }
        throw err;
      }
    }
  }
}
