import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/utils/email";
import crypto from "crypto";
import { databases, validateServerEnv } from "@/utils/appwriteServer";
import { ID, Query } from "node-appwrite";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();



    if (!email) {
      return NextResponse.json({ error: "Email or phone number is required" }, { status: 400 });
    }

    const { databaseId, userCollectionId, recoveryTokensCollectionId } =
      validateServerEnv(); 

    // Find user by email or phone (don't reveal if exists)
    let users = await databases.listDocuments(databaseId, userCollectionId, [
      Query.equal("email", email),
    ]);

    // If no user found by email, try searching by phone (in case user entered phone)
    if (users.documents.length === 0) {
      // Check if the input looks like a phone number
      const phoneRegex = /^(\+234|0)?[789]\d{9}$/;
      if (phoneRegex.test(email.replace(/\s/g, ''))) {
        // Format phone number
        let formattedPhone = email.replace(/\s/g, '');
        if (formattedPhone.startsWith('0')) {
          formattedPhone = '+234' + formattedPhone.slice(1);
        } else if (formattedPhone.startsWith('234')) {
          formattedPhone = '+' + formattedPhone;
        } else if (!formattedPhone.startsWith('+234')) {
          formattedPhone = '+234' + formattedPhone;
        }

        users = await databases.listDocuments(databaseId, userCollectionId, [
          Query.equal("phone", formattedPhone),
        ]);
      }
    }

    if (users.documents.length === 0) {
      // Silent success for security
      return NextResponse.json({ message: "Reset link sent if email exists" });
    }

    const user = users.documents[0];

    // Check if user has email
    if (!user.email || user.email.includes('@guest.com')) {
      // User doesn't have a valid email, cannot send password reset
      return NextResponse.json({ 
        message: "Account found but no email associated. Please contact support or sign up with email to enable password reset." 
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Save to recovery collection
    await databases.createDocument(
      databaseId,
      recoveryTokensCollectionId, // e.g., 'password_recoveries'
      ID.unique(),
      {
        userId: user.$id,
        token,
        expiresAt,
        used: false,
        email: user.email,
      }
    );

    // Build dynamic reset link - works on localhost, production, and Vercel
    const origin = 
      process.env.NODE_ENV === 'production' 
        ? request.headers.get('origin') || 
          request.headers.get('referer')?.split('/')[2] || 
          process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
          process.env.APP_URL || 
          "http://localhost:3000"
        : process.env.APP_URL || 
          "http://localhost:3000";

          console.log("The rigin is ", origin);
    
    const resetLink = `${origin}/reset-password?token=${token}&userId=${user.$id}`;
    console.log("The reset link is ", resetLink);

    // Send custom email
    await sendPasswordResetEmail({
      email: user.email,
      name: user.fullName || user.name,
      resetLink,
    });


    return NextResponse.json({ message: "Reset link sent if email exists" });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
