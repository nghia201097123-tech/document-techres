// Enums dùng chung cho các entities

export enum BusinessModel {
  ORDER_ONLY = 'order_only',
  CCB_ONLY = 'ccb_only',
  FULL_SYSTEM = 'full_system',
}

export enum SubscriptionPlan {
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export enum StaffRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  CASHIER = 'cashier',
  STAFF = 'staff',
  KITCHEN = 'kitchen',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
}
