import { z } from 'zod';

export const employeeFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  jobTitle: z.string().min(2, 'Job title must be at least 2 characters'),
  annualSalary: z.number().positive('Salary must be a positive number'),
  hoursPerWeek: z.number().min(1).max(48, 'Hours must be between 1 and 48'),
  location: z.enum(['York', 'Harrogate'], {
    message: 'Please select a location',
  }),
  startDate: z.string().refine((date) => {
    const d = new Date(date);
    return d instanceof Date && !isNaN(d.getTime());
  }, 'Invalid date'),
  employerName: z.string().min(2, 'Employer name is required'),
  employerSignature: z.any().optional(),
});

export type EmployeeFormData = z.infer<typeof employeeFormSchema>;

export const onboardingSubmissionSchema = z.object({
  // Document acceptance
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms of employment',
  }),
  acceptRestrictive: z.boolean().refine((val) => val === true, {
    message: 'You must accept the restrictive covenant agreement',
  }),
  acceptDeductions: z.boolean().refine((val) => val === true, {
    message: 'You must accept the deductions from pay agreement',
  }),
  // Signature
  signatureName: z.string().min(2, 'Please enter your full name'),
  signatureDate: z.string(),
  employeeSignature: z.any().optional(),
  // Personal details for Xero integration
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  postcode: z.string().min(5, 'Postcode must be at least 5 characters'),
  nationalInsuranceNumber: z.string().min(9, 'National Insurance number is required'),
  dateOfBirth: z.string().refine((date) => {
    const d = new Date(date);
    return d instanceof Date && !isNaN(d.getTime());
  }, 'Invalid date format'),
  // Bank details for payment
  bankName: z.string().min(2, 'Bank name is required'),
  accountHolderName: z.string().min(2, 'Account holder name is required'),
  accountNumber: z.string().min(8, 'Account number must be at least 8 digits'),
  sortCode: z.string().min(6, 'Sort code must be 6 digits'),
});

export type OnboardingSubmissionData = z.infer<typeof onboardingSubmissionSchema>;