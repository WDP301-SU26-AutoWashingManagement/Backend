import crypto from "crypto";

export function generateReferralCode() {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
}