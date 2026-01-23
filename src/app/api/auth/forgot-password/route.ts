import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/utils/email";
import crypto from "crypto";
import { databases, validateServerEnv } from "@/utils/appwriteServer";
import { ID, Query } from "node-appwrite";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 },
      );
    }

    const trimmedEmail = email.trim().toLowerCase();


    // Basic server-side email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 },
      );
    }

    const { databaseId, userCollectionId, recoveryTokensCollectionId } =
      validateServerEnv();

    // Search ONLY by email (case-insensitive if your collection allows, but Appwrite is case-sensitive by default)
    const users = await databases.listDocuments(databaseId, userCollectionId, [
      Query.equal("email", trimmedEmail),
    ]);

    // Security best practice: Always return generic success message (do not reveal if account exists)
    if (users.documents.length === 0) {
      return NextResponse.json({
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    }

    const user = users.documents[0];

    // Double-check user has a valid (non-guest) email
    if (!user.email || user.email.includes("@guest.com")) {
      return NextResponse.json({
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour expiry

    // Store recovery token
    await databases.createDocument(
      databaseId,
      recoveryTokensCollectionId,
      ID.unique(),
      {
        userId: user.$id,
        token,
        expiresAt,
        used: false,
        email: user.email,
      },
    );

    // Build reset link dynamically (works on localhost, Vercel previews, and production)
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const host = request.headers.get("host") || "localhost:3000";
    const resetLink = `${protocol}://${host}/reset-password?token=${token}&userId=${user.$id}`;


    // Send email
    await sendPasswordResetEmail({
      email: user.email,
      name: user.fullName || user.name || "User",
      resetLink,
    });

    return NextResponse.json({
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 },
    );
  }
}
