import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

    if (!key) {
      return NextResponse.json(
        { error: "Google API key is missing" },
        { status: 500 },
      );
    }

    const params = new URLSearchParams(searchParams);
    params.set("key", key);

    if (!params.has("units")) params.set("units", "metric");

    // TWO_WHEELER matches motorcycle/rider routing on Google Maps
    // This is why your distances were longer — driving uses car roads
    params.set("mode", "driving");
    params.set("vehicle_type", "TWO_WHEELER"); // ← key addition

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;

    const response = await fetch(url);
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Distance Matrix API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch distance matrix data" },
      { status: 500 },
    );
  }
}