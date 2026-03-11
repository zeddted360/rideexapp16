import { branches } from "../../data/branches";
import { Branch } from "../../types/types";

 
const BASE_FARE = 800; 
const RATE_PER_KM = 400; 
const MAX_DELIVERY_KM = 18; 
const MIN_DELIVERY_KM = 1; 
const SERVICE_CHARGE = 200; 
const ROUND_TO_NEAREST = 100; 

export interface DeliveryFeeResult {
  deliveryFee: number; 
  serviceCharge: number; 
  totalLogisticsCost: number; 
  distanceKm: number;
  distanceText: string;
  isDeliverable: boolean;
  reason?: string;
}

// Helper: Round up to nearest 100
function roundUpToNearest100(amount: number): number {
  return Math.ceil(amount / ROUND_TO_NEAREST) * ROUND_TO_NEAREST;
}

// Main function used during checkout
export function calculateDeliveryFeeSimple(
  distanceInMeters: number,
  isSingleRestaurantOrder: boolean = true
): DeliveryFeeResult {

  const distanceKm = distanceInMeters / 1000;

  // 1. Check max distance
  if (distanceKm > MAX_DELIVERY_KM) {
    return {
      deliveryFee: 0,
      serviceCharge: 0,
      totalLogisticsCost: 0,
      distanceKm,
      distanceText: `${distanceKm.toFixed(1)} km`,
      isDeliverable: false,
      reason: `Delivery not available beyond ${MAX_DELIVERY_KM}km`,
    };
  }

  // 2. Enforce minimum distance only for single restaurant orders
  const effectiveDistanceKm = isSingleRestaurantOrder
    ? Math.max(distanceKm, MIN_DELIVERY_KM)
    : distanceKm;

  // 3. Calculate raw delivery fee
  const rawDeliveryFee = BASE_FARE + effectiveDistanceKm * RATE_PER_KM;

  // 4. Round up to nearest ₦100
  const deliveryFee = roundUpToNearest100(rawDeliveryFee);

  return {
    deliveryFee,
    serviceCharge: SERVICE_CHARGE,
    totalLogisticsCost: deliveryFee + SERVICE_CHARGE,
    distanceKm: effectiveDistanceKm,
    distanceText: `${effectiveDistanceKm.toFixed(1)} km`,
    isDeliverable: true,
  };
}

// Quick estimate function (e.g. for cart preview)
export function estimateDeliveryFee(distanceKm: number): DeliveryFeeResult {
  return calculateDeliveryFeeSimple(distanceKm * 1000, true);
}

// Get branch helpers
export function getBranchById(branchId: number): Branch | undefined {
  return branches.find((b) => b.id === branchId);
}

export function getAllBranches(): Branch[] {
  return branches;
}