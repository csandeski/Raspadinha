import bcrypt from "bcrypt";
import { db } from "./db";
import { adminUsers } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedAdminUser() {
  try {
    const username = "admin#@#@d54dsa546645";
    const password = "44D4%GDS4F44245Ddsd*RR$#!331fgyh65";
    
    // Check if admin already exists
    const existingAdmin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, username));
    
    if (existingAdmin.length > 0) {
      console.log("Admin user already exists, updating password...");
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Update existing admin password
      await db
        .update(adminUsers)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(adminUsers.username, username));
      
      console.log("Admin password updated successfully!");
    } else {
      console.log("Creating new admin user...");
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create admin user
      await db.insert(adminUsers).values({
        username,
        password: hashedPassword,
      });
      
      console.log("Admin user created successfully!");
    }
    
    console.log(`
    ✅ Admin credentials configured:
    Username: ${username}
    Password: ${password}
    
    ⚠️  Please save these credentials securely and change them after first login!
    `);
    
    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin user:", error);
    process.exit(1);
  }
}

seedAdminUser();