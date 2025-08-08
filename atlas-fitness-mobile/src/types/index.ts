// User types
export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Organization types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  contactEmail: string;
  contactPhone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  timezone: string;
  features: {
    classBooking: boolean;
    personalTraining: boolean;
    nutritionPlans: boolean;
    onlineClasses: boolean;
    messaging: boolean;
  };
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
}

// Membership types
export interface MembershipPlan {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  price: number;
  interval: 'monthly' | 'quarterly' | 'yearly';
  features: string[];
  maxClassesPerMonth?: number;
  personalTrainingSessions?: number;
  active: boolean;
}

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  membershipPlanId: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  startDate: string;
  endDate?: string;
  nextBillingDate?: string;
  stripeSubscriptionId?: string;
  membershipPlan: MembershipPlan;
}

// Class types
export interface ClassType {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  duration: number; // in minutes
  maxParticipants: number;
  equipment?: string[];
  level: 'beginner' | 'intermediate' | 'advanced' | 'all';
  calories?: number;
  imageUrl?: string;
}

export interface Instructor {
  id: string;
  userId: string;
  organizationId: string;
  bio: string;
  specialties: string[];
  certifications: string[];
  user: User;
}

export interface Class {
  id: string;
  organizationId: string;
  classTypeId: string;
  instructorId: string;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  currentParticipants: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  location: string;
  notes?: string;
  classType: ClassType;
  instructor: Instructor;
}

export interface ClassBooking {
  id: string;
  userId: string;
  classId: string;
  status: 'confirmed' | 'waitlisted' | 'cancelled' | 'attended' | 'no-show';
  checkedInAt?: string;
  createdAt: string;
  class: Class;
}

// Check-in types
export interface CheckIn {
  id: string;
  userId: string;
  organizationId: string;
  type: 'qr' | 'manual' | 'class';
  classId?: string;
  checkedInAt: string;
  checkedOutAt?: string;
}

// Message types
export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'support';
  name?: string;
  lastMessageAt: string;
  participants: ConversationParticipant[];
  lastMessage?: Message;
  unreadCount: number;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  role: 'member' | 'admin';
  joinedAt: string;
  user: User;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  attachmentUrl?: string;
  readBy: string[];
  createdAt: string;
  updatedAt: string;
  sender: User;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'class-reminder' | 'booking-confirmed' | 'membership-expiring' | 'announcement' | 'message';
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

// Payment types
export interface PaymentMethod {
  id: string;
  userId: string;
  type: 'card' | 'bank_account';
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  stripePaymentMethodId: string;
}

export interface Payment {
  id: string;
  userId: string;
  organizationId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  description: string;
  paymentMethodId: string;
  stripePaymentIntentId: string;
  createdAt: string;
}

// Analytics types
export interface UserActivity {
  checkInsThisWeek: number;
  checkInsThisMonth: number;
  classesAttended: number;
  averageCheckInTime: string;
  favoriteClasses: string[];
  streak: number;
}

// App state types
export interface AuthState {
  user: User | null;
  organization: Organization | null;
  membership: Membership | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AppTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  secondaryTextColor: string;
  borderColor: string;
  errorColor: string;
  successColor: string;
  warningColor: string;
}