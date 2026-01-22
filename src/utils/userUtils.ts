import { RootState } from '@/state/store';


export const getUserPhoneFromAuth = (state: RootState): string | null => {
  const user = state.auth.user;
  return user?.phoneVerified && user?.phoneNumber ? user.phoneNumber : null;
};


export const hasVerifiedPhoneFromAuth = (state: RootState): boolean => {
  const user = state.auth.user;
  return user?.phoneVerified === true && !!user?.phoneNumber;
};


export const getPhoneForSMSFromAuth = (state: RootState): string | null => {
  return getUserPhoneFromAuth(state);
};


export const getUserWithPhone = (state: RootState) => {
  const user = state.auth.user;
  if (!user) return null;
  
  return {
    ...user,
    hasPhone: hasVerifiedPhoneFromAuth(state),
    phoneForSMS: getPhoneForSMSFromAuth(state),
  };
}; 