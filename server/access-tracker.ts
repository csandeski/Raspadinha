import { InsertSiteAccess, siteAccesses } from "@shared/schema";
import { db } from "./db";
import { UAParser } from "ua-parser-js";
import { nanoid } from "nanoid";
import type { Request } from "express";

interface AccessData {
  userId?: number | null;
  ipAddress: string;
  userAgent: string;
  deviceType: string;
  operatingSystem: string;
  browser?: string;
  country?: string;
  city?: string;
  region?: string;
  latitude?: string;
  longitude?: string;
  pageUrl: string;
  referrer?: string | null;
  sessionId: string;
  isRegistered: boolean;
}

export async function trackAccess(req: Request, userId?: number | null): Promise<void> {
  try {
    // Get user agent data
    const parser = new UAParser(req.headers["user-agent"]);
    const browserData = parser.getBrowser();
    const osData = parser.getOS();
    const deviceData = parser.getDevice();
    
    // Determine device type
    let deviceType = "desktop";
    if (deviceData.type === "mobile") {
      deviceType = "mobile";
    } else if (deviceData.type === "tablet") {
      deviceType = "tablet";
    }
    
    // Get IP address (considering proxies)
    const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || 
                     req.headers["x-real-ip"] as string ||
                     req.socket.remoteAddress || 
                     "unknown";
    
    // Get or create session ID
    let sessionId = req.cookies?.sessionId;
    if (!sessionId) {
      sessionId = nanoid();
      // Note: We'll set this cookie in the middleware
    }
    
    // Prepare access data
    const accessData: InsertSiteAccess = {
      userId: userId || null,
      ipAddress,
      userAgent: req.headers["user-agent"] || "unknown",
      deviceType,
      operatingSystem: osData.name || "unknown",
      browser: browserData.name || undefined,
      pageUrl: req.originalUrl,
      referrer: req.headers.referer || null,
      isRegistered: !!userId,
    };
    
    // Always set to Brazil
    accessData.country = "Brasil";
    accessData.city = "Unknown";
    accessData.region = "Unknown";
    
    // Save to database
    await db.insert(siteAccesses).values(accessData);
    
  } catch (error: any) {
    // Don't throw errors for tracking - it shouldn't break the application
    // Ignore duplicate key errors silently as they're not critical
    if (error?.code !== '23505') {
      console.error("Failed to track access:", error);
    }
  }
}